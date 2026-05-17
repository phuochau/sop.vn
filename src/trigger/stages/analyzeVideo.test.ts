import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { computeAppGateFrameCount, decideAppGate, runAnalyzeVideo } from "./analyzeVideo";

test("computeAppGateFrameCount clamps to [8,20]", () => {
  assert.equal(computeAppGateFrameCount(60), 8);     // 1 min -> 1, clamped to 8
  assert.equal(computeAppGateFrameCount(300), 8);    // 5 min -> 5, clamped to 8
  assert.equal(computeAppGateFrameCount(600), 10);   // 10 min -> 10
  assert.equal(computeAppGateFrameCount(1200), 20);  // 20 min -> 20
  assert.equal(computeAppGateFrameCount(3600), 20);  // 60 min -> 60, clamped to 20
});

test("decideAppGate accepts at exactly 50%", () => {
  assert.equal(decideAppGate(10, 20), true);
  assert.equal(decideAppGate(5, 10), true);
});

test("decideAppGate rejects below 50%", () => {
  assert.equal(decideAppGate(8, 20), false);
  assert.equal(decideAppGate(4, 10), false);
});

test("decideAppGate rejects when totalFrames is 0", () => {
  assert.equal(decideAppGate(0, 0), false);
});

async function tmpVideo(): Promise<{ srcPath: string; cleanup: () => Promise<void> }> {
  // sampleFrames runs ffmpeg on this; tests inject a fake visionFn so the
  // ffmpeg output is never inspected — a tiny real mp4 fixture is reused.
  // durationSec must not exceed the actual video length (~307 s) so ffmpeg
  // does not seek past EOF.
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "av-"));
  const srcPath = path.join(dir, "v.mp4");
  await fs.promises.copyFile("samples/trimmed-hubspot_crm.mp4", srcPath);
  return { srcPath, cleanup: () => fs.promises.rm(dir, { recursive: true, force: true }) };
}

// trimmed-hubspot_crm.mp4 is ~307 s; use 300 s so all sampled timestamps stay
// within bounds. computeAppGateFrameCount(300) = 8, satisfying the [8,20] check.
const TEST_DURATION_SEC = 300;

test("runAnalyzeVideo returns the vision fn output", async () => {
  const { srcPath, cleanup } = await tmpVideo();
  try {
    const out = await runAnalyzeVideo({
      srcPath,
      durationSec: TEST_DURATION_SEC,
      language: "vi",
      visionFn: async (opts) => {
        assert.ok(opts.imagePaths.length >= 8 && opts.imagePaths.length <= 20);
        return {
          appUIFrameCount: opts.imagePaths.length,
          totalFrames: opts.imagePaths.length,
          appType: "web",
          category: "CRM",
          domainSummary: "A CRM walkthrough.",
        };
      },
    });
    assert.equal(out.appType, "web");
    assert.equal(out.appUIFrameCount, out.totalFrames);
  } finally {
    await cleanup();
  }
});

test("runAnalyzeVideo propagates a vision fn error", async () => {
  const { srcPath, cleanup } = await tmpVideo();
  try {
    await assert.rejects(
      runAnalyzeVideo({
        srcPath,
        durationSec: TEST_DURATION_SEC,
        language: "vi",
        visionFn: async () => { throw new Error("provider down"); },
      }),
      /provider down/,
    );
  } finally {
    await cleanup();
  }
});
