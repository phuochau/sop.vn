import type { Segment } from "@/lib/mongo";

export function hasUsableSpeech(args: { segments: Segment[]; transcript: string }): boolean {
  const wordCount = args.transcript.trim().split(/\s+/).filter(Boolean).length;
  return args.segments.length > 0 && wordCount >= 30;
}
