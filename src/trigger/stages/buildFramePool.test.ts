import { test } from "node:test";
import assert from "node:assert";
import { filterFramePool, type RawFrame } from "./buildFramePool";

function rf(t: number, pHash: string): RawFrame {
  return { t, pHash, localPath: `/tmp/frame-${t}.jpg`, poolId: `p${t}` };
}

test("filterFramePool keeps stable plateaus and drops singletons", () => {
  const frames: RawFrame[] = [
    rf(0.0, "0000000000000000"),
    rf(0.5, "0000000000000000"),
    rf(1.0, "0000000000000000"),
    rf(1.5, "0000000000000000"),
    rf(2.0, "0000000000000000"),
    rf(2.5, "ffff0000ffff0000"), // very different — transition frame, singleton
    rf(3.0, "ffffffffffffffff"),
    rf(3.5, "ffffffffffffffff"),
    rf(4.0, "ffffffffffffffff"),
  ];
  const out = filterFramePool(frames, {
    motionHammingThreshold: 8,
    dedupHammingThreshold: 5,
    dedupWindowSeconds: 10,
    maxPoolSize: 200,
  });
  assert.equal(out.length, 2);
  assert.equal(out[0].t, 0.0);
  assert.equal(out[1].t, 3.0);
});

test("filterFramePool dedupes within window", () => {
  const frames: RawFrame[] = [
    rf(0.0, "1111111111111111"),
    rf(0.5, "1111111111111111"),
    rf(0.5 + 0.001, "1111111111111111"),
    rf(5.0, "1111111111111110"),
    rf(5.5, "1111111111111110"),
  ];
  const out = filterFramePool(frames, {
    motionHammingThreshold: 8,
    dedupHammingThreshold: 5,
    dedupWindowSeconds: 10,
    maxPoolSize: 200,
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].t, 0.0);
});

test("filterFramePool respects maxPoolSize cap", () => {
  const frames: RawFrame[] = [];
  for (let i = 0; i < 500; i++) {
    const hex = i.toString(16).padStart(16, "0");
    frames.push(rf(i, hex));
    frames.push(rf(i + 0.1, hex));
    frames.push(rf(i + 0.2, hex));
  }
  const out = filterFramePool(frames, {
    motionHammingThreshold: 0,
    dedupHammingThreshold: 0,
    dedupWindowSeconds: 0,
    maxPoolSize: 50,
  });
  assert.ok(out.length <= 50, `expected <=50, got ${out.length}`);
});
