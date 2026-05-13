# Frame-Diff Click Event Detection — Design

**Date:** 2026-05-13
**Status:** Approved (after spec review pass 1)
**Replaces (in pipeline behavior):** LLM-bbox + cursor-validation rigs in screenshots mode.

## 1. Reframing

Prior approaches asked "where is the cursor in this frame?" and tried to bbox the element under it. They failed because:

1. The LLM picks frames for *visual usefulness*, not click moments. Most picked frames are post-action / transitional / idle — cursor isn't on the click target anymore.
2. Even when LLM proposes a click bbox, it's a guess. Validation drops most picks because cursor genuinely isn't there.

The user's actual goal is **"every click and every input gets a yellow rectangle."** That's better answered by a different question: **"when in the video did a click happen, and where on screen did the change occur?"**

That question has a physical answer: a click causes a localized pixel change in the next frame. No cursor detection, no LLM bbox guessing — just look at what changed.

## 2. Architecture

### 2.1 Pipeline shape (new, screenshots mode only)

```
buildFramePool (modified)
   ├─ frames (filtered, existing) ─ unused in screenshots mode after this change; kept for clip mode
   └─ denseFrames (NEW) ─ all 2 fps raw frames in timestamp order
        ↓
detectClickEvents (NEW)   →   list of ClickEvent { time, bbox, afterFramePath }
        ↓
groupClickEventsByStep (NEW) → assigns events to steps by time range
        ↓
captionClickEvents (NEW)   → LLM batched per step: caption + click/input kind
        ↓
uploadClickScreenshots (modified) → R2 upload, one screenshot per event with bbox drawn
```

**Clip mode is a different trigger.dev task and is unaffected.** This change is scoped to `processSopScreenshots`.

### 2.2 buildFramePool changes

```ts
export interface RawFrame {
  t: number;
  pHash: string;
  localPath: string;
  poolId: string;
}

export interface DenseFrame {
  t: number;
  localPath: string;
}

export interface FramePool {
  frames: RawFrame[];          // existing filtered pool — unused in screenshots mode
  denseFrames: DenseFrame[];   // NEW: all sampled frames, timestamp-ordered, NO pHash
  tmpDir: string;
  dispose: () => Promise<void>;
}
```

`denseFrames` are the raw outputs of `ffmpegDenseSample`, prior to pHash computation and filtering. **They do not carry pHash** (not needed for diff). Filtering and pHash work continues as today for `frames`.

### 2.3 Sample rate

`config.screenshots.sampleFps` remains at **2** (frames 0.5s apart). Most UI state changes settle within 100–300ms, so 0.5s spacing reliably catches "before vs after" transition. If smoke shows missed events, bump in a follow-up; not in this change.

### 2.4 Diff resolution

Before computing per-pixel diff, **downscale both frames to a 640px max edge, grayscale**. Bounds cost at ~290K pixels per frame, ~580K array operations per diff. For 600 frames × ~290K = ~175M operations across the video. Well under 2s in V8 with typed arrays. Sharp does the resize + grayscale extract in one chain.

Bboxes from the downscaled diff are normalized to 0..1, then applied to the full-resolution `afterFramePath` for display. Coordinate frame is identical (both downscale preserves aspect ratio).

## 3. Click event detection

### 3.1 Algorithm per adjacent pair (F_i, F_{i+1})

1. Load both as 640px-max grayscale raw pixels (sharp).
2. Compute mask `M[p] = 1 if |F_i[p] - F_{i+1}[p]| > diffThreshold else 0`. Default `diffThreshold = 25`.
3. Connected-component label `M` (4-connectivity, iterative BFS, Int32Array label image, Uint32Array work queue).
4. For each component: `area` (pixel count), `bbox = (x, y, w, h)`, `density = area / (bbox.w * bbox.h)`.
5. Filter:
   - `area >= minAreaFrac * totalPixels` (default 0.003 = 0.3%)
   - `area <= maxAreaFrac * totalPixels` (default 0.20 = 20%)
   - `density >= minDensity` (default 0.20)
6. **Component selection: keep the largest component above thresholds.** At most one event per pair. (Multiple unrelated changes per 0.5s window are rare; pursuing them adds complexity for marginal value.)
7. **Steadiness check.** Let `bbox` be in downscaled pixels. Compute:
   - `primaryMAD = mean(|F_i[p] - F_{i+1}[p]|)` for p in bbox
   - `secondaryMAD = mean(|F_{i+1}[p] - F_{i+2}[p]|)` for p in same bbox (if F_{i+2} exists)
   - If `primaryMAD < 1e-3` (effectively zero — shouldn't happen given diffThreshold > 0): accept (no division).
   - Else if `secondaryMAD / primaryMAD > steadinessThreshold` (default 0.30) → **reject** (still changing).
   - **If F_{i+2} does not exist (last pair):** accept (no steadiness data → don't drop).
8. Surviving component → emit `ClickEvent { time: F_i.t, bbox (normalized 0..1 wrt downscaled W,H, which equals full-image), afterFramePath: F_{i+1}.localPath, area, density }`.

### 3.2 Temporal merging across pairs

After all events computed, iterate chronologically. **Merge events i and i+1** if:
- `time_{i+1} - time_i < mergeWindowSec` (default 1.5s)
- AND `bboxIou(bbox_i, bbox_{i+1}) >= mergeIouMin` (default 0.30)

Merged event:
- `time` = `time_i` (earliest, the action started here)
- `bbox` = union of bboxes
- `afterFramePath` = `afterFramePath_{i+1}` (latest visible state)
- `area, density` recomputed on the union (area = sum, density approximated as min of the two)

This collapses input-typing runs (multiple characters → one event covering the field) and rapid double-clicks.

### 3.3 Cap

If post-merge `events.length > maxEventsPerVideo` (default 60), keep the top-N by `area * density` (proxy for visual importance).

## 4. Module: `src/trigger/lib/clickEventDetect.ts`

```ts
export type ClickEvent = {
  time: number;
  bbox: { x: number; y: number; w: number; h: number };  // normalized 0..1
  afterFramePath: string;
  area: number;       // pixels in component, in downscaled image space
  density: number;    // 0..1
};

export type ClickDetectOptions = {
  diffThreshold?: number;       // default 25
  minAreaFrac?: number;         // default 0.003
  maxAreaFrac?: number;         // default 0.20
  minDensity?: number;          // default 0.20
  steadinessThreshold?: number; // default 0.30
  mergeWindowSec?: number;      // default 1.5
  mergeIouMin?: number;         // default 0.30
  maxEventsPerVideo?: number;   // default 60
  diffMaxEdge?: number;         // default 640
};

export async function detectClickEvents(
  frames: { t: number; localPath: string }[],
  opts?: ClickDetectOptions,
): Promise<ClickEvent[]>;
```

Internal helpers (not exported): `loadGrayscale640`, `pixelDiffMask`, `connectedComponentsLargest`, `meanAbsDiffOver`, `bboxIou`, `mergeEvents`. Hand-rolled, typed arrays, no extra deps beyond `sharp`.

## 5. Step grouping: `src/trigger/stages/extractClickEvents.ts`

```ts
import type { StepRange } from "./assignScreenshots";

export async function runExtractClickEvents(args: {
  steps: StepRange[];
  denseFrames: DenseFrame[];
}): Promise<Map<number, ClickEvent[]>>;
```

Algorithm:
1. Call `detectClickEvents(denseFrames)`.
2. For each event, assign to step with `event.time` in `[tStart, tEnd)`. **Half-open intervals;** the last step is `[tStart, tEnd]` (inclusive on the right) so events at the very end aren't lost.
3. Within each step, sort events by `time` ascending.
4. Return map. Steps with no events get an empty array (don't fail).

## 6. Caption stage: `src/trigger/stages/captionClickEvents.ts`

For each step with at least one event, one batched LLM call:

```ts
export type CaptionedClickEvent = ClickEvent & {
  caption: string | null;
  kind: "click" | "input";
};

export async function runCaptionClickEvents(args: {
  byStep: Map<number, ClickEvent[]>;
  steps: Array<{ stepIndex: number; title: string; narration: string }>;
  language: string;
}): Promise<Map<number, CaptionedClickEvent[]>>;
```

**Input to the LLM:** the un-annotated `afterFramePath` images plus a text block listing each event's `(index, time, bbox)`. The LLM reads bbox numbers from text — fewer image bytes, no need to bake yellow rectangles into the input.

**Index contract:** `index` in `CaptionsOutput.captions[].index` is the **zero-based position of the event within the step's array sorted by `time` ascending**, matching the order the images and text are sent. The caption stage joins by this index.

**Missing index in response:** default to `caption=null, kind="click"`.
**Out-of-range index in response:** silently ignored.

**Prompt** — new `config.ai.prompts.clickCaptionSystem(lang)`:

> You receive frames from a training video where the user has just performed an action (clicked, tapped, or typed). For each frame, the user message lists a bounding box (normalized 0..1, top-left origin) identifying where on the screen the change occurred — that is, the UI element the user just interacted with.
>
> For each event, write a short imperative caption in {lang} describing what the user did at that bounding box. Examples: "Click the Get started free button.", "Enter your email address.". One sentence, no more. If the change does not look like a meaningful UI action (background animation, video playback, etc.), return null for the caption.
>
> Also classify each event:
> - `"input"` if the bounding box is on a text field, textarea, or search box, and the change looks like text being entered.
> - `"click"` otherwise (buttons, links, tabs, dropdowns, menu items, icons).
>
> Indices in your response MUST match the indices given in the user message.
>
> Return strict JSON: `{ "captions": [{ "index": N, "caption": "..." | null, "kind": "click" | "input" }] }`.

**Schema** (new in `src/lib/schemas.ts`):

```ts
export const CaptionsOutput = z.object({
  captions: z.array(z.object({
    index: z.number().int().nonnegative(),
    caption: z.string().nullable(),
    kind: z.enum(["click", "input"]),
  })),
});
```

**Failure handling:** the LLM call is wrapped in try/catch inside `runCaptionClickEvents` *per step*. On failure for a step: every event in that step gets `caption=null, kind="click"`. Other steps proceed normally.

## 7. Upload: `runUploadScreenshots` signature change

```ts
export type UploadEvent = {
  afterFramePath: string;
  t: number;
  bbox: { x: number; y: number; w: number; h: number };
  kind: "click" | "input";
  caption: string | null;
};

export async function runUploadScreenshots(args: {
  sopId: string;
  byStep: Map<number, UploadEvent[]>;
}): Promise<Map<number, Screenshot[]>>;
```

The `pool` argument is **removed** (events already carry their `afterFramePath` directly).

For each event:

```ts
const frameId = newFrameId();
const r2Key = screenshotKey(sopId, stepIndex, frameId);
const highlight: Screenshot["highlight"] = { kind: event.kind, bbox: event.bbox };
const { buf, error } = await buildUploadBuffer(event.afterFramePath, highlight);
await putObject(r2Key, buf, "image/jpeg");
record = {
  frameId, r2Key, t: event.t, order: <position in step, 0..N-1 by event.time asc>,
  ...(event.caption ? { description: event.caption } : {}),
  // Match existing behavior: only persist highlight if the rectangle was actually drawn.
  ...(!error ? { highlight } : {}),
  ...(error ? { highlightError: error } : {}),
};
```

`order` is the event's zero-based index within its step (events already time-sorted in §5).

`buildUploadBuffer` and `rectSvg` are reused unchanged — they already handle drawing the yellow SVG rect onto the JPEG.

## 8. Orchestration: `src/trigger/processSopScreenshots.ts`

Replace the `assigning` + `uploading-screenshots` blocks:

```ts
// Stage 6 (was: assign per step).
await setStatus(_id, "assigning");
const byStepEvents = await runExtractClickEvents({
  steps: stepInputs.map(s => ({ stepIndex: s.stepIndex, tStart: s.tStart, tEnd: s.tEnd })),
  denseFrames: pool.denseFrames,
});
const captioned = await runCaptionClickEvents({
  byStep: byStepEvents,
  steps: stepInputs,
  language: language!,
});

// Convert to UploadEvent[] per step.
const uploadByStep = new Map<number, UploadEvent[]>();
for (const [stepIndex, evs] of captioned.entries()) {
  uploadByStep.set(stepIndex, evs.map(e => ({
    afterFramePath: e.afterFramePath,
    t: e.time,
    bbox: e.bbox,
    kind: e.kind,
    caption: e.caption,
  })));
}

// Stage 7: upload.
await setStatus(_id, "uploading-screenshots");
const screenshotsByStep = await runUploadScreenshots({
  sopId: _id.toHexString(),
  byStep: uploadByStep,
});
```

No new `SopStatus` values: reuse `"assigning"` and `"uploading-screenshots"` (the work is conceptually the same — assign frames to steps, then upload).

**ErrorCode:** if `detectClickEvents` throws, fail with the new error code `click_detect_failed`. Add to the `ErrorCode` enum in `src/lib/mongo.ts`. If only the captioning call fails (caught per-step), the pipeline continues.

## 9. What's removed from the pipeline

- `runAssignScreenshots` — no longer imported by `processSopScreenshots`. File stays for now; not deleted in this change.
- `validateHighlights.ts` — not imported anywhere after this change. File stays.
- `cursorDetect.ts` — exports still useful for tests/utilities; not imported by main pipeline.

Clean-up of dead files happens in a follow-up PR after smoke testing confirms the new pipeline works.

## 10. Edge cases & known compromises

| Case | Behavior | Acceptable? |
|---|---|---|
| Page navigation (whole screen changes) | Component too large → filtered out | Yes — page navs aren't precise clicks |
| Video playback within demo | Continuous change → steadiness rejects | Yes |
| Cursor blink in text field, no other change | Tiny diff → below minArea | Yes |
| Typing in a field (many small diffs) | Merged into one event, bbox covers field | Yes — desired result |
| Animated loader / spinner | Continuous → steadiness rejects | Yes |
| Modal dialog opens (large region) | Big diff → may exceed maxAreaFrac → filtered. | Acceptable |
| Fast double-click | Two events same place < mergeWindowSec → merged | Acceptable |
| Click triggering no visible change (tab focus) | No diff → no event | Acceptable |
| Step with no events | Empty `screenshots` array; SOP renders the step without imagery | Acceptable |
| Video has zero events total | Empty screenshots; SOP status still `done` | Acceptable |
| Last pair has no F_{i+2} for steadiness | Accept event (no data to reject) | Acceptable |

## 11. Files

| File | Change |
|---|---|
| `src/trigger/lib/clickEventDetect.ts` | NEW |
| `src/trigger/lib/clickEventDetect.test.ts` | NEW |
| `src/trigger/stages/buildFramePool.ts` | Return `denseFrames` in `FramePool` (no pHash) |
| `src/trigger/stages/extractClickEvents.ts` | NEW |
| `src/trigger/stages/captionClickEvents.ts` | NEW |
| `src/trigger/stages/uploadScreenshots.ts` | Replace input shape with `UploadEvent[]` per step; drop `pool` arg |
| `src/trigger/processSopScreenshots.ts` | Replace `runAssignScreenshots` block with new detection/caption/upload chain |
| `src/lib/schemas.ts` | Add `CaptionsOutput` |
| `src/lib/mongo.ts` | Add `"click_detect_failed"` to `ErrorCode` union |
| `src/config/index.ts` | Add `prompts.clickCaptionSystem` and `screenshots.clickDetect.*` opts |

## 12. Configuration

```ts
config.screenshots.clickDetect = {
  diffThreshold: 25,
  minAreaFrac: 0.003,
  maxAreaFrac: 0.20,
  minDensity: 0.20,
  steadinessThreshold: 0.30,
  mergeWindowSec: 1.5,
  mergeIouMin: 0.30,
  maxEventsPerVideo: 60,
  diffMaxEdge: 640,
};
```

## 13. Acceptance

**Automated:**
- Unit tests for `detectClickEvents`:
  - 3-frame synthetic: plant a localized 100×30 px rectangle change in middle pair → emits 1 event at correct time, bbox within ±3 px in downscaled coords.
  - 3-frame all-identical: emits 0 events.
  - 4-frame continuous diffuse change (simulating video): emits 0 events (steadiness rejects).
  - 5-frame with 3 small changes at same location 0.5s apart: merges to 1 event covering union bbox.
  - Frame with change > maxAreaFrac: rejected.
  - Last-pair event (no F_{i+2}): accepted.
- Unit tests for `bboxIou` and `mergeEvents` directly.
- Test for `runExtractClickEvents` step bucketing: half-open intervals; last step inclusive on right.
- `tsc --noEmit` clean.

**Manual smoke on `samples/hubspot_crm.mp4`:**
- 10–40 click events detected (the demo has ~30+ visible actions).
- Spot-check ≥ 8 surviving frames: bbox visually overlaps the UI element changed; caption matches the action.
- The 3 prior known-bad cases (YouTube intro idle frame, HubSpot hero hover, body-text hallucination) are GONE — these were idle frames; frame-diff doesn't fire on them.
- No bbox is visibly random or in body text.

## 14. Out of scope

- Highlighting cursor position itself (we highlight the change region instead).
- Pixel-perfect button bboxes (we get "what changed" — usually correct, sometimes a bit loose).
- Detecting keyboard shortcut–triggered changes that aren't on a UI element (still captured as events; will be classified by the LLM).
- Showing the cursor trail / animation.
- Cleaning up dead code (`assignScreenshots.ts`, `validateHighlights.ts`, `cursorDetect.ts`) — deferred to follow-up.
