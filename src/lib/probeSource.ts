import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ffmpeg from "fluent-ffmpeg";

export interface SourceMetadata {
  sizeBytes: number;
  width: number;
  height: number;
  durationSec: number;
  fps: number;
  ext: string;   // lowercased, no leading dot
  mime: string;
  codec: string; // ffprobe video stream codec_name, "" if unknown
}

const MIME_BY_EXT: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  m4v: "video/x-m4v",
};

function parseFps(rate: string | undefined): number {
  if (!rate) return 0;
  const [num, den] = rate.split("/").map(Number);
  if (!num || !den) return 0;
  return num / den;
}

export async function probeSourceFile(filePath: string): Promise<SourceMetadata> {
  const stat = await fs.promises.stat(filePath);
  const ext = path.extname(filePath).replace(/^\./, "").toLowerCase();
  const data = await new Promise<ffmpeg.FfprobeData>((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, d) => (err ? reject(err) : resolve(d)));
  });
  const video = data.streams.find((s) => s.codec_type === "video");
  const width  = Number(video?.width  ?? 0);
  const height = Number(video?.height ?? 0);
  const fps    = parseFps(video?.avg_frame_rate ?? video?.r_frame_rate);
  const durationSec = Number(data.format.duration ?? 0);
  const codec = video?.codec_name ?? "";
  return {
    sizeBytes: stat.size,
    width, height,
    durationSec, fps,
    ext,
    mime: MIME_BY_EXT[ext] ?? "application/octet-stream",
    codec,
  };
}

export async function probeSourceFromUrl(signedUrl: string, ext: string): Promise<SourceMetadata> {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "probe-src-"));
  const file = path.join(tmp, `src.${ext}`);
  try {
    const res = await fetch(signedUrl);
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.promises.writeFile(file, buf);
    return await probeSourceFile(file);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
}
