import { llmJsonVision } from "@/lib/openrouter";
import { OverviewOutput } from "@/lib/schemas";
import { config } from "@/config";
import { sampleFrames } from "@/trigger/lib/sampleFrames";
import type { z } from "zod";

export type Overview = z.infer<typeof OverviewOutput>;

export async function runVisualOverview(args: {
  srcPath: string;
  durationSec: number;
  title: string;
  category: string;
  domainSummary: string;
  stepTitles: string[];
  language: string;
}): Promise<Overview> {
  const frames = await sampleFrames(args.srcPath, args.durationSec, { mode: "fixed" });
  try {
    const userText =
      `SOP title: ${args.title}\n` +
      `Category: ${args.category}\n` +
      `Domain summary: ${args.domainSummary}\n\n` +
      `Step titles:\n${args.stepTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n` +
      `These ${frames.paths.length} frames are sampled evenly across the video. ` +
      `Return strict JSON: { "purpose", "audience", "prerequisites": string[], "toolsMaterials": string[], "estimatedDuration" }.`;

    return await llmJsonVision({
      model: config.ai.visionModel,
      system: config.ai.prompts.pdfVisualOverviewSystem(args.language),
      userText,
      imagePaths: frames.paths,
      schema: OverviewOutput,
      schemaName: "pdf_visual_overview",
      maxRetries: config.ai.maxRetries,
    });
  } finally {
    await frames.dispose();
  }
}
