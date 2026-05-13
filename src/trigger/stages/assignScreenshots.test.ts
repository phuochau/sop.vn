import { test } from "node:test";
import assert from "node:assert";
import { bucketFramesByStep, resolveCrossStepDedup, bboxContainsCursor, type StepRange, type PoolFrame, type Pick, type Highlight } from "./assignScreenshots";

function pf(t: number, id: string): PoolFrame {
  return { t, poolId: id, localPath: `/tmp/${id}.jpg`, pHash: "0000000000000000" };
}

function pick(poolId: string, description: string | null = null, highlight: Highlight | null = null): Pick {
  return { poolId, description, highlight };
}

test("bucketFramesByStep applies overlap buffer on both sides", () => {
  const steps: StepRange[] = [
    { stepIndex: 0, tStart: 0, tEnd: 10 },
    { stepIndex: 1, tStart: 10, tEnd: 20 },
  ];
  const pool: PoolFrame[] = [
    pf(0.5, "a"),
    pf(7.0, "b"),
    pf(9.5, "c"),
    pf(10.5, "d"),
    pf(12.5, "e"),
    pf(19.5, "f"),
    pf(22.5, "g"),
  ];
  const buckets = bucketFramesByStep(steps, pool, 2);
  assert.deepEqual(buckets.get(0)!.map(f => f.poolId), ["a", "b", "c", "d"]);
  assert.deepEqual(buckets.get(1)!.map(f => f.poolId), ["c", "d", "e", "f"]);
});

test("resolveCrossStepDedup assigns shared frame to the step with closer center", () => {
  const steps: StepRange[] = [
    { stepIndex: 0, tStart: 0, tEnd: 10 },
    { stepIndex: 1, tStart: 10, tEnd: 20 },
  ];
  const picks = new Map<number, Pick[]>([
    [0, [pick("x", "first attempt")]],
    [1, [pick("x", "second attempt")]],
  ]);
  const pool: PoolFrame[] = [pf(11, "x")];
  const out = resolveCrossStepDedup(steps, picks, pool);
  assert.deepEqual(out.get(0), []);
  assert.deepEqual(out.get(1), [pick("x", "second attempt")]);
});

test("resolveCrossStepDedup breaks ties by earlier step", () => {
  const steps: StepRange[] = [
    { stepIndex: 0, tStart: 0, tEnd: 10 },
    { stepIndex: 1, tStart: 10, tEnd: 20 },
  ];
  const picks = new Map<number, Pick[]>([
    [0, [pick("x", "from step 0")]],
    [1, [pick("x", "from step 1")]],
  ]);
  const pool: PoolFrame[] = [pf(10, "x")];
  const out = resolveCrossStepDedup(steps, picks, pool);
  assert.deepEqual(out.get(0), [pick("x", "from step 0")]);
  assert.deepEqual(out.get(1), []);
});

test("resolveCrossStepDedup preserves timestamp order within each step", () => {
  const steps: StepRange[] = [{ stepIndex: 0, tStart: 0, tEnd: 30 }];
  const picks = new Map<number, Pick[]>([
    [0, [pick("c", "third"), pick("a", "first"), pick("b", "second")]],
  ]);
  const pool: PoolFrame[] = [pf(1, "a"), pf(2, "b"), pf(3, "c")];
  const out = resolveCrossStepDedup(steps, picks, pool);
  assert.deepEqual(out.get(0), [pick("a", "first"), pick("b", "second"), pick("c", "third")]);
});

test("bboxContainsCursor accepts cursor inside bbox", () => {
  const bbox = { x: 0.2, y: 0.3, w: 0.2, h: 0.1 };
  assert.equal(bboxContainsCursor(bbox, { x: 0.3, y: 0.35 }), true);
});

test("bboxContainsCursor rejects cursor far outside bbox", () => {
  const bbox = { x: 0.2, y: 0.3, w: 0.2, h: 0.1 };
  assert.equal(bboxContainsCursor(bbox, { x: 0.8, y: 0.9 }), false);
});

test("bboxContainsCursor allows small margin around bbox", () => {
  const bbox = { x: 0.2, y: 0.3, w: 0.2, h: 0.1 };
  // 0.005 past the right edge → within 5% of w=0.2 = 0.01 margin
  assert.equal(bboxContainsCursor(bbox, { x: 0.405, y: 0.35 }), true);
});

test("bboxContainsCursor rejects cursor beyond margin", () => {
  const bbox = { x: 0.2, y: 0.3, w: 0.2, h: 0.1 };
  // 0.05 past the right edge — well beyond 5% margin of 0.01
  assert.equal(bboxContainsCursor(bbox, { x: 0.45, y: 0.35 }), false);
});

test("bboxContainsCursor allows margin on top edge (axis-asymmetric)", () => {
  const bbox = { x: 0.2, y: 0.3, w: 0.2, h: 0.1 };
  // 0.003 above the top edge → within 5% of h=0.1 = 0.005 margin (y axis margin differs from x)
  assert.equal(bboxContainsCursor(bbox, { x: 0.3, y: 0.297 }), true);
});

test("bboxContainsCursor rejects zero-area bbox", () => {
  const bbox = { x: 0.2, y: 0.3, w: 0, h: 0.1 };
  assert.equal(bboxContainsCursor(bbox, { x: 0.2, y: 0.35 }), false);
});

test("bboxContainsCursor rejects negative-area bbox", () => {
  const bbox = { x: 0.2, y: 0.3, w: -0.1, h: 0.1 };
  assert.equal(bboxContainsCursor(bbox, { x: 0.15, y: 0.35 }), false);
});

test("resolveCrossStepDedup preserves highlight on the winning step", () => {
  const steps: StepRange[] = [
    { stepIndex: 0, tStart: 0, tEnd: 10 },
    { stepIndex: 1, tStart: 10, tEnd: 20 },
  ];
  const h: Highlight = { kind: "click", bbox: { x: 0.1, y: 0.2, w: 0.3, h: 0.05 } };
  const picks = new Map<number, Pick[]>([
    [0, [pick("x", "stepA", h)]],
    [1, [pick("x", "stepB", null)]],
  ]);
  // frame at t=11 → closer to step 1's center (15) than step 0's (5)
  const pool: PoolFrame[] = [pf(11, "x")];
  const out = resolveCrossStepDedup(steps, picks, pool);
  assert.deepEqual(out.get(0), []);
  assert.deepEqual(out.get(1), [pick("x", "stepB", null)]);
});
