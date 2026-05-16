# Bbox Precision Improvements — Design

**Date:** 2026-05-15
**Status:** Drafted, awaiting review
**Builds on:** `2026-05-13-hybrid-cursor-validation-design.md` (approved but never shipped — top-down rewrite dropped all cursor code in `a36eb8f`)

## 1. Problem

Current `runLocateHighlight` is a single VLM call on a frame downscaled to 1280px max edge. Five concrete failure modes observed on the HubSpot demo SOP:

| # | Symptom | Frame |
|---|---|---|
| 1 | Bbox hugs the "Get started free" text but cuts off the button's red background and padding | hero CTA |
| 2 | Underline-only input gets a zero-height bbox (the underline itself) | "First name" input |
| 3 | Same as #1 — text-tight, not button-tight | hero CTA variant |
| 4 | Box ends on the wrong element (Next half-rendered while cursor is over Skip) | "What tools do you use" Next/Skip |
| 5 | Box on a logo, cursor is over Contacts menu item | CRM Contacts dropdown |

Root cause: VLMs are imprecise at pixel coordinates and have no grounding signal beyond their own attention. Downscale-to-1280 throws away another 30-50% of spatial precision on 1920×1080 sources.

## 2. Solution

Three independent improvements layered onto the existing single VLM call:

- **D — Higher resolution input.** Cap at 1920px max edge instead of 1280px. ~2x token cost on this stage; effectively native for 1920×1080 sources.
- **A — Hybrid cursor validation gate (click verb only).** Port the previously-approved hybrid design forward. For `verb === "click"` only (not `select`, `input`, `link`, `view`): run a focused-cursor LLM call + CV verify in a narrow window. If both agree the cursor exists at point P AND VLM's bbox doesn't contain P (with tolerance), drop the highlight. Never auto-snap or move the bbox — only validate or drop.

  *Why click-only:* `select` targets (tiles, cards, options) are large areas where cursor-anywhere-inside is a weak signal; `input` and `link` often render in states where the cursor is hidden or off-target (typing, loading transitions). Only `click` reliably has a visible cursor on the targeted element.
- **B — Element-snap post-processing.** After VLM returns bbox, run edge-detection on the full-resolution frame in a window around the bbox. Snap to the dominant enclosing rectangular contour. For `verb === "input"` only: if VLM bbox height is suspiciously thin AND no border was detected by snap, apply a conditional min-height expansion around the detected underline / VLM-y center.

These are independent and additive. Each catches a different failure mode.

## 3. Detailed design

### 3.1 D — Resolution

`DOWNSCALE_MAX_EDGE` in `locateHighlight.ts` changes from `1280` to `1920`. Move the literal into `config.screenshots.locateHighlight.downscaleMaxEdgePx` for tunability. No prompt change.

**Shared-resolution invariant.** All three vision operations — VLM bbox call, focused-cursor LLM call, and CV `verifyCursorInWindow` — operate on the **same 1920-capped JPEG**, written once into the stage's tmp directory and passed by path to each. This guarantees that bbox coords, LLM cursor coords, and CV cursor coords all share the same image-space and are directly comparable.

### 3.2 A — Hybrid cursor validation (click verb only)

**Scope clarification from prior hybrid spec:** original applied to *all* highlights. New scope: only `verb === "click"` (see §2 rationale).

**Flow inside `runLocateHighlight`:**

```
raw = VLM bbox call (existing, against 1920-capped frame)
if raw.highlight === "no" → return raw (view / no_specific_target / non_ui_frame untouched)
if verb === "click":
   cursor_claim = await focusedCursorLlm(framePath)
   if cursor_claim === null → drop (see "drop semantics" below) with reason "cursor_not_found"
   cv = await verifyCursorInWindow(framePath, cursor_claim.x, cursor_claim.y)
   if cv === null → drop with reason "cursor_not_found"
   if !bboxContainsPoint(raw.bbox, cv, tolerance=config...bboxToleranceFrac) → drop with reason "cursor_outside_bbox"
// surviving highlights then pass through to B (snap)
```

**Drop semantics.** "Drop" means: produce a `HighlightDecision` with `highlight: "no"`, `bbox: null`, `elementCaption: null`, and the listed `noHighlightReason`. The screenshot itself is kept and the substep proceeds — only the yellow rectangle is omitted.

**New schemas (`src/lib/schemas.ts`):**

```ts
export const CursorPoint = z.object({ x: z.number(), y: z.number() });
export const FocusedCursorOutput = z.object({
  cursor: CursorPoint.nullable(),
});
```

Single-frame (not batched) because top-down pipeline already invokes `locateHighlight` per substep.

**New prompt (`config.ai.prompts.focusedCursorSystem`):** single-frame variant of the hybrid spec §2.2:

> You are a precise visual locator. Find the mouse cursor in the image — the actual rendered pointer (arrow, pointing hand, I-beam, or custom). Report the cursor's tip point (where a click lands) as normalized 0..1 coordinates against the image dimensions.
>
> Return: `{ "cursor": { "x": <0..1>, "y": <0..1> } }` if a cursor is clearly visible, or `{ "cursor": null }` otherwise.
>
> Rules:
> - If you do not clearly see a cursor (hidden, off-screen, mobile/touch demo with no cursor rendered, mid-transition frame), return `cursor: null`.
> - Do NOT guess. Do NOT default to a screen center or a UI element. Return `null` when uncertain.
> - Do NOT consider what UI element the cursor is on. Only the cursor's pixel location.
>
> Return strict JSON only.

No language parameter — output is purely numeric.

**CV templates (`src/trigger/lib/cursorDetect.ts` — new file, resurrected):**
- Arrow (16×22 SVG, tipX=1, tipY=1)
- Hand (22×22 SVG, tipX=11, tipY=1)
- Rasterized at heights [18, 22, 26]
- NCC via grayscale raw buffer

**Narrow-window verify:** `verifyCursorInWindow(framePath, cx, cy, opts)` with `windowFrac = 0.08`, `threshold = 0.55` — same parameters as hybrid spec §2.3.

**Bbox-contains-point tolerance:** 2% of image extent on each side. Allows VLM bbox to be slightly off without dropping correct picks.

**New drop reasons (HighlightDecision schema):**

```ts
noHighlightReason: z.enum([
  "view_action",
  "no_specific_target",
  "non_ui_frame",
  "cursor_not_found",       // NEW — focused cursor LLM OR CV verify returned null
  "cursor_outside_bbox",    // NEW — cursor detected but not inside VLM bbox
]).nullable(),
```

The `locateHighlightSystem` prompt is **not updated**: the VLM never emits the two new reasons. They are produced only by post-processing in `runLocateHighlight`, which constructs the `HighlightDecision` directly. The VLM-facing JSON-schema enum gains new values it'll never use; this is harmless.

**Focused-cursor LLM knobs:** same as the bbox call — `model: config.ai.visionModel`, `temperature: 0.0`, `schemaName: "focused_cursor"`, system prompt from `config.ai.prompts.focusedCursorSystem`.

**Cursor check operates on the raw VLM bbox** (before snap in §3.3). Snap may move bbox sides outward; the cursor decision uses the original bounds.

**`bboxContainsPoint(bbox, point, tolerance)` semantics:**
1. Clamp bbox to `[0, 1]` on each side (handles VLM returning slight overshoot).
2. Compute expanded bounds: `x0 = bbox.x - tolerance`, `x1 = bbox.x + bbox.w + tolerance` (and same for y). No re-clamp after expansion — tolerance can push expanded bounds outside `[0,1]`; that's intentional.
3. Return `point.x ∈ [x0, x1] && point.y ∈ [y0, y1]`.

Cursor checks fail-safe: any thrown error in `focusedCursorLlm` or `verifyCursorInWindow` is caught, logged, and treated as "no cursor check applied" — fall through to B without dropping. Drop only on explicit `null` returns.

### 3.3 B — Element-snap post-processing

Applied to every surviving highlight (any non-`view` verb), only when a non-null bbox exists after §3.2. Operates on the same 1920-capped JPEG from §3.1.

**Coordinate handling.** Bbox is stored normalized (0..1). Snap converts to pixel space, operates there, then converts back. All thresholds (`minEdgeMovePx`) are in pixel space; all bounded fractions (`searchExpansionFrac`, `maxOutwardExpansionFrac`, `inputMinHeightFrac`) are relative to the corresponding image dimension.

**Approach:** sharp + simple edge detection (no OpenCV dep).

1. Convert bbox to pixel space using image dimensions read via `sharp().metadata()`.
2. Expand bbox by `searchExpansionFrac` (15%) on each side, clamped to frame bounds — the "search region."
3. `sharp().extract(searchRegion).grayscale().convolve(sobelX|sobelY)` → edge magnitude image.
4. Threshold edges: pixels with magnitude ≥ `0.25 × max_magnitude_in_region` are "edge pixels."
5. For each of the 4 bbox sides, scan outward 1 pixel at a time (up to `maxOutwardExpansionFrac` = 20% of frame dimension):
   - On each scan line parallel to the side, count edge pixels falling within ±1px of that line.
   - A line "qualifies" if its edge-pixel count ≥ `0.6 × side_length_pixels`.
   - Stop at the **first** (nearest) qualifying line, not the strongest. Scan increments by 1 px so two qualifying lines cannot share a scan position — no tie-breaking needed.
6. For each side: if a qualifying line found AND its distance from VLM edge ≥ `minEdgeMovePx` (2px), move that side. Otherwise leave it.
7. Convert resulting pixel bbox back to normalized 0..1.

Record `borderFound = (any side moved)` for use by the input min-height gate. Snap never *shrinks* the bbox below the VLM original on a given side — only expands outward to find the element's true edge.

**Input min-height fallback — explicit gating:**

```
apply_floor =
  verb === "input"
  AND borderFound === false              // snap did not lock onto any rectangle
  AND post_snap_bbox.h_normalized < inputMinHeightFrac
```

When `apply_floor` is true: expand symmetrically around bbox vertical center to `inputMinHeightFrac` (e.g., 0.025 ≈ 27px on 1080p). Width unchanged.

Edge-clamp behavior: if symmetric expansion would push the top above 0 or bottom below 1, **shift the floor-height window** rather than truncate — i.e., snap the window flush against the offending edge while preserving the full `inputMinHeightFrac` height. The floor is a minimum, not a maximum.

Rationale for each gate: `verb === "input"` because only inputs render as underline-only; `!borderFound` because a snap-locked input already has the correct geometry; thin-bbox check because a normally-rendered input already passes the floor.

**Config (`config.screenshots.locateHighlight`):**

```ts
locateHighlight: {
  downscaleMaxEdgePx: 1920,
  snap: {
    searchExpansionFrac: 0.15,
    maxOutwardExpansionFrac: 0.20,
    minEdgeMovePx: 2,
  },
  inputMinHeightFrac: 0.025,
  cursor: {
    windowFrac: 0.08,
    ncc: { threshold: 0.55 },
    bboxToleranceFrac: 0.02,
  },
},
```

### 3.4 Pipeline trace additions

`PipelineTraceDoc` (the per-substep type in `src/lib/pipelineTrace.ts:7`, stored in collection `sop_pipeline_traces`) gains two optional fields:

```ts
cursorCheck?: {
  applied: boolean;       // false when verb !== "click" or bbox was already null
  llmCursor: { x: number; y: number } | null;
  cvCursor: { x: number; y: number; score: number } | null;
  bboxContained: boolean | null;   // null if check didn't reach this stage
  outcome: "passed" | "dropped_no_cursor_llm" | "dropped_no_cv" | "dropped_outside_bbox" | "errored" | "skipped";
};
snap?: {
  ran: boolean;           // true if a non-null bbox entered §3.3
  edgesMovedPx: { top: number; right: number; bottom: number; left: number };
  borderFound: boolean;   // any side moved
  inputMinHeightApplied: boolean;
};
```

Read via `scripts/inspect-trace.mjs` (extend its per-substep dump).

**Surfacing trace from `runLocateHighlight`.** Current signature returns `Decision`. Spec extends it to:

```ts
export type LocateHighlightResult = {
  decision: Decision;
  trace: { cursorCheck: CursorCheckTrace; snap: SnapTrace };
};
export async function runLocateHighlight(args: ...): Promise<LocateHighlightResult>;
```

Caller (`processSopScreenshots`) reads `result.decision` for the pipeline value and `result.trace` to construct the new `PipelineTraceDoc.cursorCheck` / `.snap` fields. This is an additive return-shape change, not a callback, to match the style of the existing pipeline.

## 4. Files changed

| File | Change |
|---|---|
| `src/lib/schemas.ts` | `CursorPoint`, `FocusedCursorOutput`; extend `HighlightDecision.noHighlightReason` enum. |
| `src/config/index.ts` | `prompts.focusedCursorSystem`; new `screenshots.locateHighlight` config block. |
| `src/trigger/lib/cursorDetect.ts` | **New (resurrected).** SVG templates, NCC matcher, `verifyCursorInWindow`. |
| `src/trigger/stages/locateHighlight.ts` | Wire cursor validation (click only), wire snap, wire input min-height. Bump resolution. Change return type to `LocateHighlightResult`. |
| `src/trigger/stages/locateHighlight.test.ts` | Update existing tests to read `result.decision` instead of bare `Decision`. New tests per §5. |
| `src/trigger/processSopScreenshots.ts` | Adapt call site to new return shape. Specifically: `const highlight = await runLocateHighlight(...)` at L277 becomes `const result = await runLocateHighlight(...)`; the `highlight.highlight` read at L294 becomes `result.decision.highlight`; the `buildAction({ highlight, ... })` call at L300 passes `result.decision`. Merge `result.trace.cursorCheck` / `result.trace.snap` into the `PipelineTraceDoc` build. |
| `src/lib/pipelineTrace.ts` | Add optional `cursorCheck?` and `snap?` fields to `PipelineTraceDoc`. |
| `scripts/inspect-trace.mjs` | Dump new trace fields when present. |

## 5. Acceptance

**Automated:**
- All existing tests pass.
- New unit tests:
  - `verifyCursorInWindow`: planted cursor inside window (returns coords ±3px), no cursor (returns null), window-too-small (returns null).
  - `runLocateHighlight` (mocked): click+cursor-llm-null → drops with reason `cursor_not_found`; click+cv-null → drops with `cursor_not_found`; click+cursor-outside-bbox → drops with `cursor_outside_bbox`; click+cursor-inside-bbox → keeps; click+raw-highlight-already-`no` → cursor check skipped (no LLM call wasted); input/select/link → cursor check skipped (cursorCheck.outcome === "skipped"); view → fully unchanged (existing coerceForViewVerb path); cursor-llm-throws → check errored, bbox preserved.
- `bboxContainsPoint`: point exactly on right edge + tolerance → contained; point one fractional unit beyond tolerance → not contained; bbox with `x+w > 1` clamped before contain-check.
- Snap edge cases: bbox already touching frame edge (extract clamps, no out-of-bounds error); snap finds no qualifying edge → no movement, `borderFound=false`.
- Input floor short-circuit: thin bbox but `borderFound===true` → floor NOT applied (snap is trusted).
  - Snap: synthetic frame with a clear rectangle, VLM bbox 10px inside → snaps to rectangle; VLM bbox already on rectangle → no movement.
  - Input min-height: thin input bbox → expanded to floor; normal input bbox → untouched.
- `tsc --noEmit` clean, `npm test` green.

**Manual smoke (`samples/trimmed-hubspot_crm.mp4`):**
- Re-run pipeline. Inspect each step's screenshots.
- Cases 1, 3 (button-text-only): bbox now covers the button background (snap caught a border).
- Case 2 (underline input): bbox expanded to `inputMinHeightFrac` around the underline (input min-height gate fired).
- Case 4 (Next/Skip): cursor gate drops the highlight (cursor is over Skip, VLM bbox on Next → cursor_outside_bbox).
- Case 5 (logo vs Contacts): cursor gate drops the highlight (cursor_outside_bbox).
- No more than 1 false-positive drop across the SOP (correctly-placed highlight dropped by cursor gate).

## 6. Cost & latency

- Per substep with click verb: +1 LLM call (Gemini Flash, ~$0.001). ~5 click substeps/video → +$0.005/video.
- Per substep CV: ~10ms.
- Per substep snap: ~30ms (sharp convolve on a small crop).
- Resolution bump: ~2x bbox-call tokens. ~$0.002 → $0.004/substep → +$0.01/video.
- **Total added cost per video: ~$0.02. Added latency: ~3s wallclock.**

## 7. Out of scope

- Replacing SVG templates with real macOS pointer PNGs.
- Per-platform cursor sprites (Windows, Linux).
- Two-pass VLM bbox refinement (zoom & re-prompt).
- OCR cross-check of `elementCaption` against bbox content.
- Backfill of prior SOPs.
- Custom in-app cursors (Guidde, Loom screen recordings with hidden OS cursor).
