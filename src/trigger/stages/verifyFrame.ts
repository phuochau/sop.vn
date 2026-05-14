import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { logger } from "@trigger.dev/sdk/v3";
import type { z } from "zod";
import { llmJsonVision } from "@/lib/openrouter";
import { FrameVerification, SubStepPlan } from "@/lib/schemas";
import { config } from "@/config";

type SubStep = z.infer<typeof SubStepPlan>;

export type VerifierFn = (args: {
  intent: string;
  verb: SubStep["verb"];
  framePath: string;
  pickerReasoning: string;
  language: string;
}) => Promise<z.infer<typeof FrameVerification>>;

const DOWNSCALE_MAX_EDGE = 1280;

async function downscaledCopy(srcPath: string, outDir: string, name: string): Promise<string> {
  const outPath = path.join(outDir, name);
  await sharp(srcPath)
    .resize({ width: DOWNSCALE_MAX_EDGE, height: DOWNSCALE_MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(outPath);
  return outPath;
}

async function defaultVerifier(args: {
  intent: string;
  verb: SubStep["verb"];
  framePath: string;
  pickerReasoning: string;
  language: string;
}): Promise<z.infer<typeof FrameVerification>> {
  const userText = [
    `Intent: ${args.intent}`,
    `Verb: ${args.verb}`,
    `Picker's rationale: ${args.pickerReasoning}`,
  ].join("\n");
  return llmJsonVision({
    model: config.ai.visionModel,
    system: config.ai.prompts.verifyFrameSystem(args.language),
    userText,
    imagePaths: [args.framePath],
    schema: FrameVerification,
    schemaName: "frame_verification",
    temperature: 0.0,
  });
}

export async function runVerifyWithFallback(args: {
  intent: string;
  verb: SubStep["verb"];
  pickedFramePath: string;
  runnerUpFramePath: string | null;
  pickerReasoning: string;
  language: string;
  verifier?: VerifierFn;
  stepIndex?: number;
}): Promise<{ verify: z.infer<typeof FrameVerification>; finalFramePath: string | null }> {
  const verifier = args.verifier ?? defaultVerifier;
  const first = await verifier({
    intent: args.intent, verb: args.verb,
    framePath: args.pickedFramePath, pickerReasoning: args.pickerReasoning, language: args.language,
  });

  if (first.match === "yes" || first.match === "partially") {
    if (first.match === "partially") {
      logger.warn("pipeline.verify.partial", {
        stepIndex: args.stepIndex, intent: args.intent, reasoning: first.reasoning,
      });
    }
    return { verify: first, finalFramePath: args.pickedFramePath };
  }

  if (!args.runnerUpFramePath) {
    logger.info("pipeline.verify.no", {
      stepIndex: args.stepIndex, intent: args.intent, reasoning: first.reasoning, hadRunnerUp: false,
    });
    return { verify: first, finalFramePath: null };
  }

  const second = await verifier({
    intent: args.intent, verb: args.verb,
    framePath: args.runnerUpFramePath, pickerReasoning: args.pickerReasoning, language: args.language,
  });
  if (second.match === "yes" || second.match === "partially") {
    logger.info("pipeline.verify.runnerup_accepted", {
      stepIndex: args.stepIndex, intent: args.intent, match: second.match,
    });
    return { verify: second, finalFramePath: args.runnerUpFramePath };
  }
  logger.info("pipeline.verify.no", {
    stepIndex: args.stepIndex, intent: args.intent, reasoning: second.reasoning, hadRunnerUp: true,
  });
  return { verify: second, finalFramePath: null };
}

export async function runVerifyFrame(args: {
  intent: string;
  verb: SubStep["verb"];
  pickedFramePath: string;
  runnerUpFramePath: string | null;
  pickerReasoning: string;
  language: string;
  stepIndex: number;
}): Promise<{ verify: z.infer<typeof FrameVerification>; finalFramePath: string | null }> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "verify-"));
  try {
    const pickedDs = await downscaledCopy(args.pickedFramePath, tmpDir, "picked.jpg");
    const runnerDs = args.runnerUpFramePath
      ? await downscaledCopy(args.runnerUpFramePath, tmpDir, "runner.jpg")
      : null;
    const result = await runVerifyWithFallback({
      ...args,
      pickedFramePath: pickedDs,
      runnerUpFramePath: runnerDs,
    });
    let originalFinal: string | null = null;
    if (result.finalFramePath === pickedDs) originalFinal = args.pickedFramePath;
    else if (result.finalFramePath === runnerDs) originalFinal = args.runnerUpFramePath;
    return { verify: result.verify, finalFramePath: originalFinal };
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}
