import { z, type ZodTypeAny } from "zod";
import fs from "node:fs";

const API = "https://openrouter.ai/api/v1/chat/completions";

export async function llmJson<T extends ZodTypeAny>(opts: {
  model: string;
  system: string;
  user: string;
  schema: T;
  schemaName: string;
  maxRetries: number;
}): Promise<z.infer<T>> {
  const body = {
    model: opts.model,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: opts.schemaName,
        strict: true,
        schema: zodToJsonSchemaLike(opts.schema),
      },
    },
    temperature: 0.2,
  };

  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY!}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://sop.vn",
          "X-Title": "SOP.vn",
        },
        body: JSON.stringify(body),
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

/**
 * Minimal Zod → JSON Schema conversion sufficient for our 3 schemas.
 * If schemas grow, switch to `zod-to-json-schema` npm package.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function zodToJsonSchemaLike(schema: ZodTypeAny): unknown {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const def: any = (schema as any)._def;
  switch (def.typeName) {
    case "ZodObject": {
      const shape = def.shape();
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [k, v] of Object.entries(shape)) {
        properties[k] = zodToJsonSchemaLike(v as ZodTypeAny);
        required.push(k);
      }
      return { type: "object", properties, required, additionalProperties: false };
    }
    case "ZodArray":
      return { type: "array", items: zodToJsonSchemaLike(def.type) };
    case "ZodString": return { type: "string" };
    case "ZodNumber": return { type: "number" };
    case "ZodEnum":   return { type: "string", enum: def.values };
    default:
      throw new Error(`Unsupported Zod type: ${def.typeName}`);
  }
}

export async function llmJsonVision<T extends ZodTypeAny>(opts: {
  model: string;
  system: string;
  userText: string;
  imagePaths: string[];
  schema: T;
  schemaName: string;
  maxRetries: number;
}): Promise<z.infer<T>> {
  const imageParts = await Promise.all(
    opts.imagePaths.map(async (p) => {
      const b = await fs.promises.readFile(p);
      const url = `data:image/jpeg;base64,${b.toString("base64")}`;
      return { type: "image_url" as const, image_url: { url } };
    })
  );

  const body = {
    model: opts.model,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: [{ type: "text" as const, text: opts.userText }, ...imageParts] },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: opts.schemaName,
        strict: true,
        schema: zodToJsonSchemaLike(opts.schema),
      },
    },
    temperature: 0.2,
  };

  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY!}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://sop.vn",
          "X-Title": "SOP.vn",
        },
        body: JSON.stringify(body),
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
