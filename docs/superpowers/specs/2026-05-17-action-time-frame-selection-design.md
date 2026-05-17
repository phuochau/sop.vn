# Action-Time Frame Selection — Design

**Date:** 2026-05-17
**Status:** Approved (brainstorming)

## Problem

In the screenshot SOP pipeline, sequential sub-steps that happen on the same
on-screen screen produce **duplicate-looking screenshots**.

Observed in SOP `6a08a7b1bd8d8846831c49d6`, step 2 ("Hoàn tất thông tin
doanh nghiệp"): the sub-step "enter your name" (`input`) and the sub-step
"click Next" (`click`) both resolved to the **same moment** of the "What is
your name?" screen (t = 72.5s), differing only in the highlight point.

### Root cause

The pipeline selects a frame per sub-step in two stages:

1. `runPickFrame` picks a **screen cluster** (which screen). Correct — both
   sub-steps occur on the name screen, so both pick that cluster.
2. `selectInClusterFrame(cluster, window)` picks **which frame inside the
   cluster**. Its current logic chooses the in-window frame whose perceptual
   hash (dHash) is **closest to the cluster representative**:

   ```ts
   let bestDist = hammingDistance(best.dHash, repMember.dHash);
   for (...) if (d < bestDist) { best = inWindow[i]; ... }
   ```

This is representative-bias: it picks the frame most *visually typical of the
screen*, not the frame at the *moment the action happens*. Every sub-step that
maps to the same cluster therefore collapses onto the same representative-like
frame.

Consequences:
- Screenshots look duplicated.
- The later sub-step's screenshot is **temporally wrong** — "click Next" shows
  the name field still empty, before the previous sub-step's typing happened.

Representative-bias is a screen-*identification* heuristic mistakenly applied
to frame-*moment* selection. The cluster already identifies the screen; within
it, the frame should be chosen by the sub-step's action time.

## Goal

Within an already-chosen screen cluster, select each sub-step's frame by its
**action time** and **sharpness**, instead of by similarity to the cluster
representative — so sequential same-screen sub-steps get distinct,
temporally-correct, in-focus frames.

## Approach

Selected approach: **A — time-based selection**, with a small-neighborhood
sharpness guard.

Rejected alternatives:
- **B — spread same-cluster sub-steps** (give the first an early frame, the
  next a later one). Treats the symptom positionally rather than using the
  real action time.
- **C — merge consecutive same-screen sub-steps** into one screenshot. Changes
  SOP structure and caption semantics; larger scope.

## Components

### 1. `computeActionTime(subStep, narration, step)`

New function in `src/trigger/stages/pickFrame.ts`, next to
`computeSearchWindow`. Returns the **action instant** for a sub-step:

- If the sub-step has narration segment ids and matching segments exist:
  return `max(segment.end)` over those segments — the **unpadded** end of the
  narration range. The action completes as or just after it is described, so
  the late edge of the narration best marks the action moment.
- Else if `subStep.timeWindow` is set: return `timeWindow.end`.
- Else: return `step.tEnd`.

The `step` parameter has type `{ tStart: number; tEnd: number }` — the same
shape `computeSearchWindow` already receives at the call site. The fallback
*ordering* (narration → `timeWindow` → `step`) matches `computeSearchWindow`'s;
each fallback returns the end edge, since this is an action *instant*, not a
window.

Padding (`searchWindowPrePadSec` / `searchWindowPostPadSec`) stays exclusive to
`computeSearchWindow`; it widens the candidate *search*, it does not locate the
action.

### 2. `frameSharpness(localPath)`

A small `async` helper exported from `src/trigger/lib/screenId.ts` (which
already imports `sharp`). Computes a focus measure for a frame:

- `const { sharpness } = await sharp(localPath).stats(); return sharpness;`
- `sharp`'s `Stats` already exposes a built-in `sharpness` field, documented
  as "estimation of greyscale sharpness based on the standard deviation of a
  Laplacian convolution" — exactly the variance-of-Laplacian focus measure we
  want. Higher = sharper.

Using the native `stats().sharpness` avoids hand-rolling greyscale +
convolution, so no separate `lib/sharpness.ts` file and no OpenCV dependency.
`frameSharpness` is exported so it can serve as the default `sharpnessFn` for
`selectInClusterFrame`.

### 3. `selectInClusterFrame` rewrite

In `src/trigger/lib/screenId.ts`. New signature:

```ts
export async function selectInClusterFrame(
  cluster: ScreenCluster,
  window: { start: number; end: number },
  actionTime: number,
  sharpnessFn?: (localPath: string) => Promise<number>,
): Promise<DensePoolFrame>
```

Logic:
1. Filter cluster members to those whose `frame.t` is within `window`
   (`inWindow`). If `inWindow` is empty, return `cluster.representative`
   (unchanged fallback).
2. Sort `inWindow` by `|frame.t - actionTime|` ascending; break ties on lower
   `frame.t` so the sort is fully deterministic.
3. Take the **K nearest** — `K = config.screenshots.selectFrame.actionNeighborhood`
   (default 5). If `inWindow` has fewer than K frames, take all of them.
4. Compute sharpness for those K frames only (`sharpnessFn ?? frameSharpness`).
5. Return the frame with the highest sharpness. On a sharpness tie, return the
   tied frame that appeared earliest in the step-2 ordering (i.e. nearest to
   `actionTime`, then lowest `t`) — the selection is fully deterministic.

`sharpnessFn` is injectable so the selection logic can be unit-tested without
running `sharp`.

### 4. Wiring

`src/trigger/processSopScreenshots.ts` (around lines 243–245): compute
`actionTime` via `computeActionTime` alongside `window`, and `await` the two
`selectInClusterFrame` calls (picked frame and runner-up frame).

### 5. Config

Add to `src/config` under `screenshots`:

```
selectFrame: { actionNeighborhood: 5 }
```

## Data flow

```
sub-step
  → computeSearchWindow → window   (padded; widens candidate search)
  → computeActionTime   → actionTime (unpadded narration end; the action moment)
  → runPickFrame → cluster (which screen)
  → selectInClusterFrame(cluster, window, actionTime)
        → frames in window
        → K nearest to actionTime
        → sharpest of those K
        → chosen frame
```

Note: `runPickFrame` already calls `computeSearchWindow` internally to build
its cluster shortlist, so the window is computed both inside `runPickFrame`
and again at the `processSopScreenshots` call site. This duplication is
pre-existing and unchanged by this design; `computeActionTime` is added
alongside the existing call-site `computeSearchWindow`.

## Testing

- **`computeActionTime`** — narration-end is used; `timeWindow.end` fallback
  when there are no narration segments; `step.tEnd` fallback when neither is
  available.
- **`frameSharpness`** — against the existing
  `src/trigger/stages/__fixtures__/sample-1080p.jpg` and a `sharp`-blurred copy
  of it; assert the blurred copy scores lower.
- **`selectInClusterFrame`** — with an injected fake `sharpnessFn` (no real
  `sharp`):
  - (a) picks the in-window frame nearest `actionTime`;
  - (b) within the K-neighborhood, picks the sharpest over the merely-nearest;
  - (c) regression: two different action times on one cluster yield two
    different frames;
  - (d) empty-in-window → returns `cluster.representative`;
  - (e) fewer than K frames in window → considers all of them, no crash;
  - (f) sharpness tie → resolves deterministically (nearest to `actionTime`,
    then lowest `t`).
- **`src/trigger/lib/screenId.test.ts`** — the two existing `selectInClusterFrame`
  calls (currently synchronous, two-arg) must be updated for the new
  three-arg `async` signature: add an `actionTime` argument and `await` the
  result before asserting. Without this they break (arity-invalid, and an
  unawaited `Promise` compared against a string).
- The only `selectInClusterFrame` call sites are `processSopScreenshots.ts` and
  `screenId.test.ts` (`pickFrame.test.ts` does not call it). Both are covered
  above; no other caller needs updating.

## Verification

After implementation, re-run the pipeline on
`samples/trimmed-hubspot_crm.mp4` — the same recording that produced SOP
`6a08a7b1bd8d8846831c49d6` — and confirm step 2's "enter name" and
"click Next" sub-steps resolve to **distinct** frames, with the "click Next"
screenshot showing the name field **filled in**.

## Scope

**In scope:** `pickFrame.ts` (`computeActionTime`), `screenId.ts`
(`selectInClusterFrame` rewrite + `frameSharpness` helper),
`processSopScreenshots.ts` wiring, `config`.

**Out of scope:**
- Planner / sub-step decomposition — unchanged.
- Cluster *identification* (`runPickFrame`, `buildScreenClusters`) — unchanged;
  only frame-*moment* selection within an already-chosen cluster changes.
- Merge / de-dup of same-screen sub-steps.

## Known limitation

If a sub-step's narration does not temporally separate it from a neighbouring
sub-step (the narrator describes two actions in one breath), their action times
collapse and the selected frames may still coincide. Approach A cannot fix
this; a merge/de-dup pass (approach B or C) would be required. This is accepted
and out of scope.
