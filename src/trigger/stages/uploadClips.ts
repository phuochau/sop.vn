import fs from "node:fs";
import { customAlphabet } from "nanoid";
import { putObject as realPutObject } from "@/lib/r2";
import { clipKey, clipPosterKey } from "@/lib/utils";
import type { Clip, Step } from "@/lib/mongo";
import type { ExtractedClip } from "./extractClips";

export type PutObjectFn = (key: string, body: Buffer, contentType: string) => Promise<void>;

// Lowercase + digits, length 10 — matches the `newFrameId` convention in
// uploadScreenshots.ts.
const newClipId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);

export interface StepClips {
  clips: Clip[];
  error?: string;
}

/**
 * Uploads each extracted clip's mp4 + poster to R2 and builds `Clip` records,
 * keyed by step index. A step that failed extraction is passed through as a
 * `clipsError` with no upload. `putObject` is injectable for testing.
 */
export async function runUploadClips(args: {
  sopId: string;
  clips: ExtractedClip[];
  putObject?: PutObjectFn;
}): Promise<Map<number, StepClips>> {
  const putObject = args.putObject ?? realPutObject;
  const out = new Map<number, StepClips>();
  for (const ec of args.clips) {
    if (ec.error) {
      out.set(ec.stepIndex, { clips: [], error: ec.error });
      continue;
    }
    const clipId = newClipId();
    const r2Key = clipKey(args.sopId, ec.stepIndex, clipId);
    const posterR2Key = clipPosterKey(args.sopId, ec.stepIndex, clipId);
    const clipBuf = await fs.promises.readFile(ec.clipPath);
    const posterBuf = await fs.promises.readFile(ec.posterPath);
    await putObject(r2Key, clipBuf, "video/mp4");
    await putObject(posterR2Key, posterBuf, "image/jpeg");
    out.set(ec.stepIndex, {
      clips: [{
        clipId, r2Key, posterR2Key,
        startTime: ec.startTime, endTime: ec.endTime, order: 0,
      }],
    });
  }
  return out;
}

/** One resolved step's metadata — the subset `composeClipSteps` needs. */
export interface ResolvedStepLite {
  title: string;
  description: string;
  startTime: number;
  endTime: number;
}

/**
 * Assembles the final `Step[]` for a physical SOP: each resolved step gets its
 * uploaded `clips` (or a `clipsError`) from `clipsByStep`. `screenshots` is
 * never set. Pure — testable without the orchestrator.
 */
export function composeClipSteps(
  resolved: ResolvedStepLite[],
  clipsByStep: Map<number, StepClips>,
): Step[] {
  return resolved.map((rs, i) => {
    const entry = clipsByStep.get(i);
    const base: Step = {
      title: rs.title,
      description: rs.description,
      startTime: rs.startTime,
      endTime: rs.endTime,
    };
    if (entry?.clips.length) base.clips = entry.clips;
    if (entry?.error) base.clipsError = entry.error;
    return base;
  });
}
