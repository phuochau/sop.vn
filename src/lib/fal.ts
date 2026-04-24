import { fal } from "@fal-ai/client";
import type { Segment } from "./mongo";

fal.config({ credentials: process.env.FAL_API_KEY });

/**
 * Runs fal.ai Whisper on an R2 signed URL. Returns indexed segments
 * matching our Mongo Segment type.
 */
export async function transcribeAudio(signedUrl: string): Promise<{
  transcript: string;
  segments: Segment[];
}> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = await fal.subscribe("fal-ai/whisper", {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    input: {
      audio_url: signedUrl,
      task: "transcribe",
      language: "vi",
      chunk_level: "segment",
      version: "3",
    } as any,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = result?.data ?? result;
  const rawSegments: any[] = data?.chunks ?? data?.segments ?? [];
  const segments: Segment[] = rawSegments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((s: any, i: number) => ({
      id: i,
      start: Number(s.timestamp?.[0] ?? s.start ?? 0),
      end:   Number(s.timestamp?.[1] ?? s.end   ?? 0),
      text:  String(s.text ?? "").trim(),
    })).filter(s => s.text.length > 0);

  const transcript = segments.map(s => s.text).join(" ");
  return { transcript, segments };
}
