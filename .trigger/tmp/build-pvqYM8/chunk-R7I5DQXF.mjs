import {
  external_exports
} from "./chunk-E6JKZSLS.mjs";
import {
  __name,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// src/lib/openrouter.ts
init_esm();
var API = "https://openrouter.ai/api/v1/chat/completions";
async function llmJson(opts) {
  const body = {
    model: opts.model,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user }
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: opts.schemaName,
        strict: true,
        schema: zodToJsonSchemaLike(opts.schema)
      }
    },
    temperature: 0.2
  };
  let lastErr = null;
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://sop.vn",
          "X-Title": "SOP.vn"
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty content");
      const parsed = JSON.parse(content);
      return opts.schema.parse(parsed);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("LLM failed");
}
__name(llmJson, "llmJson");
function zodToJsonSchemaLike(schema) {
  const def = schema._def;
  switch (def.typeName) {
    case "ZodObject": {
      const shape = def.shape();
      const properties = {};
      const required = [];
      for (const [k, v] of Object.entries(shape)) {
        properties[k] = zodToJsonSchemaLike(v);
        required.push(k);
      }
      return { type: "object", properties, required, additionalProperties: false };
    }
    case "ZodArray":
      return { type: "array", items: zodToJsonSchemaLike(def.type) };
    case "ZodString":
      return { type: "string" };
    case "ZodNumber":
      return { type: "number" };
    case "ZodEnum":
      return { type: "string", enum: def.values };
    default:
      throw new Error(`Unsupported Zod type: ${def.typeName}`);
  }
}
__name(zodToJsonSchemaLike, "zodToJsonSchemaLike");

// src/lib/schemas.ts
init_esm();
var NormalizeOutput = external_exports.object({
  segments: external_exports.array(external_exports.object({ id: external_exports.number().int(), text: external_exports.string() }))
});
var ContextOutput = external_exports.object({
  category: external_exports.enum([
    "Coffee & Drinks",
    "Food & Cooking",
    "Spa & Beauty",
    "Nail",
    "Other"
  ]),
  domainSummary: external_exports.string()
});
var SopExtractOutput = external_exports.object({
  title: external_exports.string(),
  steps: external_exports.array(external_exports.object({
    title: external_exports.string(),
    description: external_exports.string(),
    startSegmentId: external_exports.number().int().nonnegative(),
    endSegmentId: external_exports.number().int().nonnegative()
  })).min(1)
});

export {
  llmJson,
  NormalizeOutput,
  ContextOutput,
  SopExtractOutput
};
//# sourceMappingURL=chunk-R7I5DQXF.mjs.map
