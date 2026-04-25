import { llmJson } from "@/lib/openrouter";
import { StepRewriteOutput } from "@/lib/schemas";
import { config } from "@/config";
import type { Segment } from "@/lib/mongo";
import type { z } from "zod";

export type StepRewrite = z.infer<typeof StepRewriteOutput>;

/**
 * Returns the concatenated text of all segments overlapping [start, end].
 * A segment overlaps if its end > start AND its start < end.
 */
export function sliceTranscriptByTime(segments: Segment[], start: number, end: number): string {
  return segments
    .filter(s => s.end > start && s.start < end)
    .map(s => s.text)
    .join(" ")
    .trim();
}

export async function runSynthesizeStep(args: {
  step: { title: string; description: string; startTime: number; endTime: number };
  segments: Segment[];
  prevTitle: string | null;
}): Promise<StepRewrite> {
  const transcriptSlice = sliceTranscriptByTime(args.segments, args.step.startTime, args.step.endTime);

  const userPrompt =
    `Step title: ${args.step.title}\n` +
    `Original short description: ${args.step.description}\n` +
    (args.prevTitle ? `Previous step title (for continuity, do not repeat its content): ${args.prevTitle}\n` : "") +
    `\nTranscript slice for this step:\n${transcriptSlice || "(empty — fall back to the original description)"}\n\n` +
    `Return strict JSON: { "prose", "subBullets": string[], "callouts": [{ "kind": "warning"|"tip"|"note", "text" }] }.`;

  return llmJson({
    model: config.ai.pdfModel,
    system: config.ai.prompts.pdfStepSystem,
    user: userPrompt,
    schema: StepRewriteOutput,
    schemaName: "pdf_step_rewrite",
    maxRetries: config.ai.maxRetries,
  });
}
