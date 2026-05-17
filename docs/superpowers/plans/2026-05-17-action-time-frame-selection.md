# Action-Time Frame Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Select each sub-step's screenshot by its action time and sharpness within the chosen screen cluster, so sequential same-screen sub-steps stop producing duplicate screenshots.

**Architecture:** The screenshot pipeline picks a screen *cluster* per sub-step, then picks one *frame* inside that cluster. The frame picker (`selectInClusterFrame`) currently picks the frame closest to the cluster representative, so every sub-step on the same screen collapses to the same frame. This plan replaces that with: pick the K frames nearest the sub-step's *action time* (the unpadded end of its narration), then pick the sharpest of those K.

**Tech Stack:** TypeScript, `node:test` + `node:assert` (run via `npx tsx --test <file>`), `sharp` for image stats, Zod schemas. The `@/` import alias maps to `src/`. Typecheck: `npx tsc --noEmit -p tsconfig.json`.

**Spec:** `docs/superpowers/specs/2026-05-17-action-time-frame-selection-design.md`

---

## File Structure

- `src/config/index.ts` — add `screenshots.selectFrame.actionNeighborhood` (the K constant).
- `src/trigger/stages/pickFrame.ts` — add `computeActionTime`, next to the existing `computeSearchWindow`.
- `src/trigger/stages/pickFrame.test.ts` — tests for `computeActionTime`.
- `src/trigger/lib/screenId.ts` — add `frameSharpness`; rewrite `selectInClusterFrame` (async, action-time + sharpness based).
- `src/trigger/lib/screenId.test.ts` — test `frameSharpness`; update the two existing `selectInClusterFrame` tests for the new signature; add new selection tests.
- `src/trigger/processSopScreenshots.ts` — compute `actionTime` and `await` the two `selectInClusterFrame` calls.

---

## Task 1: Config — action-time neighborhood size

**Files:**
- Modify: `src/config/index.ts:215-221` (the `screenshots.pickFrame` block region)

- [ ] **Step 1: Add the `selectFrame` config block**

In `src/config/index.ts`, the `screenshots` object contains a `pickFrame` block ending at line 221. Immediately after the `pickFrame` block's closing `},`, add a new `selectFrame` block:

```ts
    pickFrame: {
      // Tutorial narrators often describe an action seconds AFTER it visually
      // happens (e.g. demo first, then explain). Symmetric padding around the
      // narration segment lets us shortlist clusters in either direction.
      searchWindowPrePadSec: 8,
      searchWindowPostPadSec: 8,
    },
    selectFrame: {
      // Within the chosen screen cluster, consider this many frames nearest
      // the sub-step's action time, then pick the sharpest of them.
      actionNeighborhood: 5,
    },
```

(Only the `selectFrame` block is new; the `pickFrame` block above is shown for placement.)

- [ ] **Step 2: Verify it typechecks**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/config/index.ts
git commit -m "feat(config): add screenshots.selectFrame.actionNeighborhood"
```

---

## Task 2: `computeActionTime`

**Files:**
- Modify: `src/trigger/stages/pickFrame.ts` (add function after `computeSearchWindow`, which ends at line 48)
- Test: `src/trigger/stages/pickFrame.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/trigger/stages/pickFrame.test.ts`, change the import on line 3 to add `computeActionTime`:

```ts
import { computeActionTime, computeSearchWindow, shortlistClusters, sanitizePick } from "./pickFrame";
```

Then append these tests to the end of the file:

```ts
test("computeActionTime returns the unpadded end of the narration range", () => {
  const t = computeActionTime(
    { narrationSegmentIds: [1, 2], timeWindow: null },
    [
      { id: 1, start: 10, end: 14, text: "a" },
      { id: 2, start: 14, end: 19, text: "b" },
      { id: 3, start: 30, end: 35, text: "c" },
    ],
    { tStart: 0, tEnd: 100 },
  );
  assert.equal(t, 19);
});

test("computeActionTime falls back to timeWindow.end when there are no narration segments", () => {
  const t = computeActionTime(
    { narrationSegmentIds: [], timeWindow: { start: 40, end: 52 } },
    [],
    { tStart: 0, tEnd: 100 },
  );
  assert.equal(t, 52);
});

test("computeActionTime falls back to step.tEnd when there is no narration and no timeWindow", () => {
  const t = computeActionTime(
    { narrationSegmentIds: [], timeWindow: null },
    [],
    { tStart: 5, tEnd: 88 },
  );
  assert.equal(t, 88);
});

test("computeActionTime falls back when narration ids match no segment", () => {
  const t = computeActionTime(
    { narrationSegmentIds: [99], timeWindow: { start: 1, end: 7 } },
    [{ id: 1, start: 0, end: 3, text: "x" }],
    { tStart: 0, tEnd: 100 },
  );
  assert.equal(t, 7);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx tsx --test src/trigger/stages/pickFrame.test.ts`
Expected: FAIL — `computeActionTime` is not exported from `./pickFrame`.

- [ ] **Step 3: Implement `computeActionTime`**

In `src/trigger/stages/pickFrame.ts`, add this function immediately after `computeSearchWindow` (after line 48):

```ts
/**
 * The instant a sub-step's action happens: the *unpadded* end of its
 * narration range. A narrator describes an action as or just before it
 * completes, so the late edge of the narration best marks the action moment.
 * Unlike computeSearchWindow, this applies no padding — padding only widens
 * the candidate *search*, it does not locate the action. Falls back to the
 * sub-step's timeWindow end, then to the step's end. The fallback *ordering*
 * (narration -> timeWindow -> step) matches computeSearchWindow's; each
 * fallback returns the end edge, since this is an instant, not a window.
 */
export function computeActionTime(
  subStep: { narrationSegmentIds: number[]; timeWindow: { start: number; end: number } | null },
  narration: NarrationSegment[],
  step: { tStart: number; tEnd: number },
): number {
  if (subStep.narrationSegmentIds.length > 0) {
    const refs = narration.filter(n => subStep.narrationSegmentIds.includes(n.id));
    if (refs.length > 0) return Math.max(...refs.map(n => n.end));
  }
  if (subStep.timeWindow) return subStep.timeWindow.end;
  return step.tEnd;
}
```

`NarrationSegment` is already imported at the top of `pickFrame.ts` (`import type { NarrationSegment } from "@/trigger/lib/narration";`). No new import needed.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx tsx --test src/trigger/stages/pickFrame.test.ts`
Expected: PASS — all tests, including the four new ones.

- [ ] **Step 5: Commit**

```bash
git add src/trigger/stages/pickFrame.ts src/trigger/stages/pickFrame.test.ts
git commit -m "feat(pickFrame): add computeActionTime"
```

---

## Task 3: `frameSharpness`

**Files:**
- Modify: `src/trigger/lib/screenId.ts` (add an exported function)
- Test: `src/trigger/lib/screenId.test.ts`

- [ ] **Step 1: Write the failing test**

In `src/trigger/lib/screenId.test.ts`, change the import block (lines 7-13) to add `frameSharpness`:

```ts
import {
  buildScreenClusters,
  clusterFor,
  frameSharpness,
  selectInClusterFrame,
  type DensePoolFrame,
  type ScreenCluster,
} from "./screenId";
```

Then append this test to the end of the file:

```ts
test("frameSharpness scores a blurred frame lower than the sharp original", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sharp-"));
  try {
    const fixture = "src/trigger/stages/__fixtures__/sample-1080p.jpg";
    const blurred = path.join(tmp, "blur.jpg");
    await sharp(fixture).blur(8).jpeg().toFile(blurred);
    const sharpScore = await frameSharpness(fixture);
    const blurScore = await frameSharpness(blurred);
    assert.ok(
      sharpScore > blurScore,
      `expected sharp score ${sharpScore} > blurred score ${blurScore}`,
    );
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});
```

`sharp`, `path`, `os`, and `fs` are already imported at the top of `screenId.test.ts`. The fixture `src/trigger/stages/__fixtures__/sample-1080p.jpg` already exists.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/trigger/lib/screenId.test.ts`
Expected: FAIL — `frameSharpness` is not exported from `./screenId`.

- [ ] **Step 3: Implement `frameSharpness`**

In `src/trigger/lib/screenId.ts`, add this exported function after the `ScreenCluster` type (after line 14):

```ts
/**
 * Focus measure for a frame. sharp's stats() exposes a native `sharpness`
 * estimate — the standard deviation of a Laplacian convolution of the
 * greyscale image. Higher = sharper / more in-focus.
 */
export async function frameSharpness(localPath: string): Promise<number> {
  const { sharpness } = await sharp(localPath).stats();
  return sharpness;
}
```

`sharp` is already imported at the top of `screenId.ts`. No new import needed.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test src/trigger/lib/screenId.test.ts`
Expected: PASS — including the new `frameSharpness` test.

- [ ] **Step 5: Commit**

```bash
git add src/trigger/lib/screenId.ts src/trigger/lib/screenId.test.ts
git commit -m "feat(screenId): add frameSharpness focus measure"
```

---

## Task 4: Rewrite `selectInClusterFrame`

**Files:**
- Modify: `src/trigger/lib/screenId.ts:138-152` (the current `selectInClusterFrame`)
- Test: `src/trigger/lib/screenId.test.ts`

The current `selectInClusterFrame` is synchronous, takes `(cluster, window)`, and picks the in-window member whose dHash is closest to the cluster representative. It will become `async`, take `(cluster, window, actionTime, sharpnessFn?)`, and pick the sharpest of the K frames nearest the action time.

- [ ] **Step 1: Update the two existing `selectInClusterFrame` tests**

In `src/trigger/lib/screenId.test.ts`, the last two tests currently call `selectInClusterFrame` synchronously with two arguments. Replace both tests with these updated versions (new third arg `actionTime`, a constant `sharpnessFn`, `await`, and `async` test fn):

```ts
test("selectInClusterFrame prefers the in-window member nearest the action time", async () => {
  const c = fakeCluster("A", [
    { t: 1, localPath: "/m1.jpg", dHash: "aaaa" },
    { t: 5, localPath: "/m2.jpg", dHash: "aaab" },
    { t: 9, localPath: "/m3.jpg", dHash: "aaac" },
  ]);
  const picked = await selectInClusterFrame(c, { start: 4, end: 6 }, 5, async () => 1);
  assert.equal(picked.localPath, "/m2.jpg");
});

test("selectInClusterFrame falls back to representative when no member is in window", async () => {
  const c = fakeCluster("A", [
    { t: 1, localPath: "/m1.jpg", dHash: "aaaa" },
    { t: 5, localPath: "/m2.jpg", dHash: "aaab" },
  ]);
  const picked = await selectInClusterFrame(c, { start: 100, end: 200 }, 150, async () => 1);
  assert.equal(picked.localPath, c.representative.localPath);
});
```

- [ ] **Step 2: Add the new selection tests**

Append these four tests to the end of `src/trigger/lib/screenId.test.ts`:

```ts
test("selectInClusterFrame picks the sharpest frame in the action-time neighborhood", async () => {
  const c = fakeCluster("A", [
    { t: 10, localPath: "/n10.jpg", dHash: "aaaa" },
    { t: 11, localPath: "/n11.jpg", dHash: "aaab" },
    { t: 12, localPath: "/n12.jpg", dHash: "aaac" },
  ]);
  // /n12.jpg is farthest from actionTime 10 but sharpest — it must still win.
  const sharpness = async (p: string) => (p === "/n12.jpg" ? 9 : 1);
  const picked = await selectInClusterFrame(c, { start: 0, end: 20 }, 10, sharpness);
  assert.equal(picked.localPath, "/n12.jpg");
});

test("selectInClusterFrame returns distinct frames for distinct action times", async () => {
  const c = fakeCluster("A", [
    { t: 70, localPath: "/e70.jpg", dHash: "aaaa" },
    { t: 72, localPath: "/e72.jpg", dHash: "aaab" },
    { t: 74, localPath: "/e74.jpg", dHash: "aaac" },
    { t: 76, localPath: "/e76.jpg", dHash: "aaad" },
  ]);
  const flat = async () => 1;
  const early = await selectInClusterFrame(c, { start: 60, end: 90 }, 70, flat);
  const late = await selectInClusterFrame(c, { start: 60, end: 90 }, 76, flat);
  assert.notEqual(early.localPath, late.localPath);
  assert.equal(early.localPath, "/e70.jpg");
  assert.equal(late.localPath, "/e76.jpg");
});

test("selectInClusterFrame handles fewer than K frames in the window", async () => {
  const c = fakeCluster("A", [
    { t: 3, localPath: "/p3.jpg", dHash: "aaaa" },
    { t: 4, localPath: "/p4.jpg", dHash: "aaab" },
  ]);
  const picked = await selectInClusterFrame(c, { start: 0, end: 10 }, 4, async () => 1);
  assert.equal(picked.localPath, "/p4.jpg");
});

test("selectInClusterFrame breaks a sharpness tie by nearest action time", async () => {
  const c = fakeCluster("A", [
    { t: 20, localPath: "/q20.jpg", dHash: "aaaa" },
    { t: 22, localPath: "/q22.jpg", dHash: "aaab" },
  ]);
  // Both frames score equally — the tie must resolve to the one nearer 22.
  const picked = await selectInClusterFrame(c, { start: 0, end: 40 }, 22, async () => 5);
  assert.equal(picked.localPath, "/q22.jpg");
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx tsx --test src/trigger/lib/screenId.test.ts`
Expected: FAIL — the current synchronous two-arg `selectInClusterFrame` does not match the new calls (extra args, and `await` on a non-Promise / wrong results).

- [ ] **Step 4: Rewrite `selectInClusterFrame`**

In `src/trigger/lib/screenId.ts`, add the config import. The current imports are:

```ts
import sharp from "sharp";
import { hammingDistance } from "./perceptualHash";
```

Add a third line:

```ts
import sharp from "sharp";
import { hammingDistance } from "./perceptualHash";
import { config } from "@/config";
```

(Keep the `hammingDistance` import — it is still used by `chooseCentroid`.)

Then replace the entire current `selectInClusterFrame` function (lines 138-152) with:

```ts
export async function selectInClusterFrame(
  cluster: ScreenCluster,
  window: { start: number; end: number },
  actionTime: number,
  sharpnessFn: (localPath: string) => Promise<number> = frameSharpness,
): Promise<DensePoolFrame> {
  const inWindow = cluster.members.filter(
    m => m.frame.t >= window.start && m.frame.t <= window.end,
  );
  if (inWindow.length === 0) return cluster.representative;

  // Order by closeness to the action time; tie-break on lower t so the
  // ordering — and therefore the final pick — is fully deterministic.
  const byActionTime = [...inWindow].sort((a, b) => {
    const da = Math.abs(a.frame.t - actionTime);
    const db = Math.abs(b.frame.t - actionTime);
    return da - db || a.frame.t - b.frame.t;
  });

  // Among the K frames nearest the action time, pick the sharpest. The
  // neighborhood is already in deterministic nearest-first order, and the
  // loop replaces `best` only on a strictly greater score, so a sharpness
  // tie keeps the earlier (nearer / lower-t) frame.
  const neighborhood = byActionTime.slice(
    0, config.screenshots.selectFrame.actionNeighborhood,
  );
  let best = neighborhood[0];
  let bestSharpness = await sharpnessFn(best.frame.localPath);
  for (let i = 1; i < neighborhood.length; i++) {
    const s = await sharpnessFn(neighborhood[i].frame.localPath);
    if (s > bestSharpness) {
      best = neighborhood[i];
      bestSharpness = s;
    }
  }
  return best.frame;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx tsx --test src/trigger/lib/screenId.test.ts`
Expected: PASS — all tests (the updated two, the four new selection tests, the `frameSharpness` test, and the unchanged `buildScreenClusters` / `clusterFor` tests).

- [ ] **Step 6: Commit**

```bash
git add src/trigger/lib/screenId.ts src/trigger/lib/screenId.test.ts
git commit -m "feat(screenId): select frame by action time + sharpness"
```

---

## Task 5: Wire `computeActionTime` into the pipeline

**Files:**
- Modify: `src/trigger/processSopScreenshots.ts:19` (import) and `:243-245` (call site)

- [ ] **Step 1: Add `computeActionTime` to the import**

In `src/trigger/processSopScreenshots.ts`, line 19 currently reads:

```ts
import { runPickFrame, computeSearchWindow } from "./stages/pickFrame";
```

Change it to:

```ts
import { runPickFrame, computeSearchWindow, computeActionTime } from "./stages/pickFrame";
```

- [ ] **Step 2: Compute the action time and await the selection calls**

In `src/trigger/processSopScreenshots.ts`, lines 243-245 currently read:

```ts
              const window = computeSearchWindow(subStep, step.narration, step);
              const pickedFrame = selectInClusterFrame(pickedCluster, window);
              const runnerFrame = runnerCluster ? selectInClusterFrame(runnerCluster, window) : null;
```

Replace those three lines with:

```ts
              const window = computeSearchWindow(subStep, step.narration, step);
              const actionTime = computeActionTime(subStep, step.narration, step);
              const pickedFrame = await selectInClusterFrame(pickedCluster, window, actionTime);
              const runnerFrame = runnerCluster
                ? await selectInClusterFrame(runnerCluster, window, actionTime)
                : null;
```

This code is inside the `async (step) => { ... }` callback passed to `runWithConcurrency`, so `await` is valid here.

- [ ] **Step 3: Typecheck the whole project**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors. (This confirms there are no other `selectInClusterFrame` callers left on the old signature.)

- [ ] **Step 4: Run the full affected test suite**

Run: `npx tsx --test src/trigger/lib/screenId.test.ts src/trigger/stages/pickFrame.test.ts`
Expected: PASS — all tests.

- [ ] **Step 5: Commit**

```bash
git add src/trigger/processSopScreenshots.ts
git commit -m "feat(screenshots): select sub-step frames by action time"
```

---

## Final Verification (manual)

After all tasks are committed, verify the fix end-to-end against the bug it targets:

1. Ensure the trigger.dev dev worker is running (`trigger dev`).
2. Re-trigger the screenshot pipeline for the recording that produced SOP `6a08a7b1bd8d8846831c49d6` — task `process-sop-screenshots`, payload `{ "sopId": "<a fresh upload of samples/trimmed-hubspot_crm.mp4>" }`. (A new upload is needed because the SOP doc is overwritten per run; use the same sample video.)
3. Open the resulting SOP and inspect step 2 ("Hoàn tất thông tin doanh nghiệp").
4. Confirm the "enter your name" sub-step and the "click Next" sub-step now resolve to **distinct** frames — and that the "click Next" screenshot shows the name field **filled in**, not empty.

This step is a manual check, not an automated test; it confirms the real-world symptom from the spec's Problem section is resolved.
