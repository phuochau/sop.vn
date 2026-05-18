import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import ffmpeg from "fluent-ffmpeg";
import { extractClip } from "./extractClip";

function probeDuration(file: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, data) => {
      if (err) return reject(err);
      resolve(Number(data.format?.duration ?? 0));
    });
  });
}

test("extractClip trims the source to the requested span", async () => {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "clip-"));
  const out = path.join(dir, "clip.mp4");
  try {
    await extractClip("samples/trimmed-hubspot_crm.mp4", out, 10, 14);
    assert.ok(fs.existsSync(out), "output file exists");
    const dur = await probeDuration(out);
    assert.ok(Math.abs(dur - 4) <= 0.5, `duration ~4s, got ${dur}`);
  } finally {
    await fs.promises.rm(dir, { recursive: true, force: true });
  }
});
