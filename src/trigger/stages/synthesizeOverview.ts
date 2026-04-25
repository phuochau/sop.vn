import { llmJson } from "@/lib/openrouter";
import { OverviewOutput } from "@/lib/schemas";
import { config } from "@/config";
import type { z } from "zod";

export type Overview = z.infer<typeof OverviewOutput>;

export async function runSynthesizeOverview(args: {
  title: string;
  category: string;
  transcript: string;
  stepTitles: string[];
}): Promise<Overview> {
  const userPrompt =
    `SOP title: ${args.title}\n` +
    `Category: ${args.category}\n\n` +
    `Step titles:\n${args.stepTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n` +
    `Full transcript:\n${args.transcript}\n\n` +
    `Return strict JSON: { "purpose", "audience", "prerequisites": string[], "toolsMaterials": string[], "estimatedDuration" }.`;

  return llmJson({
    model: config.ai.pdfModel,
    system: config.ai.prompts.pdfOverviewSystem,
    user: userPrompt,
    schema: OverviewOutput,
    schemaName: "pdf_overview",
    maxRetries: config.ai.maxRetries,
  });
}
