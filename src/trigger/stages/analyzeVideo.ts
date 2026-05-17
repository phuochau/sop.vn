import type { z } from "zod";
import { llmJsonVision } from "@/lib/openrouter";
import { VideoAnalysisOutput } from "@/lib/schemas";
import { config } from "@/config";
import { sampleFrames } from "@/trigger/lib/sampleFrames";

export type AnalyzeVisionFn = typeof llmJsonVision;

const defaultVisionFn: AnalyzeVisionFn = llmJsonVision;

/** round(durationSec / 60) frames, clamped to [8, 20]. */
export function computeAppGateFrameCount(durationSec: number): number {
  return Math.max(8, Math.min(20, Math.round(durationSec / 60)));
}

/** Accept the video if at least half the sampled frames show an app UI. */
export function decideAppGate(appUIFrameCount: number, totalFrames: number): boolean {
  if (totalFrames <= 0) return false;
  return appUIFrameCount / totalFrames >= 0.5;
}

/**
 * Stage 0: sample frames across the whole video and ask a VLM to classify how
 * many show a software-application UI, plus an overall appType and the
 * category/domainSummary used downstream. The caller applies `decideAppGate`.
 * Throws on a VLM failure — the caller maps that to `analysis_failed`.
 */
export async function runAnalyzeVideo(args: {
  srcPath: string;
  durationSec: number;
  language: string;
  /** Injectable for tests; defaults to the real llmJsonVision. */
  visionFn?: AnalyzeVisionFn;
}): Promise<z.infer<typeof VideoAnalysisOutput>> {
  const visionFn = args.visionFn ?? defaultVisionFn;
  const count = computeAppGateFrameCount(args.durationSec);
  const frames = await sampleFrames(args.srcPath, args.durationSec, { count });
  try {
    return await visionFn({
      model: config.ai.visionModel,
      system: config.ai.prompts.analyzeVideoSystem(args.language),
      userText:
        `These ${frames.paths.length} frames are sampled evenly across a ` +
        `how-to video. Classify each as an app UI or not, then return the ` +
        `JSON described in the system prompt. totalFrames must be ` +
        `${frames.paths.length}.`,
      imagePaths: frames.paths,
      schema: VideoAnalysisOutput,
      schemaName: "video_analysis",
      maxRetries: config.ai.maxRetries,
    });
  } finally {
    await frames.dispose();
  }
}
