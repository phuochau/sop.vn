import {
  ContextOutput,
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

// src/trigger/stages/context.ts
init_esm();
async function runContext(args) {
  if (args.userCategory) {
    return { category: args.userCategory, domainSummary: "" };
  }
  try {
    const out = await llmJson({
      model: config.ai.contextModel,
      system: config.ai.prompts.contextSystem,
      user: `Transcript:
${args.cleanTranscript}

Return { "category": <enum>, "domainSummary": string }.`,
      schema: ContextOutput,
      schemaName: "context",
      maxRetries: 0
    });
    return out;
  } catch (e) {
    logger.warn("context detect failed — defaulting to Other", { e: String(e) });
    return { category: "Other", domainSummary: "" };
  }
}
__name(runContext, "runContext");

export {
  runContext
};
//# sourceMappingURL=chunk-XSAM7OVK.mjs.map
