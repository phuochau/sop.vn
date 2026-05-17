# LLM-Driven Display-Frame Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the vision LLM pick which dense-pool frame to display for each detected user action, so sub-step screenshots are consistent on fast wizard/questionnaire screens.

**Architecture:** Detection (`detectClickEvents` / `classifyAndMergeEvents`) is unchanged. For each event the classifier receives an ordered *window* of dense-pool frames spanning the event's local time range and returns the index of the frame to display. `buildActionsForStep` uses that frame, dedups by element within a time window, and orders by time. The montage, `screenCluster` plumbing, the before/after `displayFrame` enum, and the cross-screen hamming guard are removed.

**Tech Stack:** TypeScript, `node:test` via `npx tsx --test`, Zod, `sharp`, trigger.dev v4.

**Reference:** the full design is `docs/superpowers/specs/2026-05-17-llm-display-frame-selection-design.md` — implementers MUST read the spec section named in each task.

**Build-state note:** this is a tightly-coupled rework. The schema change in Task 2 makes `tsc` red until the test files are updated in Tasks 4–5. Each task below states its expected `tsc` / test state explicitly. Per-task commits are expected; the transient red is confined and shrinking, and Task 6 verifies a fully green build.

---

### Task 1: `buildCandidateWindow` helper

**Files:**
- Modify: `src/trigger/stages/classifyStepWithLLM.ts` (add one exported function)
- Test: `src/trigger/stages/classifyStepWithLLM.test.ts` (add a test block)

Spec section: **§1 Candidate frame window**.

- [ ] **Step 1: Write the failing tests**

Append to `classifyStepWithLLM.test.ts`:

```ts
import { buildCandidateWindow } from "./classifyStepWithLLM";
import type { RawEvent } from "./classifyAndMergeEvents";

function frame(t: number): { t: number; localPath: string } {
  return { t, localPath: `/f${t}.jpg` };
}
function evt(over: Partial<RawEvent>): RawEvent {
  return {
    time: 10, bbox: { x: 0, y: 0, w: 0.1, h: 0.1 },
    beforeFramePath: "/f9.jpg", afterFramePath: "/f11.jpg",
    area: 1, density: 0.5, kindHint: "click", ...over,
  };
}
const WIN = { maxFrames: 9, preSec: 1.5, postSec: 1.5, maxSpanSec: 6.0 };

test("buildCandidateWindow returns frames within the time range, sorted by t", () => {
  const pool = [frame(7), frame(9), frame(10), frame(11), frame(13)];
  const w = buildCandidateWindow(pool, evt({}), WIN);
  assert.deepEqual(w.map(f => f.t), [9, 10, 11]); // [10-1.5 .. 11+1.5] = [8.5..12.5]
});

test("buildCandidateWindow downsamples to maxFrames but always keeps the anchors", () => {
  const pool = Array.from({ length: 30 }, (_, i) => frame(8.5 + i * 0.2)); // dense
  const e = evt({ beforeFramePath: pool[2].localPath, afterFramePath: pool[20].localPath });
  const w = buildCandidateWindow(pool, e, { ...WIN, maxFrames: 6 });
  assert.ok(w.length <= 6);
  assert.ok(w.some(f => f.localPath === pool[2].localPath), "before anchor kept");
  assert.ok(w.some(f => f.localPath === pool[20].localPath), "after anchor kept");
});

test("buildCandidateWindow caps the sampled span via maxSpanSec but force-includes the after anchor", () => {
  // after anchor is 20s after event.time — far outside the capped range
  const pool = [frame(9), frame(10), frame(11), frame(20), frame(30)];
  const e = evt({ beforeFramePath: "/f9.jpg", afterFramePath: "/f30.jpg", time: 10 });
  const w = buildCandidateWindow(pool, e, { ...WIN, maxSpanSec: 6.0 });
  assert.ok(w.some(f => f.t === 30), "far after-anchor still force-included");
  assert.ok(!w.some(f => f.t === 20), "frame inside the gap but outside the cap is excluded");
});

test("buildCandidateWindow never returns empty — falls back to nearest frame", () => {
  const pool = [frame(100), frame(200)];
  const w = buildCandidateWindow(pool, evt({ time: 10, beforeFramePath: "/x", afterFramePath: "/y" }), WIN);
  assert.equal(w.length, 1);
  assert.equal(w[0].t, 100);
});

test("buildCandidateWindow returns empty only for an empty pool", () => {
  assert.deepEqual(buildCandidateWindow([], evt({}), WIN), []);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/trigger/stages/classifyStepWithLLM.test.ts`
Expected: FAIL — `buildCandidateWindow` is not exported.

- [ ] **Step 3: Implement `buildCandidateWindow`**

Add to `classifyStepWithLLM.ts` (after the imports; import `DensePoolFrame` type from `@/trigger/lib/screenId` and `RawEvent` is already imported). Implement exactly per spec §1: three-step build (anchors → sampled-with-decimation → combine/dedup/sort), span cap, never-empty fallback. The decimation helper must keep the first and last of the sampled set and space the rest evenly. Returns `DensePoolFrame[]`.

```ts
export function buildCandidateWindow(
  denseFrames: DensePoolFrame[],
  event: RawEvent,
  opts: { maxFrames: number; preSec: number; postSec: number; maxSpanSec: number },
): DensePoolFrame[] {
  if (denseFrames.length === 0) return [];
  const sorted = [...denseFrames].sort((a, b) => a.t - b.t);
  const byPath = new Map(sorted.map(f => [f.localPath, f] as const));

  const beforeAnchor = byPath.get(event.beforeFramePath) ?? null;
  const afterAnchor = byPath.get(event.afterFramePath) ?? null;
  const afterT = afterAnchor ? afterAnchor.t : event.time;

  const rangeStart = event.time - opts.preSec;
  const rangeEnd = Math.min(afterT, event.time + opts.maxSpanSec) + opts.postSec;

  const anchors: DensePoolFrame[] = [];
  if (beforeAnchor) anchors.push(beforeAnchor);
  if (afterAnchor && afterAnchor.localPath !== beforeAnchor?.localPath) anchors.push(afterAnchor);
  const anchorPaths = new Set(anchors.map(a => a.localPath));

  let sampled = sorted.filter(
    f => f.t >= rangeStart && f.t <= rangeEnd && !anchorPaths.has(f.localPath),
  );
  const budget = Math.max(0, opts.maxFrames - anchors.length);
  if (sampled.length > budget) sampled = decimateEvenly(sampled, budget);

  const seen = new Set<string>();
  const out: DensePoolFrame[] = [];
  for (const f of [...anchors, ...sampled].sort((a, b) => a.t - b.t)) {
    if (seen.has(f.localPath)) continue;
    seen.add(f.localPath);
    out.push(f);
  }
  if (out.length > 0) return out;

  let nearest = sorted[0];
  for (const f of sorted) {
    if (Math.abs(f.t - event.time) < Math.abs(nearest.t - event.time)) nearest = f;
  }
  return [nearest];
}

function decimateEvenly(frames: DensePoolFrame[], n: number): DensePoolFrame[] {
  if (n <= 0) return [];
  if (frames.length <= n) return frames;
  if (n === 1) return [frames[0]];
  const picked: DensePoolFrame[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    const idx = Math.round((i * (frames.length - 1)) / (n - 1));
    const f = frames[idx];
    if (!seen.has(f.localPath)) { seen.add(f.localPath); picked.push(f); }
  }
  return picked;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/trigger/stages/classifyStepWithLLM.test.ts`
Expected: PASS (all tests, old and new). `tsc` is still green at this point.

- [ ] **Step 5: Commit**

```bash
git add src/trigger/stages/classifyStepWithLLM.ts src/trigger/stages/classifyStepWithLLM.test.ts
git commit -m "feat(classify): add buildCandidateWindow frame-window helper"
```

---

### Task 2: Schema + config

**Files:**
- Modify: `src/lib/schemas.ts` (the `ClassifiedCandidate` schema)
- Modify: `src/config/index.ts` (the `screenshots.classify` and `screenshots.screenId` blocks)

Spec sections: **§3 ClassifiedCandidate schema**, **§7 Config**.

- [ ] **Step 1: Update `ClassifiedCandidate`**

In `src/lib/schemas.ts`, replace the `ClassifiedCandidate` object with:

```ts
export const ClassifiedCandidate = z.object({
  index: z.number(),
  decision: z.enum(["action", "discard"]),
  verb: z.enum(["click", "input", "select", "link"]).nullable(),
  screenName: z.string().nullable(),
  elementCaption: z.string().nullable(),
  displayFrameIndex: z.number().int().nullable(),
  discardReason: z.enum(["transition", "hover", "press_flicker", "animation", "not_a_ui", "other"]).nullable(),
});
```

(`screenCluster` and `displayFrame` removed; `displayFrameIndex` added. `StepClassification` is unchanged — it wraps `ClassifiedCandidate`.)

- [ ] **Step 2: Update config**

In `src/config/index.ts`, replace the `classify` block under `screenshots`:

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

And in the `screenId` block, **delete** the `maxMontageClusters: 6` line.

- [ ] **Step 3: Verify scope of breakage**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: errors ONLY in `classifyStepWithLLM.ts`, `buildActionsForStep.ts`, `classifyStepWithLLM.test.ts`, `buildActionsForStep.test.ts`. `processSopScreenshots.ts` does NOT error yet — it only errors after Task 3 changes `classifyAndRemap`'s signature. If any file outside that four-file set errors, STOP and report.

- [ ] **Step 4: Commit**

```bash
git add src/lib/schemas.ts src/config/index.ts
git commit -m "feat(classify): displayFrameIndex schema + window config"
```

(Transient red `tsc` is expected and confined; Tasks 3–5 resolve it.)

---

### Task 3: Production rework — `classifyStepWithLLM.ts`, `buildActionsForStep.ts`, `processSopScreenshots.ts`, prompt

**Files:**
- Modify: `src/trigger/stages/classifyStepWithLLM.ts`
- Modify: `src/trigger/stages/buildActionsForStep.ts`
- Modify: `src/trigger/processSopScreenshots.ts`
- Modify: `src/config/index.ts` (the `classifyStepSystem` prompt only)

Spec sections: **§2 Classifier I/O**, **§4 prompt**, **§5 buildActionsForStep**, **§6 processSopScreenshots**. Read all four before starting.

- [ ] **Step 1: Rework `classifyStepWithLLM.ts`** — apply spec §2 exactly:
  - `CandidateForLLM`: `{ index, time, kindHint, windowFramePaths: string[] }`.
  - `ClassifiedActionRecord` = `ClassifiedCandidate & { displayFramePath: string }`.
  - `ClassifierFn` / `classifyStepWithLLM` / `defaultClassifier`: drop `montageImagePath`. `defaultClassifier` builds the flat `imagePaths` array by concatenating every candidate's `windowFramePaths` **candidate-by-candidate in `index` order** (candidate 0's window first, then candidate 1's, …); the user text lists, per candidate, its `index` and its window length so the model can map flat image positions back. See spec §2 and §4.
  - The per-candidate internal record in `classifyAndRemap` is `CandidateForLLM & { event: RawEvent; window: DensePoolFrame[] }` (clean window kept for index resolution; `event` kept for the nearest-`event.time` fallback). Match candidates back with `candidates.find(c => c.index === cc.index)`.
  - Discard records (`decision === "discard"`): emit a `ClassifiedActionRecord` as today, with `displayFramePath: ""` (no frame to resolve; `buildActionsForStep` drops discards before using it).
  - The `buildCandidateWindow` call passes `{ maxFrames: config.screenshots.classify.maxWindowFrames, preSec: config.screenshots.classify.windowPreSec, postSec: config.screenshots.classify.windowPostSec, maxSpanSec: config.screenshots.classify.windowMaxSpanSec }`.
  - Delete `buildMontage` and `nearestCluster` (both their function definitions — `nearestCluster` is a standalone function at the file bottom — and all call sites), and all other montage code.
  - `chunkCandidatesBySort`: generic constraint → `<T extends { time: number }>`, sort by `time` only.
  - `classifyAndRemap`: args `{ stepTitle, language, events, denseFrames }`; per event call `buildCandidateWindow`, mark each window frame with `markRegion` into the temp dir, keep BOTH the clean `DensePoolFrame[]` window and the marked `windowFramePaths` per candidate; after classification apply the **index resolution rule** (valid → use; out-of-range → clamp + `pipeline.classifier.index_clamped`; `null` on an action → nearest-`event.time` frame + `pipeline.classifier.index_missing`); `displayFramePath` = the **clean unmarked** `window[resolvedIndex].localPath`.
  - Delete the cross-screen hamming guard and the `maskedDHash` / `hammingDistance` / `perceptualHash` imports.
  - Imports from `screenId.ts`: `{ type DensePoolFrame }` (drop `maskedDHash`, `ScreenCluster`).
  - Adapt the `STEPIKA_DEBUG_DIR` block: dump each candidate's window frames as `c{i}-w{k}.jpg` and add `displayFrameIndex` / `displayFramePath` to the debug rows; remove the `beforeMarkedPath`/`afterMarkedPath`/`screenClusters`/`cluster-{letter}.jpg` dumps.

- [ ] **Step 2: Rework `buildActionsForStep.ts`** — apply spec §5 exactly:
  - Drop screen grouping (`screenGroups`, `orderedScreens`, `normalizeScreenName`, `screenId`).
  - Validity guard: reject records with empty/missing `displayFramePath` (and still-required `verb`/`screenName`/`elementCaption`); no longer reference `displayFrame`.
  - `displayFramePath` taken directly from the record.
  - Time-windowed **anchor-based** dedup: group by `normalizeElementId`, sort by `eventTimes[record.index]`, anchor = earliest, members within `dedupWindowSec` of the anchor join; verb = `input` if any member is `input` else anchor's verb; kept frame/caption/time = anchor's.
  - `viewGroups` unchanged.
  - `keep `eventTimes` arg; order final actions by time.

- [ ] **Step 3: Wire `processSopScreenshots.ts`** — apply spec §6: call `classifyAndRemap` with `{ stepTitle, language, events: stepEvents, denseFrames: pool!.denseFrames }` (no `screenClusters`); keep `buildScreenClusters` and still pass its result to `buildActionsForStep`. (`pool.denseFrames` is `DenseFrame[]` from `buildFramePool.ts`, shape `{ t: number; localPath: string }` — structurally assignable to `DensePoolFrame`; no cast needed.)

- [ ] **Step 4: Rewrite the `classifyStepSystem` prompt** in `src/config/index.ts` — apply spec §4: describe the ordered window-frame input, the magenta box as an approximate hint, the `displayFrameIndex` output (with the input/select-result vs click/link-source rule), keep the aggressive loading/transition/chrome discard guidance, remove all montage / `screenCluster` text.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: errors ONLY in `classifyStepWithLLM.test.ts` and `buildActionsForStep.test.ts` (fixed in Tasks 4–5). No errors in any non-test file.

- [ ] **Step 6: Commit**

```bash
git add src/trigger/stages/classifyStepWithLLM.ts src/trigger/stages/buildActionsForStep.ts src/trigger/processSopScreenshots.ts src/config/index.ts
git commit -m "feat(classify): LLM-driven display-frame selection"
```

---

### Task 4: `classifyStepWithLLM.test.ts` rewrite

**Files:**
- Modify: `src/trigger/stages/classifyStepWithLLM.test.ts`

Spec section: **§Testing**.

- [ ] **Step 1: Rewrite the chunk + classifier tests**

The `c()` helper builds the old `CandidateForLLM`. Replace it:

```ts
function c(index: number, time: number): CandidateForLLM {
  return { index, time, kindHint: "click", windowFramePaths: [`/c${index}-w0.jpg`] };
}
```

Rewrite the three `chunkCandidatesBySort` tests to assert **time-ordered** chunking (drop the `screenCluster` cases entirely — `chunkCandidatesBySort` now sorts by `time` only). Use **distinct ascending `time`** values in fixtures so ordering assertions are deterministic. Keep coverage: (a) count ≤ cap → one chunk; (b) count > cap → multiple chunks, each ≤ cap; (c) the flattened candidates are sorted by ascending `time`.

Rewrite the `classifyStepWithLLM` forwarding test: drop `montageImagePath`; the injected classifier returns candidates with `displayFrameIndex` (e.g. `0`) instead of `screenCluster`/`displayFrame`:

```ts
classifier: async ({ candidates }) => ({
  candidates: candidates.map(cand => ({
    index: cand.index,
    decision: "action" as const,
    verb: "click" as const,
    screenName: "x",
    elementCaption: `el${cand.index}`,
    displayFrameIndex: 0,
    discardReason: null,
  })),
}),
```

The file at this point already contains the Task 1 additions — the
`buildCandidateWindow` import, the `RawEvent` import, the `frame()`/`evt()`/`WIN`
helpers, and the five `buildCandidateWindow` tests. **Preserve all of them**;
this task rewrites only the `c()` helper and the chunk/classifier tests.

- [ ] **Step 2: Run + verify**

Run: `npx tsx --test src/trigger/stages/classifyStepWithLLM.test.ts`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/trigger/stages/classifyStepWithLLM.test.ts
git commit -m "test(classify): update classifyStepWithLLM tests for window I/O"
```

---

### Task 5: `buildActionsForStep.test.ts` rewrite

**Files:**
- Modify: `src/trigger/stages/buildActionsForStep.test.ts`

Spec section: **§Testing**.

- [ ] **Step 1: Update the factory and fixtures**

Replace the `action()` factory's removed fields with the new shape:

```ts
function action(over: Partial<ClassifiedActionRecord>): ClassifiedActionRecord {
  return {
    index: 0,
    decision: "action",
    verb: "click",
    screenName: "Login page",
    elementCaption: "Sign in button",
    displayFrameIndex: 0,
    discardReason: null,
    displayFramePath: "/frame.jpg",
    ...over,
  };
}
```

Discard fixtures: drop `screenCluster: null` / `displayFrame: null`; set `displayFrameIndex: null` and `displayFramePath: ""` (the field is required by `ClassifiedActionRecord` and ignored for discards).

- [ ] **Step 2: Fix the dedup test assertion**

The `"dedupes same ... keeping the latest event"` test must now assert the **earliest** anchor is kept. Rename it to `"dedupes same-element events within the window, keeping the earliest"` and change `assert.equal(elements[0].time, 47.5)` → `assert.equal(elements[0].time, 46.0)`. Its `eventTimes` `[46.0, 47.5]` are 1.5 s apart — inside `dedupWindowSec` (4.0) — so they still collapse.

- [ ] **Step 3: Add new dedup tests**

```ts
test("same-element events beyond dedupWindowSec stay separate actions", () => {
  const cls = [
    action({ index: 0, elementCaption: "Next button" }),
    action({ index: 1, elementCaption: "Next button" }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0, classified: cls, screenClusters: [cluster("A", 0, 30)],
    eventTimes: [5.0, 20.0], viewMinDurationSec: 100.0, language: "en",
  });
  assert.equal(out.filter(a => a.verb !== "view").length, 2);
});
```

Keep the `"verb-collapse rule: input wins over click"` test — its `eventTimes` `[1.0, 2.0]` are within the window so it still collapses; verify it still asserts `verb === "input"`.

- [ ] **Step 4: Run + full verify**

Run: `npx tsx --test src/trigger/stages/buildActionsForStep.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/trigger/stages/buildActionsForStep.test.ts
git commit -m "test(classify): update buildActionsForStep tests for time-windowed dedup"
```

---

### Task 6: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Full typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: clean, zero errors.

- [ ] **Step 2: Full test suite**

Run: `npx tsx --test src/trigger/stages/classifyStepWithLLM.test.ts src/trigger/stages/buildActionsForStep.test.ts src/trigger/stages/extractClickEvents.test.ts src/trigger/stages/classifyAndMergeEvents.test.ts src/trigger/stages/buildFramePool.test.ts`
Expected: all PASS.

- [ ] **Step 3: Confirm no stray references**

Run: `grep -rnE "montageImagePath|buildMontage|\bscreenCluster\b|\bdisplayFrame\b|nearestCluster|maxMontageClusters" src --include='*.ts'`
Expected: no matches. The `\b` boundaries are deliberate: `\bscreenCluster\b` excludes the intentionally-kept `screenClusters` plumbing, and `\bdisplayFrame\b` excludes the intended `displayFrameIndex` / `displayFramePath`. Any match must be inspected and removed.

- [ ] **Step 4: Commit if Step 3 surfaced fixes** (otherwise nothing to commit).

---

## Self-Review notes

- Spec coverage: Task 1 → §1; Task 2 → §3/§7; Task 3 → §2/§4/§5/§6; Tasks 4–5 → §Testing. All spec sections covered.
- Type consistency: `CandidateForLLM` (`windowFramePaths`), `ClassifiedActionRecord` (`displayFramePath`), `ClassifiedCandidate` (`displayFrameIndex`) are used consistently across Tasks 1–5.
- The `STEPIKA_DEBUG_DIR` dump is kept (adapted in Task 3 Step 1) — the e2e iteration loop (separate task #170) depends on it.
