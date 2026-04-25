import { llmJson } from "@/lib/openrouter";
import { SopExtractOutput } from "@/lib/schemas";
import { config, type Category } from "@/config";
import type { CleanSegment } from "@/lib/mongo";

export async function runExtract(args: {
  segmentsClean: CleanSegment[];
  category: Category;
  language: string;
}) {
  const domainHint = config.ai.domainTerminology[args.category] ?? "";
  const out = await llmJson({
    model: config.ai.sopModel,
    system: config.ai.prompts.sopSystem(domainHint, args.language),
    user: `Segments (JSON, use ids to reference):\n${JSON.stringify(args.segmentsClean)}\n\nReturn { "title": string, "steps": [{ "title", "description", "startSegmentId", "endSegmentId" }] }.`,
    schema: SopExtractOutput,
    schemaName: "sop_extract",
    maxRetries: config.ai.maxRetries,
  });
  return out;
}
