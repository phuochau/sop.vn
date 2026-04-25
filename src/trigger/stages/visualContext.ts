import { llmJsonVision } from "@/lib/openrouter";
import { ContextOutput } from "@/lib/schemas";
import { config, type Category } from "@/config";

export async function runVisualContext(args: {
  framePaths: string[];
  language: string;
}): Promise<{ category: Category; domainSummary: string }> {
  return llmJsonVision({
    model: config.ai.visionModel,
    system: config.ai.prompts.visualContextSystem(args.language),
    userText:
      `These ${args.framePaths.length} frames are sampled evenly across a how-to video. ` +
      `Return { "category": <one of the enum values>, "domainSummary": string }.`,
    imagePaths: args.framePaths,
    schema: ContextOutput,
    schemaName: "context",
    maxRetries: config.ai.maxRetries,
  });
}
