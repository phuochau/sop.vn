# Screenshot Pipeline Quality — Design

**Date:** 2026-05-14
**Author:** Hau (with Claude)
**Status:** Draft (awaiting user review)

## Goal

Restructure the screenshot pipeline so each sub-step represents a meaningful **action on a target element**, not a raw pixel-diff event. Eliminate duplicates caused by press-state flicker and page transitions. Fix step-extraction non-determinism. Mention narrated alternatives the trainer describes but does not demonstrate.

## Problem

The current pipeline is action-driven in the wrong sense: every detected pixel diff that fits click-shape gates becomes one sub-step. This produces three failure modes the user sees in the live SOP at `/sop/6a04abd616f65270628d088b`:

1. **Duplicate clicks on the same element within ~2s** — press-state animation or release flicker emits a second "click" event. Example: two "Get started free" cards at t=46.0 and t=47.5.
2. **Duplicate clicks across a page transition** — the post-click navigation produces a stable diff a few seconds later that looks like a click in the same region. Example: two "Verify email" cards at t=53.5 and t=57.5.
3. **Multiple actions on one screen** — when two different elements are touched on the same screen (e.g., enter code, then click Next on Check Your Email), the reader should see one card per *element*. Today they get one per detection. Same-element duplicates ≠ different-element actions; both need clean handling.

Two upstream issues compound this:

4. **Step extraction is non-deterministic** — the same SOP went from 5 to 11 steps between runs.
5. **Step descriptions ignore narrated alternatives** — the trainer says "you can sign in with Google or use email"; only the email path makes it into the description.

The underlying mismatch is conceptual. The detector emits *anything that looks click-shaped*. What the reader needs is *each interaction with a target element*. Different abstraction.

## Mental model

A sub-step is a tuple **(verb, target_element)**. Verbs are Click, Input, Select, Link, View. Two events that point to the same target element on the same screen are one sub-step. Two different elements on the same screen produce two sub-steps. A screen with no detectable interaction that the reader still needs to see emits one View card.

## Architecture

```
build pool → detect candidates → classify+merge (typing) → batched LLM classifier per step → dedup + view pass → upload
                                                          ↑                                  ↑
                                                    one LLM call per step              pure deterministic
```

The detector becomes a candidate generator (over-recall on purpose). The LLM (currently Gemini via OpenRouter, but the design is provider-agnostic) does the action-vs-noise decision for a whole step in one batched call, with the catalog of distinct screens visible to it as context. A pure post-pass dedupes by `(stepIndex, screenId, elementId)` and emits View cards for screens that persist with no interaction.

**Defense in depth.** The same duplicate is rejected at three layers:
- **Detection layer** (§2) collapses adjacent identical-bbox events via a widened merge window with a lowered IOU threshold.
- **LLM layer** (§4) sees all surviving candidates for a step in one call and can mark the obvious press-flicker / transition by-product as `discard`.
- **Dedup layer** (§5) groups any remaining same-element candidates by `(screenId, elementId)` and keeps one.

This is intentional: each layer is independently testable and any single layer leaking a duplicate is recoverable.

## Section 1 — Action schema

```ts
type ElementAction = {
  verb: "click" | "input" | "select" | "link";
  screenId: string;         // assigned by dedup pass; see §3
  screenName: string;       // from the LLM (§4)
  elementId: string;        // = normalize(elementCaption): lowercased, whitespace-collapsed, punctuation-stripped, with a trailing closed-class suffix from {button, link, field, input, icon, tab, menu, item} also stripped
  elementCaption: string;   // from the LLM (§4), short reusable element name
  bbox: { x: number; y: number; w: number; h: number };  // normalized 0..1 against the FULL displayFrame image (post-mapping); ready for uploadScreenshots
  displayFrame: "before" | "after";
  displayFramePath: string; // resolved from candidate + displayFrame
  time: number;
};

type ViewAction = {
  verb: "view";
  screenId: string;
  screenName: string;
  displayFramePath: string; // representative frame of the cluster
  caption: string;          // localized constant; see §5
  time: number;             // midpoint of the cluster's time span within the step
  durationSec: number;
};

type Action = ElementAction | ViewAction;
```

**Dedup key.** ElementAction: `(stepIndex, screenId, elementId)` — verb is NOT in the key. If two candidates target the same element on the same screen with different verbs (e.g., a click-into-field event and an input event), they collapse into one. The merge rule in §5 step 3 chooses the resulting verb. ViewAction key: `(stepIndex, screenId)`.

**Bbox coordinate mapping.** The LLM returns `bbox` normalized to the CROP fed to it (§4). The classifier stage wraps `cropBboxToFullFrame` (already in `src/trigger/lib/cropEvent.ts`) to remap into full-frame coordinates before the bbox is stored on the `Action`. `uploadScreenshots.ts` already expects full-frame normalized bboxes; no change to its math. If `displayFrame === "before"`, the bbox is mapped using the BEFORE crop's window; if `"after"`, the AFTER crop's window (identical window dimensions today — same `extract` rect — but the function is written generically to handle future asymmetry).

**MongoDB `Screenshot` mapping.** Existing fields stay. Three optional fields added:

| New optional field | Source                              | Used for                       |
|--------------------|-------------------------------------|--------------------------------|
| `verb`             | `Action.verb`                       | UI rendering & analytics       |
| `screenName`       | `Action.screenName`                 | Composing displayed caption    |
| `elementCaption`   | `ElementAction.elementCaption`      | Composing displayed caption    |

Existing `description` field continues to be set: the upload stage composes it from `screenName + verb + elementCaption` for ElementAction or the View constant for ViewAction, so older clients render identically. `bbox`, `highlight.kind`, `r2Key`, `t`, `order`, `frameId` are unchanged. Old SOPs render as before; no backfill.

## Section 2 — Candidate detection

`detectClickEvents` becomes a candidate generator.

- **Drop the steadiness gate.** No more `fwd/bwd` mask-area ratio check.
- **Tighten `maxAreaFrac`** from 0.20 to 0.12. This is a structural transition filter: any component covering ≥12% of the screen is treated as page-level motion and rejected before the candidate list. With this cap there is no need for a separate `isTransition` flag.
- **Widen temporal merge window** from 1.5s to 4s, AND **lower `mergeIouMin`** from 0.30 to 0.20. The lower IOU is necessary because press-state bbox geometry can shift enough that a pure-IOU merge misses the second event. The time-delta comparison uses `<=` (not the current `<`) so a pair exactly at the boundary (e.g., the 1.5s "Get started free" case) is captured.
- **Cap candidates per step** at 25 (was a global `maxEventsPerVideo: 60`). The scope change is acknowledged: a 10-step video could in principle now produce more candidates than before; the downstream LLM batching (§4) handles this by chunking. Beyond the per-step cap, candidates are sorted by `area * density` and trimmed.

`classifyAndMergeEvents` (typing-session merge) stays as-is. It does honest work the LLM can't easily reconstruct.

## Section 3 — Screen identity

A `screenId` is produced for each ElementAction so the dedup pass can group by screen. Two signals, applied in this order:

1. **Masked perceptual hash (pre-LLM)**. For each step, sample the dense frame pool every 1.5s within `[tStart, tEnd]` and compute dHash of each sampled frame, downscaled to 256×256, with the top 6% (URL bar / tab strip) and bottom 8% (chat widgets, cookie banners) masked to neutral gray. Single-linkage cluster the sampled frames by pairwise Hamming ≤ 10/64. Each cluster gets a stable letter label (`A`, `B`, `C`, …) and a time span (earliest → latest member). Candidates in the step are then assigned to the cluster whose member's timestamp is nearest to the candidate's BEFORE-frame time. This means **clusters exist independently of candidates**, so a screen with zero detected actions can still have a long-lived cluster — required for the View-emission rule in §5 step 4.
2. **LLM screenName (post-LLM)**. After §4 returns, group action candidates within a step by `normalize(screenName)` (lowercased, trimmed, collapsed whitespace). Each group is a final screen.

**Final `screenId`** is `${stepIndex}-${seq}` where `seq` is the 1-based ordinal of the screen group within the step, ordered by earliest candidate `time`. The pre-LLM cluster letters are *not* part of the final ID — they exist only as a glance-aid in the prompt. The LLM is free to assign the same `screenName` to two pre-clusters (e.g., when typed text changed the pHash) and the post-pass will merge them.

**Order is not paradoxical.** The pHash clusters are a *hint*, not a contract. The LLM may put two letter-clusters under one `screenName` and the post-pass merges. The LLM may also put two candidates with the *same* letter-cluster under different `screenName` values (rare; usually means the LLM saw a meaningful change like a modal opening over the same base page), and the post-pass keeps them separate.

**Edge case (montage overflow).** If the number of clusters in a step exceeds the cap (§4 `maxMontageClusters`), the top-N clusters by total time span are kept; remaining clusters have **no** letter and pass `screenCluster: null` to the LLM (the candidate still receives its own BEFORE crop). §5 re-groups by `screenName` so labeling-less candidates are recoverable.

New file: `src/trigger/lib/screenId.ts`. Reuses `dHash` from `perceptualHash.ts`.

## Section 4 — Batched per-step LLM classifier

Replaces `groundOneWithLLM`. One LLM call per step (provider-agnostic naming: function is `classifyStepWithLLM`).

**Inputs to one call:**

- Step title.
- A **screen montage** image (when ≥2 clusters and ≤ `maxMontageClusters`): a single image laying out up to `maxMontageClusters` (default 6) representative full BEFORE frames in a row, each labeled with its cluster letter. If clusters exceed the cap, the montage is omitted and the LLM relies on each candidate's BEFORE crop for screen context. If only 1 cluster exists, the montage is omitted (no useful comparison).
- Per candidate (up to `maxCandidatesPerCall`, default 12): index, time, `kindHint`, diff bbox in crop, BEFORE crop, AFTER crop, and the cluster letter of its BEFORE frame.

**Chunking.** If a step has more than `maxCandidatesPerCall` candidates, candidates are first **sorted by `(screenCluster letter, time)`** so adjacent same-screen candidates stay together, then split into chunks of `maxCandidatesPerCall`. Each chunk receives the same montage and step title. Outputs are concatenated. The sort minimizes the chance of cross-chunk press-flicker pairs being split (same-screen pairs share a cluster letter and end up in the same chunk). Genuinely cross-chunk duplicates remain the dedup pass's responsibility (§5).

**Output schema (zod / strict JSON):**

```ts
const ClassifiedCandidate = z.object({
  index: z.number(),
  decision: z.enum(["action", "discard"]),
  // present iff decision === "action":
  verb: z.enum(["click", "input", "select", "link"]).nullable(),
  screenName: z.string().nullable(),
  screenCluster: z.string().nullable(), // "A" | "B" | ... must match a montage letter
  elementCaption: z.string().nullable(),
  bbox: BBox.nullable(),
  displayFrame: z.enum(["before", "after"]).nullable(),
  // present iff decision === "discard":
  discardReason: z.enum([
    "transition", "hover", "press_flicker", "animation", "other"
  ]).nullable(),
});
const StepClassification = z.object({
  candidates: z.array(ClassifiedCandidate),
});
```

Note: `"duplicate"` is **not** a discard reason. Dedup is the post-pass's job; the LLM only decides "is this thing an action or visual noise". The post-pass enforces uniqueness.

**Schema strictness.** The strict JSON-schema emitter in `openrouter.ts` requires all fields. Nullable conditional fields (`verb`, `screenName`, `screenCluster`, `elementCaption`, `bbox`, `displayFrame`, `discardReason`) are typed `T | null`. The "iff" semantics described above are guidance to the LLM, not schema-enforceable. §5 step 1 handles the edge case where `decision: "discard"` arrives with `discardReason: null` by treating reason as `"other"` and continuing — never a hard fail at the deserialization boundary.

**Prompt (`classifyStepSystem`):**

- Defines the action taxonomy (Click / Input / Select / Link) and the discard reasons.
- `elementCaption` is the *target element name*, short and reusable ("Verify email button", "verification code input") — not a sentence. The UI composes the visible string.
- `screenName` is the visible page/screen identifier (title text, modal heading, or functional name if no heading).
- `screenCluster` must match one of the labeled montage clusters when a montage is present; if no montage is present, the field is `null`.
- `displayFrame` rule: `"after"` for `verb === "input"` and for click verbs whose action *reveals* new UI in the AFTER crop (flyouts, dropdowns, modals); `"before"` otherwise. Matches the current production behavior.
- The LLM independently decides action vs discard per candidate.

**SDK change required.** `llmJson` and `llmJsonVision` in `src/lib/openrouter.ts` currently hard-code `temperature: 0.2`. Both functions gain an optional `temperature?: number` parameter that defaults to `0.2`. §4 calls pass `0.0`; §6 also uses `0.0`.

**Concurrency:** one call per step (or multiple chunked calls), all steps in parallel up to `perStepConcurrency`.

**Failure handling.** If all retries for a step (or chunk) fail, the SOP fails with `errorCode: "classify_failed"` (new value added to `ErrorCode` union in `src/lib/mongo.ts`). No fallback to per-event grounding — the new pipeline does not maintain a second code path; clean failure is preferable to silent degradation.

**Retry with backoff (SDK change).** The current `llmJson` / `llmJsonVision` retry loop in `src/lib/openrouter.ts` retries with no delay and on any error, which makes a transient 503 burst exhaust retries in milliseconds. The SDK change in this section adds:
- `retryDelayMs?: number` (default `1000`), used as the base for exponential backoff with full jitter: `delay = random(0, retryDelayMs * 2^attempt)`.
- Skip retry on HTTP 4xx (other than 408 / 429) — these are programming errors, not transient outages.
- Increase the default `maxRetries` for vision calls (`llmJsonVision`) to `3` (was effectively 1). Non-vision `llmJson` keeps its existing default of `1` — short text calls don't need the same retry budget.

With these in place, the no-fallback policy in §4 is acceptable: with `maxRetries: 3` and base `1000ms`, the worst-case sleep across 3 retries is `1s + 2s + 4s = 7s` plus four LLM round-trips. The SOP fails only after a sustained ~7s+RTT window of LLM unavailability per step.

## Section 5 — Dedup + View pass

Pure deterministic post-pass after the LLM returns.

**Inputs:** classified candidates per step (possibly from multiple chunks, concatenated), plus the step's pHash clusters with time spans and representative frames (from §3), plus the step's dense frame pool slice (for View frame fallback).

**Algorithm:**

1. **Drop discards.** Log each with reason: `pipeline.candidate.discarded { stepIndex, time, reason }`. If `decision: "discard"` arrives with `discardReason: null`, log reason as `"other"` and proceed (never a hard fail).
2. **Group by screen.** For surviving action candidates within a step, group by `normalize(screenName)` (lowercased, whitespace-collapsed, trailing punctuation stripped). Each group gets a `screenId = ${stepIndex}-${seq}` where `seq` is the 1-based ordinal of the group, ordered by earliest member `time`.
3. **Dedup by element.** Within each `screenId` group, sub-group by `elementId = normalize(elementCaption)`. For each sub-group:
   - Keep the **latest** member (highest `time`). Its frame shows the post-action state, which is what the reader confirms.
   - **Verb collapse rule:** if any member has `verb === "input"`, the resulting verb is `input`. Otherwise the verb of the latest member wins. Rationale: a click-into-field followed by typing is logically one Input action; the click is a precursor.
   - **Bbox:** the latest member's bbox is used. Union is *not* performed even when IOU is high — the latest crop already shows the right region, and unioned bboxes tend to over-cover.
   - Log `pipeline.action.deduped { stepIndex, screenId, elementId, kept_time, dropped_times: [...] }`.
4. **Emit View actions.** For each pHash cluster in the step (from §3, built from sampled dense-pool frames independently of candidates) whose time span ≥ `viewMinDurationSec` (default 4s) AND whose time span has zero **temporal overlap** with any surviving ElementAction's anchor time, emit one `ViewAction`. (Temporal overlap, not pre-LLM cluster assignment: this avoids a stale-assignment false positive where pre-LLM cluster A got reassigned by `screenName` grouping in step 2 but the surviving action's timestamp still falls inside A's time span.) Properties:
   - `screenName`: stored as `"this screen"` for analytics/grouping only. The UI does NOT render `screenName` for View cards — only `caption` is rendered. (We deliberately do not run an extra LLM call to name unlabeled clusters — cheap and acceptable.)
   - `caption`: a localized constant `"Review this screen before continuing."` (English) / `"Hãy xem màn hình này trước khi tiếp tục."` (Vietnamese). Selection follows `outputLanguage`.
   - `time`: midpoint of the cluster's time span within the step.
   - `displayFramePath`: the dense-pool frame at the cluster's median sampled timestamp (always available because the cluster was built from dense-pool samples).
5. **Order actions** within a step by `time` ascending.

**Cross-step screens.** View actions are emitted only within a single step. A screen that the user lingers on across a step boundary is not collapsed across steps; each step independently considers its own clusters. This is explicit and accepted — cross-step deduplication is out of scope.

**Edge cases:**

- Step with zero candidates but a long-lived pHash cluster → one View card.
- Step where every candidate is discarded → same.
- Same dedup key with different times → keep the latest; log all dropped times.
- Candidate whose `screenCluster` doesn't match any montage letter → treat `screenCluster` as `null` for screen grouping; the candidate still groups by `screenName` in step 2. Log `pipeline.classifier.unknown_cluster`.

New file: `src/trigger/stages/buildActionsForStep.ts`. Pure, unit-testable with synthetic classifier outputs.

## Section 6 — Step extraction stability and narrated alternatives

Two surgical changes to `runExtract` in `src/trigger/stages/extract.ts`.

**Stability:**

- Add a granularity floor and ceiling to `sopSystem`: *"Aim for one step per 60–180 seconds of narration. A typical 15-minute training video produces 5–12 steps. Combine micro-actions within a single goal into one step; do not split a single workflow across multiple steps."*
- Add a few-shot example: one positive (correct boundaries) and one negative (over-split) for a HubSpot-like SOP.
- Drop temperature to `0.0` for this call (requires the SDK change in §4).
- **Acknowledged limit.** Temperature 0 with a hosted LLM is not byte-identical determinism — providers may still vary. The combination of low temperature, granularity hints, and few-shot is best-effort. The sanity check below catches gross drift.

**Repair-on-drift.** After extraction, if `steps.length < 3` or `steps.length > 20`, re-run the call once with an even stricter prompt addendum: *"Your previous attempt produced N steps, which is outside the 3–20 range. Re-segment with the granularity rules above."* Choose the better of the two results:
- If exactly one attempt is in-range, use it.
- If both are in-range, use the second (it had the explicit feedback).
- If both are out-of-range, use the one with the **smaller** step count (under-segmentation is more recoverable downstream than 30 micro-steps; manual splitting beats manual merging). Tie → use the second attempt. Log `pipeline.step_extract.out_of_range` at error level.

Never a hard fail.

**Narrated alternatives:**

- Add to `sopSystem`: *"If the trainer mentions an alternative path they don't demonstrate (e.g., 'You can sign in with Google or enter your email'), include that alternative in the step's description as a brief note. Do not invent alternatives — only include what the trainer actually says."*

**Sanity check:** after extraction, log `pipeline.step_extract.count { sopId, count }` always; log at warn level when `count < 3 || count > 20`.

**Files:** `src/config/index.ts` (sopSystem prompt) and `src/trigger/stages/extract.ts` (temperature + sanity log + repair).

## Section 7 — Testing and rollout

**Unit tests** (`node:test` + `node:assert`, via `tsx --test`):

1. `screenId.test.ts` — masked pHash clustering on a fixture set: same-screen vs different-screen vs near-similar-screen frames; verify chrome regions are masked.
2. `buildActionsForStep.test.ts`:
   - Drops discards (including `discardReason: null` treated as `"other"`).
   - Dedups same `(screenId, elementId)` keeping the latest.
   - Verb-collapse: input wins over click for same element; latest wins among non-input verbs.
   - Bbox of the kept entry, not a union.
   - Cross-chunk dedup: feeds two chunks of classifier output where the same element appears in both chunks; assert one resulting action.
   - **Cross-chunk press-flicker with differing elementCaptions** ("Verify email button" vs "Verify email"): `elementId = normalize(elementCaption)` strips a closed-class suffix set `{button, link, field, input, icon, tab, menu, item}` (lowercased, trailing only). Assert the test fixture collapses both into one `elementId = "verify email"`.
   - Unifies pre-LLM cluster letters when the LLM gives them the same `screenName`.
   - **Emits View when a step has zero candidates** but the dense-pool-built pHash cluster spans ≥ threshold.
   - Emits View when all candidates in a cluster were discarded.
   - Orders actions chronologically.
   - Unknown `screenCluster` falls back to `screenName` grouping.
3. `classifyStepWithLLM.test.ts` — injection-style test (mirrors existing `groundEventsWithGemini.test.ts`): inject a fake classifier; assert candidate splitting into chunks when count > `maxCandidatesPerCall`; pre-chunk sort by `(screenCluster, time)` keeps same-screen candidates together; montage omitted when only 1 cluster or > `maxMontageClusters`; concatenated chunk outputs reach the dedup pass; assert `displayFrame: "after"` is requested for `verb: "input"` (by inspecting prompt string).
4. `clickEventDetect.test.ts` (extend existing): assert steadiness gate is removed; `maxAreaFrac=0.12` rejects large transitions; merge window=4s, mergeIouMin=0.20 collapses synthetic 1.5s-apart pairs with 0.25 IOU.
5. `extract.test.ts` — assert temperature is 0 (the SDK records the value); assert sanity log fires for `count=2`; assert repair re-runs once on out-of-range and accepts the second result; assert the prompt contains the "alternative path" instruction by string match.
6. `openrouter.test.ts` — assert `llmJson` and `llmJsonVision` accept an optional `temperature` and pass it through; default remains `0.2`; assert exponential backoff with jitter between retries (mock timer); assert 4xx (other than 408/429) does NOT trigger a retry.

**Regression fixture.** Capture a frozen dense-frame pool from a short fragment of the live SOP video (10–15 frames covering the "Get started free" and "Verify email" sequences) under `src/trigger/__fixtures__/`. `clickEventDetect.test.ts` and `buildActionsForStep.test.ts` reference this fixture for end-to-end gate behavior without hitting ffmpeg or the LLM.

**Smoke test:** re-run `process-sop-screenshots` against `6a04abd616f65270628d088b` after each section ships, inspect via `scripts/inspect-sop.mjs`, verify in Playwright.

**Acceptance criteria** for the final smoke:

- The "Create Your Free HubSpot Account" step (whichever index it lands at after stable extraction) shows **one** card per (screen, element) pair. Specifically: one "Get started free" card, one "Verify email" card, and on the Check your email screen, exactly **one** "verification code input" card AND **one** "Next button" card — two cards because two distinct elements, not because of duplicate detection.
- Each card's displayed caption uses the `(screenName, verb, elementCaption)` shape composed at upload time.
- The step's description mentions social login as an alternative.
- Total step count is between 3 and 20 across two consecutive runs, and the second run is within ±2 steps of the first run's count. (Exact-count stability is not achievable with a hosted LLM at temp 0; see §6.)

**Rollout:**

- All work on `master` against the dev environment.
- Replace, don't keep parallel paths. `groundEventsWithGemini.ts` is deleted; `classifyStepWithLLM.ts` is the new stage. `GroundedEvent` is replaced by the `Action` union (`src/lib/schemas.ts`). `processSopScreenshots.ts` is updated to consume `Action[]` and pass them to `uploadScreenshots`.
- One git commit per spec section. Smoke-test between commits.
- Section order matches plan order in §8; later commits depend on earlier ones.

## Section 8 — Implementation order

For the plan stage that follows this spec. Each is a separate landing.

1. SDK change: add `temperature?`, `retryDelayMs?` (exponential + jitter), and "skip retry on 4xx (≠ 408/429)" to `llmJson` / `llmJsonVision`. (Unblocks §4 and §6.)
2. `ErrorCode` union extension in `src/lib/mongo.ts`: add `"classify_failed"`.
3. Step extraction: prompt update + temperature=0 + repair-on-drift + sanity log + tests.
4. Detector changes: drop steadiness, tighten `maxAreaFrac`, widen merge window (with `<=`), lower mergeIouMin, per-step cap, fixture + tests.
5. Screen identity utility (`screenId.ts`) + cluster sampling from dense pool + tests.
6. Action schema (`schemas.ts`) + Mongo schema additions (`verb`, `screenName`, `elementCaption`).
7. Batched LLM classifier (`classifyStepWithLLM.ts`) + chunking + per-chunk sort + bbox crop→full-frame mapping + tests.
8. Dedup + view pass (`buildActionsForStep.ts`) — receives classifier output, pHash clusters, and dense-pool frames — + tests.
9. Pipeline wiring in `src/trigger/processSopScreenshots.ts`: remove the `runGroundEventsWithGemini` call and the `grounded` variable at lines ~165–169; pass the dense-pool slice into the new classifier and the dedup pass; consume `Action[]`; the upload adapter composes the displayed `description` from `screenName + verb + elementCaption`.
10. Delete the now-unreferenced `src/trigger/stages/groundEventsWithGemini.ts` module, its test file, and the `GroundedEvent` type from `src/lib/schemas.ts`. Verify the typecheck still passes.
11. Final smoke test against the live SOP; iterate if acceptance criteria miss.

## Out of scope

- Cursor tracking via template matching.
- Backfilling old SOPs with the new schema.
- Multi-language step extraction tuning beyond the language rule already in place.
- Drag / scroll action types.
- Cross-step screen continuity (View actions stay step-local).
