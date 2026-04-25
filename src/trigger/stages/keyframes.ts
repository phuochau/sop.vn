import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { logger } from "@trigger.dev/sdk/v3";
import { putObject } from "@/lib/r2";
import { keyframeKey } from "@/lib/utils";
import type { Step } from "@/lib/mongo";
import { grabFrame } from "@/trigger/lib/videoTmp";

export function pickKeyframeTimestamps(start: number, end: number): number[] {
  const span = end - start;
  return [start + span * 0.25, start + span * 0.5, start + span * 0.75];
}

/**
 * Extracts 3 keyframes per step from the source video and uploads them to R2.
 * Returns a copy of `steps` with `keyframeR2Keys` populated.
 * On per-step failure, that step's `keyframeR2Keys` is empty (caller falls back to posterR2Key).
 *
 * The source video at `srcPath` is owned by the caller; this function does not delete it.
 */
export async function runKeyframes(args: {
  sopId: string;
  srcPath: string;
  steps: Step[];
}): Promise<Step[]> {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sop-kf-"));

  const out: Step[] = [];
  for (let i = 0; i < args.steps.length; i++) {
    const step = args.steps[i];
    const timestamps = pickKeyframeTimestamps(step.startTime, step.endTime);
    const keys: string[] = [];
    for (let f = 0; f < timestamps.length; f++) {
      const framePath = path.join(tmp, `step-${i}-frame-${f}.jpg`);
      try {
        await grabFrame(args.srcPath, framePath, timestamps[f]);
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
