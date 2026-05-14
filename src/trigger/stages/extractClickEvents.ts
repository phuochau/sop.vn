import { logger } from "@trigger.dev/sdk/v3";
import { detectClickEvents, type ClickEvent, type ClickDetectOptions } from "@/trigger/lib/clickEventDetect";
import type { DenseFrame } from "./buildFramePool";

export type StepRange = {
  stepIndex: number;
  tStart: number;
  tEnd: number;
};

export async function runExtractClickEvents(args: {
  steps: StepRange[];
  denseFrames: DenseFrame[];
  opts?: ClickDetectOptions;
  maxCandidatesPerStep?: number;
}): Promise<Map<number, ClickEvent[]>> {
  const events = await detectClickEvents(args.denseFrames, args.opts);
  logger.info("click events detected", { count: events.length });

  const byStep = new Map<number, ClickEvent[]>();
  for (const step of args.steps) byStep.set(step.stepIndex, []);

  const lastStepIndex = args.steps.length === 0 ? -1 : Math.max(...args.steps.map(s => s.stepIndex));

  for (const ev of events) {
    let assigned: number | null = null;
    for (const step of args.steps) {
      const isLast = step.stepIndex === lastStepIndex;
      const inRange = isLast
        ? ev.time >= step.tStart && ev.time <= step.tEnd
        : ev.time >= step.tStart && ev.time < step.tEnd;
      if (inRange) {
        assigned = step.stepIndex;
        break;
      }
    }
    if (assigned !== null) byStep.get(assigned)!.push(ev);
  }

  const cap = args.maxCandidatesPerStep ?? 25;
  for (const [stepIndex, list] of byStep.entries()) {
    list.sort((a, b) => a.time - b.time);
    if (list.length > cap) {
      const trimmed = [...list]
        .sort((a, b) => b.area * b.density - a.area * a.density)
        .slice(0, cap)
        .sort((x, y) => x.time - y.time);
      logger.warn("pipeline.click_events.capped", { stepIndex, before: list.length, after: cap });
      byStep.set(stepIndex, trimmed);
    }
  }

  return byStep;
}
