import {
  SopExtractOutput,
  llmJson
} from "./chunk-R7I5DQXF.mjs";
import {
  config
} from "./chunk-REM3KCND.mjs";
import {
  __name,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// src/trigger/stages/extract.ts
init_esm();
async function runExtract(args) {
  const domainHint = config.ai.domainTerminology[args.category] ?? "";
  const out = await llmJson({
    model: config.ai.sopModel,
    system: config.ai.prompts.sopSystem(domainHint),
    user: `Segments (JSON, use ids to reference):
${JSON.stringify(args.segmentsClean)}

Return { "title": string, "steps": [{ "title", "description", "startSegmentId", "endSegmentId" }] }.`,
    schema: SopExtractOutput,
    schemaName: "sop_extract",
    maxRetries: config.ai.maxRetries
  });
  return out;
}
__name(runExtract, "runExtract");

export {
  runExtract
};
//# sourceMappingURL=chunk-CRMM6R3R.mjs.map
