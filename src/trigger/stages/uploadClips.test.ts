import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runUploadClips, composeClipSteps, type StepClips } from "./uploadClips";

async function tmpFile(content: string): Promise<string> {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "uc-"));
  const p = path.join(dir, "f");
  await fs.promises.writeFile(p, content);
  return p;
}

test("runUploadClips uploads mp4 + poster and builds a Clip per step", async () => {
  const puts: { key: string; contentType: string }[] = [];
  const clipPath = await tmpFile("mp4-bytes");
  const posterPath = await tmpFile("jpg-bytes");
  const byStep = await runUploadClips({
    sopId: "SOP9",
    clips: [{ stepIndex: 0, clipPath, posterPath, startTime: 2, endTime: 8 }],
    putObject: async (key, _body, contentType) => { puts.push({ key, contentType }); },
  });
  assert.equal(puts.length, 2);
  assert.equal(puts[0].contentType, "video/mp4");
  assert.equal(puts[1].contentType, "image/jpeg");
  assert.ok(puts[0].key.startsWith("sops/SOP9/clips/step-0/"));
  assert.ok(puts[0].key.endsWith(".mp4"));
  assert.ok(puts[1].key.endsWith("-poster.jpg"));
  const entry = byStep.get(0)!;
  assert.equal(entry.error, undefined);
  assert.equal(entry.clips.length, 1);
  assert.equal(entry.clips[0].order, 0);
  assert.equal(entry.clips[0].startTime, 2);
  assert.equal(entry.clips[0].endTime, 8);
  assert.equal(entry.clips[0].r2Key, puts[0].key);
  assert.equal(entry.clips[0].posterR2Key, puts[1].key);
});

test("runUploadClips passes a failed-extraction step through as clipsError, no upload", async () => {
  const puts: string[] = [];
  const byStep = await runUploadClips({
    sopId: "SOP9",
    clips: [{ stepIndex: 0, clipPath: "/x", posterPath: "/y", startTime: 0, endTime: 5, error: "ffmpeg boom" }],
    putObject: async (key) => { puts.push(key); },
  });
  assert.equal(puts.length, 0);
  const entry = byStep.get(0)!;
  assert.equal(entry.clips.length, 0);
  assert.ok(entry.error && entry.error.includes("ffmpeg boom"));
});

test("composeClipSteps sets clips / clipsError per step and never sets screenshots", () => {
  const byStep: Map<number, StepClips> = new Map([
    [0, { clips: [{ clipId: "c", r2Key: "k", posterR2Key: "p", startTime: 0, endTime: 5, order: 0 }] }],
    [1, { clips: [], error: "boom" }],
  ]);
  const steps = composeClipSteps(
    [
      { title: "A", description: "a", startTime: 0, endTime: 5 },
      { title: "B", description: "b", startTime: 5, endTime: 10 },
    ],
    byStep,
  );
  assert.equal(steps.length, 2);
  assert.equal(steps[0].clips?.length, 1);
  assert.equal(steps[0].clipsError, undefined);
  assert.equal(steps[0].screenshots, undefined);
  assert.equal(steps[1].clips, undefined);
  assert.equal(steps[1].clipsError, "boom");
});
