import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import type { z } from "zod";
import { llmJsonVision } from "@/lib/openrouter";
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

async function defaultHighlighter(args: {
  intent: string;
  verb: SubStep["verb"];
  framePath: string;
  language: string;
}): Promise<Decision> {
  const userText = [
    `Intent: ${args.intent}`,
    `Verb: ${args.verb}`,
  ].join("\n");
  return llmJsonVision({
    model: config.ai.visionModel,
    system: config.ai.prompts.locateHighlightSystem(args.language),
    userText,
    imagePaths: [args.framePath],
    schema: HighlightDecision,
    schemaName: "highlight_decision",
    temperature: 0.0,
  });
}

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
