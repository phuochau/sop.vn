import { detectCursor as defaultDetectCursor } from "@/trigger/lib/cursorDetect";
import type { ClickEvent } from "@/trigger/lib/clickEventDetect";

export type AnchoredEvent = {
  time: number;
  displayFramePath: string;
  bbox: { x: number; y: number; w: number; h: number };
  cursorAnchored: boolean;
};

export type AnchorOptions = {
  minWFrac?: number;
  maxWFrac?: number;
  minHFrac?: number;
  maxHFrac?: number;
  cursorThreshold?: number;
};

export type CursorDetector = (
  imagePath: string,
  opts?: { threshold?: number },
) => Promise<{ x: number; y: number; score: number } | null>;

/**
 * Anchor each click event's highlight to the cursor location in the BEFORE frame,
 * when a cursor can be detected with sufficient confidence. Falls back to the
 * diff bbox on the AFTER frame when the cursor isn't found.
 *
 * Sizing: bbox width/height taken from the diff bbox (clamped to sane min/max),
 * positioned centered on the cursor tip.
 */
export async function anchorClickEvents(
  events: ClickEvent[],
  opts: AnchorOptions = {},
  detectCursor: CursorDetector = defaultDetectCursor,
): Promise<AnchoredEvent[]> {
  const minW = opts.minWFrac ?? 0.05;
  const maxW = opts.maxWFrac ?? 0.20;
  const minH = opts.minHFrac ?? 0.025;
  const maxH = opts.maxHFrac ?? 0.10;
  const threshold = opts.cursorThreshold ?? 0.55;

  const out: AnchoredEvent[] = [];
  for (const ev of events) {
    const cursor = await detectCursor(ev.beforeFramePath, { threshold });
    if (cursor) {
      const w = Math.min(maxW, Math.max(minW, ev.bbox.w));
      const h = Math.min(maxH, Math.max(minH, ev.bbox.h));
      const x = Math.max(0, Math.min(1 - w, cursor.x - w / 2));
      const y = Math.max(0, Math.min(1 - h, cursor.y - h / 2));
      out.push({
        time: ev.time,
        displayFramePath: ev.beforeFramePath,
        bbox: { x, y, w, h },
        cursorAnchored: true,
      });
    } else {
      out.push({
        time: ev.time,
        displayFramePath: ev.afterFramePath,
        bbox: ev.bbox,
        cursorAnchored: false,
      });
    }
  }
  return out;
}

export async function anchorClickEventsByStep(
  byStep: Map<number, ClickEvent[]>,
  opts?: AnchorOptions,
  detectCursor?: CursorDetector,
): Promise<Map<number, AnchoredEvent[]>> {
  const out = new Map<number, AnchoredEvent[]>();
  for (const [stepIndex, events] of byStep.entries()) {
    out.set(stepIndex, await anchorClickEvents(events, opts, detectCursor));
  }
  return out;
}
