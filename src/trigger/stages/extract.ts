import { llmJson } from "@/lib/openrouter";
import { SopExtractOutput } from "@/lib/schemas";
import { config } from "@/config";
import type { CleanSegment } from "@/lib/mongo";

export async function runExtract(args: {
  segmentsClean: CleanSegment[];
  category: string;
  domainSummary: string;
  language: string;
}) {
  const userPrompt =
    `Category: ${args.category}\n` +
    `Domain summary: ${args.domainSummary}\n\n` +
    `Segments (JSON, use ids to reference):\n${JSON.stringify(args.segmentsClean)}\n\n` +
    `Return { "title": string, "steps": [{ "title", "description", "startSegmentId", "endSegmentId" }] }.`;

  const out = await llmJson({
    model: config.ai.sopModel,
    system: config.ai.prompts.sopSystem(args.language),
    user: userPrompt,
    schema: SopExtractOutput,
    schemaName: "sop_extract",
    maxRetries: config.ai.maxRetries,
  });
  return out;
}
