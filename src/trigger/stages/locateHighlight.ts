import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import type { z } from "zod";
import { uiTarsPoint, qwenPoint } from "@/lib/grounding";
import { HighlightDecision, SubStepPlan } from "@/lib/schemas";
import { config } from "@/config";

type SubStep = z.infer<typeof SubStepPlan>;
type Decision = z.infer<typeof HighlightDecision>;

export type HighlighterFn = (args: {
  intent: string;
  verb: SubStep["verb"];
  framePath: string;
  language: string;
}) => Promise<Decision>;

const DOWNSCALE_MAX_EDGE = 1280;

export function coerceForViewVerb(verb: SubStep["verb"], d: Decision): Decision {
  if (verb !== "view") return d;
  return {
    highlight: "no",
    bbox: null,
    elementCaption: null,
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
};
const defaultGroundDeps: GroundDeps = { uiTars: uiTarsPoint, qwen: qwenPoint };

function yesDecision(point: { x: number; y: number }): Decision {
  return {
    highlight: "yes",
    point,
    bbox: null,
    elementCaption: null,
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

  let uiTarsErrored = false;
  try {
    const r = await deps.uiTars({
      framePath: args.framePath, intent: args.intent, verb: args.verb,
      frameW, frameH, model: config.ai.pointPrimaryModel,
    });
    if (r.point) return yesDecision(r.point);
  } catch {
    uiTarsErrored = true;
  }

  let qwenErrored = false;
  try {
    const r = await deps.qwen({
      framePath: args.framePath, intent: args.intent, verb: args.verb,
      model: config.ai.pointFallbackModel,
    });
    if (r.point) return yesDecision(r.point);
  } catch {
    qwenErrored = true;
  }

  return {
    highlight: "no",
    point: null,
    bbox: null,
    elementCaption: null,
    noHighlightReason:
      uiTarsErrored && qwenErrored ? "grounding_unavailable" : "no_specific_target",
  };
}

const defaultHighlighter: HighlighterFn = (args) =>
  pointFallbackHighlight({ intent: args.intent, verb: args.verb, framePath: args.framePath });

export async function runLocateHighlightWith(args: {
  intent: string;
  verb: SubStep["verb"];
  framePath: string;
  language: string;
  highlighter?: HighlighterFn;
}): Promise<Decision> {
  const highlighter = args.highlighter ?? defaultHighlighter;
  const raw = await highlighter({
    intent: args.intent, verb: args.verb, framePath: args.framePath, language: args.language,
  });
  return coerceForViewVerb(args.verb, raw);
}

export async function runLocateHighlight(args: {
  intent: string;
  verb: SubStep["verb"];
  framePath: string;
  language: string;
}): Promise<Decision> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "highlight-"));
  try {
    const ds = await downscaledCopy(args.framePath, tmpDir);
    return runLocateHighlightWith({ ...args, framePath: ds });
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}
