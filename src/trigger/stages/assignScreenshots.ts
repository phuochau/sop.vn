import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { logger } from "@trigger.dev/sdk/v3";
import { llmJsonVision } from "@/lib/openrouter";
import { ScreenshotPicksOutput } from "@/lib/schemas";
import { config } from "@/config";
import { downscaleToMaxEdge } from "@/trigger/lib/perceptualHash";
import type { Cursor } from "@/lib/schemas";
import { validateHighlights } from "./validateHighlights";

export interface PoolFrame {
  t: number;
  poolId: string;
  localPath: string;
  pHash: string;
}

export interface StepRange {
  stepIndex: number;
  tStart: number;
  tEnd: number;
}

export interface StepInput extends StepRange {
  title: string;
  narration: string;
}

export type Highlight = { kind: "click" | "input"; bbox: { x: number; y: number; w: number; h: number } };
export type Pick = { poolId: string; description: string | null; highlight: Highlight | null };

export function bboxContainsCursor(
  bbox: Highlight["bbox"],
  cursor: Cursor,
  marginFrac = 0.05,
): boolean {
  if (bbox.w <= 0 || bbox.h <= 0) return false;
  const mx = bbox.w * marginFrac;
  const my = bbox.h * marginFrac;
  return (
    cursor.x >= bbox.x - mx &&
    cursor.x <= bbox.x + bbox.w + mx &&
    cursor.y >= bbox.y - my &&
    cursor.y <= bbox.y + bbox.h + my
  );
}

export type AssignmentResult = {
  byStep: Map<number, Pick[]>;
  errors: Map<number, string>;
};

export function bucketFramesByStep(
  steps: StepRange[],
  pool: PoolFrame[],
  overlapBufferSeconds: number,
): Map<number, PoolFrame[]> {
  const buckets = new Map<number, PoolFrame[]>();
  for (const step of steps) {
    const lo = step.tStart - overlapBufferSeconds;
    const hi = step.tEnd + overlapBufferSeconds;
    buckets.set(step.stepIndex, pool.filter(f => f.t >= lo && f.t <= hi));
  }
  return buckets;
}

export function resolveCrossStepDedup(
  steps: StepRange[],
  picksByStep: Map<number, Pick[]>,
  pool: PoolFrame[],
): Map<number, Pick[]> {
  const byId = new Map<string, PoolFrame>(pool.map(f => [f.poolId, f]));
  const stepCenter = (s: StepRange) => (s.tStart + s.tEnd) / 2;

  const owner = new Map<string, { stepIndex: number; description: string | null; highlight: Highlight | null }>();
  for (const step of steps) {
    const picks = picksByStep.get(step.stepIndex) ?? [];
    for (const p of picks) {
      const frame = byId.get(p.poolId);
      if (!frame) continue;
      const incumbent = owner.get(p.poolId);
      if (incumbent === undefined) {
        owner.set(p.poolId, { stepIndex: step.stepIndex, description: p.description, highlight: p.highlight });
        continue;
      }
      const incumbentStep = steps.find(s => s.stepIndex === incumbent.stepIndex)!;
      const incumbentDist = Math.abs(frame.t - stepCenter(incumbentStep));
      const challengerDist = Math.abs(frame.t - stepCenter(step));
      if (challengerDist < incumbentDist) {
        owner.set(p.poolId, { stepIndex: step.stepIndex, description: p.description, highlight: p.highlight });
      }
    }
  }

  const out = new Map<number, Pick[]>();
  for (const step of steps) out.set(step.stepIndex, []);
  for (const [poolId, info] of owner.entries()) {
    out.get(info.stepIndex)!.push({ poolId, description: info.description, highlight: info.highlight });
  }
  for (const [stepIndex, picks] of out.entries()) {
    picks.sort((a, b) => byId.get(a.poolId)!.t - byId.get(b.poolId)!.t);
    out.set(stepIndex, picks);
  }
  return out;
}

async function pickForStep(args: {
  step: StepInput;
  bucket: PoolFrame[];
  language: string;
}): Promise<Pick[]> {
  if (args.bucket.length === 0) return [];

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sop-pick-"));
  try {
    const downscaledPaths: string[] = [];
    for (let i = 0; i < args.bucket.length; i++) {
      const out = path.join(tmpDir, `b-${i}.jpg`);
      await downscaleToMaxEdge(args.bucket[i].localPath, out, config.screenshots.downscaleMaxEdgePx);
      downscaledPaths.push(out);
    }

    const userText = [
      `Step title: ${args.step.title}`,
      `Narration: ${args.step.narration}`,
      ``,
      `Candidate frames (bucket index : timestamp seconds):`,
      ...args.bucket.map((f, i) => `${i} : ${f.t.toFixed(2)}s`),
      ``,
      `Return JSON: { "picks": [{ "index": <bucket index>, "description": "<short caption or null>", "highlight": { "kind": "click"|"input", "bbox": { "x": <0..1>, "y": <0..1>, "w": <0..1>, "h": <0..1> } } | null }] }`,
    ].join("\n");

    const result = await llmJsonVision({
      model: config.ai.visionModel,
      system: config.ai.prompts.screenshotPickSystem(args.language),
      userText,
      imagePaths: downscaledPaths,
      schema: ScreenshotPicksOutput,
      schemaName: "screenshot_picks",
      maxRetries: config.ai.maxRetries,
    });

    const validPicks = result.picks.filter(p => p.index >= 0 && p.index < args.bucket.length);
    if (validPicks.length !== result.picks.length) {
      logger.warn("vision LLM returned out-of-range indices", {
        stepIndex: args.step.stepIndex,
        returned: result.picks.length,
        valid: validPicks.length,
      });
    }

    const picks: Pick[] = validPicks.map(p => ({
      poolId: args.bucket[p.index].poolId,
      description: p.description,
      highlight: p.highlight,
    }));

    const validationInputs = validPicks
      .map((p, pickIndex) =>
        p.highlight
          ? {
              pickIndex,
              bucketIndex: p.index,
              framePath: downscaledPaths[p.index],
              timestampSec: args.bucket[p.index].t,
            }
          : null,
      )
      .filter((x): x is NonNullable<typeof x> => x !== null);

    try {
      return await validateHighlights({ picks, inputs: validationInputs, stepIndex: args.step.stepIndex });
    } catch (e) {
      logger.warn("highlight validation failed; dropping all highlights for step", {
        stepIndex: args.step.stepIndex,
        error: e instanceof Error ? e.message : String(e),
      });
      return picks.map(p => ({ ...p, highlight: null }));
    }
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}

export async function runAssignScreenshots(args: {
  steps: StepInput[];
  pool: PoolFrame[];
  language: string;
}): Promise<AssignmentResult> {
  const buckets = bucketFramesByStep(args.steps, args.pool, config.screenshots.overlapBufferSeconds);

  const settled = await Promise.allSettled(
    args.steps.map(step =>
      pickForStep({ step, bucket: buckets.get(step.stepIndex) ?? [], language: args.language }),
    ),
  );

  const picksByStep = new Map<number, Pick[]>();
  const errors = new Map<number, string>();
  for (let i = 0; i < args.steps.length; i++) {
    const stepIndex = args.steps[i].stepIndex;
    const r = settled[i];
    if (r.status === "fulfilled") {
      picksByStep.set(stepIndex, r.value);
    } else {
      picksByStep.set(stepIndex, []);
      errors.set(stepIndex, String(r.reason));
      logger.error("screenshot pick failed", { stepIndex, e: String(r.reason) });
    }
  }

  const byStep = resolveCrossStepDedup(args.steps, picksByStep, args.pool);
  return { byStep, errors };
}
