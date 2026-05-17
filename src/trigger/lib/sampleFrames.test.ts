import { test } from "node:test";
import assert from "node:assert";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
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

// trimmed-hubspot_crm.mp4 is ~307 s; use 300 s so all sampled timestamps stay
// within bounds.
const HUBSPOT_FIXTURE = path.resolve("samples/trimmed-hubspot_crm.mp4");
const HUBSPOT_DURATION_SEC = 300;

async function tmpHubspot(): Promise<{ srcPath: string; cleanup: () => Promise<void> }> {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sf-count-"));
  const srcPath = path.join(dir, "v.mp4");
  await fs.promises.copyFile(HUBSPOT_FIXTURE, srcPath);
  return { srcPath, cleanup: () => fs.promises.rm(dir, { recursive: true, force: true }) };
}

test("sampleFrames { count: 5 } yields exactly 5 paths and timestamps", async (t) => {
  if (!fs.existsSync(HUBSPOT_FIXTURE)) {
    t.skip("samples/trimmed-hubspot_crm.mp4 missing");
    return;
  }
  const { srcPath, cleanup } = await tmpHubspot();
  try {
    const result = await sampleFrames(srcPath, HUBSPOT_DURATION_SEC, { count: 5 });
    try {
      assert.equal(result.paths.length, 5);
      assert.equal(result.timestamps.length, 5);
      for (const p of result.paths) {
        const stat = await fs.promises.stat(p);
        assert.ok(stat.size > 0, `frame file should be non-empty: ${p}`);
      }
    } finally {
      await result.dispose();
    }
  } finally {
    await cleanup();
  }
});

test("sampleFrames { count: 0 } is clamped to 1 path", async (t) => {
  if (!fs.existsSync(HUBSPOT_FIXTURE)) {
    t.skip("samples/trimmed-hubspot_crm.mp4 missing");
    return;
  }
  const { srcPath, cleanup } = await tmpHubspot();
  try {
    const result = await sampleFrames(srcPath, HUBSPOT_DURATION_SEC, { count: 0 });
    try {
      assert.equal(result.paths.length, 1);
      assert.equal(result.timestamps.length, 1);
    } finally {
      await result.dispose();
    }
  } finally {
    await cleanup();
  }
});
