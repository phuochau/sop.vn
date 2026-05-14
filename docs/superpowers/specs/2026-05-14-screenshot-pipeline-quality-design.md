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
3. **Multiple actions on one screen treated as independent sub-steps** — genuinely different actions (enter code + click Next) on one screen still emit two cards. Reader experiences one screen but sees two cards.

Two upstream issues compound this:

4. **Step extraction is non-deterministic** — the same SOP went from 5 to 11 steps between runs.
5. **Step descriptions ignore narrated alternatives** — the trainer says "you can sign in with Google or use email"; only the email path makes it into the description.

The underlying mismatch is conceptual. The detector emits *anything that looks click-shaped*. What the reader needs is *each interaction with a target element*. Different abstraction.

## Mental model

A sub-step is a tuple **(verb, target_element)**. Verbs are Click, Input, Select, Link, View. Two events that point to the same target element on the same screen are one sub-step. A screen with no detectable interaction that the reader still needs to see emits one View card.

This is the abstraction we will encode in the schema, the LLM contract, and the dedup logic.

## Architecture

Pipeline stages, before → after:

```
build pool → detect candidates → classify+merge (typing) → ground per-event → upload
                                                          ↑
                                                    today's grounding
```

```
build pool → detect candidates → classify+merge (typing) → batched LLM classifier per step → dedup + view pass → upload
                                                          ↑                                  ↑
                                                    one Gemini call per step           pure deterministic
```

The detector becomes a candidate generator (over-recall on purpose). The LLM does the action-vs-noise decision for a whole step in one batched call, with the catalog of distinct screens visible to it as context. A pure post-pass dedupes by `(stepIndex, screenId, elementCaption)` and emits View cards for screens that persist with no interaction.

## Section 1 — Action schema

```ts
type ElementAction = {
  verb: "click" | "input" | "select" | "link";
  screenId: string;       // assigned by the dedup pass; see §3
  screenName: string;     // from the LLM (§4)
  elementId: string;      // = normalized(elementCaption), lowercased & whitespace-collapsed
  elementCaption: string; // from the LLM (§4), short reusable element name
  bbox: { x: number; y: number; w: number; h: number };
  displayFrame: "before" | "after";
  time: number;
};

type ViewAction = {
  verb: "view";
  screenId: string;
  screenName: string;
  caption: string;
  time: number;
  durationSec: number;
};

type Action = ElementAction | ViewAction;
```

Dedup key for `ElementAction` is `(stepIndex, screenId, verb, elementId)`. For `ViewAction` it is `(stepIndex, screenId)`.

`elementCaption` is a short reusable element name ("Verify email button", "verification code input") — not a sentence. The UI composes the rendered caption from `screenName + verb + elementCaption`.

`MongoDB.Screenshot` adds optional `verb` and `screenName`. Old documents stay readable; no backfill.

## Section 2 — Candidate detection

`detectClickEvents` becomes a candidate generator. Specific changes:

- **Drop the steadiness gate.** No more `fwd/bwd` mask-area ratio check.
- **Tighten `maxAreaFrac`** from 0.20 to 0.12 — anything bigger is a page transition.
- **Widen temporal merge window** from 1.5s to 4s with the same `mergeIouMin: 0.30`. Collapses press-flicker at the candidate level.
- **Add `isTransition: boolean` to each candidate.** True when the frame-pair's total mask area ≥ 40% of screen. The LLM uses this as a hint that the candidate is probably a transition by-product, not its own action.
- **Cap candidates per step** at 25 (was 60 global). Beyond the cap, sort by `area * density` and trim.

`classifyAndMergeEvents` (typing-session merge) stays as-is. It does honest work the LLM can't easily reconstruct.

## Section 3 — Screen identity

Two signals, combined:

1. **Masked perceptual hash.** Full BEFORE frame, downscaled to 256×256, with the top 6% (URL bar / tab strip) and bottom 8% (chat widgets, cookie banners) masked to neutral gray. Two frames share a screen if dHash Hamming distance ≤ 10/64.
2. **LLM-assigned screen name.** Returned by the §4 classifier.

Algorithm:

1. For each candidate, compute the masked pHash of the BEFORE frame.
2. Single-linkage cluster candidates within a step by pairwise Hamming ≤ 10/64 → each cluster gets a tentative `screenClusterHash`.
3. After §4 returns, unify clusters whose `screenName` matches case-insensitively (trimmed).
4. Final `screenId` is `${stepIndex}-${cluster_seq}`.

Cross-checking both signals eliminates both failure modes — pHash conflates visually-similar-but-distinct screens; LLM names drift across calls.

New file: `src/trigger/lib/screenId.ts`. Reuses `dHash` from `perceptualHash.ts`.

## Section 4 — Batched per-step LLM classifier

Replaces `groundOneWithLLM`. One Gemini call per step instead of one per event.

**Inputs:**

- Step title.
- A **screen montage** image: 2×N grid of distinct pHash-cluster representative full BEFORE frames in this step (each ~640px wide), labeled with cluster letters A, B, C, … The LLM sees the catalog of screens in this step at a glance.
- For each candidate: index, time, `isTransition`, `kindHint`, diff bbox in crop, BEFORE crop, AFTER crop, and the cluster letter of its BEFORE frame.

**Output schema (zod / strict JSON):**

```ts
const ClassifiedCandidate = z.object({
  index: z.number(),
  decision: z.enum(["action", "discard"]),
  verb: z.enum(["click", "input", "select", "link"]).nullable(),
  screenName: z.string().nullable(),
  screenCluster: z.string().nullable(),
  elementCaption: z.string().nullable(),
  bbox: BBox.nullable(),
  displayFrame: z.enum(["before", "after"]).nullable(),
  discardReason: z.enum([
    "transition", "hover", "press_flicker", "animation", "duplicate", "other"
  ]).nullable(),
});
const StepClassification = z.object({
  candidates: z.array(ClassifiedCandidate),
});
```

**Prompt** (`classifyStepSystem` replaces `groundEventSystem`):

- Defines the action taxonomy (Click / Input / Select / Link) and the discard reasons.
- `elementCaption` is the *target element name*, short and reusable ("Verify email button"), not a sentence. The UI composes the visible string.
- `screenName` is the visible page/screen identifier (title text, modal heading, or functional name if no heading).
- `screenCluster` must match one of the labeled montage clusters. Hard error if it doesn't.
- The LLM independently decides action vs discard per candidate.

**Concurrency:** one call per step, all steps in parallel up to `perStepConcurrency`.

**Fallback:** if a step call fails after retries, fall back to per-candidate grounding with an adapter that maps old `GroundedEvent` outputs into the new `ElementAction` shape, so we never lose a whole step's screenshots.

**Cost:** for typical 4–8 candidates per step, one batched call replaces 4–8 per-event calls. Net cheaper despite the montage image.

## Section 5 — Dedup + View pass

Pure deterministic post-pass after the LLM returns.

**Inputs:** classified candidates per step, plus pHash clusters with time spans.

**Algorithm:**

1. **Drop discards.** Log each with its reason.
2. **Resolve screenId.** Group action candidates by `(stepIndex, screenCluster)`. Unify clusters whose `screenName` matches case-insensitively.
3. **Dedup by element.** Within `(stepIndex, screenId)`, group action candidates by `elementCaption` (lowercased, trimmed). For each group: keep the latest event (post-action state); union bboxes only if pairwise IOU ≥ 0.6; verb collapses to `input` if any member is `input`, else takes the latest event's verb.
4. **Emit View actions.** For each pHash cluster in the step whose time span ≥ `viewMinDurationSec` (default 4s) and which has zero action events after dedup, emit one `ViewAction` with `caption = "Review this screen before continuing."` and `time = midpoint of the cluster's time span`.
5. **Order actions** within a step by `time` ascending.

**Edge cases:**

- Step with zero candidates but a long-lived pHash cluster → one View card.
- Step where every candidate is discarded → same.
- Candidate whose `screenCluster` doesn't match any montage cluster → drop and log (shouldn't happen — strict schema).
- Same dedup key with different times → keep the latest, log the merge.

New file: `src/trigger/stages/buildActionsForStep.ts`. Pure, unit-testable with synthetic classifier outputs.

## Section 6 — Step extraction stability and narrated alternatives

Two surgical changes to `runExtract`.

**Stability:**

- Add a granularity floor and ceiling to `sopSystem`: *"Aim for one step per 60–180 seconds of narration. A typical 15-minute training video produces 5–12 steps. Combine micro-actions within a single goal into one step; do not split a single workflow across multiple steps."*
- Add a few-shot example: one positive (correct boundaries) and one negative (over-split) for a HubSpot-like SOP.
- Drop temperature to `0.0` for this call.

**Narrated alternatives:**

- Add to `sopSystem`: *"If the trainer mentions an alternative path they don't demonstrate (e.g., 'You can sign in with Google or enter your email'), include that alternative in the step's description as a brief note. Do not invent alternatives — only include what the trainer actually says."*

**Sanity check:** after extraction, log `pipeline.step_extract.unusual_count` if `steps.length < 3` or `steps.length > 20`.

**Files:** `src/config/index.ts` (sopSystem prompt) and `src/trigger/stages/extract.ts` (temperature + sanity log).

## Section 7 — Testing and rollout

**Unit tests** (`node:test` + `node:assert`, via `tsx --test`):

1. `screenId.test.ts` — masked pHash clustering on a fixture set.
2. `buildActionsForStep.test.ts` — drops discards; dedups same `(screenId, elementCaption)` keeping latest; unifies clusters with matching screenName; emits View when cluster persists ≥ threshold with no actions; preserves chronological order.
3. `classifyStepWithGemini.test.ts` — injection-style test with mock classifier, asserts adapter wires inputs/outputs correctly.
4. Extend existing `extract` tests — assert temperature is 0 and sanity log fires for unusual counts.
5. Update `detectClickEvents` tests for new gates (steadiness removed, maxAreaFrac tightened, `isTransition` flag).

**Smoke test:** re-run `process-sop-screenshots` against `6a04abd616f65270628d088b` after each section ships, inspect via `scripts/inspect-sop.mjs`, verify in Playwright.

**Acceptance criteria** for the final smoke:

- Step 2 ("Create Your Free HubSpot Account") shows **one** "Get started free" card, **one** "Verify email" card, and **one** "Check your email" card per screen.
- Each card's caption uses the `(screenName, elementCaption)` shape.
- Step 2 description mentions social login as an alternative.
- Total step count stable across two consecutive runs (±0 steps).

**Rollout:**

- All work on `master` against the dev environment.
- Replace, don't keep parallel paths. `groundEventsWithGemini` becomes `classifyStepWithGemini`. `GroundedEvent` is replaced by the `Action` union. `processSopScreenshots.ts` updated to consume `Action[]`.
- One git commit per section landing, smoke-test between each.

## Out of scope

- Cursor tracking via template matching.
- Backfilling old SOPs with the new schema.
- Multi-language step extraction tuning.
- Drag / scroll action types.
