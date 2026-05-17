# Classifier Full-Frame Context — Design

**Date:** 2026-05-17
**Status:** Approved (brainstorming)

## Problem

End-to-end verification of the restored bottom-up screenshot pipeline found that
screenshots, descriptions, and yellow-circle highlights are frequently
inconsistent — 5 of 8 sampled screenshots were wrong:

- Spurious screenshots kept: a chat-widget bubble captioned "consult button"; a
  loading screen ("Building your tailored set-up") captioned "create account
  button"; a mid-fade transition frame.
- Wrong captions: a role-picker screen captioned "Next button"; a "What tools
  do you use?" screen captioned "26 to 50 button".
- The yellow circle then lands on the wrong element, because `highlightActions`
  feeds the wrong caption to UI-TARS as the grounding intent.

### Root cause

`classifyStepWithLLM` is the keep/discard + caption gate. For each detected
event it sends the LLM a **crop** — `cropMultiplier: 3 ×` the changed-pixel
region, roughly a third of the screen (`classifyStepWithLLM.ts:199-207`). The
LLM cannot see the whole screen, so it:

- cannot recognise incidental UI (chat widget), loading screens, or
  transition/fade frames, and therefore fails to discard them;
- cannot read the page heading, and therefore captions inaccurately.

The wrong caption is then amplified into a wrong circle by `highlightActions`,
which grounds UI-TARS on `action.description`. One root cause, three symptoms.

A second contributing factor — `clickEventDetect` firing on incidental
animations in the first place — is **out of scope** (see Scope); a reliable
classifier gate makes that detection noise harmless (it just gets discarded).

## Goal

Make `classifyStepWithLLM` discard spurious events and caption accurately by
giving it **full-screen context** instead of a crop.

## Approach

Replace the per-event crop with the **full before/after frame, with the
detected change region drawn on it as a marker box**. The LLM gains full screen
context for its discard and caption decisions, and the marker tells it
unambiguously which element each event is about.

Rejected alternatives:
- *Full frame + crop, both* — 4 images per candidate, ~2× image tokens.
- *Full frame + diff bbox as text coordinates* — relies on the model mentally
  mapping normalized coords; a drawn marker points more reliably.

## Components

### 1. `markRegion` — new helper

New file `src/trigger/lib/markRegion.ts`, exporting:

```ts
markRegion(srcFramePath: string, bbox: { x: number; y: number; w: number; h: number }, outPath: string): Promise<void>
```

Draws an outlined rectangle at `bbox` (normalized 0..1) onto the full frame at
`srcFramePath` and writes the result to `outPath`. The outline color is
**magenta (`#FF00FF`)** — deliberately not yellow, so the marker is never
confused with the yellow-circle highlight. Implementation: `sharp` composite of
an SVG sized to the frame's pixel dimensions, with a stroked `<rect>` (no fill)
at `bbox × {W,H}`. The stroke is a few pixels wide so it is visible on a
1280px-wide frame.

### 2. `classifyStepWithLLM.ts` rework

`classifyAndRemap`:
- **Remove the crop.** Delete the `computeCropWindow` + `sharp().extract(...)`
  crop extraction and the `diffBboxInCrop` computation.
- For each event, call `markRegion` twice — on `e.beforeFramePath` and
  `e.afterFramePath`, using `e.bbox` (the diff bbox `clickEventDetect` already
  produces) — writing `beforeMarkedPath` / `afterMarkedPath` into the temp dir.
- **Remove the bbox mapping.** Delete `cropBboxToFullFrame` / `padBbox` and the
  `fullBbox` computation. `ClassifiedActionRecord` drops its `fullFrameBbox`
  field; the type becomes `ClassifiedCandidate & { beforeFramePath: string;
  afterFramePath: string }`.
- **Keep** the cross-screen `displayFrame` guard (`hashOf` before/after, force
  `before` on navigation) — it is unrelated to crops and still correct.
- **Keep** the montage (`buildMontage`, `nearestCluster`, `screenCluster`) —
  it gives cross-candidate screen-name consistency at low cost.

`CandidateForLLM` type: replace `diffBboxInCrop`, `beforeCropPath`,
`afterCropPath` with `beforeMarkedPath` / `afterMarkedPath`. `index`, `time`,
`kindHint`, `screenCluster` stay.

`defaultClassifier`: drop the `diffBboxInCrop=(…)` text line (the marker is now
visual); send `beforeMarkedPath` / `afterMarkedPath` as the per-candidate
images. The montage-first / candidates-after ordering is unchanged.

`chunkCandidatesBySort` is unchanged (it sorts on `screenCluster` / `time`
only).

### 3. `ClassifiedCandidate` schema (`src/lib/schemas.ts`)

Remove the `bbox: BBox.nullable()` field. The classifier no longer outputs a
bounding box (point-based highlight; the bbox was dead — nothing consumed
`fullFrameBbox`). The schema becomes: `index`, `decision`, `verb`, `screenName`,
`screenCluster`, `elementCaption`, `displayFrame`, `discardReason`.

### 4. `classifyStepSystem` prompt (`src/config/index.ts`)

Rewrite to match the new input and tighten discards:
- Input description: each candidate has a **full BEFORE frame and full AFTER
  frame, with the detected change region outlined in magenta** — instead of
  "BEFORE crop / AFTER crop / diff bbox in crop".
- Remove the `bbox` output instruction (item 2's bbox bullet).
- Keep all other output fields (`decision`, `verb`, `screenName`,
  `screenCluster`, `elementCaption`, `displayFrame`, `discardReason`).
- Strengthen the discard guidance — now that the LLM sees whole screens, it can
  and must discard: **incidental product chrome** (chat-widget bubbles,
  cookie/consent banners, notification toasts), **loading / progress screens**
  (spinners, "setting up…" pages with no user control), and **mid-transition /
  fade frames** (a frame caught while the screen is animating between states).
  These map to the existing `discardReason` enum values `animation`,
  `transition`, `not_a_ui` — no schema change to `discardReason`.

### 5. Config cleanup (`src/config/index.ts`)

The `screenshots.ground` block (`cropMultiplier`, `cropMinPx`, `cropMaxFrac`,
`bboxPadPx`, `perStepConcurrency`) is now fully dead — every key was read only
by the crop/bbox code being removed (verified: `grep` for `screenshots.ground`
shows only the four crop/bbox call sites in `classifyStepWithLLM.ts`, and
`ground.perStepConcurrency` has no reader at all). Delete the whole `ground`
block. The `screenshots.classify` block stays (`maxCandidatesPerCall` is live).

### 6. Delete `cropEvent.ts`

`src/trigger/lib/cropEvent.ts` (`computeCropWindow`, `diffBboxInCrop`,
`cropBboxToFullFrame`, `padBbox`, `Bbox`) was imported only by
`classifyStepWithLLM.ts` (verified). After the rework nothing imports it.
Delete `cropEvent.ts` and `cropEvent.test.ts`.

## Data flow

```
ClickEvent (has e.bbox, e.beforeFramePath, e.afterFramePath)
  → markRegion(beforeFramePath, e.bbox) → beforeMarkedPath   (full frame, magenta box)
  → markRegion(afterFramePath,  e.bbox) → afterMarkedPath
  → classifyStepWithLLM: LLM sees montage + per-candidate marked full frames
  → ClassifiedCandidate { decision, verb, screenName, elementCaption, displayFrame, ... }   (no bbox)
  → ClassifiedActionRecord { ...candidate, beforeFramePath, afterFramePath }   (no fullFrameBbox)
  → buildActionsForStep → Action[]   (unchanged — already never read fullFrameBbox)
  → highlightActions → correct caption → correct UI-TARS point
```

## Testing

- **`markRegion`** — new `markRegion.test.ts`: call it on the fixture
  `src/trigger/stages/__fixtures__/sample-1080p.jpg` with a known bbox; assert
  the output file is a valid JPEG with the same pixel dimensions as the input
  (the marker must not resize the frame).
- **`classifyStepWithLLM.test.ts`** — update the `CandidateForLLM` fixtures to
  the new shape (`beforeMarkedPath` / `afterMarkedPath`, no `diffBboxInCrop` /
  crop paths). The `chunkCandidatesBySort` tests are unaffected. The
  injected-classifier test keeps its structure; only the candidate object shape
  changes.
- **`buildActionsForStep.test.ts`** — its `ClassifiedActionRecord` factory
  currently sets `bbox` and `fullFrameBbox`; remove both fields (they no longer
  exist on the type). `buildActionsForStep.ts` itself is unchanged — it already
  never read `fullFrameBbox`.
- **Typecheck** — `npx tsc --noEmit -p tsconfig.json` clean after the change.
- Tests run with `node:test` via `npx tsx --test <file>`.

## Verification (manual)

Re-run the pipeline on `samples/trimmed-hubspot_crm.mp4`. Re-fetch the
screenshots and confirm: the chat-widget bubble and loading screens are no
longer emitted as steps; each kept screenshot's description matches the screen
shown; and the yellow circle sits on the element the description names. Compare
against the 5/8-broken baseline from the triage.

## Scope

**In scope:** new `markRegion.ts` + test; `classifyStepWithLLM.ts` rework;
`ClassifiedCandidate` schema (`schemas.ts`, drop `bbox`); `classifyStepSystem`
prompt rewrite + `ground` config-block deletion (`config/index.ts`); delete
`cropEvent.ts` + `cropEvent.test.ts`; update `classifyStepWithLLM.test.ts` and
the `buildActionsForStep.test.ts` factory for the type changes.

**Out of scope:**
- `clickEventDetect.ts` — the detector still fires on incidental animations;
  the strengthened classifier discards them, which is sufficient.
- `extractClickEvents.ts`, `classifyAndMergeEvents.ts`, `buildActionsForStep.ts`
  logic, `highlightActions.ts`, `processSopScreenshots.ts`, `screenId.ts`,
  `runLocateHighlight` — unchanged.
- The 6-frame montage — kept as-is.

## Known consideration

Sending full 1280px frames (two per candidate) instead of ~400px crops
increases image tokens per classifier call. This is an accepted cost — the
classifier batches candidates (`maxCandidatesPerCall`), and correctness is the
priority. If cost becomes a concern, downscaling the marked frames before
sending is a follow-up tuning knob, not part of this spec.
