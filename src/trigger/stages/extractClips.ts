import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { extractClip as realExtractClip } from "@/trigger/lib/extractClip";
import { grabFrame as realGrabFrame } from "@/trigger/lib/videoTmp";

export type ExtractClipFn = (
  srcPath: string, outPath: string, startSec: number, endSec: number,
) => Promise<void>;
export type GrabFrameFn = (input: string, out: string, atSec: number) => Promise<void>;

/** One step's clip extraction result. `error` is set when this step failed;
 *  the other steps are unaffected. */
export interface ExtractedClip {
  stepIndex: number;
  clipPath: string;
  posterPath: string;
  startTime: number;
  endTime: number;
  error?: string;
}

/**
 * Trims one clip per step (with a midpoint poster frame) into a fresh temp dir.
 * Per-step failures are recorded as `error` and do not abort other steps.
 * The returned temp paths must outlive the upload stage, so the caller is
 * responsible for calling `dispose()` — typically in the orchestrator's
 * outer `finally`.
 */
export async function runExtractClips(args: {
  srcPath: string;
  steps: { startTime: number; endTime: number }[];
  extractClip?: ExtractClipFn;
  grabFrame?: GrabFrameFn;
}): Promise<{ clips: ExtractedClip[]; tmpDir: string; dispose: () => Promise<void> }> {
  const extractClip = args.extractClip ?? realExtractClip;
  const grabFrame = args.grabFrame ?? realGrabFrame;
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sop-clips-"));
  const dispose = async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  };
  try {
    const clips: ExtractedClip[] = [];
    for (let i = 0; i < args.steps.length; i++) {
      const { startTime, endTime } = args.steps[i];
      const clipPath = path.join(tmpDir, `clip-${i}.mp4`);
      const posterPath = path.join(tmpDir, `clip-${i}-poster.jpg`);
      const rec: ExtractedClip = { stepIndex: i, clipPath, posterPath, startTime, endTime };
      try {
        await extractClip(args.srcPath, clipPath, startTime, endTime);
        await grabFrame(args.srcPath, posterPath, (startTime + endTime) / 2);
      } catch (e) {
        rec.error = e instanceof Error ? e.message : String(e);
      }
      clips.push(rec);
    }
    return { clips, tmpDir, dispose };
  } catch (e) {
    await dispose();
    throw e;
  }
}
