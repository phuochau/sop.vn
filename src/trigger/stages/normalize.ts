import { llmJson } from "@/lib/openrouter";
import { NormalizeOutput } from "@/lib/schemas";
import { config } from "@/config";
import type { Segment, CleanSegment } from "@/lib/mongo";
import { logger } from "@trigger.dev/sdk/v3";

export async function runNormalize(segments: Segment[], language: string): Promise<CleanSegment[]> {
  try {
    const out = await llmJson({
      model: config.ai.normalizeModel,
      system: config.ai.prompts.normalizeSystem(language),
      user: `Segments (JSON):\n${JSON.stringify(segments.map(s => ({ id: s.id, text: s.text })))}\n\nReturn { "segments": [{ id, text }] } with SAME ids.`,
      schema: NormalizeOutput,
      schemaName: "normalize",
      maxRetries: config.ai.maxRetries,
    });

    // Defensive: ensure IDs align 1:1 with input; if not, fall through to raw.
    const inIds = new Set(segments.map(s => s.id));
    const outIds = new Set(out.segments.map(s => s.id));
    const sameSet = inIds.size === outIds.size && [...inIds].every(id => outIds.has(id));
    if (!sameSet) {
      logger.warn("normalize ID mismatch — falling back to raw segments");
      return segments.map(s => ({ id: s.id, text: s.text }));
    }
    return out.segments;
  } catch (e) {
    logger.warn("normalize failed — falling back to raw segments", { e: String(e) });
    return segments.map(s => ({ id: s.id, text: s.text }));
  }
}
