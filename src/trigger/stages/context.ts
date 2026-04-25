import { llmJson } from "@/lib/openrouter";
import { ContextOutput } from "@/lib/schemas";
import { config } from "@/config";
import { logger } from "@trigger.dev/sdk/v3";

export async function runContext(args: {
  cleanTranscript: string;
  language: string;
}): Promise<{ category: string; domainSummary: string }> {
  try {
    const out = await llmJson({
      model: config.ai.contextModel,
      system: config.ai.prompts.contextSystem(args.language),
      user: `Transcript:\n${args.cleanTranscript}\n\nReturn { "category": <freeform string naming the domain/industry>, "domainSummary": string }.`,
      schema: ContextOutput,
      schemaName: "context",
      maxRetries: 0,
    });
    return out;
  } catch (e) {
    logger.warn("context detect failed — defaulting to empty category", { e: String(e) });
    return { category: "", domainSummary: "" };
  }
}
