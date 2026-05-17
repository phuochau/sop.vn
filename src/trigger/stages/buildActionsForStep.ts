import { logger } from "@trigger.dev/sdk/v3";
import type { Action } from "@/lib/schemas";
import type { ClassifiedActionRecord } from "./classifyStepWithLLM";
import type { ScreenCluster } from "@/trigger/lib/screenId";

const SUFFIX_SET = new Set(["button", "link", "field", "input", "icon", "tab", "menu", "item"]);

const VIEW_CAPTION: Record<string, string> = {
  en: "Review this screen before continuing.",
  vi: "Hãy xem màn hình này trước khi tiếp tục.",
};

function viewCaption(lang: string): string {
  return VIEW_CAPTION[lang] ?? VIEW_CAPTION.en;
}

export function normalizeElementId(s: string): string {
  let n = s.toLowerCase().trim().replace(/\s+/g, " ");
  n = n.replace(/[.,;:!?'"()\[\]]/g, "");
  const tokens = n.split(" ");
  if (tokens.length > 1 && SUFFIX_SET.has(tokens[tokens.length - 1])) {
    tokens.pop();
  }
  return tokens.join(" ");
}

function normalizeScreenName(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ").replace(/[.:!?]$/, "");
}

export type BuildActionsArgs = {
  stepIndex: number;
  classified: ClassifiedActionRecord[];
  screenClusters: ScreenCluster[];
  eventTimes: number[];
  viewMinDurationSec: number;
  language: string;
};

type ElementGroup = {
  verb: "click" | "input" | "select" | "link";
  caption: string;
  displayFramePath: string;
  time: number;
};

export function buildActionsForStep(args: BuildActionsArgs): Action[] {
  const surviving: ClassifiedActionRecord[] = [];
  for (const c of args.classified) {
    if (c.decision === "discard") {
      const reason = c.discardReason ?? "other";
      logger.info("pipeline.candidate.discarded", { stepIndex: args.stepIndex, index: c.index, reason });
      continue;
    }
    if (!c.verb || !c.screenName || !c.elementCaption || !c.displayFrame) {
      logger.warn("pipeline.classifier.incomplete_action", { stepIndex: args.stepIndex, index: c.index });
      continue;
    }
    surviving.push(c);
  }

  const screenGroups = new Map<string, ClassifiedActionRecord[]>();
  for (const c of surviving) {
    const key = normalizeScreenName(c.screenName!);
    const list = screenGroups.get(key) ?? [];
    list.push(c);
    screenGroups.set(key, list);
  }

  const orderedScreens = [...screenGroups.entries()].sort((a, b) => {
    const at = Math.min(...a[1].map(r => args.eventTimes[r.index]));
    const bt = Math.min(...b[1].map(r => args.eventTimes[r.index]));
    return at - bt;
  });

  const elementGroups: ElementGroup[] = [];
  let seq = 0;
  for (const [, records] of orderedScreens) {
    const screenId = `${args.stepIndex}-${seq + 1}`;
    seq += 1;

    const byElement = new Map<string, ClassifiedActionRecord[]>();
    for (const r of records) {
      const id = normalizeElementId(r.elementCaption!);
      const list = byElement.get(id) ?? [];
      list.push(r);
      byElement.set(id, list);
    }

    for (const [elementId, group] of byElement.entries()) {
      const sortedByTime = [...group].sort((x, y) => args.eventTimes[x.index] - args.eventTimes[y.index]);
      const latest = sortedByTime[sortedByTime.length - 1];
      const hasInput = group.some(g => g.verb === "input");
      const verb = hasInput ? ("input" as const) : latest.verb!;
      if (sortedByTime.length > 1) {
        logger.info("pipeline.action.deduped", {
          stepIndex: args.stepIndex,
          screenId,
          elementId,
          keptTime: args.eventTimes[latest.index],
          droppedTimes: sortedByTime.slice(0, -1).map(r => args.eventTimes[r.index]),
        });
      }
      const displayFrame = latest.displayFrame!;
      elementGroups.push({
        verb,
        caption: latest.elementCaption!,
        displayFramePath: displayFrame === "after" ? latest.afterFramePath : latest.beforeFramePath,
        time: args.eventTimes[latest.index],
      });
    }
  }

  const elementTimes = elementGroups.map(a => a.time);
  const viewGroups: { caption: string; displayFramePath: string; time: number }[] = [];
  for (const cluster of args.screenClusters) {
    const span = cluster.timeSpan.end - cluster.timeSpan.start;
    if (span < args.viewMinDurationSec) continue;
    const overlaps = elementTimes.some(t => t >= cluster.timeSpan.start && t <= cluster.timeSpan.end);
    if (overlaps) continue;
    viewGroups.push({
      caption: viewCaption(args.language),
      displayFramePath: cluster.representative.localPath,
      time: (cluster.timeSpan.start + cluster.timeSpan.end) / 2,
    });
  }

  type Pending = { verb: Action["verb"]; description: string; displayFramePath: string; time: number };
  const pending: Pending[] = [
    ...elementGroups.map(e => ({ verb: e.verb, description: e.caption, displayFramePath: e.displayFramePath, time: e.time })),
    ...viewGroups.map(v => ({ verb: "view" as const, description: v.caption, displayFramePath: v.displayFramePath, time: v.time })),
  ];
  pending.sort((a, b) => a.time - b.time);

  return pending.map((p, order) => ({
    stepIndex: args.stepIndex,
    order,
    verb: p.verb,
    description: p.description,
    displayFramePath: p.displayFramePath,
    time: p.time,
  }));
}
