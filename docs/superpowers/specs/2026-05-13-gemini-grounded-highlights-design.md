# Gemini-Grounded Highlights Design

**Date:** 2026-05-13
**Status:** Approved
**Supersedes:** the cursor-anchoring path from `2026-05-13-cursor-anchored-highlights-design.md`, `2026-05-13-cv-cursor-detection-design.md`, `2026-05-13-hybrid-cursor-validation-design.md`. Frame-diff WHEN-detection from `2026-05-13-frame-diff-click-events-design.md` is retained.

## Problem

Today's pipeline detects WHEN something changed (frame-diff) and uses the raw diff bounding box as the highlight region. This often boxes the *side-effect* (page transition, panel that opens, URL preview, heading change), not the *source* element that was clicked. Result: yellow rectangles land on the wrong UI element in roughly half of real videos.

We need every click and every typing event highlighted on the **actual interacted element**, with a short natural-language caption per event.

## Approach

Keep frame-diff for WHEN. Replace the diff-bbox WHERE with a **per-event Gemini call on a tight crop** of the BEFORE/AFTER frames. The LLM returns a precise bbox of the clicked element (or the input field receiving text) plus a caption and kind classification.

Cropping is the key insight. Vision LLMs ground accurately on small crops and hallucinate on large frames. We send a tight window around the diff, and the LLM picks the right element within it.

A separate sub-stage merges consecutive small diffs in the same region into a single "input" event (one typing session = one screenshot) before grounding.

## Pipeline

```
Frame pool (dense 2fps)
  ↓
detectClickEvents             (existing — WHEN signal)
  ↓
classifyAndMergeEvents        (NEW — split clicks vs typing sessions)
  ├─ Clicks: pass through
  └─ Inputs: merge consecutive close-by diffs into one event
  ↓
groundEventsWithGemini        (NEW — per-event LLM grounding on a crop)
  ↓
uploadScreenshots             (unchanged — draws yellow rect)
```

### Stage: classifyAndMergeEvents

**Input:** `Map<stepIndex, ClickEvent[]>` from `runExtractClickEvents`.

**Output:** `Map<stepIndex, RawEvent[]>` where `RawEvent` adds a tentative `kind: "click" | "input"`.

**Rules (heuristic, refined by LLM later):**
- An event is a **typing candidate** if its bbox is wider-than-tall (aspect > 2.5), `density < 0.4`, and within the same step there exists at least one consecutive event whose bbox overlaps (IoU ≥ 0.30) within `mergeWindowSec` (default 1.5s).
- Group typing candidates into a session: consecutive events whose bboxes overlap (IoU ≥ 0.30) and timestamps are within 1.5s of the previous member. Collapse the session into one event:
  - `time` = first member's time
  - `bbox` = union of member bboxes (expanded to the bounding rectangle that contains the whole typing region)
  - `beforeFramePath` = first member's BEFORE
  - `afterFramePath` = last member's AFTER
  - `kind = "input"`
- Non-typing events get `kind = "click"`.

The kind here is a **hint** — the grounding LLM may override it. This is fine; the merge logic only needs to be roughly right.

### Stage: groundEventsWithGemini

**For each event, in parallel within a step (concurrency 5):**

1. **Compute crop window** around `event.bbox` on the full-resolution BEFORE frame:
   - Target crop size = `max(3 × diff_size, 400px)` on each axis
   - Capped at `0.5 × frame_dimension` per axis
   - Centered on diff bbox center, clamped to frame bounds
   - Same crop coordinates applied to BEFORE and AFTER frames
2. **Crop both frames** to JPEG buffers (use `sharp().extract().jpeg()`).
3. **Build prompt** with both crops + step narration + event kind hint + diff bbox in crop coordinates.
4. **Call Gemini** via `llmJsonVision` with a strict schema.
5. **Map the returned bbox** from crop-relative 0..1 to full-frame 0..1.

**Per-event LLM output schema:**
```ts
GroundedEventOutput = z.object({
  bbox: BBox,                                    // 0..1 in crop coords
  caption: z.string().nullable(),                // imperative caption in narration language; null if not meaningful
  kind: z.enum(["click", "input"]),              // confirmed kind
})
```

**Prompt (system):**
> You are a precise visual locator for a how-to screen recording. You receive a BEFORE crop and an AFTER crop of the same screen region around a moment where the user performed one action. A diff bounding box (normalized 0..1 in the crop) tells you roughly where pixels changed.
>
> Return a tight bounding box around the **specific UI element the user interacted with**:
> - For a `click` (button, link, icon, tab, menu item, row, dropdown): bbox the **source element** the cursor was on, not any panel/menu/page that opened in response.
> - For an `input` (text field, textarea, search box): bbox the **input field** receiving text, including its full visual extent (border, padding).
>
> Write a short imperative caption in {language} describing what the user did (e.g., "Click the Sign in button.", "Enter your email address."). One sentence. If the change is not a meaningful UI action (background animation, video playback, ad swap), return `caption: null`.
>
> Classify the kind: `input` if a text field is receiving text, `click` otherwise.
>
> Coordinates are normalized 0..1 against the crop (top-left origin).
>
> Return strict JSON.

**User text:**
```
Step title: {step.title}
Step narration: {step.narration}
Event kind hint: {event.kindHint}
Diff bbox in crop (x, y, w, h): {diff_in_crop.x}, {diff_in_crop.y}, {diff_in_crop.w}, {diff_in_crop.h}
```

**Images attached:** [crop_before.jpg, crop_after.jpg]

### Failure handling

If `llmJsonVision` throws after retries for an event:
- Fall back to the **raw diff bbox** (full-frame 0..1) and `caption: null`, `kind: event.kindHint`.
- Log a warn with `stepIndex`, `t`, `error`.
- The screenshot still gets uploaded with a yellow rectangle around the diff region — same as the current pipeline. Quality regresses to baseline for that event but no event is dropped.

### Coordinate mapping

Given a crop spanning `[cx, cy, cw, ch]` in full-frame pixels, an LLM bbox `(bx, by, bw, bh)` in 0..1 crop coords maps to full-frame 0..1 as:

```
fullX = (cx + bx * cw) / frameWidth
fullY = (cy + by * ch) / frameHeight
fullW = (bw * cw) / frameWidth
fullH = (bh * ch) / frameHeight
```

`uploadScreenshots` expects full-frame 0..1 — no change to that stage.

## Schema additions

Add to `src/lib/schemas.ts`:
```ts
export const GroundedEventOutput = z.object({
  bbox: BBox,
  caption: z.string().nullable(),
  kind: z.enum(["click", "input"]),
});
```

`CaptionsOutput` becomes unused — keep for one release for safety, then delete.

## Config additions

Add to `config.screenshots`:
```ts
ground: {
  cropMultiplier: 3,        // crop = max(3 × diff_size, cropMinPx)
  cropMinPx: 400,
  cropMaxFrac: 0.50,        // each axis capped at 50% of frame
  perStepConcurrency: 5,
}
```

Add to `config.ai.prompts`:
- `groundEventSystem(lang: string) => string` (the system prompt above)

## Code deletions

After this design ships and the smoke test passes, delete:
- `src/trigger/stages/anchorClickEvents.ts` + test
- `src/trigger/lib/cursorDetect.ts` + test
- `src/trigger/stages/validateHighlights.ts` + test
- `src/trigger/stages/captionClickEvents.ts` (replaced by the new stage)
- `config.ai.prompts.clickCaptionSystem`, `focusedCursorSystem`
- `config.screenshots.clickDetect` keeps; cursor-anchor disabled flag is removed from `processSopScreenshots.ts`
- `CursorSchema`, `FocusedCursorOutput`, `CaptionsOutput` from `schemas.ts`

Keep:
- `clickEventDetect.ts` and its test (frame-diff WHEN is still the source of truth)
- `extractClickEvents.ts` (bucketing by step)
- `uploadScreenshots.ts` (drawing logic unchanged)

## Pipeline wiring (`processSopScreenshots.ts`)

Replace the block from `// Cursor anchoring is implemented...` through the call to `runUploadScreenshots` with:

```ts
const merged = await runClassifyAndMergeEvents({ byStep: eventsByStep });

const grounded = await runGroundEventsWithGemini({
  byStep: merged,
  steps: stepInputs,
  language: language!,
});

await setStatus(_id, "uploading-screenshots");
const uploadByStep = new Map<number, UploadEvent[]>();
for (const [stepIndex, evs] of grounded.entries()) {
  uploadByStep.set(stepIndex, evs.map(e => ({
    displayFramePath: e.displayFramePath,
    t: e.time,
    bbox: e.bbox,
    kind: e.kind,
    caption: e.caption,
  })));
}
const screenshotsByStep = await runUploadScreenshots({ sopId, byStep: uploadByStep });
```

`displayFramePath` for grounded events:
- Clicks: the BEFORE frame (we want to see the element about to be clicked, before any visual feedback)
- Inputs: the AFTER frame (text is visible in the field)

This rule lives in the grounding stage's output.

## Open questions resolved (autonomous decisions)

| Q | Decision |
|---|---|
| Crop multiplier | 3× diff with 400px floor, 50% frame cap |
| Concurrency | 5 events per step run in parallel; steps stay serial |
| Failure mode | Fall back to raw diff bbox + null caption; don't drop events |
| Dead-code deletion | Anchor, cursorDetect, validateHighlights, captionClickEvents — all deleted in the same change |
| Input field display frame | AFTER (text visible) |
| Click display frame | BEFORE (element visible pre-click) |
| Kind override | LLM final classification wins over heuristic hint |

## Testing strategy

1. **Unit tests for `classifyAndMergeEvents`:**
   - Single click with no neighbors → one click event
   - Three consecutive overlapping wide diffs → one input event with union bbox
   - Mix of one click and one typing session in same step → two events, correctly classified
   - Typing session crossing a step boundary → only the events in that step merge (sessions don't span steps)

2. **Unit tests for crop math:**
   - 3× diff inside frame bounds → expected crop coordinates
   - Tiny diff with cropMinPx floor → 400×400 crop centered on diff
   - Diff at frame edge → crop clamped to bounds, still centered as much as possible
   - LLM bbox in crop maps correctly to full-frame coords

3. **Unit tests for `groundEventsWithGemini` with mocked LLM:**
   - Success path: crop + LLM bbox → mapped event
   - LLM failure → fallback to raw diff + null caption
   - Concurrency limit respected

4. **Smoke test:**
   - Re-run `hubspot_crm.mp4` end-to-end
   - Spot-check 10 screenshots: bbox tightness, caption sense, click/input kind
   - Compare visually with the 53-highlight baseline

## Cost & latency budget

- ~50 events × Gemini 2.5 Flash @ ~$0.001/call = **$0.05 / video**
- Latency: 50 events ÷ concurrency 5 ≈ 10 sequential rounds × ~2s = **~20s added** (best case); pessimistic 60s
- Acceptable for a trigger.dev background job that already takes minutes

## Risks

| Risk | Mitigation |
|---|---|
| LLM bbox still misaligned within crop | Tight crop reduces space the LLM can be wrong in; track in smoke test; tune cropMultiplier if needed |
| LLM rate limits with 50 parallel calls | Concurrency limit 5/step; steps serial; OpenRouter handles backoff |
| Typing-session merge over-merges (e.g., two adjacent fields filled in succession) | IoU threshold + 1.5s window are conservative; verify in smoke test |
| Pipeline regression for already-working clicks | Failure path keeps current diff-bbox behavior; net effect is monotonic improvement |
