# LLM-Driven Display-Frame Selection — Design

**Date:** 2026-05-17
**Status:** Draft (brainstorming)

## Problem

End-to-end verification of the bottom-up screenshots pipeline shows that
sub-step screenshots on **fast wizard / questionnaire screens** are frequently
wrong: the displayed image is a transition frame, a loading screen, or the
*next* screen, while the description names an element from a different screen.
Stable multi-action screens (signup form, contact-creation form) are fine.

### Confirmed root cause (instrumented, 3 re-runs of `trimmed-hubspot_crm.mp4`)

The CV pipeline assumes a click and its small local UI change are captured
between two adjacent stable pool frames. Fast wizards break that assumption in
three compounding ways:

1. **Screen clustering collapses similar screens.** `buildScreenClusters` uses
   a 9×8 masked dHash. Centered-white-card wizard screens hash within
   `hammingThreshold` of each other, so one cluster `A` absorbed ~6 distinct
   wizard screens over a 66-second span. With >6 clusters the montage is
   dropped, so every wizard candidate reaches the classifier with
   `screenCluster = null` — no cross-screen context at all.

2. **Frame-diff events straddle transitions.** `detectClickEvents` pairs
   adjacent pool frames. On a fast wizard the `beforeFramePath` /
   `afterFramePath` of an event land on *different* screens (or on loading
   screens). The diff bbox then lands on heading text — the region that differs
   most between two screens — not on the element the user clicked.

3. **Dedup keeps the latest frame.** `buildActionsForStep` dedups same-element
   actions and keeps the latest by time. When the CV detector fires several
   times across one click's transition, the latest frame is often a
   loading/transition frame, which becomes the screenshot.

The classifier itself reads screens correctly (its `screenName` /
`elementCaption` text is usually right). The failure is the *frames it is given
and the frame the pipeline displays*.

## Goal

Sub-step screenshots whose image, description, and yellow-circle highlight are
mutually consistent on fast wizard screens, reaching ≥95% consistency on the
`trimmed-hubspot_crm.mp4` benchmark — without regressing stable-screen steps.

## Approach

**Let the vision LLM choose the display frame.** The LLM reliably reads which
screen an action is on; CV frame-diff does not localize well on fast
transitions. So:

- Detection (`detectClickEvents`, `classifyAndMergeEvents`) is unchanged — it
  still gives event *times* and an approximate bbox hint.
- For each event the classifier receives a **candidate frame window**: an
  ordered set of dense-pool frames spanning the event's local time range. It
  returns the **index of the frame to display** — chosen to show the action's
  screen, stable (not mid-transition), element visible. It also discards
  loading / transition / chrome candidates as today.
- `buildActionsForStep` uses the chosen frame directly. The before/after
  `displayFrame` enum, the cross-screen hamming guard, and the montage /
  `screenCluster` plumbing are removed.
- Dedup becomes **time-windowed**: collapse same-element events only when they
  are close in time (a CV double-fire), never when they are seconds apart
  (a legitimately repeated action on a later screen). Screen grouping is
  dropped — actions are ordered purely by time.

Rejected alternatives:

- *Finer screen hashing / OCR-based clustering* — would fix clustering but not
  the straddling-frame problem; two fixes for one outcome.
- *Higher `sampleFps` alone* — denser frames help but the pipeline still has to
  *pick* the right one; without LLM selection the same wrong-frame logic picks
  a wrong denser frame.
- *Snap to the screen-cluster representative* — fails outright: clustering
  cannot separate wizard screens, so the representative is the wrong screen.

## Components

### 1. Candidate frame window — `classifyStepWithLLM.ts`

`classifyAndRemap` gains a `denseFrames` argument: the full pool, passed from
`processSopScreenshots` as `pool.denseFrames` (typed `DenseFrame[]` in
`buildFramePool.ts`, structurally `{ t: number; localPath: string }`). Reuse
the existing `DensePoolFrame` type from `src/trigger/lib/screenId.ts` for the
argument and helper signatures — `DenseFrame` is structurally assignable to it,
so no new type is introduced and no name collision is created.

New exported pure helper `buildCandidateWindow`:

```ts
buildCandidateWindow(
  denseFrames: DensePoolFrame[],
  event: RawEvent,
  opts: { maxFrames: number; preSec: number; postSec: number; maxSpanSec: number },
): DensePoolFrame[]
```

`classifyAndRemap` passes `opts` from config:
`{ maxFrames: config.screenshots.classify.maxWindowFrames, preSec: windowPreSec,
postSec: windowPostSec, maxSpanSec: windowMaxSpanSec }`.

- `buildCandidateWindow` takes a `RawEvent`. `RawEvent` has **no `index`
  field** — the candidate `index` is the loop position in `classifyAndRemap`
  (`index: i` over `args.events`), assigned by the caller, not derived here.
- Window time range: from `event.time - PRE_SEC` to `rangeEndT + POST_SEC`.
  `afterT` is the pool time of `event.afterFramePath`, looked up by exact match
  of the absolute `localPath` string against `denseFrames[].localPath`.
  `detectClickEvents` sets `before/afterFramePath` to `denseFrames[i].localPath`
  values, and `mergeEvents` / the typing-session merge only ever reassign these
  to *other* pool frames' paths — so each endpoint path individually still
  exists in `denseFrames`. If no match is found (defensive), `afterT` falls
  back to `event.time`.
- **Span cap.** A merged event (especially a long typing session) can have
  `afterT` many seconds after `event.time`, which would make a sparse
  multi-screen strip. Cap the range end:
  `rangeEndT = min(afterT, event.time + WINDOW_MAX_SPAN_SEC)`. The
  `event.afterFramePath` frame is still **force-included** as an anchor even
  when it falls outside the capped range, so the LLM always sees the result
  frame; the cap only keeps the *sampled* part of the window dense and local.
- `PRE_SEC = 1.5`, `POST_SEC = 1.5`, `WINDOW_MAX_SPAN_SEC = 6.0` (config:
  `screenshots.classify.windowPreSec` / `windowPostSec` / `windowMaxSpanSec`).
- Build the frame set in three explicit steps so the anchors are never lost:
  1. **Anchors:** the pool frames whose `localPath` equals `event.beforeFramePath`
     and `event.afterFramePath` (0–2 frames; same one if equal).
  2. **Sampled:** pool frames with `t` in the range, excluding the anchors;
     if this set exceeds `maxFrames - anchorCount`, downsample it evenly to
     that count (config `screenshots.classify.maxWindowFrames`, default 9).
     Decimation applies **only** to this sampled set — anchors are never
     decimated.
  3. **Combine:** union anchors + sampled, de-duplicate by `localPath`, sort
     ascending by `t`. Result length is ≤ `maxFrames`.
- Never returns empty: if both anchors are unavailable and the range yields
  nothing, return the single pool frame nearest `event.time`.
- Returns `DensePoolFrame[]` (each with `t` and the clean `localPath`).

The event's diff bbox (normalized 0..1, resolution-independent) is drawn on
every window frame with `markRegion` (existing helper). It is only meaningful
near `event.time`; on earlier/later window frames — possibly a different
screen — it is decoration that may land on empty space or the wrong element.
The prompt (§4) tells the model to treat it as an approximate hint, not a
guarantee.

### 2. Classifier I/O — `classifyStepWithLLM.ts`

`CandidateForLLM` becomes:

```ts
type CandidateForLLM = {
  index: number;          // event index within the step
  time: number;
  kindHint: "click" | "input";
  windowFramePaths: string[];   // ordered, marked; length 1..maxWindowFrames
};
```

(`beforeMarkedPath` / `afterMarkedPath` / `screenCluster` are removed.)
`windowFramePaths` are the **marked** (magenta-boxed) frames written into the
temp dir — what the LLM sees. They are positionally 1:1 with the clean
`DensePoolFrame[]` window from `buildCandidateWindow`; `displayFrameIndex`
indexes both.

`defaultClassifier` sends all candidates' `windowFramePaths` as one flat ordered
image list — **candidate-by-candidate in `index` order**: candidate 0's window
frames first, then candidate 1's, etc. The user text lists, per candidate, its
`index` and the length of its window, so the model can map flat image positions
to `(candidate, displayFrameIndex)` and knows each candidate's valid index
range is `0 .. windowLength-1` (the index is **into that candidate's own
window**, not the flat list). The montage image and all montage code are
removed:
`buildMontage`, `nearestCluster`, and the `montageImagePath` parameter — which
threads through the `ClassifierFn` type, the `classifyStepWithLLM` args, and
`defaultClassifier` args — are all deleted.

`classifyAndRemap`:
- Per event, calls `buildCandidateWindow` → a clean `DensePoolFrame[]` window;
  marks each window frame with the bbox into the temp dir → marked paths.
  The per-candidate internal record is
  `CandidateForLLM & { event: RawEvent; window: DensePoolFrame[] }` — it retains
  the clean `DensePoolFrame[]` window (with `t`, for index resolution) and the
  `event` (for the nearest-`event.time` fallback), alongside the marked
  `windowFramePaths`. `window` and `windowFramePaths` are positionally 1:1.
  Candidates are matched back after classification by
  `candidates.find(c => c.index === cc.index)`, as today.
- After classification, resolves each `action` candidate's `displayFrameIndex`
  and produces `ClassifiedActionRecord`.
- **Index resolution rule** — for a record with `decision === "action"`, let
  `window` be its clean `DensePoolFrame[]`:
  - valid index in `[0, window.length - 1]` → resolved index = that index;
  - index out of range → clamp to `[0, window.length - 1]`, log
    `pipeline.classifier.index_clamped`;
  - `displayFrameIndex === null` (an LLM error on an action — the schema allows
    null only for discards) → resolved index = the index of the window frame
    whose `t` is **nearest `event.time`**, log
    `pipeline.classifier.index_missing`. The action is kept, not dropped.
- `displayFramePath` = `window[resolvedIndex].localPath` — the **clean,
  unmarked** pool frame. Downstream (`highlightActions`, `uploadScreenshots`)
  must receive the clean frame, never the magenta-marked one.
  The window is never empty (see §1), so resolution always yields a path.
- **Discard records:** `classifyAndRemap` still emits a `ClassifiedActionRecord`
  for every classified candidate (discards included, as today). For
  `decision === "discard"` there is no frame to resolve — set
  `displayFramePath: ""`. `buildActionsForStep` drops discards before the
  validity guard, so the empty string is never used.
- The cross-screen hamming guard and `maskedDHash`/`hammingDistance` use here
  are deleted.

`classifyAndRemap`'s args change: the `screenClusters` argument is **removed**
(its only use was the montage, now gone). New args:
`{ stepTitle, language, events, denseFrames }`. The `screenId.ts` import in
this file changes from `{ maskedDHash, type ScreenCluster }` to
`{ type DensePoolFrame }`; the `perceptualHash` import (`hammingDistance`) is
removed entirely.

`ClassifiedActionRecord` becomes:

```ts
type ClassifiedActionRecord = ClassifiedCandidate & {
  displayFramePath: string;   // resolved concrete frame for this action
};
```

(`beforeFramePath` / `afterFramePath` are removed — nothing downstream needs
them once the frame is resolved here.)

`chunkCandidatesBySort` is kept but simplified to sort by `time` only; its
generic constraint changes from `<T extends { screenCluster: string | null;
time: number }>` to `<T extends { time: number }>`. `maxCandidatesPerCall`
chunking is unchanged. Note: chunking reorders the LLM I/O, but each
candidate's `index` remains the stable original position in the step's event
array — `buildActionsForStep` indexes `eventTimes` by `record.index`, so the
classifier returning candidates in chunk order is harmless. Do **not** renumber
`index` when simplifying the sort.

### 3. `ClassifiedCandidate` schema — `src/lib/schemas.ts`

- Remove `screenCluster` and `displayFrame`.
- Add `displayFrameIndex: z.number().int().nullable()` — the index into the
  candidate's window; `null` for discards.
- `screenName` is **kept** purely as a human-readable label / debug field. It
  is no longer used for grouping or dedup — nothing keys off it.
- Fields after change: `index`, `decision`, `verb`, `screenName`,
  `elementCaption`, `displayFrameIndex`, `discardReason`.
- `StepClassification` (`schemas.ts`) needs **no** change — it is just
  `{ candidates: array(ClassifiedCandidate) }` and updates transitively.

### 4. `classifyStepSystem` prompt — `src/config/index.ts`

Rewrite to match the new input/output:
- Input: the images for all candidates in the batch are supplied as one flat
  list, **grouped per candidate in `index` order** — each candidate's user-text
  line states its `index` and window length so the model knows which images
  belong to it. Each candidate's images are an **ordered series of full window
  frames** covering a short time span around the action; the detected change
  region is outlined in magenta on every frame.
- `displayFrameIndex` is **0-based into that candidate's own window** (range
  `0 .. windowLength-1`), not the flat image list.
- Magenta box is an **approximate motion hint** — explicitly tell the model it
  may be inaccurate or land on heading text during fast screen transitions, and
  to trust the cursor position and what visibly changed over the box.
- Output `displayFrameIndex`: the 0-based index of the window frame to show the
  user. Pick the frame that **clearly shows the screen the action happened on**,
  is **not mid-transition / not a loading screen**, and shows the target
  element. For `input` / `select`, pick the frame showing the *result* (typed
  text visible, dropdown open). For `click` / `link`, pick the frame showing
  the *source* screen with the element present.
- Keep and re-state the aggressive discard guidance for loading/progress
  screens, mid-transition frames, and incidental chrome — now the model sees a
  whole window, so a loading screen mid-window is unambiguous.
- Remove all montage / `screenCluster` instructions.

### 5. `buildActionsForStep.ts`

- Drop screen grouping (`screenGroups` / `orderedScreens` / `normalizeScreenName`
  / `screenId`).
- The surviving-record validity guard (currently `buildActionsForStep.ts:55`,
  which rejects records missing `verb`/`screenName`/`elementCaption`/
  `displayFrame`) changes: it no longer checks `displayFrame`; instead it
  rejects records with an empty/missing `displayFramePath`. `screenName`,
  `verb`, and `elementCaption` are still required to be non-empty (they are
  the action's label/description).
- `displayFramePath` is taken directly from `ClassifiedActionRecord`.
- `eventTimes: number[]` stays as an argument — `ClassifiedActionRecord` carries
  no time field, so per-event time still comes from `eventTimes[record.index]`,
  used for both dedup and final ordering.
- **Time-windowed dedup.** Group surviving records by `normalizeElementId`.
  Within a group, sort by event time ascending and walk it: the first record
  starts a *cluster* and is its **anchor**; each subsequent record whose time
  is within `config.screenshots.classify.dedupWindowSec` (default 4.0) of the
  **anchor's** time joins that cluster; the first record beyond the window
  starts a new cluster and becomes the new anchor. (Anchor-based, not
  nearest-prior — no chaining.) Each cluster emits one action:
  - kept record = the **earliest** (the anchor) — the click itself; later
    same-element diffs are transition aftermath;
  - `verb` = `"input"` if any record in the cluster has `verb === "input"`,
    else the anchor record's `verb` (preserves the existing input-wins rule);
  - `displayFramePath` / `caption` = from the anchor record;
  - `time` = the anchor's event time.
  Same-element records in separate clusters (far apart in time) each emit their
  own action.
  - **Deliberate behavior change:** dedup keys on `normalizeElementId` + the
    time window only — *not* on screen. Two genuinely different elements that
    normalize to the same caption on two different screens would collapse only
    if also within `dedupWindowSec` (4.0s) of each other. Given the short
    window and that distinct screens are normally seconds apart, this is
    acceptable and simpler than re-introducing screen identity.
- `viewGroups` logic is unchanged — it still uses `screenClusters` for long
  static screens with no action overlap.
- `Action` output shape is unchanged; actions are ordered by `time` ascending.

### 6. `processSopScreenshots.ts`

- `classifyAndRemap` is now called with `{ stepTitle, language, events,
  denseFrames: pool.denseFrames }` — `screenClusters` is no longer passed to it.
- `buildScreenClusters` is still called and its result is still passed to
  `buildActionsForStep` (for `viewGroups`).
- The invariant the indexing depends on is preserved: the same `stepEvents`
  array is the source of `classifyAndRemap`'s `events` arg and
  `buildActionsForStep`'s `eventTimes` arg — do not reorder one independently.

### 7. Config — `src/config/index.ts`

`screenshots.classify` becomes:

```ts
classify: {
  maxCandidatesPerCall: 12,
  maxWindowFrames: 9,
  windowPreSec: 1.5,
  windowPostSec: 1.5,
  windowMaxSpanSec: 6.0,
  dedupWindowSec: 4.0,
},
```

`screenshots.screenId.maxMontageClusters` is removed (montage gone).
`sampleFps` stays at 2 for now; revisit only if the e2e shows the right frame
is genuinely absent from the pool (see Verification).

## Data flow

```
RawEvent (time, bbox, before/after frame paths)
  → buildCandidateWindow(denseFrames, event)  → ordered pool frames
  → markRegion on each window frame (magenta bbox hint)
  → classifyStepWithLLM: LLM sees the window, returns displayFrameIndex
  → ClassifiedActionRecord { ...candidate, displayFramePath }
  → buildActionsForStep: time-windowed dedup, order by time
  → highlightActions → UI-TARS circle on elementCaption
  → uploadScreenshots
```

## Testing

- **`buildCandidateWindow`** — new unit tests: window respects the time range;
  downsamples to `maxFrames` keeping first and last; always includes
  before/after frames; never returns empty (empty-range and missing-frame
  fallbacks).
- **`buildActionsForStep.test.ts`** — update the `ClassifiedActionRecord`
  factory and every fixture: the factory hard-codes `screenCluster`,
  `displayFrame`, `beforeFramePath`, `afterFramePath` — replace with
  `displayFramePath`; discard-case fixtures that set `screenCluster: null` /
  `displayFrame: null` instead carry `displayFrameIndex: null` (on
  `ClassifiedCandidate`) and need no path. The existing same-element dedup test
  currently asserts the **latest** event is kept (`t=47.5`); under anchor-based
  dedup it must assert the **earliest** anchor is kept (`t=46.0`) — invert the
  expectation, do not just update fixtures. Keep its `eventTimes` gaps inside
  `dedupWindowSec` (4.0) so the records still collapse. Add tests: same-element
  events beyond the window stay separate actions; the input-wins verb rule
  still holds within a cluster; ordering is by time. Keep the existing
  verb-collapse test, adapted.
- **`classifyStepWithLLM.test.ts`** — substantial rework, not just fixtures:
  - the four `chunkCandidatesBySort` tests are built on `screenCluster`; since
    `chunkCandidatesBySort` now sorts by `time` only, rewrite them to assert
    time-ordered chunking and delete the `screenCluster`-specific cases (e.g.
    the null-`screenCluster` test);
  - update `CandidateForLLM` fixtures to `windowFramePaths`;
  - the injected-classifier outputs currently return `screenCluster` and
    `displayFrame` per candidate — change them to return `displayFrameIndex`,
    drop `screenCluster`/`displayFrame`;
  - add an out-of-range-`displayFrameIndex` clamp test.
- **Typecheck** — `npx tsc --noEmit -p tsconfig.json` clean.
- Tests run with `node:test` via `npx tsx --test <file>`.

## Verification (manual, gates the iteration loop)

Re-run the pipeline on `samples/trimmed-hubspot_crm.mp4` with `STEPIKA_DEBUG_DIR`
set. For **every** surviving action, view the chosen `displayFramePath` and
score it consistent / inconsistent against the three-way test: image shows the
action's screen, description names an element present on it, the circle would
land on that element. Accuracy = consistent / total. Iterate prompt/config
until ≥95%. If the debug dump shows the correct frame is absent from the
candidate window entirely, raise `sampleFps` as a follow-up tuning step.

## Scope

**In scope:** `buildCandidateWindow` + tests; `classifyStepWithLLM.ts` rework
(window building, I/O, drop montage + hamming guard); `ClassifiedCandidate`
schema; `classifyStepSystem` prompt rewrite; `buildActionsForStep.ts` rework
(drop screen grouping, time-windowed dedup); `processSopScreenshots.ts` wiring;
`screenshots.classify` / `screenId` config; update affected tests.

**Out of scope:**
- `detectClickEvents` / `classifyAndMergeEvents` detection logic — unchanged.
- `runLocateHighlight` / `highlightActions` — unchanged.
- `buildScreenClusters` — kept for `viewGroups`; only its montage use is removed.
- `sampleFps` change — deferred, contingent on verification.
- The `STEPIKA_DEBUG_DIR` instrumentation in `classifyStepWithLLM.ts` — kept as
  an env-gated debug aid for the iteration loop, but **adapted** to the new
  data: it must dump each candidate's window frames (e.g. `c{i}-w{k}.jpg`) and
  the chosen `displayFrameIndex` instead of the removed `beforeMarkedPath` /
  `afterMarkedPath` / `screenClusters` / `cluster-{letter}.jpg`. Cleaned up or
  promoted to a proper trace after ≥95% is reached (tracked separately).

## Known consideration

A candidate window is up to `maxWindowFrames` (9) full frames per event versus
2 today — more image tokens per classifier call. Accepted: correctness is the
priority and `maxCandidatesPerCall` still bounds per-call size. Downscaling
window frames before sending is a follow-up tuning knob, not part of this spec.
