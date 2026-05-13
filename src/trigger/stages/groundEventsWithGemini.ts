import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { logger } from "@trigger.dev/sdk/v3";
import { llmJsonVision } from "@/lib/openrouter";
import { GroundedEventOutput } from "@/lib/schemas";
import { config } from "@/config";
import {
  computeCropWindow,
  diffBboxInCrop,
  cropBboxToFullFrame,
  padBbox,
  type Bbox,
} from "@/trigger/lib/cropEvent";
import type { RawEvent } from "./classifyAndMergeEvents";

export type GroundedEvent = {
  time: number;
  bbox: Bbox;
  displayFramePath: string;
  kind: "click" | "input";
  caption: string | null;
};

type StepInfo = { stepIndex: number; title: string };

export async function groundOneWithLLM(e: RawEvent, step: StepInfo, language: string): Promise<GroundedEvent | null> {
  try {
    const beforeMeta = await sharp(e.beforeFramePath).metadata();
    const W = beforeMeta.width ?? 0;
    const H = beforeMeta.height ?? 0;
    if (!W || !H) throw new Error("missing image metadata");

    const crop = computeCropWindow(e.bbox, W, H, {
      multiplier: config.screenshots.ground.cropMultiplier,
      minPx: config.screenshots.ground.cropMinPx,
      maxFrac: config.screenshots.ground.cropMaxFrac,
    });

    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "ground-"));
    const cropBeforePath = path.join(tmpDir, "before.jpg");
    const cropAfterPath = path.join(tmpDir, "after.jpg");
    try {
      await sharp(e.beforeFramePath)
        .extract({ left: crop.cx, top: crop.cy, width: crop.cw, height: crop.ch })
        .jpeg({ quality: 90 })
        .toFile(cropBeforePath);
      await sharp(e.afterFramePath)
        .extract({ left: crop.cx, top: crop.cy, width: crop.cw, height: crop.ch })
        .jpeg({ quality: 90 })
        .toFile(cropAfterPath);

      const diffInCrop = diffBboxInCrop(e.bbox, crop, W, H);
      const userText = [
        `Step title: ${step.title}`,
        `Event kind hint: ${e.kindHint}`,
        `Diff bbox in crop (x, y, w, h): ${diffInCrop.x.toFixed(3)}, ${diffInCrop.y.toFixed(3)}, ${diffInCrop.w.toFixed(3)}, ${diffInCrop.h.toFixed(3)}`,
      ].join("\n");

      logger.info("ground.event.start", {
        stepIndex: step.stepIndex,
        time: e.time,
        kindHint: e.kindHint,
        diffBbox: e.bbox,
        frameSize: { W, H },
        crop,
      });

      const result = await llmJsonVision({
        model: config.ai.visionModel,
        system: config.ai.prompts.groundEventSystem(language),
        userText,
        imagePaths: [cropBeforePath, cropAfterPath],
        schema: GroundedEventOutput,
        schemaName: "grounded_event",
        maxRetries: config.ai.maxRetries,
      });

      const fullBbox = cropBboxToFullFrame(result.bbox, crop, W, H);
      const paddedBbox = padBbox(fullBbox, W, H, config.screenshots.ground.bboxPadPx);
      const displayFramePath = result.displayFrame === "after" ? e.afterFramePath : e.beforeFramePath;

      logger.info("ground.event.done", {
        stepIndex: step.stepIndex,
        time: e.time,
        kindHint: e.kindHint,
        finalKind: result.kind,
        displayFrame: result.displayFrame,
        bbox: paddedBbox,
        caption: result.caption,
      });

      return {
        time: e.time,
        bbox: paddedBbox,
        displayFramePath,
        kind: result.kind,
        caption: result.caption,
      };
    } finally {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    }
  } catch (err) {
    logger.warn("ground.event.failed", {
      stepIndex: step.stepIndex,
      time: e.time,
      kindHint: e.kindHint,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

function fallbackEvent(e: RawEvent, stepIndex: number): GroundedEvent {
  logger.warn("ground.event.fallback", {
    stepIndex,
    time: e.time,
    kindHint: e.kindHint,
    bbox: e.bbox,
  });
  return {
    time: e.time,
    bbox: e.bbox,
    displayFramePath: e.kindHint === "input" ? e.afterFramePath : e.beforeFramePath,
    kind: e.kindHint,
    caption: null,
  };
}

async function runWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function runGroundEventsWithGemini(args: {
  byStep: Map<number, RawEvent[]>;
  steps: Array<{ stepIndex: number; title: string }>;
  language: string;
  groundOne?: (e: RawEvent, step: StepInfo, language: string) => Promise<GroundedEvent | null>;
  concurrency?: number;
}): Promise<Map<number, GroundedEvent[]>> {
  const groundOne = args.groundOne ?? groundOneWithLLM;
  const limit = args.concurrency ?? config.screenshots.ground.perStepConcurrency;
  const out = new Map<number, GroundedEvent[]>();

  let totalEvents = 0;
  let totalFallbacks = 0;

  for (const step of args.steps) {
    const events = args.byStep.get(step.stepIndex) ?? [];
    if (events.length === 0) {
      out.set(step.stepIndex, []);
      logger.info("ground.step.summary", { stepIndex: step.stepIndex, total: 0, fallbacks: 0 });
      continue;
    }
    let stepFallbacks = 0;
    const results = await runWithConcurrency(events, limit, async (e) => {
      const grounded = await groundOne(e, step, args.language);
      if (grounded === null) {
        stepFallbacks++;
        return fallbackEvent(e, step.stepIndex);
      }
      return grounded;
    });
    out.set(step.stepIndex, results);
    totalEvents += events.length;
    totalFallbacks += stepFallbacks;
    logger.info("ground.step.summary", {
      stepIndex: step.stepIndex,
      total: events.length,
      fallbacks: stepFallbacks,
    });
  }

  logger.info("ground.pipeline.summary", {
    steps: args.steps.length,
    totalEvents,
    totalFallbacks,
    language: args.language,
  });

  return out;
}
