# Top-Down Screenshot Pipeline — Design

**Date:** 2026-05-14
**Author:** Hau (with Claude)
**Status:** Draft (awaiting user review)

## Goal

Replace the bottom-up screenshot pipeline (pixel-diff detector → classify → caption → frame) with a top-down structure (plan from narration → pick the right frame for each sub-step → verify match → decide highlight). Eliminate description / screenshot mismatches by gating every sub-step through an explicit verification call.

## Problem

The current pipeline starts from raw pixel diffs and asks the LLM to caption whatever the detector emitted. This produces three failure modes the user has seen on the live SOPs:

1. **Hallucinated element names** — the bbox is on whitespace or an animation artifact, but the LLM is forced to label it as an action and invents an `elementCaption` ("referral link") that doesn't exist on the screen.
2. **Frame ↔ description mismatch** — the LLM chose the wrong side of the diff (BEFORE vs AFTER), or picked a frame on a different screen than the one its description names.
3. **Non-UI sections produce phantom actions** — presenter / talking-head intros emit click events on illustrative icons.

The structural mismatch: today the description follows the frame ("what does this pixel-diff look like?"). The user wants the frame to follow the description ("we know the reader is supposed to click *Get started free* — find the frame that shows that action").

## Mental model

Three phases, each independently testable, each output gated by the next:

1. **Outline** — derive the SOP structure (steps and sub-steps) primarily from the trainer's narration, cross-checked against the visual timeline.
2. **Frame picking + verification** — for each described sub-step, find the dense-pool frame that best illustrates it. Validate the match in a separate LLM call.
3. **Highlight** — decide whether a bbox is needed; if yes, where. Some screens (view-only, non-UI) get no bbox.

Every stage runs one LLM call at a time, returns a small structured JSON, and exposes a deterministic post-pass so the runtime can drop / retry / log without re-asking the model.

## Architecture

```
transcript + dense pool
       │
       ▼
[planStep]              one call per step  → SubStepPlan[]
       │   (drop low visualConfidence)
       ▼
[pickFrame]             one call per sub-step → { picked: cluster letter | NONE, runnerUp }
       │   (NONE → drop sub-step)
       ▼
[verifyFrame]           one call per sub-step → { match: yes | partially | no }
       │   (no → retry on runnerUp, then drop)
       ▼
[locateHighlight]       one call per sub-step → { bbox | null }
       │
       ▼
runUploadScreenshots    description = sub-step's intent verbatim
```

The dense frame pool (`runBuildFramePool`) is unchanged. The pixel-diff detector (`detectClickEvents`) and its downstream consumers are **deleted** — narration drives the structure. The screen-clustering utility (`buildScreenClusters`) is reused for Phase 2's shortlist.

## Section 1 — Phase 1: `planStep`

Replaces today's step-extraction-then-detect flow. Combines step-level structure with sub-step planning in one stage per step.

**Input** (one call per step):

- Step title + description (from upstream `runExtract`).
- Step's narration: cleaned transcript segments inside `[step.startSegmentId, step.endSegmentId]`, each as `{ id, start, end, text }`.
- Step's pHash cluster montage (≤ 6 representative frames labeled A/B/C/…), from `buildScreenClusters` over `[step.startTime, step.endTime]`.

**Output schema:**

```ts
const SubStepPlan = z.object({
  intent: z.string(),              // one short imperative sentence, in output language
  verb: z.enum(["click", "input", "select", "link", "view"]),
  narrationSegmentIds: z.array(z.number().int()).min(0),
  timeWindow: z.object({ start: z.number(), end: z.number() }).nullable(),
  visualConfidence: z.enum(["high", "low"]),
});
const StepPlan = z.object({
  subSteps: z.array(SubStepPlan),
});
```

**Prompt rules:**

- Sub-steps come from the trainer's narration. One sub-step per discrete action the trainer asks the reader to take. Do not invent actions the trainer doesn't mention.
- `intent` is the reader-facing description — imperative voice, ≤ 20 words. Example: *"On the Check your email screen, enter the verification code."* The screen name comes from what is visible in the montage.
- `verb: "view"` is used when the trainer points to a screen but doesn't direct an action. View sub-steps proceed through the pipeline normally but get no bbox in Phase 3.
- `narrationSegmentIds[]` must reference real segments from the input. The runtime uses these to bound where the action happens in time.
- `visualConfidence: "low"` when the narration describes something but the montage shows no plausible matching screen. Phase 2 drops these.

**Post-call processing:**

- Drop sub-steps where `visualConfidence === "low"`. Log `pipeline.plan.low_confidence_dropped { stepIndex, intent }`.
- Drop sub-steps that reference segment IDs outside the input set. Log `pipeline.plan.invalid_segment_id`.

**Determinism:** temperature `0.0`. Repair-on-drift safety net: if the planner returns 0 sub-steps for a step that has narration, re-run once with a stricter addendum; if still 0, accept and log `pipeline.plan.empty_after_repair`.

**Files:**

- New `src/trigger/stages/planStep.ts` (function `runPlanStep`).
- New `src/trigger/stages/planStep.test.ts` (injection-style with a fake planner).
- New prompt `planStepSystem` in `src/config/index.ts`.

**Reused:** `buildScreenClusters` from `src/trigger/lib/screenId.ts`, `llmJsonVision` from `src/lib/openrouter.ts`.

## Section 2 — Phase 2a: `pickFrame`

For each surviving sub-step from Phase 1, pick the single best frame to show the reader.

**Input** (one call per sub-step):

- `intent` and `verb`.
- The step's pHash clusters (already computed once per step in Phase 1; reused).
- **Search window:**
  - If `narrationSegmentIds` is non-empty: `[min(segment.start) - 1s, max(segment.end) + 3s]`. The +3s buffer captures the visual landing after the narration ends.
  - Else if `timeWindow` is set: use `[timeWindow.start, timeWindow.end + 3s]`.
  - Else: the whole step's time range (last-resort fallback).
- **Shortlist:** pHash clusters whose `timeSpan` overlaps the search window. Cap at 6 clusters; if more overlap, keep the 6 with the longest in-window dwell. Compose into a single labeled montage image (letters A/B/C/…).

**Output schema:**

```ts
const FramePick = z.object({
  picked: z.string().nullable(),       // "A" | "B" | ... | null
  runnerUp: z.string().nullable(),     // second-best letter; null when only one candidate
  reasoning: z.string(),
});
```

**Prompt rules:**

- Output the single letter whose frame best illustrates the `intent`. Best = a reader given the intent text would clearly recognize where to perform the action (or what to observe, for `verb: "view"`).
- Return `picked: null` if **no** frame in the montage matches: the action target isn't visible; every candidate is a non-UI frame; the intent's target is not present in the search window.
- For `verb: "view"`, prefer a frame where the screen is fully rendered (no transient transitions or loading states).
- Always set `runnerUp` to a letter other than `picked` when ≥ 2 candidates exist; null otherwise.

**Post-call processing:**

- `picked === null` → drop sub-step. Log `pipeline.pick.no_match { stepIndex, intent, reasoning }` at info level.
- Map the picked letter to its cluster's representative frame (a dense-pool frame path on disk). That path is the sub-step's tentative `displayFramePath`.

**Files:** new `src/trigger/stages/pickFrame.ts` + test; new `pickFrameSystem` prompt.

## Section 3 — Phase 2b: `verifyFrame`

Independent validation gate. Sends only the picked frame + the intent back to the LLM.

**Input** (one call per sub-step):

- `intent`, `verb`.
- The picked frame as a single full image, downscaled to max 1280px on its longest edge to control token cost.

**Output schema:**

```ts
const FrameVerification = z.object({
  match: z.enum(["yes", "partially", "no"]),
  reasoning: z.string(),
});
```

**Prompt rules:**

- The model answers ONLY based on what is visible in the supplied frame. No outside knowledge.
- `"yes"` = the screen / element / state described in `intent` is clearly visible.
- `"partially"` = the screen is right but the specific element / state is unclear, OR the element is visible but the screen context is ambiguous.
- `"no"` = the frame contradicts the intent (different screen entirely, non-UI content, blank, animated transition mid-flight).
- For `verb: "view"`, `"yes"` requires that the frame shows the screen the trainer is pointing to.

**Decision logic (post-call):**

- `"yes"` → keep the picked frame. Sub-step proceeds.
- `"partially"` → keep the picked frame BUT log `pipeline.verify.partial` at warn level.
- `"no"` → fallback:
  1. If a `runnerUp` exists, re-call `verifyFrame` with the runner-up frame. If that returns `"yes"` or `"partially"`, accept it. If `"no"`, drop the sub-step.
  2. If no `runnerUp`, drop immediately.
- Maximum one fallback retry per sub-step (no chained runner-ups). Logged.

**Why a separate stage:** asking one model call to both pick and grade itself is unreliable (it tends to defend the pick). The verify call receives a single frame, not a montage, keeping the model focused on detail rather than comparison.

**Files:** new `src/trigger/stages/verifyFrame.ts` + test; new `verifyFrameSystem` prompt.

## Section 4 — Phase 3: `locateHighlight`

For each verified sub-step, decide whether to draw a yellow bbox and where.

**Input** (one call per sub-step):

- `intent`, `verb`.
- The verified picked frame as a full image (max 1280px longest edge — same downscale as Phase 2b). The bbox returned is normalized 0..1 against this image and is remapped to the full-frame dimensions before upload.

**Output schema:**

```ts
const HighlightDecision = z.object({
  highlight: z.enum(["yes", "no"]),
  bbox: BBox.nullable(),
  elementCaption: z.string().nullable(),
  noHighlightReason: z.enum(["view_action", "no_specific_target", "non_ui_frame"]).nullable(),
});
```

**Prompt rules:**

- For `verb: "view"` → always `highlight: "no"`, `noHighlightReason: "view_action"`.
- For `verb` in `{click, input, select, link}`:
  - If the frame shows an application UI AND the target element is clearly visible: `highlight: "yes"` with a tight bbox wrapping the FULL interactive element (background + border + padding), plus a short reusable `elementCaption`.
  - If the frame shows an application UI but the target isn't visible: `highlight: "no"`, `noHighlightReason: "no_specific_target"`.
  - If the frame is not an application UI: `highlight: "no"`, `noHighlightReason: "non_ui_frame"`.
- Bbox coords: normalized 0..1 against the supplied (downscaled) image. The runtime remaps to full-frame dimensions before upload.

**Files:** new `src/trigger/stages/locateHighlight.ts` + test; new `locateHighlightSystem` prompt.

## Section 5 — Action schema & wiring

**`Action` type** (replaces the current `ElementAction` / `ViewAction` union in `src/lib/schemas.ts`):

```ts
type Action = {
  stepIndex: number;
  order: number;
  verb: "click" | "input" | "select" | "link" | "view";
  description: string;          // = the sub-step's intent, verbatim
  displayFramePath: string;
  time: number;
  highlight?: {
    kind: "click" | "input";    // narrow set; select/link coerced to "click", input stays "input"
    bbox: { x: number; y: number; w: number; h: number };  // full-frame normalized
  };
  verifyMatch: "yes" | "partially";
  pickedClusterLetter: string;
};
```

`Action.description` is what the reader sees — no further composition in the upload adapter. This eliminates the localization-templating awkwardness of today's `composeDescription` and removes the `screenName + verb + elementCaption` reconstruction logic.

**MongoDB `Screenshot` field cleanup.** New docs carry `description`, `verb`, `highlight`. The previously-added `screenName` and `elementCaption` fields are no longer written. Old SOPs still render fine (UI reads `description`).

**Pipeline wiring in `processSopScreenshots.ts`:**

```ts
for (const step of stepInputs) {
  const clusters = await buildScreenClusters({ /* step.timeWindow, dense pool */ });
  const plan = await runPlanStep({ stepTitle, narration, clusters });

  const actions: Action[] = [];
  for (const subStep of plan.subSteps) {
    if (subStep.visualConfidence === "low") continue;

    const pick = await runPickFrame({ subStep, clusters, denseFrames });
    if (pick.picked === null) continue;

    let frame = clusterFor(pick.picked).representative;
    let verify = await runVerifyFrame({ subStep, frame });
    if (verify.match === "no" && pick.runnerUp) {
      frame = clusterFor(pick.runnerUp).representative;
      verify = await runVerifyFrame({ subStep, frame });
    }
    if (verify.match === "no") continue;

    const hi = await runLocateHighlight({ subStep, frame });
    actions.push(buildAction(step, subStep, pick, verify, hi, frame));
  }
  actionsByStep.set(step.stepIndex, actions);
}
```

**Stages deleted:**

- `src/trigger/lib/clickEventDetect.ts`
- `src/trigger/stages/extractClickEvents.ts`
- `src/trigger/stages/classifyAndMergeEvents.ts`
- `src/trigger/stages/classifyStepWithLLM.ts`
- `src/trigger/stages/buildActionsForStep.ts`
- Their test files.

**Stages kept (unchanged):**

- `src/trigger/stages/buildFramePool.ts`
- `src/trigger/stages/extract.ts`
- `src/trigger/lib/screenId.ts`
- `src/trigger/lib/perceptualHash.ts`

**Schema changes (`src/lib/schemas.ts`):**

- Add: `SubStepPlan`, `StepPlan`, `FramePick`, `FrameVerification`, `HighlightDecision`, new `Action` type.
- Remove: `ClassifiedCandidate`, `StepClassification`, `ElementAction`, `ViewAction`, old `Action` union.

**`ErrorCode` additions (`src/lib/mongo.ts`):** `"plan_failed"`, `"frame_pick_failed"`, `"verify_failed"`, `"highlight_failed"`. Keep `"classify_failed"` in the union for backward-compat with old failed docs.

**Failure-handling policy change.** Today, a single step's classifier failure aborts the whole SOP (`classify_failed`). New policy: `plan_failed` still aborts (the step has no structure). But Phase 2 / Phase 3 failures per sub-step only **drop the sub-step**, not the whole SOP. Losing one card is recoverable; failing the whole SOP for one bad frame is not.

## Section 6 — Cost, testing, rollout

**Cost & latency.** For a typical 15-min training video with 8 steps and ~4 sub-steps per step:

| Phase | Calls per step | Total calls |
|---|---|---|
| planStep | 1 | 8 |
| pickFrame | ≤ 4 sub-steps | ~32 |
| verifyFrame | ≤ 4 sub-steps + ~5–10% retry | ~35 |
| locateHighlight | ≤ 4 sub-steps minus drops | ~30 |

Total ≈ 105–115 vision calls per video, up from ~30 today. Per-step concurrency stays at 5 (existing `config.screenshots.classify.perStepConcurrency`). Wall-clock ≈ 2–3× today (∼15 min for a 15-min video). User accepted the latency cost in exchange for accuracy.

**Token cost.** Phase 2a sends one montage image (~6 frames composited). Phase 2b and Phase 3 each send one full frame. Average ~3 images per sub-step. Output JSON is small. Roughly 3× per-sub-step vision tokens vs today; offset partially by deletion of the old `classifyStepWithLLM` montage call.

**Retry & backoff.** Each stage uses the existing `llmJsonVision` retry-with-backoff (default 3 retries, exponential jitter). Per-stage failures map to the new `ErrorCode` values above.

**Unit tests** (`node:test` + `node:assert`, run via `tsx --test`):

- `planStep.test.ts`:
  - Drops sub-steps with `visualConfidence: "low"`.
  - Drops sub-steps with out-of-range `narrationSegmentIds`.
  - Passes `temperature: 0.0` to `llmJsonVision`.
  - Repair-on-empty runs at most one retry.
- `pickFrame.test.ts`:
  - Builds shortlist from clusters overlapping the search window (segment-derived and fallback paths).
  - Honors max-6 cap; keeps longest dwell when over-cap.
  - Search window ends `step.end + 3s`.
  - `picked: null` returns through and signals drop.
- `verifyFrame.test.ts`:
  - `"yes"` → keep; `"partially"` → keep + warn log; `"no"` with `runnerUp` → retry once on runner-up; `"no"` without `runnerUp` → drop.
  - No infinite retry loops (maximum one fallback).
- `locateHighlight.test.ts`:
  - `verb: "view"` → always returns `highlight: "no"`, even if the LLM erroneously returns `"yes"` (post-process override).
  - Bbox coords are remapped from downscaled-image coords to full-frame coords correctly.
- `processSopScreenshots.test.ts` (new): integration test with all four LLM stages mocked, asserts the for-each-sub-step loop drops appropriately at each gate.

**Regression fixture.** Capture frozen dense-pool frames for one synthetic step (12–15 frames covering: an intro-with-presenter at the start, a form page mid-step, a confirmation screen). Drive the whole pipeline with injected LLM responses and assert end-to-end behavior without hitting Gemini.

**Acceptance criteria** for the final smoke test against `samples/trimmed-hubspot_crm.mp4`:

1. No sub-step's description names an element not visible in its picked screenshot. (Visual eye-check on the live SOP — currently the top-priority failure pattern.)
2. The presenter-intro section produces no actionable sub-steps. At most one `verb: "view"` card may cover the intro.
3. Every sub-step with `verb: "view"` has no bbox. Every sub-step with `verb !== "view"` either has a bbox OR was dropped.
4. Step count stable across two consecutive runs (±2 steps).
5. For the verification-code → Next sequence on the *Check your email* screen, both sub-steps exist as distinct cards with correct screen identity and bboxes on the correct elements.

**Rollout strategy.** Single branch, single coherent rewrite. Land in this order:

1. Add new schema types in `schemas.ts` (additive — old union still present).
2. Add new `ErrorCode` values in `mongo.ts`.
3. Add four new prompts in `config/index.ts`.
4. Implement `planStep` + tests.
5. Implement `pickFrame` + tests.
6. Implement `verifyFrame` + tests.
7. Implement `locateHighlight` + tests.
8. Rewrite `processSopScreenshots.ts` to use the new chain. Rewrite `uploadScreenshots.ts` to consume the new `Action` shape.
9. Delete obsolete stages and schema types in one commit.
10. Smoke test against the live SOP; iterate knobs (search-window buffer, max-shortlist size, downscale resolution).

## Out of scope

- Cursor-tracking via template matching.
- Backfilling old SOPs into the new schema.
- Splitting one sub-step across multiple frames (before + after). One sub-step = one screenshot.
- A UI for surfacing `partially`-verified sub-steps for human review (logged only for now).
- Multi-language tuning of new prompts beyond the language-rule string already used by other prompts.
