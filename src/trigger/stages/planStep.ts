import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { logger } from "@trigger.dev/sdk/v3";
import type { z } from "zod";
import { llmJsonVision } from "@/lib/openrouter";
import { StepPlan } from "@/lib/schemas";
import { config } from "@/config";
import type { NarrationSegment } from "@/trigger/lib/narration";
import type { ScreenCluster } from "@/trigger/lib/screenId";

export type PlannerFn = (args: {
  stepIndex: number;
  stepTitle: string;
  stepDescription: string;
  narration: NarrationSegment[];
  montagePath: string | null;
  language: string;
  isRepair: boolean;
}) => Promise<z.infer<typeof StepPlan>>;

export type PlanTraceInfo = {
  rawPlan: z.infer<typeof StepPlan>;
  filteredPlan: z.infer<typeof StepPlan>;
  drops: PlanDropRecord[];
  repairUsed: boolean;
  rawRepairPlan: z.infer<typeof StepPlan> | null;
};

export type PlanStepArgs = {
  stepIndex: number;
  stepTitle: string;
  stepDescription: string;
  narration: NarrationSegment[];
  clusters: ScreenCluster[];
  language: string;
  planner?: PlannerFn;
  onTrace?: (info: PlanTraceInfo) => void | Promise<void>;
};

const TILE_W = 640;
const TILE_H = 360;
const LABEL_H = 36;

async function buildMontage(clusters: ScreenCluster[], outDir: string): Promise<string | null> {
  if (clusters.length === 0) return null;
  const tiles: Buffer[] = [];
  for (const c of clusters) {
    const labelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_W}" height="${LABEL_H}">
      <rect width="${TILE_W}" height="${LABEL_H}" fill="#222"/>
      <text x="12" y="26" fill="#fff" font-family="sans-serif" font-size="22" font-weight="700">${c.letter}</text>
    </svg>`;
    let imgBuf: Buffer;
    try {
      imgBuf = await sharp(c.representative.localPath)
        .resize({ width: TILE_W, height: TILE_H - LABEL_H, fit: "inside", withoutEnlargement: true })
        .toBuffer();
    } catch {
      continue;
    }
    const tile = await sharp({
      create: { width: TILE_W, height: TILE_H, channels: 3, background: "#000" },
    })
      .composite([
        { input: Buffer.from(labelSvg), top: 0, left: 0 },
        { input: imgBuf, top: LABEL_H, left: 0 },
      ])
      .jpeg({ quality: 85 })
      .toBuffer();
    tiles.push(tile);
  }
  if (tiles.length === 0) return null;
  const outPath = path.join(outDir, "montage.jpg");
  const composites = tiles.map((buf, i) => ({ input: buf, top: 0, left: i * TILE_W }));
  await sharp({
    create: { width: TILE_W * tiles.length, height: TILE_H, channels: 3, background: "#000" },
  })
    .composite(composites)
    .jpeg({ quality: 85 })
    .toFile(outPath);
  return outPath;
}

async function defaultPlanner(args: {
  stepIndex: number;
  stepTitle: string;
  stepDescription: string;
  narration: NarrationSegment[];
  montagePath: string | null;
  language: string;
  isRepair: boolean;
}): Promise<z.infer<typeof StepPlan>> {
  const userLines = [
    `Step title: ${args.stepTitle}`,
    `Step description: ${args.stepDescription}`,
    `Narration segments (id | start-end | text):`,
    ...args.narration.map(s => `- ${s.id} | ${s.start.toFixed(2)}-${s.end.toFixed(2)} | ${s.text}`),
    args.montagePath ? `\nMontage attached; letters in left-to-right order.` : `\nNo screen montage available.`,
    args.isRepair ? `\nYour previous attempt returned 0 sub-steps. Re-segment using the narration above; aim for one sub-step per discrete action the trainer asks the reader to take.` : ``,
  ];
  const userText = userLines.join("\n");
  const imagePaths: string[] = args.montagePath ? [args.montagePath] : [];

  return llmJsonVision({
    model: config.ai.visionModel,
    system: config.ai.prompts.planStepSystem(args.language),
    userText,
    imagePaths,
    schema: StepPlan,
    schemaName: "step_plan",
    temperature: 0.0,
  });
}

export type PlanDropRecord = {
  intent: string;
  reason: "low_confidence" | "no_temporal_anchor";
  droppedNarrationIds?: number[];
};

export function validateAndFilter(
  plan: z.infer<typeof StepPlan>,
  validIds: Set<number>,
  ctx: {
    stepIndex?: number;
    log?: (event: string, attrs: Record<string, unknown>) => void;
    drops?: PlanDropRecord[];
  } = {},
): z.infer<typeof StepPlan> {
  const log = ctx.log ?? ((_event, _attrs) => {});
  const stepIndex = ctx.stepIndex;
  const out: z.infer<typeof StepPlan>["subSteps"] = [];
  for (const s of plan.subSteps) {
    if (s.visualConfidence === "low") {
      log("pipeline.plan.low_confidence_dropped", { stepIndex, intent: s.intent });
      ctx.drops?.push({ intent: s.intent, reason: "low_confidence" });
      continue;
    }
    const invalidIds = s.narrationSegmentIds.filter(id => !validIds.has(id));
    const filteredIds = s.narrationSegmentIds.filter(id => validIds.has(id));
    if (invalidIds.length > 0) {
      log("pipeline.plan.filtered_invalid_ids", { stepIndex, intent: s.intent, droppedIds: invalidIds });
    }
    const next = { ...s, narrationSegmentIds: filteredIds };
    if (next.narrationSegmentIds.length === 0 && next.timeWindow === null) {
      log("pipeline.plan.no_temporal_anchor", { stepIndex, intent: next.intent });
      ctx.drops?.push({ intent: next.intent, reason: "no_temporal_anchor", droppedNarrationIds: invalidIds });
      continue;
    }
    out.push(next);
  }
  return { subSteps: out };
}

export async function runPlanStep(args: PlanStepArgs): Promise<z.infer<typeof StepPlan>> {
  const planner = args.planner ?? defaultPlanner;
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "plan-"));
  try {
    const montagePath = await buildMontage(args.clusters, tmpDir);
    const validIds = new Set(args.narration.map(n => n.id));

    const initialRaw = await planner({
      stepIndex: args.stepIndex,
      stepTitle: args.stepTitle,
      stepDescription: args.stepDescription,
      narration: args.narration,
      montagePath,
      language: args.language,
      isRepair: false,
    });
    const log = (event: string, attrs: Record<string, unknown>) => logger.info(event, attrs);
    const initialDrops: PlanDropRecord[] = [];
    let plan = validateAndFilter(initialRaw, validIds, { stepIndex: args.stepIndex, log, drops: initialDrops });

    let repairUsed = false;
    let rawRepair: z.infer<typeof StepPlan> | null = null;
    let repairDrops: PlanDropRecord[] = [];
    if (plan.subSteps.length === 0 && args.narration.length > 0) {
      logger.warn("pipeline.plan.empty", { stepIndex: args.stepIndex });
      repairUsed = true;
      rawRepair = await planner({
        stepIndex: args.stepIndex,
        stepTitle: args.stepTitle,
        stepDescription: args.stepDescription,
        narration: args.narration,
        montagePath,
        language: args.language,
        isRepair: true,
      });
      repairDrops = [];
      plan = validateAndFilter(rawRepair, validIds, { stepIndex: args.stepIndex, log, drops: repairDrops });
      if (plan.subSteps.length === 0) {
        logger.error("pipeline.plan.empty_after_repair", { stepIndex: args.stepIndex });
      }
    }

    logger.info("pipeline.plan.done", {
      stepIndex: args.stepIndex,
      subStepCount: plan.subSteps.length,
    });

    if (args.onTrace) {
      await args.onTrace({
        rawPlan: repairUsed && rawRepair ? rawRepair : initialRaw,
        filteredPlan: plan,
        drops: repairUsed ? repairDrops : initialDrops,
        repairUsed,
        rawRepairPlan: repairUsed ? initialRaw : null,
      });
    }

    return plan;
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}
