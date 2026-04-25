import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import ffmpeg from "fluent-ffmpeg";
import { fal } from "@fal-ai/client";
import { transcribeAudio } from "@/lib/fal";

export async function runTranscribe(signedVideoUrl: string) {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "tx-"));
  const vid = path.join(tmp, "src.mp4");
  const aud = path.join(tmp, "audio.wav");
  try {
    const res = await fetch(signedVideoUrl);
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    await fs.promises.writeFile(vid, Buffer.from(await res.arrayBuffer()));
    const hasAudio = await new Promise<boolean>((resolve, reject) => {
      ffmpeg.ffprobe(vid, (err, data) => {
        if (err) return reject(err);
        resolve((data.streams ?? []).some(s => s.codec_type === "audio"));
      });
    });
    if (!hasAudio) return { transcript: "", segments: [], language: null };
    await new Promise<void>((resolve, reject) => {
      ffmpeg(vid)
        .noVideo()
        .audioCodec("pcm_s16le")
        .audioChannels(1)
        .audioFrequency(16000)
        .format("wav")
        .on("error", reject)
        .on("end", () => resolve())
        .save(aud);
    });
    const buf = await fs.promises.readFile(aud);
    const file = new File([new Uint8Array(buf)], "audio.wav", { type: "audio/wav" });
    const audioUrl = await fal.storage.upload(file);
    return transcribeAudio(audioUrl);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
}
