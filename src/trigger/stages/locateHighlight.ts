import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import type { z } from "zod";
import { uiTarsPoint, qwenPoint, type Point } from "@/lib/grounding";
import { HighlightDecision, SubStepPlan } from "@/lib/schemas";
import { config } from "@/config";
import { verifyGroundedPoint } from "./verifyHighlight";

type SubStep = z.infer<typeof SubStepPlan>;
type Decision = z.infer<typeof HighlightDecision>;

export type HighlighterFn = (args: {
  intent: string;
  verb: SubStep["verb"];
  framePath: string;
}) => Promise<Decision>;

const DOWNSCALE_MAX_EDGE = 1280;

export function coerceForViewVerb(verb: SubStep["verb"], d: Decision): Decision {
  if (verb !== "view") return d;
  return {
    highlight: "no",
    bbox: null,
    noHighlightReason: "view_action",
  };
}

async function downscaledCopy(srcPath: string, outDir: string): Promise<string> {
  const outPath = path.join(outDir, "frame.jpg");
  await sharp(srcPath)
    .resize({ width: DOWNSCALE_MAX_EDGE, height: DOWNSCALE_MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(outPath);
  return outPath;
}

type GroundDeps = {
  uiTars: typeof uiTarsPoint;
  qwen: typeof qwenPoint;
  verify: (point: Point, framePath: string, caption: string) => Promise<boolean>;
};
const defaultGroundDeps: GroundDeps = {
  uiTars: uiTarsPoint,
  qwen: qwenPoint,
  verify: (point, framePath, caption) =>
    verifyGroundedPoint({ point, framePath, caption, model: config.ai.verifyModel }),
};

function yesDecision(point: { x: number; y: number }): Decision {
  return {
    highlight: "yes",
    point,
    bbox: null,
    noHighlightReason: null,
  };
}

/**
 * Fallback chain: UI-TARS (primary) -> Qwen3-VL (fallback) -> no-highlight.
 * A grounder "fails" if it throws OR returns no point. If both throw, the
 * reason is `grounding_unavailable` (outage); if both simply find nothing it
 * is `no_specific_target`.
 */
export async function pointFallbackHighlight(
  args: { intent: string; verb: SubStep["verb"]; framePath: string },
  deps: GroundDeps = defaultGroundDeps,
): Promise<Decision> {
  const meta = await sharp(args.framePath).metadata();
  const frameW = meta.width ?? 0;
  const frameH = meta.height ?? 0;

  // Each grounder, tried in order. A grounder yields a point (or null), and may
  // throw. A point that passes verification wins immediately. If no point
  // verifies, the earliest grounder that *returned* a point wins as best-effort.
  const grounders: Array<() => Promise<{ point: Point | null }>> = [
    () => deps.uiTars({
      framePath: args.framePath, intent: args.intent, verb: args.verb,
      frameW, frameH, model: config.ai.pointPrimaryModel,
    }),
    () => deps.qwen({
      framePath: args.framePath, intent: args.intent, verb: args.verb,
      model: config.ai.pointFallbackModel,
    }),
  ];

  const results: Array<{ errored: boolean; point: Point | null }> = [];
  for (const ground of grounders) {
    let errored = false;
    let point: Point | null = null;
    try {
      point = (await ground()).point;
    } catch {
      errored = true;
    }
    if (point && (await deps.verify(point, args.framePath, args.intent))) {
      return yesDecision(point);
    }
    results.push({ errored, point });
  }

  const firstPoint = results.find(r => r.point !== null)?.point ?? null;
  if (firstPoint) return yesDecision(firstPoint);

  return {
    highlight: "no",
    point: null,
    bbox: null,
    noHighlightReason:
      results.every(r => r.errored) ? "grounding_unavailable" : "no_specific_target",
  };
}

const defaultHighlighter: HighlighterFn = (args) =>
  pointFallbackHighlight({ intent: args.intent, verb: args.verb, framePath: args.framePath });

export async function runLocateHighlightWith(args: {
  intent: string;
  verb: SubStep["verb"];
  framePath: string;
  highlighter?: HighlighterFn;
}): Promise<Decision> {
  const highlighter = args.highlighter ?? defaultHighlighter;
  const raw = await highlighter({
    intent: args.intent, verb: args.verb, framePath: args.framePath,
  });
  return coerceForViewVerb(args.verb, raw);
}

export async function runLocateHighlight(args: {
  intent: string;
  verb: SubStep["verb"];
  framePath: string;
  highlighter?: HighlighterFn;
}): Promise<Decision> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "highlight-"));
  try {
    const ds = await downscaledCopy(args.framePath, tmpDir);
    // Must `await`: with a bare `return`, the finally below runs (and removes
    // tmpDir) before the highlighter's async sharp reads of `ds` complete,
    // racing the rm against those reads. Awaiting keeps tmpDir alive until done.
    return await runLocateHighlightWith({ ...args, framePath: ds });
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}
