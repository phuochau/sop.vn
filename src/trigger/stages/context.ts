import { llmJson } from "@/lib/openrouter";
import { ContextOutput } from "@/lib/schemas";
import { config } from "@/config";
import { logger } from "@trigger.dev/sdk/v3";
import type { Category } from "@/config";

export async function runContext(args: {
  userCategory: string | null;
  cleanTranscript: string;
}): Promise<{ category: Category; domainSummary: string }> {
  if (args.userCategory) {
    return { category: args.userCategory as Category, domainSummary: "" };
  }
  try {
    const out = await llmJson({
      model: config.ai.contextModel,
      system: config.ai.prompts.contextSystem,
      user: `Transcript:\n${args.cleanTranscript}\n\nReturn { "category": <enum>, "domainSummary": string }.`,
      schema: ContextOutput,
      schemaName: "context",
      maxRetries: 0,
    });
    return out;
  } catch (e) {
    logger.warn("context detect failed — defaulting to Other", { e: String(e) });
    return { category: "Other", domainSummary: "" };
  }
}
