import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { runExtractClips } from "./extractClips";

test("runExtractClips produces one clip + poster per step with correct bounds", async () => {
  const calls: { kind: string; start?: number; end?: number; at?: number }[] = [];
  const res = await runExtractClips({
    srcPath: "/fake/src.mp4",
    steps: [
      { startTime: 0, endTime: 10 },
      { startTime: 10, endTime: 30 },
    ],
    extractClip: async (_src, out, start, end) => {
      calls.push({ kind: "clip", start, end });
      await fs.promises.writeFile(out, "clip");
    },
    grabFrame: async (_src, out, at) => {
      calls.push({ kind: "poster", at });
      await fs.promises.writeFile(out, "poster");
    },
  });
  try {
    assert.equal(res.clips.length, 2);
    assert.equal(res.clips[0].stepIndex, 0);
    assert.equal(res.clips[0].startTime, 0);
    assert.equal(res.clips[0].endTime, 10);
    assert.equal(res.clips[0].error, undefined);
    assert.ok(fs.existsSync(res.clips[0].clipPath));
    assert.ok(fs.existsSync(res.clips[0].posterPath));
    assert.deepEqual(calls.filter(c => c.kind === "poster").map(c => c.at), [5, 20]);
  } finally {
    await res.dispose();
  }
});

test("runExtractClips isolates a failing step via an error string", async () => {
  const res = await runExtractClips({
    srcPath: "/fake/src.mp4",
    steps: [
      { startTime: 0, endTime: 10 },
      { startTime: 10, endTime: 20 },
    ],
    extractClip: async (_src, out, _start, end) => {
      if (end === 10) throw new Error("ffmpeg boom");
      await fs.promises.writeFile(out, "clip");
    },
    grabFrame: async (_src, out) => { await fs.promises.writeFile(out, "poster"); },
  });
  try {
    assert.equal(res.clips.length, 2);
    assert.ok(res.clips[0].error && res.clips[0].error.includes("ffmpeg boom"));
    assert.equal(res.clips[1].error, undefined);
  } finally {
    await res.dispose();
  }
});

test("runExtractClips dispose removes the temp dir", async () => {
  const res = await runExtractClips({
    srcPath: "/fake/src.mp4",
    steps: [{ startTime: 0, endTime: 5 }],
    extractClip: async (_s, out) => { await fs.promises.writeFile(out, "c"); },
    grabFrame: async (_s, out) => { await fs.promises.writeFile(out, "p"); },
  });
  const dir = res.tmpDir;
  await res.dispose();
  assert.equal(fs.existsSync(dir), false);
});
