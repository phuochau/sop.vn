import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import ffmpeg from "fluent-ffmpeg";
import { nanoid } from "nanoid";
import { logger } from "@trigger.dev/sdk/v3";
import { dHash, hammingDistance } from "@/trigger/lib/perceptualHash";

export interface RawFrame {
  t: number;
  pHash: string;
  localPath: string;
  poolId: string;
}

export interface FramePool {
  frames: RawFrame[];
  tmpDir: string;
  dispose: () => Promise<void>;
}

export interface FilterOptions {
  motionHammingThreshold: number;
  dedupHammingThreshold: number;
  dedupWindowSeconds: number;
  maxPoolSize: number;
}

/**
 * Densely sample frames at `fps`, write JPEGs into `tmpDir`,
 * and return them in timestamp order WITHOUT filtering.
 */
function ffmpegDenseSample(srcPath: string, tmpDir: string, fps: number): Promise<{ t: number; localPath: string }[]> {
  return new Promise((resolve, reject) => {
    const pattern = path.join(tmpDir, "raw-%05d.jpg");
    ffmpeg(srcPath)
      .outputOptions([`-vf fps=${fps}`, "-qscale:v 5"])
      .on("end", async () => {
        try {
          const files = (await fs.promises.readdir(tmpDir))
            .filter(f => f.startsWith("raw-") && f.endsWith(".jpg"))
            .sort();
          const out = files.map((f, i) => ({
            t: i / fps,
            localPath: path.join(tmpDir, f),
          }));
          resolve(out);
        } catch (e) { reject(e); }
      })
      .on("error", reject)
      .save(pattern);
  });
}

/**
 * Stability filter (drop singleton transitions; collapse identical runs)
 * + sliding-window dedup + hard cap. Pure function.
 */
export function filterFramePool(frames: RawFrame[], opts: FilterOptions): RawFrame[] {
  if (frames.length === 0) return [];

  // 1. Stability: drop frames whose hash is far from BOTH neighbors.
  const stable: RawFrame[] = [];
  for (let i = 0; i < frames.length; i++) {
    const prev = i > 0 ? frames[i - 1] : null;
    const next = i < frames.length - 1 ? frames[i + 1] : null;
    const closeToPrev = prev && hammingDistance(frames[i].pHash, prev.pHash) <= opts.motionHammingThreshold;
    const closeToNext = next && hammingDistance(frames[i].pHash, next.pHash) <= opts.motionHammingThreshold;
    if (closeToPrev || closeToNext) stable.push(frames[i]);
  }

  // 2. Collapse runs: within `stable`, drop frames whose hash is close to the previous kept frame.
  const collapsed: RawFrame[] = [];
  for (const f of stable) {
    const last = collapsed[collapsed.length - 1];
    if (!last || hammingDistance(f.pHash, last.pHash) > opts.motionHammingThreshold) {
      collapsed.push(f);
    }
  }

  // 3. Sliding-window dedup.
  const deduped: RawFrame[] = [];
  for (const f of collapsed) {
    const tooSimilar = deduped.some(
      k => f.t - k.t <= opts.dedupWindowSeconds &&
           hammingDistance(f.pHash, k.pHash) <= opts.dedupHammingThreshold,
    );
    if (!tooSimilar) deduped.push(f);
  }

  // 4. Hard cap via even downsampling.
  if (deduped.length <= opts.maxPoolSize) return deduped;
  const stride = deduped.length / opts.maxPoolSize;
  const capped: RawFrame[] = [];
  for (let i = 0; i < opts.maxPoolSize; i++) {
    capped.push(deduped[Math.floor(i * stride)]);
  }
  return capped;
}

export async function runBuildFramePool(args: {
  srcPath: string;
  sampleFps: number;
  filter: FilterOptions;
}): Promise<FramePool> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sop-pool-"));
  try {
    const sampled = await ffmpegDenseSample(args.srcPath, tmpDir, args.sampleFps);
    logger.info("frame pool: dense sample", { count: sampled.length });

    const raw: RawFrame[] = [];
    for (const s of sampled) {
      const pHash = await dHash(s.localPath);
      raw.push({ t: s.t, localPath: s.localPath, pHash, poolId: nanoid(10) });
    }

    const filtered = filterFramePool(raw, args.filter);
    logger.info("frame pool: filtered", { before: raw.length, after: filtered.length });

    return {
      frames: filtered,
      tmpDir,
      dispose: () => fs.promises.rm(tmpDir, { recursive: true, force: true }),
    };
  } catch (e) {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
    throw e;
  }
}
