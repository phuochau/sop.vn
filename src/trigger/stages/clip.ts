import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import ffmpeg from "fluent-ffmpeg";
import { logger } from "@trigger.dev/sdk/v3";
import { presignGet, putObject } from "@/lib/r2";
import { clipKey, posterKey } from "@/lib/utils";
import type { Segment, Step } from "@/lib/mongo";

export function resolveTimes(
  rawSegments: Segment[],
  extractedSteps: { title: string; description: string; startSegmentId: number; endSegmentId: number }[],
  videoDurationSec: number
): { title: string; description: string; startTime: number; endTime: number }[] {
  const byId = new Map(rawSegments.map(s => [s.id, s]));
  const resolved: { title: string; description: string; startTime: number; endTime: number }[] = [];
  let prevEnd = 0;
  for (const s of extractedSteps) {
    const a = byId.get(s.startSegmentId);
    const b = byId.get(s.endSegmentId);
    if (!a || !b) continue;
    let start = Math.max(0, Math.min(a.start, videoDurationSec));
    let end   = Math.max(0, Math.min(b.end,   videoDurationSec));
    if (end <= start) continue;
    if (start < prevEnd) start = prevEnd; // keep monotonic
    if (end <= start) continue;
    prevEnd = end;
    resolved.push({ title: s.title, description: s.description, startTime: start, endTime: end });
  }
  return resolved;
}

async function downloadTo(tmpPath: string, url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(tmpPath, buf);
}

function ffprobeDuration(file: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, data) => {
      if (err) return reject(err);
      resolve(Number(data.format.duration ?? 0));
    });
  });
}

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

function grabFrame(input: string, out: string, atSec: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .screenshots({ timestamps: [atSec], filename: path.basename(out), folder: path.dirname(out), size: "640x?" })
      .on("end", () => resolve())
      .on("error", reject);
  });
}

export async function runClip(args: {
  sopId: string;
  videoR2Key: string;
  rawSegments: Segment[];
  extractedSteps: { title: string; description: string; startSegmentId: number; endSegmentId: number }[];
}): Promise<Step[]> {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sop-"));
  const srcUrl = await presignGet(args.videoR2Key, 3600);
  const srcPath = path.join(tmp, "src.mp4");
  await downloadTo(srcPath, srcUrl);
  const duration = await ffprobeDuration(srcPath);

  const resolved = resolveTimes(args.rawSegments, args.extractedSteps, duration);
  const steps: Step[] = [];
  for (let i = 0; i < resolved.length; i++) {
    const r = resolved[i];
    const clipPath = path.join(tmp, `step-${i}.mp4`);
    const posterPath = path.join(tmp, `step-${i}.jpg`);
    try {
      await cutClip(srcPath, clipPath, r.startTime, r.endTime);
      await grabFrame(srcPath, posterPath, r.startTime + (r.endTime - r.startTime) / 2);
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
  await fs.promises.rm(tmp, { recursive: true, force: true });
  if (steps.length === 0) throw new Error("no clips produced");
  return steps;
}
