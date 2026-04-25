import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import ffmpeg from "fluent-ffmpeg";
import { presignGet } from "@/lib/r2";

async function downloadTo(tmpPath: string, url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(tmpPath, buf);
}

export function grabFrame(input: string, out: string, atSec: number): Promise<void> {
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

/**
 * Downloads a source video from R2 to a fresh tmp directory.
 * Returns the local path and a `dispose()` to remove the tmp dir.
 * Caller is responsible for calling dispose() when done.
 */
export async function fetchSourceVideo(videoR2Key: string): Promise<{ srcPath: string; tmpDir: string; dispose: () => Promise<void> }> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sop-src-"));
  const srcUrl = await presignGet(videoR2Key, 3600);
  const srcPath = path.join(tmpDir, "src.mp4");
  await downloadTo(srcPath, srcUrl);
  const dispose = async () => { await fs.promises.rm(tmpDir, { recursive: true, force: true }); };
  return { srcPath, tmpDir, dispose };
}
