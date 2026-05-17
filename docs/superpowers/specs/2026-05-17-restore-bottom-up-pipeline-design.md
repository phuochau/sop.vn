# Restore Bottom-Up Screenshot Pipeline — Design

**Date:** 2026-05-17
**Status:** Approved (brainstorming)

## Problem

The video-to-SOP "screenshots" pipeline produces too few sub-steps. A recent
run of `samples/trimmed-hubspot_crm.mp4` yielded steps with `[4,1,1,4,5,7]`
screenshots — some steps reduced to a single screenshot, losing real actions.

Screenshot counts per SOP, by date (from the `sops` collection):

| Date | Pipeline | Screenshots/SOP |
|------|----------|-----------------|
| ≤ May 13 | bottom-up (event detection) | 53–78 |
| May 14+ | top-down (LLM plan → pick → verify) | 13–24 |

On 2026-05-14 commit `6a3da48` deleted the **bottom-up** pipeline and replaced
it with the **top-down** pipeline. The top-down pipeline plans sub-steps from
narration, then drops candidates at three gates (`plan.low_confidence_dropped`,
`pick.no_match`, `verify.no`). It over-drops: it discards real actions the
narration does not explicitly call out.

The bottom-up pipeline detected actions directly from the video by image-diffing
frames, so it found the real granularity of interactions. The user wants that
splitting behaviour back.

This is **not** about the highlight style. The highlight is — and stays — a
yellow-circle "click here" point produced by UI-TARS. The bottom-up pipeline is
wanted purely for its step / sub-step splitting.

## Goal

Replace the top-down screenshot pipeline middle (plan → pick → verify) with the
restored bottom-up pipeline middle (event detection → classify → assemble),
while keeping the existing yellow-circle point-highlight stage unchanged.

## Architecture

The screenshots pipeline keeps its shared front half and the point-highlight
back end. Only the action-extraction middle changes.

```
transcribe → normalize → context → extract → buildFramePool      (stages 1-5, shared, unchanged)
  → extractClickEvents      CV frame-diff → detected events per step  (the splitter)
  → classifyAndMergeEvents  click vs input; merge typing sessions
  → classifyStepWithLLM     LLM keep/discard + caption + element intent per event
  → highlight pass          per kept action: runLocateHighlight → yellow-circle point
  → buildActionsForStep     assemble Action[] (highlight = { kind, point })
  → uploadScreenshots       renders the circle (already supports point geom)   (unchanged)
```

### Bottom-up vs top-down

- **Top-down (current, to be removed):** `planStep` asks an LLM to enumerate
  sub-steps from narration; `pickFrame` picks a screen cluster; `verifyFrame`
  confirms. Each stage drops candidates. Result: too few sub-steps.
- **Bottom-up (to be restored):** `extractClickEvents` diffs adjacent frames
  and finds the largest changed-pixel blob per frame pair — a real UI event.
  Events are assigned to steps, classified click-vs-input, and an LLM keeps the
  meaningful ones. Result: granularity that matches the actual interactions.

### The diff bbox is internal only

`clickEventDetect` produces a bbox (the changed-pixel region) per event. That
bbox is used **only** for event detection and for cropping the event region
for `classifyStepWithLLM`. **It is never drawn.** The highlight is always the
yellow-circle point from `runLocateHighlight` (UI-TARS → Qwen3-VL → `circleSvg`).

## Components

### Restored faithfully (minimal change)

These are restored from git (`git show 6a3da48~1:<path>`) and reconciled
against current types, but their logic is unchanged:

- **`src/trigger/lib/clickEventDetect.ts`** — CV frame-diff event detection
  (`detectClickEvents`, `mergeEvents`, `bboxIou`, `ClickEvent` type).
- **`src/trigger/stages/extractClickEvents.ts`** — `runExtractClickEvents`:
  assigns detected events to steps by time range, caps per step.
- **`src/trigger/stages/classifyAndMergeEvents.ts`** — `runClassifyAndMergeEvents`:
  classifies each event click-vs-input (typing = wide aspect, low density),
  merges typing sessions → `RawEvent[]`.

### Restored with adaptation

- **`src/trigger/stages/classifyStepWithLLM.ts`** — per-event LLM classifier
  (`classifyAndRemap`): crops each event, builds a montage, the LLM returns
  keep/discard + caption + element intent + screen name. Restored; its output
  schemas `ClassifiedCandidate` and `StepClassification` are restored to
  `src/lib/schemas.ts`. It depends on `cropEvent.ts` (still present) and
  `screenId.ts` (`maskedDHash`, `buildScreenClusters`, `ScreenCluster` — still
  present). No bbox highlight is emitted.
- **`src/trigger/stages/buildActionsForStep.ts`** — assembles the surviving
  classified records into `Action[]`. Adapted to emit the **current** `Action`
  shape with `highlight: { kind, point }` (the point comes from the highlight
  pass below), not the old bbox highlight.

### New glue

- **Highlight pass** — for each kept action, call the existing
  `runLocateHighlight({ intent, verb, framePath })` to obtain `highlight.point`.
  This is the same call the top-down `processSopScreenshots` already made; it
  simply now consumes bottom-up actions. It runs only on **kept** actions
  (post-classification), which bounds the UI-TARS call count.

### Frame choice

Each event has a pre-action frame and a post-action frame. The screenshot shown
to the user, and the frame `runLocateHighlight` grounds on, is the
**pre-action frame** — the target element is visible there to mark with the
circle; the post-action frame shows the consequence, where the target may be
gone.

### Orchestration

`src/trigger/processSopScreenshots.ts` keeps stages 1–5 and `uploadScreenshots`.
Its middle is replaced: `extractClickEvents → classifyAndMergeEvents →
classifyStepWithLLM → highlight pass → buildActionsForStep`.

## Deletions

- Top-down middle: `src/trigger/stages/planStep.ts`, `pickFrame.ts`,
  `verifyFrame.ts`, and their test files.
- Today's top-down-only frame-selection code: `computeActionTime` (in
  `pickFrame.ts`, removed with the file), `frameSharpness` and the action-time
  rewrite of `selectInClusterFrame` (in `screenId.ts`), and their tests.
- The dead `screenshots.selectFrame` config key in `src/config/index.ts`.

`screenId.ts` itself stays — `buildScreenClusters` and `maskedDHash` are used
by `classifyStepWithLLM`. Only its top-down-only `selectInClusterFrame` and
`frameSharpness` are removed. `clusterFor` is removed only if no restored
module uses it.

`locateHighlight.ts`, `grounding.ts`, `circleSvg` (in `uploadScreenshots.ts`),
and `runLocateHighlight` are **unchanged** — this is the point solution.

## Config

The `screenshots.clickDetect` and `screenshots.classify` blocks are still
present in `src/config/index.ts` (left behind when the bottom-up pipeline was
deleted) and are reused directly by the restored modules. The
`screenshots.selectFrame` block (added today for the top-down work) is removed.

## Restored-code drift

The restored modules are three days stale; the codebase has drifted (schemas,
`DenseFrame` in `buildFramePool.ts`, config, the `Action` type). The
implementation plan must reconcile **each** restored module against current
types — not paste the old code blindly. Known touch-points to verify:

- `extractClickEvents.ts` imports `DenseFrame` from `buildFramePool.ts` —
  confirm the type still matches.
- `classifyStepWithLLM.ts` imports from `cropEvent.ts`, `screenId.ts`,
  `schemas.ts` — confirm those exports still exist / restore the schema exports.
- `buildActionsForStep.ts` emitted the old `Action`/`ElementAction`/`ViewAction`
  union — reconcile with the current `Action` type and `highlight: { kind, point }`.

## Testing

- **Restored module tests** — `clickEventDetect.test.ts`,
  `classifyAndMergeEvents.test.ts`, `classifyStepWithLLM.test.ts`,
  `buildActionsForStep.test.ts` are also recoverable from git (`6a3da48~1`).
  Restore them with their modules; adapt any assertion that depended on the old
  bbox-highlight shape to the new `highlight.point` shape.
- **Highlight pass** — unit test with an injected fake highlighter (the
  `runLocateHighlightWith` `highlighter?` injection point already supports this).
- **Schemas** — restored `ClassifiedCandidate` / `StepClassification` are
  exercised by the `classifyStepWithLLM` tests.
- **Orchestration** — the `processSopScreenshots.ts` rewrite is verified by a
  clean full typecheck (`npx tsc --noEmit -p tsconfig.json`) and the end-to-end
  run below.

Tests run with `node:test` via `npx tsx --test <file>`.

## Verification (manual)

Re-run the pipeline on `samples/trimmed-hubspot_crm.mp4`. Confirm:
1. The SOP has bottom-up-level granularity — roughly 10–15 screenshots per
   step, comparable to the May-13 SOPs (`6a04abd6…` etc., 53–78 total), not the
   over-dropped `[4,1,1,4,5,7]`.
2. Every screenshot carries a yellow-circle point highlight.
3. The pipeline completes with status `done`.

## Scope

**In scope:** restore 5 modules + 4 test files + 2 schemas from git; adapt
`buildActionsForStep` and `classifyStepWithLLM` to the point highlight and
current `Action` type; the new highlight-pass glue; rewire
`processSopScreenshots.ts` stages 6+; delete the top-down middle and today's
frame-selection code; remove the dead `selectFrame` config.

**Out of scope:**
- Shared stages 1–5 (transcribe → buildFramePool) — unchanged.
- `locateHighlight.ts`, `grounding.ts`, `circleSvg`, `runLocateHighlight` — the
  point solution, unchanged.
- The upload form and the SOP viewer UI — unchanged.
- Tuning the CV diff thresholds — the restored `clickDetect` config values are
  taken as-is; re-tuning is a separate effort if needed.

**Size:** this is a large change (~1300 lines restored plus rewiring). It is one
coherent pipeline swap, so a single spec and plan are appropriate; the plan
breaks it into tasks.

## Known consideration

The bottom-up pipeline can over-produce (the May-13 SOPs reached 10–15
screenshots per step, which can be repetitive). This design restores the
bottom-up splitter as-is to recover the lost granularity; if the result is too
noisy, tightening `classifyStepWithLLM`'s keep/discard or the `clickDetect`
thresholds is a follow-up, not part of this spec.
