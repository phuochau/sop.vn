import { llmJsonVision } from "@/lib/openrouter";
import { ContextOutput } from "@/lib/schemas";
import { config } from "@/config";

export async function runVisualContext(args: {
  framePaths: string[];
  language: string;
}): Promise<{ category: string; domainSummary: string }> {
  return llmJsonVision({
    model: config.ai.visionModel,
    system: config.ai.prompts.visualContextSystem(args.language),
    userText:
      `These ${args.framePaths.length} frames are sampled evenly across a how-to video. ` +
      `Return { "category": <freeform string naming the domain/industry>, "domainSummary": string }.`,
    imagePaths: args.framePaths,
    schema: ContextOutput,
    schemaName: "context",
    maxRetries: config.ai.maxRetries,
  });
}
