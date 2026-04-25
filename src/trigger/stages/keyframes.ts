import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import ffmpeg from "fluent-ffmpeg";
import { logger } from "@trigger.dev/sdk/v3";
import { presignGet, putObject } from "@/lib/r2";
import { keyframeKey } from "@/lib/utils";
import type { Step } from "@/lib/mongo";

export function pickKeyframeTimestamps(start: number, end: number): number[] {
  const span = end - start;
  return [start + span * 0.25, start + span * 0.5, start + span * 0.75];
}

function grabFrame(input: string, out: string, atSec: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .screenshots({
        timestamps: [atSec],
        filename: path.basename(out),
        folder: path.dirname(out),
        size: "640x?",
      })
      .on("end", () => resolve())
      .on("error", reject);
  });
}

async function downloadTo(tmpPath: string, url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(tmpPath, buf);
}

/**
 * Extracts 3 keyframes per step from the source video and uploads them to R2.
 * Returns a copy of `steps` with `keyframeR2Keys` populated.
 * On per-step failure, that step's `keyframeR2Keys` is empty (caller falls back to posterR2Key).
 */
export async function runKeyframes(args: {
  sopId: string;
  videoR2Key: string;
  steps: Step[];
}): Promise<Step[]> {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sop-kf-"));
  const srcUrl = await presignGet(args.videoR2Key, 3600);
  const srcPath = path.join(tmp, "src.mp4");
  await downloadTo(srcPath, srcUrl);

  const out: Step[] = [];
  for (let i = 0; i < args.steps.length; i++) {
    const step = args.steps[i];
    const timestamps = pickKeyframeTimestamps(step.startTime, step.endTime);
    const keys: string[] = [];
    for (let f = 0; f < timestamps.length; f++) {
      const framePath = path.join(tmp, `step-${i}-frame-${f}.jpg`);
      try {
        await grabFrame(srcPath, framePath, timestamps[f]);
        const buf = await fs.promises.readFile(framePath);
        const k = keyframeKey(args.sopId, i, f);
        await putObject(k, buf, "image/jpeg");
        keys.push(k);
      } catch (e) {
        logger.warn("keyframe failed", { stepIndex: i, frameIndex: f, e: String(e) });
      }
    }
    out.push({ ...step, keyframeR2Keys: keys });
  }
  await fs.promises.rm(tmp, { recursive: true, force: true });
  return out;
}
