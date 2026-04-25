import { test } from "node:test";
import assert from "node:assert";
import path from "node:path";
import fs from "node:fs";
import { sampleFrames, computeFrameCount } from "./sampleFrames";

test("computeFrameCount fixed mode", () => {
  assert.equal(computeFrameCount({ durationSec: 30, mode: "fixed" }), 8);
  assert.equal(computeFrameCount({ durationSec: 5, mode: "fixed" }), 5);
  assert.equal(computeFrameCount({ durationSec: 3, mode: "fixed" }), 3);
  assert.equal(computeFrameCount({ durationSec: 2, mode: "fixed" }), 2);
});

test("computeFrameCount density mode (targetFps 0.5, max 60)", () => {
  assert.equal(computeFrameCount({ durationSec: 5, mode: "density" }), 3);
  assert.equal(computeFrameCount({ durationSec: 30, mode: "density" }), 15);
  assert.equal(computeFrameCount({ durationSec: 200, mode: "density" }), 60);
  assert.equal(computeFrameCount({ durationSec: 1, mode: "density" }), 2);
});

test("sampleFrames extracts frames against a sample fixture", async (t) => {
  const fixture = path.resolve("samples/sample.mp4");
  if (!fs.existsSync(fixture)) {
    t.skip("samples/sample.mp4 missing");
    return;
  }
  const result = await sampleFrames(fixture, 10, { mode: "fixed" });
  try {
    assert.ok(result.paths.length >= 2 && result.paths.length <= 8);
    assert.equal(result.paths.length, result.timestamps.length);
    for (let i = 1; i < result.timestamps.length; i++) {
      assert.ok(result.timestamps[i] > result.timestamps[i - 1]);
      assert.ok(result.timestamps[i] >= 0 && result.timestamps[i] <= 10);
    }
    for (const p of result.paths) {
      const stat = await fs.promises.stat(p);
      assert.ok(stat.size > 0);
    }
  } finally {
    await result.dispose();
  }
});
