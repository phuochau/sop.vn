# Restore Bottom-Up Screenshot Pipeline — Design

**Date:** 2026-05-17
**Status:** Approved (brainstorming); revised after spec review

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
  → buildActionsForStep     dedup + assemble Action[]  (highlight not yet set)
  → highlight pass          per assembled action: runLocateHighlight → yellow-circle point
  → uploadScreenshots       renders the circle (already supports point geom)   (unchanged)
```

Stage ordering note: the **highlight pass runs after `buildActionsForStep`**, on
the assembled, deduplicated `Action[]`. `buildActionsForStep` collapses multiple
detected events onto one element, so the highlight must be grounded per final
action, not per raw event.

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

Restored from git (`git show 6a3da48~1:<path>`) and reconciled against current
types, but their logic is unchanged:

- **`src/trigger/lib/clickEventDetect.ts`** — CV frame-diff event detection
  (`detectClickEvents`, `mergeEvents`, `bboxIou`, `ClickEvent` type).
- **`src/trigger/stages/extractClickEvents.ts`** — `runExtractClickEvents`:
  assigns detected events to steps by time range, caps per step.
- **`src/trigger/stages/classifyAndMergeEvents.ts`** — `runClassifyAndMergeEvents`:
  classifies each event click-vs-input (typing = wide aspect, low density),
  merges typing sessions → `RawEvent[]`.
- **`src/trigger/stages/classifyStepWithLLM.ts`** — per-event LLM classifier
  (`classifyAndRemap`): crops each event, builds a montage, the LLM returns
  keep/discard + caption + element intent + screen name + a `displayFrame`
  (`"before"` / `"after"`) choice. Its output schemas `ClassifiedCandidate` and
  `StepClassification` are restored to `src/lib/schemas.ts`. It imports:
  `src/trigger/lib/cropEvent.ts` (`computeCropWindow`, `diffBboxInCrop`,
  `cropBboxToFullFrame`, `padBbox`, type `Bbox`), `src/trigger/lib/screenId.ts`
  (`maskedDHash`, `buildScreenClusters`, `ScreenCluster`),
  `src/trigger/lib/perceptualHash.ts` (`hammingDistance`), and
  `config.screenshots.screenId.*` / `config.screenshots.classify.*` — all
  present in the current codebase. No bbox highlight is emitted.

### Restored with substantial adaptation: `buildActionsForStep.ts`

This is **not** a minor change. The restored `buildActionsForStep` imports the
deleted `ElementAction` / `ViewAction` union and emits records with fields
(`screenId`, `screenName`, `elementId`, `elementCaption`, `bbox`, `displayFrame`,
`caption`, `durationSec`) that do **not** match the current flat `Action` type.
It must be rewritten to emit the **reconciled `Action`** (see next section):

- Its dedup/grouping logic (group by screen, then by element, keep the latest
  event per element, emit View actions for long unvisited clusters) is kept.
- Its output mapping changes: emit reconciled-`Action` objects — `description`
  from `elementCaption` / view `caption`; `stepIndex` from the arg; `order` from
  the post-sort index; `displayFramePath` from the restored `displayFrame`
  before/after choice; **no `highlight` field** (the highlight pass fills it).
- The internal `screenId` / `screenName` / `bbox` / `durationSec` fields are
  dropped from the emitted action — they are not consumed downstream
  (`uploadScreenshots` reads only `displayFramePath`, `time`, `description`,
  `verb`, `highlight`).

### Action type reconciliation (`src/lib/schemas.ts`)

The current `Action` type is top-down-shaped: it has required `verifyMatch` and
`pickedClusterLetter` fields, which are top-down concepts with no bottom-up
meaning. The reconciled `Action` type is:

```ts
export type Action = {
  stepIndex: number;
  order: number;
  verb: "click" | "input" | "select" | "link" | "view";
  description: string;
  displayFramePath: string;
  time: number;
  highlight?: {
    kind: "click" | "input";
    bbox?: { x: number; y: number; w: number; h: number };
    point?: { x: number; y: number };
  };
};
```

The **only** change from the current type: `verifyMatch` and
`pickedClusterLetter` are **removed**. The `highlight` shape — including the
deprecated optional `bbox?` — is left **exactly as it is today**. The new
pipeline never *produces* a `bbox` highlight (the highlight pass writes only
`point`), but the field stays on the type so that `uploadScreenshots.ts` and
the legacy zod schemas (`Highlight`, `HighlightDecision`, `BBox`, the
`Screenshot.highlight` shape) continue to compile and to validate pre-existing
records unchanged. This keeps `uploadScreenshots.ts` genuinely untouched.

### New glue

- **Highlight pass** — a small stage that, for each assembled `Action` whose
  `verb` is not `view`, calls the existing
  `runLocateHighlight({ intent, verb, framePath })` (`intent` = the action's
  `description`, `framePath` = `displayFramePath`) and writes the resulting
  `point` into `action.highlight`. `view` actions get no highlight. It runs only
  on the deduplicated, kept actions, which bounds the UI-TARS call count.

### Frame choice

`classifyStepWithLLM` already decides, per event, a `displayFrame` of
`"before"` or `"after"` (it has a cross-screen guard). That restored logic is
kept as-is. `buildActionsForStep` resolves `displayFramePath` from that choice.
The highlight pass grounds `runLocateHighlight` on that same
`displayFramePath`, so the circle is placed on the frame actually shown.

### Orchestration (`processSopScreenshots.ts`)

Stages 1–5 and `uploadScreenshots` are unchanged. The top-down middle (the
self-contained block that runs `planStep` / `runPickFrame` / `runVerifyFrame` /
`runLocateHighlight` / `buildAction` per sub-step, plus its
`runWithConcurrency` loop and trace plumbing) is replaced by:
`runExtractClickEvents → runClassifyAndMergeEvents → classifyAndRemap →
buildActionsForStep → highlight pass`.

**Error codes:** the top-down `fail()` calls use `ErrorCode` values
`plan_failed` and `frame_pick_failed`. The rewired orchestrator instead uses the
bottom-up-appropriate existing codes (`generation_failed` for classification
failure, `screenshot_pool_failed` for frame-pool failure, `unknown` as the
catch-all). The now-dead `plan_failed` and `frame_pick_failed` members are
removed from the `ErrorCode` union in `src/lib/mongo.ts`.

**Tracing:** `processSopScreenshots.ts` currently imports and calls top-down
trace plumbing from `@/lib/pipelineTrace` (`persistTrace`, `makeTrace`,
`persistStepPlanTrace`, `makeStepPlanTrace`, `ClusterSnapshot`,
`RawSubStepSnapshot`) — all shaped around `subStep` / `plan` / `pick` / `verify`.
These calls are removed from the orchestrator. The restored bottom-up modules
keep their own plain `logger.info` structured logging (e.g.
`pipeline.candidate.discarded`, `pipeline.action.deduped`). After the rewrite
`processSopScreenshots.ts` and `pipelineTrace.test.ts` are the only importers of
`pipelineTrace.ts`, so `pipelineTrace.ts` **and** `pipelineTrace.test.ts` are
both deleted.

## Deletions

- Top-down middle: `src/trigger/stages/planStep.ts`, `pickFrame.ts`,
  `verifyFrame.ts`, and their test files.
- Today's top-down-only frame-selection code: `computeActionTime` and
  `computeSearchWindow` (both in `pickFrame.ts`, removed with the file),
  `frameSharpness`, the action-time `selectInClusterFrame`, and `clusterFor`
  (in `screenId.ts`) plus their tests. `clusterFor`'s only caller is the
  top-down orchestrator; no restored module uses it, so it is removed.
- The dead `screenshots.selectFrame` **and** `screenshots.pickFrame` config
  blocks in `src/config/index.ts` (both top-down-only).
- `src/lib/pipelineTrace.ts` and `src/lib/pipelineTrace.test.ts` — both, once
  the orchestrator's trace calls are removed (they are its only importers).
- `ErrorCode` members `plan_failed` and `frame_pick_failed` in `src/lib/mongo.ts`.

`screenId.ts` itself stays — `buildScreenClusters` and `maskedDHash` are used
by `classifyStepWithLLM`. Only its top-down-only `selectInClusterFrame`,
`frameSharpness`, and `clusterFor` are removed.

`locateHighlight.ts`, `grounding.ts`, `circleSvg` (in `uploadScreenshots.ts`),
and `runLocateHighlight` are **unchanged** — this is the point solution.

## Config

Reused as-is (still present in `src/config/index.ts`, left behind when the
bottom-up pipeline was deleted): `screenshots.clickDetect`,
`screenshots.classify`, and `screenshots.screenId` (`classifyStepWithLLM` reads
`screenId.maxMontageClusters` / `screenId.hammingThreshold`;
`buildActionsForStep` reads `screenId.viewMinDurationSec`).

Removed: `screenshots.selectFrame` (added today for top-down) and
`screenshots.pickFrame` (top-down search-window padding) — both dead after the
top-down middle is deleted.

## Restored-code drift

The restored modules are three days stale; the codebase has drifted. The
implementation plan must reconcile **each** restored module against current
types — not paste the old code blindly. Verified touch-points:

- `extractClickEvents.ts` imports `DenseFrame` from `buildFramePool.ts` — the
  type still exists; confirm field compatibility.
- `classifyStepWithLLM.ts` imports from `src/trigger/lib/cropEvent.ts`,
  `src/trigger/lib/screenId.ts`, `src/trigger/lib/perceptualHash.ts`
  (`hammingDistance` — verify its current signature), and `src/lib/schemas.ts`
  (`ClassifiedCandidate` / `StepClassification` must be restored). All four
  files are present in the current codebase.
- `buildActionsForStep.ts` — substantial rewrite, see above.

## Testing

- **Restored module tests** — `clickEventDetect.test.ts`,
  `classifyAndMergeEvents.test.ts`, `classifyStepWithLLM.test.ts`,
  `buildActionsForStep.test.ts` are recoverable from git (`6a3da48~1`). Restore
  them with their modules. `buildActionsForStep.test.ts` asserted on the old
  `ElementAction`/`ViewAction` shape and **must be rewritten** for the
  reconciled `Action` type.
- **`extractClickEvents.ts` has no test at `6a3da48~1`.** A fresh
  `extractClickEvents.test.ts` is written: `runExtractClickEvents` is pure
  step-assignment-by-time + per-step capping logic — cover event→step
  assignment (including the last-step inclusive-end rule) and the cap.
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
2. Every non-view screenshot carries a yellow-circle point highlight.
3. The pipeline completes with status `done`.

## Scope

**In scope:** restore 4 modules faithfully + 4 restored test files + 1 new
`extractClickEvents.test.ts`; restore the `ClassifiedCandidate` /
`StepClassification` schemas; the substantial `buildActionsForStep` rewrite;
the `Action` type reconciliation; the new highlight-pass glue; rewire
`processSopScreenshots.ts` stages 6+ including error codes and trace removal;
delete the top-down middle, today's frame-selection code, the dead `selectFrame`
/ `pickFrame` config, and `pipelineTrace.ts` if unused.

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
