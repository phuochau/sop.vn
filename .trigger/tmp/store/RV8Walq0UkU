import {
  NormalizeOutput,
  llmJson
} from "./chunk-R7I5DQXF.mjs";
import {
  config
} from "./chunk-REM3KCND.mjs";
import {
  logger
} from "./chunk-5C4WVIZW.mjs";
import {
  __name,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// src/trigger/stages/normalize.ts
init_esm();
async function runNormalize(segments) {
  try {
    const out = await llmJson({
      model: config.ai.normalizeModel,
      system: config.ai.prompts.normalizeSystem,
      user: `Segments (JSON):
${JSON.stringify(segments.map((s) => ({ id: s.id, text: s.text })))}

Return { "segments": [{ id, text }] } with SAME ids.`,
      schema: NormalizeOutput,
      schemaName: "normalize",
      maxRetries: config.ai.maxRetries
    });
    const inIds = new Set(segments.map((s) => s.id));
    const outIds = new Set(out.segments.map((s) => s.id));
    const sameSet = inIds.size === outIds.size && [...inIds].every((id) => outIds.has(id));
    if (!sameSet) {
      logger.warn("normalize ID mismatch — falling back to raw segments");
      return segments.map((s) => ({ id: s.id, text: s.text }));
    }
    return out.segments;
  } catch (e) {
    logger.warn("normalize failed — falling back to raw segments", { e: String(e) });
    return segments.map((s) => ({ id: s.id, text: s.text }));
  }
}
__name(runNormalize, "runNormalize");

export {
  runNormalize
};
//# sourceMappingURL=chunk-EY4E5DY7.mjs.map
