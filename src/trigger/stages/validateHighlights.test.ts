import { test } from "node:test";
import assert from "node:assert";
import { validateHighlights } from "./validateHighlights";
import type { Pick } from "./assignScreenshots";

function pick(highlight: Pick["highlight"]): Pick {
  return { poolId: "p1", description: null, highlight };
}

const goodBbox = { x: 0.3, y: 0.4, w: 0.2, h: 0.1 };

test("validateHighlights returns picks unchanged when no inputs", async () => {
  const picks: Pick[] = [pick(null), pick({ kind: "click", bbox: goodBbox })];
  const out = await validateHighlights({ picks, inputs: [], stepIndex: 0 });
  assert.deepEqual(out, picks);
});

test("validateHighlights drops highlight when focused-cursor returns null", async () => {
  const picks: Pick[] = [pick({ kind: "click", bbox: goodBbox })];
  const out = await validateHighlights({
    picks,
    inputs: [{ pickIndex: 0, bucketIndex: 5, framePath: "/tmp/f.jpg", timestampSec: 1 }],
    stepIndex: 0,
    focusedCursor: async () => ({ cursors: [{ index: 5, cursor: null }] }),
    verifyCursor: async () => { throw new Error("should not be called"); },
  });
  assert.equal(out[0].highlight, null);
});

test("validateHighlights drops highlight when CV does not corroborate", async () => {
  const picks: Pick[] = [pick({ kind: "click", bbox: goodBbox })];
  const out = await validateHighlights({
    picks,
    inputs: [{ pickIndex: 0, bucketIndex: 5, framePath: "/tmp/f.jpg", timestampSec: 1 }],
    stepIndex: 0,
    focusedCursor: async () => ({ cursors: [{ index: 5, cursor: { x: 0.4, y: 0.45 } }] }),
    verifyCursor: async () => null,
  });
  assert.equal(out[0].highlight, null);
});

test("validateHighlights drops highlight when bbox does not contain cursor", async () => {
  const picks: Pick[] = [pick({ kind: "click", bbox: goodBbox })];
  const out = await validateHighlights({
    picks,
    inputs: [{ pickIndex: 0, bucketIndex: 5, framePath: "/tmp/f.jpg", timestampSec: 1 }],
    stepIndex: 0,
    // Cursor far from bbox
    focusedCursor: async () => ({ cursors: [{ index: 5, cursor: { x: 0.9, y: 0.9 } }] }),
    verifyCursor: async () => ({ x: 0.9, y: 0.9 }),
  });
  assert.equal(out[0].highlight, null);
});

test("validateHighlights keeps highlight when all checks pass", async () => {
  const original = { kind: "click" as const, bbox: goodBbox };
  const picks: Pick[] = [pick(original)];
  const out = await validateHighlights({
    picks,
    inputs: [{ pickIndex: 0, bucketIndex: 5, framePath: "/tmp/f.jpg", timestampSec: 1 }],
    stepIndex: 0,
    focusedCursor: async () => ({ cursors: [{ index: 5, cursor: { x: 0.4, y: 0.45 } }] }),
    verifyCursor: async () => ({ x: 0.4, y: 0.45 }),
  });
  assert.deepEqual(out[0].highlight, original);
});

test("validateHighlights treats missing bucket index as null cursor", async () => {
  const picks: Pick[] = [pick({ kind: "click", bbox: goodBbox })];
  const out = await validateHighlights({
    picks,
    inputs: [{ pickIndex: 0, bucketIndex: 5, framePath: "/tmp/f.jpg", timestampSec: 1 }],
    stepIndex: 0,
    focusedCursor: async () => ({ cursors: [] }), // missing index 5
    verifyCursor: async () => { throw new Error("should not be called"); },
  });
  assert.equal(out[0].highlight, null);
});

test("validateHighlights handles mixed: some pass, some fail", async () => {
  const goodHL = { kind: "click" as const, bbox: goodBbox };
  const badHL = { kind: "click" as const, bbox: { x: 0.0, y: 0.0, w: 0.1, h: 0.1 } };
  const picks: Pick[] = [pick(goodHL), pick(badHL), pick(null)];
  const out = await validateHighlights({
    picks,
    inputs: [
      { pickIndex: 0, bucketIndex: 0, framePath: "/tmp/a.jpg", timestampSec: 1 },
      { pickIndex: 1, bucketIndex: 1, framePath: "/tmp/b.jpg", timestampSec: 2 },
    ],
    stepIndex: 0,
    focusedCursor: async () => ({
      cursors: [
        { index: 0, cursor: { x: 0.4, y: 0.45 } },
        { index: 1, cursor: null },
      ],
    }),
    verifyCursor: async (_path, cx, cy) => ({ x: cx, y: cy }),
  });
  assert.deepEqual(out[0].highlight, goodHL);
  assert.equal(out[1].highlight, null);
  assert.equal(out[2].highlight, null); // never had highlight
});
