import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import ffmpeg from "fluent-ffmpeg";
import { logger } from "@trigger.dev/sdk/v3";
import { putObject } from "@/lib/r2";
import { clipKey, posterKey } from "@/lib/utils";
import type { Step } from "@/lib/mongo";
import { grabFrame } from "@/trigger/lib/videoTmp";

function cutClip(input: string, out: string, start: number, end: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .setStartTime(start)
      .duration(end - start)
      .outputOptions(["-c copy", "-movflags +faststart"])
      .on("end", () => resolve())
      .on("error", reject)
      .save(out);
  });
}

export async function runClip(args: {
  sopId: string;
  srcPath: string;
  resolvedSteps: { title: string; description: string; startTime: number; endTime: number }[];
}): Promise<{ steps: Step[] }> {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sop-"));
  try {
    const steps: Step[] = [];
    for (let i = 0; i < args.resolvedSteps.length; i++) {
      const r = args.resolvedSteps[i];
      const clipPath = path.join(tmp, `step-${i}.mp4`);
      const posterPath = path.join(tmp, `step-${i}.jpg`);
      try {
        await cutClip(args.srcPath, clipPath, r.startTime, r.endTime);
        await grabFrame(args.srcPath, posterPath, r.startTime + (r.endTime - r.startTime) / 2);
      } catch (e) {
        logger.warn("ffmpeg failed for step, skipping", { i, e: String(e) });
        continue;
      }
      const clipBuf = await fs.promises.readFile(clipPath);
      const posterBuf = await fs.promises.readFile(posterPath);
      const ck = clipKey(args.sopId, i);
      const pk = posterKey(args.sopId, i);
      await putObject(ck, clipBuf, "video/mp4");
      await putObject(pk, posterBuf, "image/jpeg");
      steps.push({
        title: r.title, description: r.description,
        startTime: r.startTime, endTime: r.endTime,
        clipR2Key: ck, posterR2Key: pk,
        keyframeR2Keys: [],
      });
    }
    if (steps.length === 0) throw new Error("no clips produced");
    return { steps };
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
}
