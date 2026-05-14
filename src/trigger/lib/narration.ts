import type { Segment, CleanSegment } from "@/lib/mongo";
import type { ScreenCluster } from "@/trigger/lib/screenId";
import type { z } from "zod";
import type { StepPlan } from "@/lib/schemas";

export type NarrationSegment = { id: number; start: number; end: number; text: string };

const VIEW_CAPTION: Record<string, string> = {
  en: "Review this screen before continuing.",
  vi: "Hãy xem màn hình này trước khi tiếp tục.",
};

function viewCaption(lang: string): string {
  const c = VIEW_CAPTION[lang];
  if (c) return c;
  return VIEW_CAPTION.en;
}

export function hasLocalizedViewCaption(lang: string): boolean {
  return VIEW_CAPTION[lang] !== undefined;
}

export function assembleStepNarration(
  step: { startSegmentId: number; endSegmentId: number },
  segments: Segment[],
  segmentsClean: CleanSegment[] | null,
): NarrationSegment[] {
  const cleanById = new Map<number, string>();
  if (segmentsClean) {
    for (const c of segmentsClean) cleanById.set(c.id, c.text);
  }
  const out: NarrationSegment[] = [];
  for (const s of segments) {
    if (s.id < step.startSegmentId || s.id > step.endSegmentId) continue;
    out.push({
      id: s.id,
      start: s.start,
      end: s.end,
      text: cleanById.get(s.id) ?? s.text,
    });
  }
  return out;
}

export function silentStepFallback(
  clusters: ScreenCluster[],
  _step: { stepIndex: number },
  viewMinDurationSec: number,
  language: string,
): z.infer<typeof StepPlan> {
  const caption = viewCaption(language);
  const subSteps = clusters
    .filter(c => (c.timeSpan.end - c.timeSpan.start) >= viewMinDurationSec)
    .map(c => ({
      intent: caption,
      verb: "view" as const,
      narrationSegmentIds: [],
      timeWindow: { start: c.timeSpan.start, end: c.timeSpan.end },
      visualConfidence: "high" as const,
    }));
  return { subSteps };
}
