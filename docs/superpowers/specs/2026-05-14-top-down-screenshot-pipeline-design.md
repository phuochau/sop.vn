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

**Upstream contract & narration assembly.** `runExtract` (kept) produces steps shaped `{ title, description, startSegmentId, endSegmentId }` — no times and no index. The orchestrator in `processSopScreenshots.ts` enriches each step with a `stepIndex` (its position in the array) and `tStart` / `tEnd` (computed) before calling `planStep`. Convention applied:

- `assembleStepNarration(step, segments, segmentsClean)` returns an array of `{ id, start, end, text }`:
  - Source `start` / `end` from `SopDoc.segments[]` (always present after transcription).
  - Source `text` from `SopDoc.segmentsClean[]` when non-null; **fall back to `segments[].text` when `segmentsClean === null`** (e.g., normalize stage hasn't completed for this doc).
  - Filter to `[step.startSegmentId, step.endSegmentId]`.
- The step's effective time range is `[min(narration[].start), max(narration[].end)]`, exposed as `step.tStart` / `step.tEnd` (computed, not stored).
- Silent step (zero `segments[]` matching the filter) is handled separately — see §1.5. A null `segmentsClean` alone does NOT trigger silent-step fallback because the raw `segments[]` still provides text.

**Input** (one call per step):

- Step title + description (from upstream `runExtract`).
- Step's narration assembled as above.
- Step's pHash cluster montage (≤ 6 representative frames labeled A/B/C/…), from `buildScreenClusters` over `[step.tStart, step.tEnd]`. Cluster-selection rule when >6 clusters exist: keep the 6 with the **longest in-window dwell** (defined in §3a). **Same shortlist rule used in Phase 2a — the planner and the picker see the same letters for the same step.** When ≤6, all clusters are passed.

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
- **Filter** out-of-range `narrationSegmentIds` instead of dropping the whole sub-step: keep only IDs that are in the input set. If the filtered list becomes empty AND `timeWindow` is null, drop the sub-step and log `pipeline.plan.no_temporal_anchor`. Log filtered-out IDs at warn level.
- Drop sub-steps where `narrationSegmentIds === []` AND `timeWindow === null` (schema-valid but unfit for Phase 2 search-window derivation). Log `pipeline.plan.no_temporal_anchor`.

**Determinism:** temperature `0.0`. Repair-on-drift safety net: if the planner returns 0 sub-steps for a step that has narration, re-run once with a stricter addendum; if still 0, accept and log `pipeline.plan.empty_after_repair`.

## Section 1.5 — Silent-step fallback

When `assembleStepNarration` returns zero segments (the step has visual activity but no transcript — silent screenshare, music-only stretch), the planner is **not** called. Instead, the runtime emits one `verb: "view"` sub-step per pHash cluster in the step whose timeSpan exceeds `viewMinDurationSec` (default 4s, reusing the existing config knob from `screenId.viewMinDurationSec`). Each fallback sub-step has:

- `intent`: a localized fixed string ("Review this screen before continuing." / "Hãy xem màn hình này trước khi tiếp tục."). Same string used by today's View card.
- `verb: "view"`.
- `narrationSegmentIds: []`.
- `timeWindow`: the cluster's timeSpan.
- `visualConfidence: "high"` (the cluster's existence is the visual evidence).

The pipeline continues through Phase 2 / 3 normally for these. Phase 3 will return no bbox for `verb: "view"`. This guarantees silent stretches still get screenshots, just without an action overlay.

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
- **Search window** (post-Phase-1 invariant: at least one of `narrationSegmentIds` or `timeWindow` is non-empty / non-null):
  - If `narrationSegmentIds` is non-empty: `[min(segment.start) - 1s, max(segment.end) + 3s]`. The +3s buffer captures the visual landing after the narration ends.
  - Else `timeWindow` is set: use `[timeWindow.start, timeWindow.end + 3s]`.
- **Shortlist:** pHash clusters whose `timeSpan` overlaps the search window. Cap at 6 clusters; if more overlap, keep the 6 with the longest **in-window dwell** (see §3a). Compose into a single labeled montage image (letters A/B/C/…). The letter→cluster map is the only authoritative set of valid `picked` / `runnerUp` values.

**Frame chosen from cluster.** Once a cluster is picked, the runtime selects a specific dense-pool frame from that cluster's members — **not** by median timestamp. The selection rule is in §3a.

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
- **Membership check:** if `picked` is a string but not in the montage's letter set, treat as `null` and drop the sub-step. Log `pipeline.pick.invalid_letter`. Same check for `runnerUp` — if invalid, set to `null` (don't drop, just disables the verifier fallback).
- **Equality check:** if `runnerUp === picked`, set `runnerUp` to `null` (no useful retry available).
- Map the picked letter to its cluster, then select the in-cluster frame via the **§3a rule** (not raw median). That path is the sub-step's tentative `displayFramePath`.

## Section 3a — In-cluster frame selection

A pHash cluster has multiple members (sampled dense-pool frames). The runtime picks a single member as the cluster's `representative` when a frame is needed for the picker's montage AND when the picker selects this cluster for a sub-step.

Two selection contexts:

**Context 1 — Cluster representative for the montage.** Used in Phase 1 and Phase 2a shortlist construction. Rule: the member whose dHash has the **smallest sum-Hamming distance to every other member** (the cluster centroid). Ties broken by earliest `t`. Intuition: the centroid frame is the most "typical" appearance of this screen, less likely to be a transient or transition.

**`ScreenCluster` shape change required.** The current `ScreenCluster.members: DensePoolFrame[]` exposes only `{ t, localPath }` per member — no per-member dHash, so the centroid rule can't be computed downstream. This task changes the shape to:

```ts
export type ScreenCluster = {
  letter: string;
  representative: DensePoolFrame;   // now the centroid, not the median-time member
  members: { frame: DensePoolFrame; dHash: string }[];   // shape change
  timeSpan: { start: number; end: number };
  dHash: string;                    // cluster's seed hash, unchanged
};
```

Callers of `ScreenCluster.members` must be updated. Audit before landing: `git grep -nE "cluster\.members|ScreenCluster\b"`. Today's only consumer (the bottom-up classifier in `classifyStepWithLLM.ts`) is being deleted in this rework. Any **View-card** path that today depends on `representative` (currently the median frame) will see a different frame after this change — but those code paths are all inside the bottom-up pipeline being deleted, so the change is bounded. Audit step listed under §6 rollout.

**Context 2 — Frame chosen for a specific sub-step.** Used after Phase 2a returns `picked`. Rule: among the chosen cluster's members, pick the one whose timestamp falls inside the sub-step's search window (see §2). If multiple, prefer the centroid. If none (the picker selected a cluster all of whose members fall outside the sub-step's window — e.g., the cluster overlapped at the edges but its members are outside the window), fall back to the cluster's centroid.

**In-window dwell (used for cluster ranking in §1 and §2a).** Defined as `max(0, min(cluster.timeSpan.end, window.end) - max(cluster.timeSpan.start, window.start))`. This is an approximation — the cluster's `timeSpan` is sampled-extent, not actual visible dwell, and a screen visited at t=10 + t=40 with nothing between gets a 30s timeSpan even though it wasn't continuously visible. Accepted limitation; documented under §6 "Known limitations".

**Known limitation — same screen revisited within one step.** Hubspot-style flow where the user fills Form X → navigates to Y → returns to X to click Next. dHash will cluster X-visit-1 and X-visit-2 together. The pickFrame call sees one letter for X with a timeSpan spanning the whole detour. Mitigation: Context-2 frame selection prefers a member inside the sub-step's narration-derived search window, so a sub-step whose narration falls in X-visit-2 picks a member from that revisit. The picker can still mis-attribute, but only when narration timing is wrong. Documented limitation; not blocking.

**Files:** new `src/trigger/stages/pickFrame.ts` + test; new `pickFrameSystem` prompt. **Modified:** `src/trigger/lib/screenId.ts` — `ScreenCluster.members` shape change + centroid representative rule + `selectInClusterFrame(cluster, searchWindow)` exported utility for Context 2.

## Section 3 — Phase 2b: `verifyFrame`

Independent validation gate. Sends the picked frame + the intent back to the LLM, plus a small amount of disambiguating context.

**Input** (one call per sub-step):

- `intent`, `verb`.
- The picked frame as a single full image, downscaled to max 1280px on its longest edge to control token cost.
- The picker's `reasoning` string (one short sentence) for context — labeled in the prompt as "picker's rationale". This nudges the verifier to evaluate whether the rationale actually holds against the picked frame, rather than evaluating the frame in isolation.

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

**MongoDB `Screenshot` field cleanup.** New docs carry `description`, `verb`, `highlight`. The previously-added `screenName` and `elementCaption` fields are no longer written. The Screenshot interface keeps them as optional for backward compatibility (no migration).

**UI render contract verification.** The UI must read `Screenshot.description` directly — it must NOT recompose from `screenName + verb + elementCaption` at render time. Verified by grepping the renderer in `src/components/sop/` (or wherever screenshots are rendered) and asserting it reads `description`. If a recomposition path is found, the rendering code is updated in this same rework to read `description` and treat `screenName`/`elementCaption` as analytics fields only. A test in `processSopScreenshots.test.ts` asserts a Screenshot doc with no `screenName`/`elementCaption` renders correctly.

**New utilities required by the wiring** (file paths used in the snippet below):

- `assembleStepNarration` — `src/trigger/lib/narration.ts` (new).
- `silentStepFallback` — `src/trigger/lib/narration.ts` (new, alongside above).
- `runWithConcurrency` — `src/lib/concurrency.ts` (new). Generic helper `runWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]>`. The bottom-up pipeline used an in-file implementation in `classifyStepWithLLM.ts`; lifting it out makes it reusable and independently testable.
- `clusterFor`, `selectInClusterFrame` — both in `src/trigger/lib/screenId.ts` (new exports alongside `buildScreenClusters`).
- `buildAction` — `src/trigger/stages/buildAction.ts` (new): pure assembler that combines a step + sub-step + pick + verify + highlight + frame path into one `Action` record.

**Pipeline wiring in `processSopScreenshots.ts`:**

```ts
// Steps run concurrently up to `config.screenshots.classify.perStepConcurrency`.
// Sub-steps within a step run serially (each depends on the previous gate's outcome).
await runWithConcurrency(stepInputs, perStepConcurrency, async (step) => {
  const narration = assembleStepNarration(step, segments, segmentsClean);
  const clusters = await buildScreenClusters({
    denseFrames: pool.denseFrames,
    stepStart: step.tStart,
    stepEnd: step.tEnd,
    samplingSec: config.screenshots.screenId.samplingSec,
    hammingThreshold: config.screenshots.screenId.hammingThreshold,
  });

  const plan = narration.length === 0
    ? silentStepFallback(clusters, step)
    : await runPlanStep({ stepTitle: step.title, narration, clusters });

  const actions: Action[] = [];
  for (const subStep of plan.subSteps) {
    if (subStep.visualConfidence === "low") continue;

    const pick = await runPickFrame({ subStep, clusters, step });
    if (pick.picked === null) continue;

    const pickedFramePath = selectInClusterFrame(clusterFor(pick.picked, clusters), subStep);
    let verify = await runVerifyFrame({ subStep, framePath: pickedFramePath, pickerReasoning: pick.reasoning });
    let finalFramePath = pickedFramePath;
    if (verify.match === "no" && pick.runnerUp) {
      finalFramePath = selectInClusterFrame(clusterFor(pick.runnerUp, clusters), subStep);
      verify = await runVerifyFrame({ subStep, framePath: finalFramePath, pickerReasoning: pick.reasoning });
    }
    if (verify.match === "no") continue;

    const hi = await runLocateHighlight({ subStep, framePath: finalFramePath });
    actions.push(buildAction({ step, subStep, pick, verify, hi, framePath: finalFramePath }));
  }
  actionsByStep.set(step.stepIndex, actions);
});
```

**Parallelism boundary** is explicit: steps run concurrently up to the existing config knob; sub-steps within a step run serially because each gate depends on the previous. For an 8-step / 4-sub-step video at concurrency 5, wall-clock is roughly `ceil(8/5) × 4 × LLM_round_trip_p50 ≈ 2 × 4 × 8s ≈ 64s` of LLM time per slot, plus retries. Faster than the prior estimate when steps are short; the §6 estimate assumed worst-case sub-step counts.

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

**`ErrorCode` additions (`src/lib/mongo.ts`):** `"plan_failed"`, `"frame_pick_failed"`, `"verify_failed"`, `"highlight_failed"`. Keep `"classify_failed"` in the union for backward-compat with old failed docs — newly written failed SOPs in this pipeline never use it. Document in code comment which codes are produced by which pipeline (old vs. new) for dashboard queries.

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
  - Filters out-of-range `narrationSegmentIds` but keeps the sub-step (unless ID list becomes empty AND `timeWindow` is null).
  - Drops sub-step when `narrationSegmentIds: []` AND `timeWindow: null` (no temporal anchor).
  - Passes `temperature: 0.0` to `llmJsonVision`.
  - Repair-on-empty runs at most one retry.
- `pickFrame.test.ts`:
  - Builds shortlist from clusters overlapping the search window (segment-derived and fallback paths).
  - Honors max-6 cap; keeps longest in-window dwell when over-cap.
  - Search window ends `step.tEnd + 3s` for timeWindow path; `narrationEnd + 3s` for segments path.
  - `picked: null` returns through and signals drop.
  - `picked: "Z"` not in montage letters → treated as null, sub-step dropped.
  - `runnerUp === picked` → runnerUp coerced to null.
- `verifyFrame.test.ts`:
  - `"yes"` → keep; `"partially"` → keep + warn log; `"no"` with `runnerUp` → retry once on runner-up; `"no"` without `runnerUp` → drop.
  - No infinite retry loops (maximum one fallback).
  - `pickerReasoning` is included in the user-message text body.
- `locateHighlight.test.ts`:
  - `verb: "view"` → always returns `highlight: "no"`, even if the LLM erroneously returns `"yes"` (post-process override).
  - Bbox coords are remapped from downscaled-image coords to full-frame coords correctly.
- `screenId.test.ts`: extend existing tests for the centroid-based representative selection (replacing median-timestamp).
- `assembleStepNarration.test.ts` (new utility): inner-join `segments[]` + `segmentsClean[]` on `id`; missing IDs in one or the other are skipped; preserves order.
- `processSopScreenshots.test.ts` (new): integration test with all four LLM stages mocked, asserts the for-each-sub-step loop drops appropriately at each gate; asserts silent-step fallback emits one view sub-step per long cluster; asserts old-Screenshot-shape rendering compatibility via a stub render call.
- Regression fixture in `__fixtures__/synthetic-frames/` includes:
  - A multi-visit scenario (Screen X visited at t=10 and t=40, with Screen Y between).
  - A >6-cluster step to validate dwell-based ranking.

**Regression fixture.** Capture frozen dense-pool frames for one synthetic step (12–15 frames covering: an intro-with-presenter at the start, a form page mid-step, a confirmation screen). Drive the whole pipeline with injected LLM responses and assert end-to-end behavior without hitting Gemini.

**Acceptance criteria** for the final smoke test against `samples/trimmed-hubspot_crm.mp4`:

1. No sub-step's description names an element not visible in its picked screenshot. (Visual eye-check on the live SOP — currently the top-priority failure pattern.)
2. The presenter-intro section produces no actionable sub-steps. At most one `verb: "view"` card may cover the intro.
3. Every sub-step with `verb: "view"` has no bbox. Every sub-step with `verb !== "view"` either has a bbox OR was dropped.
4. For the verification-code → Next sequence on the *Check your email* screen, both sub-steps exist as distinct cards with correct screen identity and bboxes on the correct elements.
5. **Sub-step stability:** the count of sub-steps within each step varies by at most ±1 across two consecutive runs. Temperature is `0.0` in all four stages, but hosted-LLM determinism is not guaranteed at temp 0 (provider may still vary on tie-breaks). The ±1 looseness absorbs that variance; exact equality is not promised. Total step count is governed by `runExtract`, outside this rework.

**Rollout strategy.** Single branch, single coherent rewrite. Land in this order:

1. Add new schema types in `schemas.ts` (additive — old union still present).
2. Add new `ErrorCode` values in `mongo.ts`.
3. Add four new prompts in `config/index.ts`.
4. Extract `runWithConcurrency` to `src/lib/concurrency.ts` + tests.
5. Modify `src/trigger/lib/screenId.ts`: `ScreenCluster.members` shape change, centroid representative rule, new `clusterFor` / `selectInClusterFrame` exports + tests.
6. Add `assembleStepNarration` and `silentStepFallback` in `src/trigger/lib/narration.ts` + tests.
7. Implement `planStep` + tests.
8. Implement `pickFrame` + tests.
9. Implement `verifyFrame` + tests.
10. Implement `locateHighlight` + tests.
11. Implement `buildAction` (pure assembler) + tests.
12. **UI render audit:** grep `src/components/sop/` for any composition of `description` from `screenName + verb + elementCaption`. Replace with reading `description` directly.
13. Rewrite `processSopScreenshots.ts` to use the new chain. Rewrite `uploadScreenshots.ts` to consume the new `Action` shape.
14. Delete obsolete stages and schema types in one commit. Audit `ScreenCluster.members` callers before this deletion to ensure no surviving code uses the old shape.
15. Smoke test against the live SOP; iterate knobs (search-window buffer, max-shortlist size, downscale resolution).

## Section 7 — Debugging & triage

With four gates per sub-step, a missing card has 4+ possible drop reasons (low visualConfidence, no temporal anchor, pickFrame null, verify no). To make postmortem tractable:

**Structured logs at every drop.** Each drop emits one log line:

- `pipeline.plan.low_confidence_dropped { sopId, stepIndex, intent }`
- `pipeline.plan.no_temporal_anchor { sopId, stepIndex, intent }`
- `pipeline.pick.no_match { sopId, stepIndex, intent, reasoning }`
- `pipeline.pick.invalid_letter { sopId, stepIndex, intent, picked }`
- `pipeline.verify.partial { sopId, stepIndex, intent, reasoning }` (kept, but logged)
- `pipeline.verify.no { sopId, stepIndex, intent, reasoning, hadRunnerUp }`

**Per-sub-step trace artifact (Mongo, debug-mode only).** When `process.env.SOP_PIPELINE_DEBUG === "1"`, the runtime persists a per-sub-step trace doc to a new `sop_pipeline_traces` Mongo collection containing: `{ sopId, stepIndex, intent, pickedLetter, runnerUpLetter, pickerReasoning, verifyMatch, verifyReasoning, highlightOutcome, finalAction }`. Off by default; not exposed in production. Lets us replay the four-gate decision chain for a problem sub-step without re-running the full video.

**Smoke-test triage script.** Extend `scripts/inspect-sop.mjs` (already used for the prior smoke) to print drop reasons by stepIndex when a previously-present sub-step is missing. Format: `step N: dropped K sub-steps — reasons: { no_match: 2, no_temporal_anchor: 1 }`.

## Out of scope

- Cursor-tracking via template matching.
- Backfilling old SOPs into the new schema.
- Splitting one sub-step across multiple frames (before + after). One sub-step = one screenshot.
- A UI for surfacing `partially`-verified sub-steps for human review (logged only for now).
- Multi-language tuning of new prompts beyond the language-rule string already used by other prompts.
