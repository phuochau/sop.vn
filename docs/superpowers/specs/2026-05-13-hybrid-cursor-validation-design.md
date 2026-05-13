# Hybrid Cursor Validation — Design

**Date:** 2026-05-13
**Status:** Approved (after spec review pass 1)
**Replaces:** `2026-05-13-cv-cursor-detection-design.md` (CV-only — failed on recall)

## 1. Problem

Two prior approaches both failed:

- **LLM self-reported cursor** (one call returns bbox + cursor): the LLM is self-consistent in hallucinations — when bbox is wrong, cursor agrees with it. Validator catches nothing.
- **CV-only template matching** (no LLM cursor): hand-crafted SVG templates score ~0.72 on real cursors but also score ~0.72 on busy UI textures (HubSpot's product mockup, illustration cards). Open-world full-frame search is too noisy. Recall collapsed to 2/67 frames.

Each approach has a complementary weakness:
- LLM: weak at spatial grounding, but generalizes to all cursor styles and is good at focused single-task questions.
- CV: precise, but its discriminator (NCC against approximated templates) isn't strong enough in open-world search.

## 2. Solution

Two **independent** cursor signals, used together:

1. **Focused-cursor LLM call** (separate from bbox call) proposes where the cursor is.
2. **CV detector in a narrow window** around the LLM-proposed point verifies a cursor actually exists there.

If both agree → keep highlight (validated against bbox). If either fails → drop.

The key property: the focused-cursor call's *prompt context* has no knowledge of the bbox decision. The LLM can't self-consistently hallucinate across the two calls.

### 2.1 Flow

```
pickForStep(step, bucket):
  bbox_result = vision_llm(bucket_frames, screenshotPickSystem)        // existing call
  validation_input = [(pick.index, downscaledPaths[pick.index]) for pick in bbox_result.picks where pick.highlight != null]
  validated = await validateHighlights(validation_input, bbox_result.picks)
  return validated
```

`validateHighlights` is a new module (`src/trigger/stages/validateHighlights.ts`) that:

1. If `validation_input` is empty, returns picks unchanged.
2. Calls the focused-cursor LLM (batched across all input frames).
3. For each pick with a highlight, looks up its `(index → cursor | null)` from the focused-cursor response.
4. If `cursor is null` → drop highlight.
5. Else calls `verifyCursorInWindow(framePath, cursor.x, cursor.y)`; if it returns `null` → drop highlight.
6. Else calls `bboxContainsCursor(pick.highlight.bbox, cvCursor)`; if false → drop highlight.
7. Returns picks with surviving highlights, dropped highlights set to `null`.

The whole `validateHighlights` call is wrapped in try/catch inside `pickForStep`. On error: log warn, set all highlights for the step to `null`, but **preserve the picks themselves** (descriptions, frame selection survive).

### 2.2 Focused-cursor LLM call

**Separate system prompt** added to `config.ai.prompts.focusedCursorSystem`:

> You are a precise visual locator. For each image, find the mouse cursor — the actual rendered pointer (arrow, pointing hand, I-beam, or custom). Report the cursor's tip point (where a click lands) as normalized 0..1 coordinates.
>
> For each image, return: `{ index: <bucket index>, cursor: { x, y } | null }`.
>
> Rules:
> - If you do not clearly see a cursor (hidden, off-screen, mobile/touch demo with no cursor rendered), return `cursor: null`.
> - Do NOT guess. Do NOT default to a screen center or a UI element. Return `null` when uncertain.
> - Do NOT consider what UI element the cursor is on. Only the cursor's pixel location.
>
> Return strict JSON only.

This prompt has **no knowledge of**: step narration, picked frames' UI semantics, bbox decisions, click vs input distinction. It's a single-purpose locator.

**Schema** (`src/lib/schemas.ts`):

```ts
export const CursorSchema = z.object({ x: z.number(), y: z.number() });
export type Cursor = z.infer<typeof CursorSchema>;

export const FocusedCursorOutput = z.object({
  cursors: z.array(z.object({
    index: z.number().int().nonnegative(),
    cursor: CursorSchema.nullable(),
  })),
});
```

The `Cursor.nullable()` pattern was already used and ran successfully end-to-end against OpenRouter→Gemini Flash in the prior `cursor-anchored-highlights` spec; the existing `zodToJsonSchemaLike` handles it via the `ZodNullable` branch (produces `{type: ["object","null"], properties, required, additionalProperties:false}` which OpenRouter forwards intact).

**Removing the duplicate TS alias:** the existing `export type Cursor = { x: number; y: number }` in `assignScreenshots.ts` is deleted; consumers import `Cursor` from `@/lib/schemas`.

**Batching & user text:**

```
For each image, return the cursor at that image's bucket index.
Bucket indices and timestamps:
0 : 39.50s
1 : 40.50s
...
Return JSON: { "cursors": [{ "index": <bucket index>, "cursor": { "x": <0..1>, "y": <0..1> } | null }] }
```

Only frames whose pick has a non-null highlight are sent. Frames with no highlight aren't asked about.

**Missing/extra/duplicate index handling:**
- Missing index in response → treat as `cursor: null` (drop that frame's highlight).
- Extra index not in the picked set → silently ignored.
- Duplicate index → take first occurrence.

### 2.3 CV narrow-window verification

New function in `cursorDetect.ts`:

```ts
export type CursorDetection = { x: number; y: number; score: number };

export async function verifyCursorInWindow(
  imagePath: string,
  cx: number,             // 0..1, claimed cursor x (full-image coords)
  cy: number,             // 0..1, claimed cursor y (full-image coords)
  opts?: { windowFrac?: number; threshold?: number },
): Promise<CursorDetection | null>;
```

**Default `windowFrac = 0.08`** (full-extent — window is 0.08 × imgW wide and 0.08 × imgH tall). On a 1280×720 frame that's 102×58 px, comfortably containing a ~22 px cursor plus ~±40 px slack to absorb LLM spatial imprecision.

**Default `threshold = 0.55`**. Start strict (matches full-frame baseline). Lower if smoke testing shows recall dropping further than expected; document any change.

**Crop math (deterministic):**

```ts
const meta = await sharp(imagePath).metadata();
const imgW = meta.width!, imgH = meta.height!;
const winW = Math.round((windowFrac ?? 0.08) * imgW);
const winH = Math.round((windowFrac ?? 0.08) * imgH);
// Minimum window size: must be larger than largest cursor template + 2px padding.
// Largest template height ≈ 26 px → require winH ≥ 30, winW ≥ 30. If smaller, return null.
if (winW < 30 || winH < 30) return null;
let x0 = Math.round(cx * imgW - winW / 2);
let y0 = Math.round(cy * imgH - winH / 2);
x0 = Math.max(0, Math.min(imgW - winW, x0));
y0 = Math.max(0, Math.min(imgH - winH, y0));
// Crop, run NCC over the crop only.
```

After NCC finds best `(x, y, score)` inside the crop coordinate system, recover full-image coords:

```ts
return {
  x: (x0 + x + template.tipX) / imgW,
  y: (y0 + y + template.tipY) / imgH,
  score,
};
```

If `cx` or `cy` is outside `[0, 1]`, clamp to `[0, 1]` before computing crop. If after clamping the crop still ends up degenerate (shouldn't happen given the min-window check), return null.

### 2.4 Cursor templates

`cursorDetect.ts` carries two SVG sources:

```ts
const ARROW_SVG = `...`;  // existing
const HAND_SVG  = `...`;  // new: pointing-hand link cursor
```

**Per-template tip offsets** (already in the `Template` type as `tipX`, `tipY`; need to be populated correctly):

| Template | tipX | tipY | Rationale |
|---|---|---|---|
| arrow (16×22 SVG) | 1 | 1 | top-left tip |
| hand (22×22 SVG, fingertip up) | 11 (width/2) | 1 | top-center fingertip |

Tip offsets are scaled with the template raster: if rasterized at height `h`, tip offsets scale by `h / svgViewBoxHeight`.

Both templates rasterized at heights `[18, 22, 26]` and added to the cache.

### 2.5 Configuration

`config.ai.prompts.focusedCursorSystem`: prompt above (no language parameter — coordinates are language-agnostic).

The focused-cursor call uses `config.ai.visionModel` (Gemini 2.5 Flash). No new model knob.

The existing `screenshotPickSystem` prompt is **unchanged** — it already says "A separate cursor-detection step will verify your bbox" which is precisely accurate for the new pipeline.

### 2.6 Error handling

| Failure | Behavior |
|---|---|
| Focused-cursor LLM call throws (network/timeout/parse) | `validateHighlights` rethrows; `pickForStep` catches, logs `logger.warn`, sets all step's highlights to `null`, preserves picks. |
| Focused-cursor returns missing index | Treat as `cursor: null` → drop that frame's highlight. |
| Focused-cursor returns extra/unknown index | Silently ignore. |
| Focused-cursor returns duplicate index | Take first; ignore rest. |
| `verifyCursorInWindow` crop has minimum-size violation (near image edge) | Returns null → drop highlight. |
| `verifyCursorInWindow` finds best score below threshold | Returns null → drop highlight. |

### 2.7 Files changed

| File | Change |
|---|---|
| `src/lib/schemas.ts` | Add `CursorSchema`, `Cursor` (TS type via `z.infer`), `FocusedCursorOutput`. |
| `src/config/index.ts` | Add `prompts.focusedCursorSystem`. |
| `src/trigger/lib/cursorDetect.ts` | Add `HAND_SVG`, per-template tip offsets, `verifyCursorInWindow`. Keep existing `detectCursor` exported (used by tests; not imported in main pipeline). |
| `src/trigger/stages/validateHighlights.ts` | **New module.** `validateHighlights(input, picks)` does focused-cursor LLM call + CV verify + bbox check. |
| `src/trigger/stages/assignScreenshots.ts` | Remove `Cursor` TS alias, remove `detectCursor` import, remove inline validation block. Call `validateHighlights` from `pickForStep` inside a try/catch that drops highlights on failure. |
| Tests | New: `verifyCursorInWindow` (synthetic frame, in-window / out-of-window / near-edge); `validateHighlights` (mocked LLM and CV); update existing `assignScreenshots.test.ts` if signatures shift. |

## 3. Cost & latency

- Per step: +1 batched LLM call (Gemini Flash, ~$0.001). Per video (~5 steps): **+$0.005**.
- Per step: +1-3s LLM latency. Steps run in parallel under existing `Promise.allSettled` in `runAssignScreenshots`, so wallclock impact is the slowest step's added latency: **~3s per video**.
- CV: `verifyCursorInWindow` ~10 ms per picked-with-highlight frame (window is ~5% the area of full-frame search; integral images rebuilt over crop only). ~70 frames → **~700ms total**.

## 4. Acceptance

**Automated:**
- All existing tests pass.
- Unit tests:
  - `verifyCursorInWindow` finds a planted cursor when the claim is correct (within ±3 px in full-image coords).
  - `verifyCursorInWindow` returns null when the claim is in a region with no cursor.
  - `verifyCursorInWindow` returns null when the window would be smaller than 30×30 px (cursor claim near edge of a small image).
- Tests for `validateHighlights` with mocked LLM call: drops highlights when focused-cursor returns null, drops when CV returns null, drops when bbox doesn't contain cursor, keeps when all checks pass.
- `tsc --noEmit` clean.

**Manual (smoke on `samples/hubspot_crm.mp4`):**
- Recall (surviving highlights / picks-with-highlight from main bbox call) **≥ 30%**. Prior CV-only run was 3% (2/72); hybrid target is 30%+ — at least an order-of-magnitude improvement.
- Spot-check ≥ 5 surviving frames manually — 0 visually-misaligned bboxes. (Subjective. Manual review.)
- The 3 known-bad frames from prior smokes (the YouTube intro, the HubSpot hero "Whether you want to incre…" hallucination, the verification-code email field) either align correctly or are dropped.

## 5. Out of scope

- Replacing hand-crafted SVG templates with real macOS sprite PNGs (would unlock recall on edge cases; not load-bearing for precision).
- Custom in-app cursors (Guidde, Loom). Likely dropped because CV templates don't match. Acceptable.
- Frame-diff click gating. Possible future enhancement on top of this.
- Tuning `windowFrac` and `threshold` per video resolution. Single defaults now; revisit if smoke shows systematic issues.
