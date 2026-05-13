import { logger } from "@trigger.dev/sdk/v3";
import { llmJsonVision } from "@/lib/openrouter";
import { CaptionsOutput } from "@/lib/schemas";
import { config } from "@/config";
import type { AnchoredEvent } from "./anchorClickEvents";

export type CaptionedAnchoredEvent = AnchoredEvent & {
  caption: string | null;
  kind: "click" | "input";
};

export async function runCaptionClickEvents(args: {
  byStep: Map<number, AnchoredEvent[]>;
  steps: Array<{ stepIndex: number; title: string; narration: string }>;
  language: string;
}): Promise<Map<number, CaptionedAnchoredEvent[]>> {
  const out = new Map<number, CaptionedAnchoredEvent[]>();

  for (const step of args.steps) {
    const events = args.byStep.get(step.stepIndex) ?? [];
    if (events.length === 0) {
      out.set(step.stepIndex, []);
      continue;
    }

    try {
      const userText = [
        `Step title: ${step.title}`,
        `Step narration: ${step.narration}`,
        ``,
        `Events (index : timestamp : bounding box in normalized 0..1 coords as x,y,w,h):`,
        ...events.map((e, i) =>
          `${i} : ${e.time.toFixed(2)}s : ${e.bbox.x.toFixed(3)},${e.bbox.y.toFixed(3)},${e.bbox.w.toFixed(3)},${e.bbox.h.toFixed(3)}`,
        ),
        ``,
        `Return JSON: { "captions": [{ "index": N, "caption": "..." | null, "kind": "click" | "input" }] }`,
      ].join("\n");

      const result = await llmJsonVision({
        model: config.ai.visionModel,
        system: config.ai.prompts.clickCaptionSystem(args.language),
        userText,
        imagePaths: events.map(e => e.displayFramePath),
        schema: CaptionsOutput,
        schemaName: "click_captions",
        maxRetries: config.ai.maxRetries,
      });

      const byIndex = new Map<number, { caption: string | null; kind: "click" | "input" }>();
      for (const c of result.captions) {
        if (c.index < 0 || c.index >= events.length) continue;
        if (!byIndex.has(c.index)) byIndex.set(c.index, { caption: c.caption, kind: c.kind });
      }

      out.set(
        step.stepIndex,
        events.map((e, i) => {
          const cap = byIndex.get(i);
          return {
            ...e,
            caption: cap?.caption ?? null,
            kind: cap?.kind ?? "click",
          };
        }),
      );
    } catch (e) {
      logger.warn("caption call failed for step; emitting null captions", {
        stepIndex: step.stepIndex,
        error: e instanceof Error ? e.message : String(e),
      });
      out.set(
        step.stepIndex,
        events.map(e => ({ ...e, caption: null, kind: "click" as const })),
      );
    }
  }

  return out;
}
