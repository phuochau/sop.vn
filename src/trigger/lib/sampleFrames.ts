import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import ffmpeg from "fluent-ffmpeg";

export type SampleMode = "fixed" | "density";

const DENSITY_TARGET_FPS = 0.5;
const DENSITY_MAX = 60;
const FIXED_MIN = 2;
const FIXED_MAX = 8;

function clamp(min: number, max: number, n: number) {
  return Math.max(min, Math.min(max, n));
}

export function computeFrameCount(opts: { durationSec: number; mode: SampleMode }): number {
  if (opts.mode === "fixed") {
    return clamp(FIXED_MIN, FIXED_MAX, Math.floor(opts.durationSec));
  }
  return clamp(FIXED_MIN, DENSITY_MAX, Math.ceil(opts.durationSec * DENSITY_TARGET_FPS));
}

function evenlySpacedTimestamps(durationSec: number, count: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    out.push(((i + 1) * durationSec) / (count + 1));
  }
  return out;
}

function grabAt(srcPath: string, outPath: string, atSec: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(srcPath)
      .seekInput(atSec)
      .frames(1)
      .outputOptions(["-vf scale=768:-2", "-qscale:v 5"])
      .on("end", () => resolve())
      .on("error", reject)
      .save(outPath);
  });
}

export async function sampleFrames(
  srcPath: string,
  durationSec: number,
  opts: { mode: SampleMode } | { count: number }
): Promise<{
  paths: string[];
  timestamps: number[];
  tmpDir: string;
  dispose: () => Promise<void>;
}> {
  const count = "count" in opts
    ? Math.max(1, Math.floor(opts.count))
    : computeFrameCount({ durationSec, mode: opts.mode });
  const timestamps = evenlySpacedTimestamps(durationSec, count);
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sop-frames-"));
  const paths: string[] = [];
  try {
    for (let i = 0; i < timestamps.length; i++) {
      const out = path.join(tmpDir, `frame-${i}.jpg`);
      await grabAt(srcPath, out, timestamps[i]);
      paths.push(out);
    }
    return {
      paths,
      timestamps,
      tmpDir,
      dispose: () => fs.promises.rm(tmpDir, { recursive: true, force: true }),
    };
  } catch (e) {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
    throw e;
  }
}
