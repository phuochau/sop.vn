import { llmJson } from "@/lib/openrouter";
import { SopExtractOutput } from "@/lib/schemas";
import { config } from "@/config";
import type { CleanSegment } from "@/lib/mongo";
import { logger } from "@trigger.dev/sdk/v3";
import type { z } from "zod";

const STEP_COUNT_MIN = 3;
const STEP_COUNT_MAX = 20;

type ExtractInput = {
  segmentsClean: CleanSegment[];
  category: string;
  domainSummary: string;
  language: string;
  sopId?: string;  // optional; passed to sanity logs when available
};

type ExtractResult = z.infer<typeof SopExtractOutput>;

type LlmExtractCall = (args: {
  system: string;
  user: string;
  temperature: number;
}) => Promise<ExtractResult>;

function buildUserPrompt(args: ExtractInput, addendum: string): string {
  const base =
    `Category: ${args.category}\n` +
    `Domain summary: ${args.domainSummary}\n\n` +
    `Segments (JSON, use ids to reference):\n${JSON.stringify(args.segmentsClean)}\n\n` +
    `Return { "title": string, "steps": [{ "title", "description", "startSegmentId", "endSegmentId" }] }.`;
  return addendum ? `${base}\n\n${addendum}` : base;
}

function isInRange(out: ExtractResult): boolean {
  return out.steps.length >= STEP_COUNT_MIN && out.steps.length <= STEP_COUNT_MAX;
}

export function pickBetterExtraction(a: ExtractResult, b: ExtractResult): ExtractResult {
  const aOk = isInRange(a);
  const bOk = isInRange(b);
  if (aOk && !bOk) return a;
  if (!aOk && bOk) return b;
  if (aOk && bOk) return b;
  if (a.steps.length < b.steps.length) return a;
  return b;
}

export async function runExtractWith(input: ExtractInput, call: LlmExtractCall): Promise<ExtractResult> {
  const system = config.ai.prompts.sopSystem(input.language);
  const first = await call({ system, user: buildUserPrompt(input, ""), temperature: 0.0 });
  logger.info("pipeline.step_extract.count", { sopId: input.sopId ?? null, count: first.steps.length, attempt: 1 });
  if (isInRange(first)) return first;

  logger.warn("pipeline.step_extract.repair", { firstCount: first.steps.length });
  const addendum =
    `Your previous attempt produced ${first.steps.length} steps, which is outside the ${STEP_COUNT_MIN}-${STEP_COUNT_MAX} range. ` +
    `Re-segment with the granularity rules above.`;
  const second = await call({ system, user: buildUserPrompt(input, addendum), temperature: 0.0 });
  logger.info("pipeline.step_extract.count", { sopId: input.sopId ?? null, count: second.steps.length, attempt: 2 });

  const chosen = pickBetterExtraction(first, second);
  if (!isInRange(chosen)) {
    logger.error("pipeline.step_extract.out_of_range", {
      sopId: input.sopId ?? null,
      firstCount: first.steps.length,
      secondCount: second.steps.length,
      chosenCount: chosen.steps.length,
    });
  }
  return chosen;
}

export async function runExtract(args: ExtractInput) {
  return runExtractWith(args, async ({ system, user, temperature }) => {
    return llmJson({
      model: config.ai.sopModel,
      system,
      user,
      schema: SopExtractOutput,
      schemaName: "sop_extract",
      maxRetries: config.ai.maxRetries,
      temperature,
    });
  });
}
