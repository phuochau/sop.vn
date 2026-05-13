# CV Cursor Detection — Design

**Date:** 2026-05-13
**Status:** Approved (replaces the LLM-self-reported cursor from `2026-05-13-cursor-anchored-highlights-design.md`)

## 1. Problem

The LLM-self-reported cursor doesn't work as a validation anchor: when the LLM hallucinates a bbox, it also hallucinates a *consistent* cursor inside that bbox. The validator only catches LLM-internal contradictions, which are rare. We need an **independent** cursor signal — derived from the image itself, not from the LLM's reasoning.

## 2. Solution

Detect the cursor with **template matching** against macOS-style cursor sprites. Replace the LLM-reported cursor entirely. Validate every LLM bbox against the CV-detected cursor.

### 2.1 Cursor templates

Two templates, rendered from inline SVG via `sharp`:

- **arrow** — macOS pointer (default). Black fill, white outline, tip at top-left of bbox.
- **hand** — macOS link/click cursor. Pointing index finger.

Templates rendered grayscale at multiple scales (heights 12, 16, 20, 24, 28 px) to cover variation in screen-recording cursor size.

### 2.2 Matching

Hand-rolled **normalized cross-correlation** (NCC) over the downscaled frame (1280px max edge, same image fed to the vision LLM):

1. Load frame as grayscale via `sharp().grayscale().raw()`.
2. For each (template, scale) pair: slide template over image, compute NCC.
3. Return the (x, y, score) with the highest NCC across all templates and scales.
4. If best score < threshold (default 0.55), return `null` (no cursor visible).

Coordinates are top-left of the bbox; normalize to 0..1 against the frame's own dimensions. The "cursor tip" is taken to be at the template's tip offset (top-left for arrow, top of finger for hand).

Performance budget: ~50 ms per frame (small templates, downscaled image). Within trigger.dev task latency.

### 2.3 Pipeline change

`pickForStep`:
1. Call vision LLM as before (returns `index, description, highlight`).
2. For each pick with a non-null `highlight`, call `detectCursor(frame.localPath)` (parallel across picks).
3. If detector returns `null` → drop highlight.
4. If detected cursor falls outside the highlight bbox (5% margin, as before) → drop highlight.

Schema cleanup:
- Remove `cursor` field from `ScreenshotPicksOutput`.
- Remove cursor-reporting instructions from `screenshotPickSystem` prompt. Prompt now just asks "find the UI element the user is clicking/typing on" — the validator catches misses.
- `Cursor` type stays in `assignScreenshots.ts` (used by detector return + validator).

### 2.4 What this does NOT cover

- **Custom in-app cursors** (Guidde yellow, Loom dot). Templates target system cursors. Custom cursors → likely no detection → highlight dropped (acceptable: false negatives over false positives).
- **Hidden cursor frames** (mobile, screencasts with cursor off). Detector returns null → highlight dropped (correct behavior).
- **Cursor at extreme edge** of frame, partially cropped. Detector may miss. Acceptable.

## 3. Acceptance

- `detectCursor` returns coordinates within ±3 px (at the downscaled resolution) of a known-position cursor in a synthetic test image.
- `detectCursor` returns `null` for an image with no cursor (e.g., plain UI screenshot).
- All existing tests still pass.
- Smoke test on `hubspot_crm.mp4`: of the 5 previously-spot-checked frames, the 3 that previously failed (3akwjuzn2i, w3cw8473k3, ljwdxmn8cx) should now either show a correctly-aligned bbox **or no bbox at all**. Acceptable to lose some valid highlights — we prioritize precision over recall.
