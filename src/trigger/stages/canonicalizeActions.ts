import { logger } from "@trigger.dev/sdk/v3";
import { llmJson } from "@/lib/openrouter";
import { CanonicalizationOutput } from "@/lib/schemas";
import { config } from "@/config";
import type { ClassifiedActionRecord } from "./classifyStepWithLLM";

/**
 * Reconcile per-candidate captions within one step.
 *
 * Because the classifier runs one candidate per call (`maxCandidatesPerCall: 1`),
 * each candidate is labelled in isolation — the same element can come back with
 * different wording / casing / language across candidates. This stage sends the
 * step's action labels (text only, no images — cheap) to an LLM that rewrites
 * `screenName` / `elementCaption` into consistent canonical forms in the output
 * language, so the downstream `(screen, element)`-keyed dedup can collapse true
 * duplicates.
 *
 * Fail-safe: on any LLM failure, or for any record the LLM omits, the original
 * values are kept. The returned array always has the same length, order, and
 * `index` values as the input — `buildActionsForStep` relies on that.
 */
export type CanonicalizeLlmFn = (opts: {
  model: string;
  system: string;
  user: string;
  schema: typeof CanonicalizationOutput;
  schemaName: string;
  maxRetries: number;
}) => Promise<{ actions: { index: number; screenName: string; elementCaption: string }[] }>;

export async function canonicalizeActions(args: {
  classified: ClassifiedActionRecord[];
  language: string;
  /** Injectable for tests; defaults to the real `llmJson`. */
  llmFn?: CanonicalizeLlmFn;
}): Promise<ClassifiedActionRecord[]> {
  const { classified, language } = args;

  const canonicalizable = classified.filter(
    c => c.decision === "action" && c.screenName !== null && c.elementCaption !== null,
  );
  if (canonicalizable.length === 0) return classified;

  const input = canonicalizable.map(c => ({
    index: c.index,
    screenName: c.screenName,
    elementCaption: c.elementCaption,
    verb: c.verb,
  }));

  const llmFn = args.llmFn ?? (llmJson as unknown as CanonicalizeLlmFn);

  let result: { actions: { index: number; screenName: string; elementCaption: string }[] };
  try {
    result = await llmFn({
      model: config.ai.canonicalizeModel,
      system: config.ai.prompts.canonicalizeSystem(language),
      user: `Actions:\n${JSON.stringify(input, null, 2)}\n\nReturn { "actions": [{ "index": number, "screenName": string, "elementCaption": string }] }.`,
      schema: CanonicalizationOutput,
      schemaName: "canonicalization",
      maxRetries: config.ai.maxRetries,
    });
  } catch (e) {
    logger.warn("canonicalizeActions failed — using raw captions", { e: String(e) });
    return classified;
  }

  const byIndex = new Map<number, { screenName: string; elementCaption: string }>();
  for (const a of result.actions) {
    if (
      typeof a.screenName === "string" && a.screenName.trim() &&
      typeof a.elementCaption === "string" && a.elementCaption.trim()
    ) {
      byIndex.set(a.index, {
        screenName: a.screenName.trim(),
        elementCaption: a.elementCaption.trim(),
      });
    }
  }

  return classified.map(c => {
    if (c.decision !== "action") return c;
    const canon = byIndex.get(c.index);
    if (!canon) return c;
    return { ...c, screenName: canon.screenName, elementCaption: canon.elementCaption };
  });
}
