import type { Segment } from "@/lib/mongo";

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
    const end  = Math.max(0, Math.min(b.end, videoDurationSec));
    if (end <= start) continue;
    if (start < prevEnd) start = prevEnd; // keep monotonic
    if (end <= start) continue;
    prevEnd = end;
    resolved.push({ title: s.title, description: s.description, startTime: start, endTime: end });
  }
  return resolved;
}
