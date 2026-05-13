import type { ClickEvent } from "@/trigger/lib/clickEventDetect";
import { bboxIou } from "@/trigger/lib/clickEventDetect";

export type RawEvent = ClickEvent & { kindHint: "click" | "input" };

type Opts = {
  typingAspectMin: number;
  typingMaxDensity: number;
  sessionIouMin: number;
  sessionWindowSec: number;
};

const DEFAULTS: Opts = {
  typingAspectMin: 2.5,
  typingMaxDensity: 0.4,
  sessionIouMin: 0.30,
  sessionWindowSec: 1.5,
};

function isTypingCandidate(e: ClickEvent, opts: Opts): boolean {
  const aspect = e.bbox.h > 0 ? e.bbox.w / e.bbox.h : 0;
  return aspect >= opts.typingAspectMin && e.density <= opts.typingMaxDensity;
}

function bboxUnion(a: ClickEvent["bbox"], b: ClickEvent["bbox"]): ClickEvent["bbox"] {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.w, b.x + b.w);
  const y2 = Math.max(a.y + a.h, b.y + b.h);
  return { x, y, w: x2 - x, h: y2 - y };
}

function classifyStep(events: ClickEvent[], opts: Opts): RawEvent[] {
  const out: RawEvent[] = [];
  let i = 0;
  while (i < events.length) {
    const e = events[i];
    if (!isTypingCandidate(e, opts)) {
      out.push({ ...e, kindHint: "click" });
      i++;
      continue;
    }
    let session = e;
    let lastTime = e.time;
    let j = i + 1;
    let merged = false;
    while (j < events.length) {
      const cand = events[j];
      if (!isTypingCandidate(cand, opts)) break;
      if (cand.time - lastTime > opts.sessionWindowSec) break;
      if (bboxIou(session.bbox, cand.bbox) < opts.sessionIouMin) break;
      session = {
        ...session,
        bbox: bboxUnion(session.bbox, cand.bbox),
        afterFramePath: cand.afterFramePath,
      };
      lastTime = cand.time;
      merged = true;
      j++;
    }
    out.push({ ...session, kindHint: merged ? "input" : "click" });
    i = j;
  }
  return out;
}

export function runClassifyAndMergeEvents(args: {
  byStep: Map<number, ClickEvent[]>;
  opts?: Partial<Opts>;
}): Map<number, RawEvent[]> {
  const opts: Opts = { ...DEFAULTS, ...(args.opts ?? {}) };
  const out = new Map<number, RawEvent[]>();
  for (const [stepIndex, evs] of args.byStep.entries()) {
    out.set(stepIndex, classifyStep(evs, opts));
  }
  return out;
}
