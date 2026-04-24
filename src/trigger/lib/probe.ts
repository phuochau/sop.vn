import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ffmpeg from "fluent-ffmpeg";

export async function probeDuration(signedUrl: string): Promise<number> {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "probe-"));
  const file = path.join(tmp, "src.mp4");
  try {
    const res = await fetch(signedUrl);
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.promises.writeFile(file, buf);
    return await new Promise<number>((resolve, reject) => {
      ffmpeg.ffprobe(file, (err, data) => {
        if (err) return reject(err);
        resolve(Number(data.format.duration ?? 0));
      });
    });
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
}
