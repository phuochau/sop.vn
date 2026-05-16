# Point-Highlight Design

**Date:** 2026-05-16
**Status:** Design — awaiting review
**Supersedes:** `2026-05-15-bbox-precision-improvements-design.md` and its plan
(the box-precision approach was investigated and abandoned — see Background).

## Goal

Replace the `locateHighlight` stage's loose, unstable yellow **bounding box**
with a precise, stable **point highlight** — a "click here" circle marker placed
on the element the step interacts with.

## Background — why a point, not a box

A long investigation (see memory `bbox-highlighter-investigation`) measured box
accuracy against a hand-labelled ground-truth set. ~12 approaches (LLM grid
prompting, three CV snappers, four grounding models across two providers,
prompt/loop tuning) all converged at **mean IoU ~0.6** for the box, and the
output was unstable run-to-run. Pixel-tight boxes are not achievable from
finished video.

However, **UI-TARS** (`bytedance/ui-tars-1.5-7b`, a GUI-grounding model) returns
a *click point* that landed inside the correct element **31/31** across two test
sets — 100% hit rate, median 24px from centre. The point is reliable; the box is
not. A fallback, **Qwen3-VL-32B** (`qwen/qwen3-vl-32b-instruct`, different
provider), scored 14/14 on the same metric.

Decision (with the user): ship a point-based highlight.

## Architecture

```
runLocateHighlight (stage)
  └─ downscale frame to 1280px
  └─ pointHighlighter
       ├─ 1. UI-TARS         → click point   (primary)
       ├─ 2. Qwen3-VL-32B    → click point   (fallback, only if #1 fails)
       └─ 3. none            → highlight=no  (safe degradation)
  └─ HighlightDecision { highlight, point, ... }

runUploadScreenshots (stage)
  └─ buildBufferWithOptionalHighlight(framePath, highlight)
       └─ point present → draw circle marker, bake into JPEG
```

The locator only **identifies a point**; the renderer turns it into the visible
marker. UI-TARS and Qwen3-VL each map to one well-defined function with a
normalized-point output, testable in isolation.

## Components

### 1. Grounding clients — `src/lib/grounding.ts` (new)

Two functions, one per model, both returning a frame-normalized point or null.

```ts
export type Point = { x: number; y: number }; // 0-1, normalized to the frame

// UI-TARS: free-form "(x,y)" reply in ABSOLUTE pixels, no JSON support.
export async function uiTarsPoint(args: {
  framePath: string; intent: string; verb: string;
  frameW: number; frameH: number; model: string;
}): Promise<{ point: Point | null; raw: string }>;

// Qwen3-VL: structured JSON, coordinates on a 0-1000 scale.
export async function qwenPoint(args: {
  framePath: string; intent: string; verb: string; model: string;
}): Promise<{ point: Point | null }>;
```

Ported from the validated prototypes `scripts/bbox-proto/uitars.ts` and
`scripts/bbox-proto/pointGrounding.ts`. `uiTarsPoint` calls OpenRouter directly
(no `response_format` — UI-TARS ignores it) and parses `(x,y)` with a regex.
`qwenPoint` uses the existing `llmJsonVision` with a `{found,x,y}` schema.

### 2. Point highlighter — in `src/trigger/stages/locateHighlight.ts`

A new `defaultHighlighter` implementing the fallback chain:

```
try uiTarsPoint
  point found?  -> return highlight=yes, point
  no point / threw?
    try qwenPoint
      point found?  -> return highlight=yes, point
      no point / threw?
        -> return highlight=no, noHighlightReason
```

- A model "fails" if it throws (network/provider error) **or** returns no point.
- `noHighlightReason`: no element found by either model → `no_specific_target`;
  both models *errored* (outage) → new value `grounding_unavailable`.
- `coerceForViewVerb` is unchanged — `view` steps still short-circuit to
  `highlight=no` before any model call.
- The pluggable `HighlighterFn` seam is kept for tests.

### 3. Circle renderer — in `src/trigger/stages/uploadScreenshots.ts`

New `circleSvg(W, H, point)` producing the marker: a soft outer halo, a bold
ring, and a centre dot, in the existing highlight colour `#F5C518`. Radius
scales with image width (~1.6% of W for the ring).

`buildBufferWithOptionalHighlight` is widened to accept a highlight geometry:

```ts
type HighlightGeom = { point: Point } | { bbox: BBox } | null;
buildBufferWithOptionalHighlight(localPath, geom): Promise<{ buf, error }>
```

- `point` → draw circle (new path).
- `bbox` → draw rect via existing `rectSvg` (kept so previously-stored SOPs and
  any non-pipeline callers still render).
- `null` → un-annotated frame.

The marker is baked into the JPEG, exactly as the box was.

### 4. Schema — `src/lib/schemas.ts`

```ts
export const Point = z.object({ x: z.number(), y: z.number() });

export const HighlightDecision = z.object({
  highlight: z.enum(["yes", "no"]),
  point: Point.nullable(),          // NEW — primary geometry
  bbox: BBox.nullable(),            // kept, deprecated; new locator sets null
  elementCaption: z.string().nullable(),
  noHighlightReason: z
    .enum(["view_action", "no_specific_target", "non_ui_frame",
           "grounding_unavailable"])  // NEW value added
    .nullable(),
});
```

`Action.highlight` and the Mongo `Screenshot/step.highlight` object gain an
optional `point` field next to `bbox`. `buildAction.ts` carries `point` through
when `highlight=yes`.

### 5. Config — `src/config/index.ts`

```ts
ai: {
  pointPrimaryModel: "bytedance/ui-tars-1.5-7b",
  pointFallbackModel: "qwen/qwen3-vl-32b-instruct",
  ...
}
```

## Coordinate handling

- The stage downscales the frame to 1280px max edge before grounding (unchanged
  — keeps cost down; 1280px is ample for grounding).
- UI-TARS replies in **absolute pixels of the image it received**. `uiTarsPoint`
  is given that image's width/height and divides to get a 0-1 point.
- Qwen3-VL replies on a **0-1000 scale**; `qwenPoint` divides by 1000.
- Both yield a frame-normalized `{x,y}` in 0-1, resolution-independent — so it
  maps correctly onto the full-resolution `displayFramePath` at render time
  regardless of the downscale.
- The point is clamped to [0,1].

## Error handling & degradation

| Situation | Behaviour |
|---|---|
| `verb === "view"` | `highlight=no`, reason `view_action` (no model call) |
| UI-TARS finds a point | use it |
| UI-TARS errors or finds nothing | try Qwen3-VL |
| Qwen3-VL finds a point | use it |
| Both find nothing | `highlight=no`, reason `no_specific_target` |
| Both error (outage) | `highlight=no`, reason `grounding_unavailable` |
| Circle draw fails | upload un-annotated frame, set `highlightError` (existing behaviour) |

The step always renders — a missing highlight never blocks the SOP.

## Testing

- `grounding.test.ts` — `uiTarsPoint` regex parsing (incl. absolute-pixel
  scaling), `qwenPoint` 0-1000 conversion, null/clamp cases, with mocked fetch.
- `locateHighlight.test.ts` — extend: fallback chain (UI-TARS fails → Qwen used),
  both-fail reasons, `view` short-circuit, via injected `HighlighterFn` /
  mocked grounding clients.
- `uploadScreenshots.test.ts` — extend: `circleSvg` geometry, point vs bbox vs
  null branch in `buildBufferWithOptionalHighlight`.
- The `scripts/bbox-gt/` harness and ground-truth set remain as the regression
  benchmark for any future locator change.

## Out of scope

- `src/trigger/lib/cropEvent.ts` (`padBbox`) — not referenced by the highlight
  pipeline; left untouched.
- Re-rendering or migrating previously-stored SOPs — `bbox` is retained in the
  schema so old records still render; no migration.
- Animated/pulsing markers for video output — the static circle ships first.
- Removing the `bbox` field entirely — deferred; deprecate-in-place for now.

## File-change summary

| File | Change |
|---|---|
| `src/lib/grounding.ts` | **new** — `uiTarsPoint`, `qwenPoint` |
| `src/lib/schemas.ts` | add `Point`, `HighlightDecision.point`, new reason |
| `src/trigger/stages/locateHighlight.ts` | new fallback-chain `defaultHighlighter` |
| `src/trigger/stages/uploadScreenshots.ts` | `circleSvg`, widened renderer |
| `src/trigger/stages/buildAction.ts` | carry `point` into `Action.highlight` |
| `src/lib/mongo.ts` | `highlight.point` field |
| `src/config/index.ts` | `pointPrimaryModel`, `pointFallbackModel` |
| `*.test.ts` | new + extended tests as above |
