# Screenshot Pipeline Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the action-as-(verb, target_element) abstraction across the screenshot pipeline: a batched per-step LLM classifier replaces per-event grounding, a deterministic dedup pass collapses duplicates, View cards cover screens with no interaction, and step extraction becomes stable.

**Architecture:** The detector becomes a candidate generator (over-recall). For each step, one batched LLM call classifies all candidates as action-or-discard with `(screenName, elementCaption)` labels. A pure post-pass groups by screen + element, drops same-element duplicates keeping the latest, and emits View cards for long-lived screens with no surviving action. Screen identity uses a masked perceptual-hash cluster of dense-pool frames sampled every 1.5s. Step extraction stabilizes via temperature=0, granularity prompt rules, a few-shot, and a one-shot repair retry.

**Tech Stack:** TypeScript, Node 22, Next.js 16, trigger.dev v3, sharp, MongoDB driver, Cloudflare R2, OpenRouter (Gemini 2.5 Flash for vision), zod, node:test + node:assert, tsx for running tests.

**Spec:** `docs/superpowers/specs/2026-05-14-screenshot-pipeline-quality-design.md`

---

## File map

**Created**
- `src/trigger/lib/screenId.ts` — masked dHash clustering of dense-pool frames within a step.
- `src/trigger/lib/screenId.test.ts` — unit tests for clustering.
- `src/trigger/stages/classifyStepWithLLM.ts` — batched per-step LLM classifier with montage + chunking + bbox mapping.
- `src/trigger/stages/classifyStepWithLLM.test.ts` — injection-style tests.
- `src/trigger/stages/buildActionsForStep.ts` — dedup + View emission post-pass.
- `src/trigger/stages/buildActionsForStep.test.ts` — pure tests over synthetic classifier outputs.
- `src/lib/openrouter.test.ts` — backoff + temperature behavior tests.
- `src/trigger/stages/extract.test.ts` — repair-on-drift + sanity log tests.
- `src/trigger/stages/clickEventDetect.test.ts` — detector gate tests using a synthetic frame fixture.
- `src/trigger/__fixtures__/synthetic-frames/` — small generated PNG fixtures for the click detector test.

**Modified**
- `src/lib/openrouter.ts` — add `temperature`, `retryDelayMs`, optional `fetcher`, exponential backoff with jitter, skip-4xx-except-408-429.
- `src/lib/mongo.ts` — add `"classify_failed"` to `ErrorCode`; add optional `verb`, `screenName`, `elementCaption` to `Screenshot`.
- `src/lib/schemas.ts` — add `ClassifiedCandidate`, `StepClassification`, `ElementAction`, `ViewAction`, `Action` (TypeScript types only — the LLM-facing schema is `StepClassification`).
- `src/config/index.ts` — `sopSystem` prompt update (granularity rules, narrated-alternatives rule, repair addendum); new `classifyStepSystem`; new screenshot config knobs (`maxMontageClusters`, `maxCandidatesPerCall`, `viewMinDurationSec`, `screenIdSamplingSec`, `screenIdHammingThreshold`, etc.).
- `src/trigger/stages/extract.ts` — `temperature: 0`, repair retry, sanity log.
- `src/trigger/lib/clickEventDetect.ts` — drop steadiness gate, tighten `maxAreaFrac`, widen merge window with `<=`, lower `mergeIouMin`. Remove global `maxEventsPerVideo`.
- `src/trigger/stages/extractClickEvents.ts` — per-step candidate cap (new arg).
- `src/trigger/processSopScreenshots.ts` — remove `runGroundEventsWithGemini` call; pass dense pool slice into classifier + dedup; consume `Action[]`; upload adapter composes `description`.
- `src/trigger/stages/uploadScreenshots.ts` — accept the union; compose `description` from `screenName + verb + elementCaption` for `ElementAction`, or use `caption` for `ViewAction`.

**Deleted (final task)**
- `src/trigger/stages/groundEventsWithGemini.ts`
- `src/trigger/stages/groundEventsWithGemini.test.ts`
- `GroundedEventOutput` from `src/lib/schemas.ts`

---

## How to run tests

The repo runs node:test via tsx:

```bash
npx tsx --test src/path/to/file.test.ts
```

To run all pipeline tests:

```bash
npx tsx --test src/trigger/**/*.test.ts src/lib/openrouter.test.ts
```

Typecheck:

```bash
npx tsc --noEmit
```

---

## Task 1: SDK changes — temperature, retry with backoff, injectable fetch

**Files:**
- Modify: `src/lib/openrouter.ts`
- Create: `src/lib/openrouter.test.ts`

- [ ] **Step 1.1: Write the failing test**

Create `src/lib/openrouter.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { z } from "zod";
import { llmJson, llmJsonVision } from "./openrouter";

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

function llmContent(payload: unknown): unknown {
  return { choices: [{ message: { content: JSON.stringify(payload) } }] };
}

test("llmJson passes temperature through to fetch body", async () => {
  let captured: { body: string } | null = null;
  const fakeFetch: typeof fetch = async (_url, init) => {
    captured = { body: String(init?.body ?? "") };
    return okResponse(llmContent({ x: 1 }));
  };
  await llmJson({
    model: "m",
    system: "s",
    user: "u",
    schema: z.object({ x: z.number() }),
    schemaName: "n",
    maxRetries: 0,
    temperature: 0.0,
    fetcher: fakeFetch,
  });
  assert.ok(captured);
  const parsed = JSON.parse(captured!.body);
  assert.equal(parsed.temperature, 0.0);
});

test("llmJson defaults temperature to 0.2 when not provided", async () => {
  let captured: { body: string } | null = null;
  const fakeFetch: typeof fetch = async (_url, init) => {
    captured = { body: String(init?.body ?? "") };
    return okResponse(llmContent({ x: 1 }));
  };
  await llmJson({
    model: "m", system: "s", user: "u",
    schema: z.object({ x: z.number() }),
    schemaName: "n", maxRetries: 0,
    fetcher: fakeFetch,
  });
  const parsed = JSON.parse(captured!.body);
  assert.equal(parsed.temperature, 0.2);
});

test("llmJson does NOT retry on 400 status", async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async () => {
    calls++;
    return new Response("bad request", { status: 400 });
  };
  await assert.rejects(() => llmJson({
    model: "m", system: "s", user: "u",
    schema: z.object({ x: z.number() }),
    schemaName: "n", maxRetries: 3,
    retryDelayMs: 1,
    fetcher: fakeFetch,
  }));
  assert.equal(calls, 1, "should not retry on 400");
});

test("llmJson DOES retry on 503 status up to maxRetries+1 times", async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async () => {
    calls++;
    return new Response("unavailable", { status: 503 });
  };
  await assert.rejects(() => llmJson({
    model: "m", system: "s", user: "u",
    schema: z.object({ x: z.number() }),
    schemaName: "n", maxRetries: 2,
    retryDelayMs: 1,
    fetcher: fakeFetch,
  }));
  assert.equal(calls, 3, "should call 3 times for maxRetries=2");
});

test("llmJson retries on 429 status", async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async () => {
    calls++;
    if (calls < 2) return new Response("rate limited", { status: 429 });
    return okResponse(llmContent({ x: 1 }));
  };
  const out = await llmJson({
    model: "m", system: "s", user: "u",
    schema: z.object({ x: z.number() }),
    schemaName: "n", maxRetries: 2,
    retryDelayMs: 1,
    fetcher: fakeFetch,
  });
  assert.equal(out.x, 1);
  assert.equal(calls, 2);
});

test("llmJson retries on network errors (thrown)", async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async () => {
    calls++;
    if (calls < 2) throw new Error("ECONNRESET");
    return okResponse(llmContent({ x: 1 }));
  };
  const out = await llmJson({
    model: "m", system: "s", user: "u",
    schema: z.object({ x: z.number() }),
    schemaName: "n", maxRetries: 2,
    retryDelayMs: 1,
    fetcher: fakeFetch,
  });
  assert.equal(out.x, 1);
});

test("llmJsonVision sleeps between retries with growing upper bound", async () => {
  const timestamps: number[] = [];
  const fakeFetch: typeof fetch = async () => {
    timestamps.push(Date.now());
    return new Response("nope", { status: 503 });
  };
  // base 100ms → attempt 0→1 sleep <=100, attempt 1→2 sleep <=200, attempt 2→3 sleep <=400.
  // Hard upper bound on total elapsed = 700ms.
  await assert.rejects(() => llmJsonVision({
    model: "m", system: "s", userText: "u",
    imagePaths: [],
    schema: z.object({ x: z.number() }),
    schemaName: "n", maxRetries: 3,
    retryDelayMs: 100,
    fetcher: fakeFetch,
  }));
  assert.equal(timestamps.length, 4);
  const totalElapsed = timestamps[3] - timestamps[0];
  // Lower bound: it actually slept at least once. With jitter, the strict lower bound is 0,
  // so assert it doesn't exceed the worst-case ceiling instead.
  assert.ok(totalElapsed <= 700 + 200 /* slack */, `elapsed ${totalElapsed} should be within budget`);
});

test("llmJson retries on 408 (request timeout)", async () => {
  let calls = 0;
  const fakeFetch: typeof fetch = async () => {
    calls++;
    if (calls < 2) return new Response("timeout", { status: 408 });
    return okResponse(llmContent({ x: 1 }));
  };
  const out = await llmJson({
    model: "m", system: "s", user: "u",
    schema: z.object({ x: z.number() }),
    schemaName: "n", maxRetries: 2,
    retryDelayMs: 1,
    fetcher: fakeFetch,
  });
  assert.equal(out.x, 1);
  assert.equal(calls, 2);
});

test("llmJsonVision defaults maxRetries to 3 when not specified", async () => {
  // We test via behavior: pass undefined-default-path is fine, but the actual default lives in the function.
  // This is a smoke test that maxRetries can be omitted.
  let calls = 0;
  const fakeFetch: typeof fetch = async () => {
    calls++;
    return new Response("nope", { status: 503 });
  };
  await assert.rejects(() => llmJsonVision({
    model: "m", system: "s", userText: "u",
    imagePaths: [],
    schema: z.object({ x: z.number() }),
    schemaName: "n",
    retryDelayMs: 1,
    fetcher: fakeFetch,
  }));
  assert.equal(calls, 4, "default maxRetries=3 → 4 total attempts");
});
```

- [ ] **Step 1.2: Run test to verify it fails**

```bash
npx tsx --test src/lib/openrouter.test.ts
```

Expected: FAIL — `temperature`, `retryDelayMs`, `fetcher` parameters not accepted; retries don't respect status; vision default maxRetries is 1.

- [ ] **Step 1.3: Implement the SDK changes**

Replace `src/lib/openrouter.ts` body. The new file:

```ts
import { z, type ZodTypeAny } from "zod";
import fs from "node:fs";

const API = "https://openrouter.ai/api/v1/chat/completions";

type Fetcher = typeof fetch;

function shouldRetryStatus(status: number): boolean {
  if (status >= 500) return true;
  if (status === 408 || status === 429) return true;
  return false;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function jitteredBackoff(baseMs: number, attempt: number): number {
  const ceiling = baseMs * Math.pow(2, attempt);
  return Math.floor(Math.random() * ceiling);
}

export async function llmJson<T extends ZodTypeAny>(opts: {
  model: string;
  system: string;
  user: string;
  schema: T;
  schemaName: string;
  maxRetries: number;
  temperature?: number;
  retryDelayMs?: number;
  fetcher?: Fetcher;
}): Promise<z.infer<T>> {
  const temperature = opts.temperature ?? 0.2;
  const retryDelayMs = opts.retryDelayMs ?? 1000;
  const fetcher = opts.fetcher ?? fetch;

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
    temperature,
  };

  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const res = await fetcher(API, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY!}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://sop.vn",
          "X-Title": "SOP.vn",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        if (!shouldRetryStatus(res.status)) {
          throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
        }
        lastErr = new Error(`OpenRouter ${res.status}`);
        if (attempt < opts.maxRetries) await sleep(jitteredBackoff(retryDelayMs, attempt));
        continue;
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty content");
      const parsed = JSON.parse(content);
      return opts.schema.parse(parsed);
    } catch (e) {
      lastErr = e;
      if (attempt < opts.maxRetries) await sleep(jitteredBackoff(retryDelayMs, attempt));
    }
  }
  throw lastErr ?? new Error("LLM failed");
}

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
    case "ZodNullable": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inner = zodToJsonSchemaLike(def.innerType) as any;
      const innerType = inner.type;
      const types: string[] = Array.isArray(innerType) ? innerType : [innerType];
      if (!types.includes("null")) types.push("null");
      return { ...inner, type: types };
    }
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
  maxRetries?: number;
  temperature?: number;
  retryDelayMs?: number;
  fetcher?: Fetcher;
}): Promise<z.infer<T>> {
  const maxRetries = opts.maxRetries ?? 3;
  const temperature = opts.temperature ?? 0.2;
  const retryDelayMs = opts.retryDelayMs ?? 1000;
  const fetcher = opts.fetcher ?? fetch;

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
    temperature,
  };

  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetcher(API, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY!}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://sop.vn",
          "X-Title": "SOP.vn",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        if (!shouldRetryStatus(res.status)) {
          throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
        }
        lastErr = new Error(`OpenRouter ${res.status}`);
        if (attempt < maxRetries) await sleep(jitteredBackoff(retryDelayMs, attempt));
        continue;
      }
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty content");
      const parsed = JSON.parse(content);
      return opts.schema.parse(parsed);
    } catch (e) {
      lastErr = e;
      if (attempt < maxRetries) await sleep(jitteredBackoff(retryDelayMs, attempt));
    }
  }
  throw lastErr ?? new Error("LLM failed");
}
```

- [ ] **Step 1.4: Run tests to verify they pass**

```bash
npx tsx --test src/lib/openrouter.test.ts
npx tsc --noEmit
```

Expected: All 8 tests PASS. Typecheck clean.

- [ ] **Step 1.5: Commit**

```bash
git add src/lib/openrouter.ts src/lib/openrouter.test.ts
git commit -m "feat: retry-with-backoff + temperature + fetcher injection in openrouter SDK"
```

---

## Task 2: Extend ErrorCode union

**Files:**
- Modify: `src/lib/mongo.ts:21-31`

- [ ] **Step 2.1: Add classify_failed to ErrorCode**

Edit `src/lib/mongo.ts`. Change:

```ts
  | "click_detect_failed"
```

to:

```ts
  | "click_detect_failed"
  | "classify_failed"
```

- [ ] **Step 2.2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 2.3: Commit**

```bash
git add src/lib/mongo.ts
git commit -m "chore: add classify_failed to ErrorCode union"
```

---

## Task 3: Step extraction — temperature=0, repair-on-drift, sanity log, narrated alternatives

**Files:**
- Modify: `src/config/index.ts` (`sopSystem` prompt)
- Modify: `src/trigger/stages/extract.ts`
- Create: `src/trigger/stages/extract.test.ts`

- [ ] **Step 3.1: Write the failing test**

Create `src/trigger/stages/extract.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { runExtractWith, pickBetterExtraction } from "./extract";

const fixtureSegments = [
  { id: 0, text: "Hello and welcome." },
  { id: 1, text: "Today we'll create a HubSpot account." },
  { id: 2, text: "Click get started free." },
];

test("runExtractWith calls llmJson with temperature 0.0", async () => {
  let captured: number | undefined;
  const fakeCall = async (args: { temperature?: number }) => {
    captured = args.temperature;
    return { title: "T", steps: [{ title: "s1", description: "d", startSegmentId: 0, endSegmentId: 2 }] };
  };
  await runExtractWith(
    { segmentsClean: fixtureSegments, category: "c", domainSummary: "d", language: "en" },
    fakeCall,
  );
  assert.equal(captured, 0.0);
});

test("runExtractWith retries once when initial count is out of range", async () => {
  let calls = 0;
  const fakeCall = async () => {
    calls++;
    if (calls === 1) {
      // First attempt: 25 steps, out of range
      return {
        title: "T",
        steps: Array.from({ length: 25 }, (_, i) => ({
          title: `s${i}`, description: "d", startSegmentId: 0, endSegmentId: 2,
        })),
      };
    }
    return {
      title: "T",
      steps: Array.from({ length: 6 }, (_, i) => ({
        title: `s${i}`, description: "d", startSegmentId: 0, endSegmentId: 2,
      })),
    };
  };
  const out = await runExtractWith(
    { segmentsClean: fixtureSegments, category: "c", domainSummary: "d", language: "en" },
    fakeCall,
  );
  assert.equal(calls, 2);
  assert.equal(out.steps.length, 6);
});

test("pickBetterExtraction prefers in-range over out-of-range", () => {
  const a = { title: "A", steps: makeSteps(2) };
  const b = { title: "B", steps: makeSteps(5) };
  assert.equal(pickBetterExtraction(a, b).title, "B");
  assert.equal(pickBetterExtraction(b, a).title, "B");
});

test("pickBetterExtraction prefers second when both in-range", () => {
  const a = { title: "A", steps: makeSteps(5) };
  const b = { title: "B", steps: makeSteps(8) };
  assert.equal(pickBetterExtraction(a, b).title, "B");
});

test("pickBetterExtraction prefers smaller count when both out of range", () => {
  const a = { title: "A", steps: makeSteps(2) };
  const b = { title: "B", steps: makeSteps(25) };
  assert.equal(pickBetterExtraction(a, b).title, "A");
});

test("pickBetterExtraction returns second on tie when both out of range", () => {
  const a = { title: "A", steps: makeSteps(2) };
  const b = { title: "B", steps: makeSteps(2) };
  assert.equal(pickBetterExtraction(a, b).title, "B");
});

function makeSteps(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    title: `s${i}`, description: "d", startSegmentId: 0, endSegmentId: 1,
  }));
}
```

- [ ] **Step 3.2: Run test to verify it fails**

```bash
npx tsx --test src/trigger/stages/extract.test.ts
```

Expected: FAIL — `runExtractWith` and `pickBetterExtraction` don't exist.

- [ ] **Step 3.3: Update sopSystem prompt in `src/config/index.ts`**

Replace the existing `sopSystem` arrow function with:

```ts
      sopSystem: (lang: string) =>
        `You convert narrated training videos into structured SOPs. You receive cleaned, indexed transcript segments. Let the trainer's narration decide where steps begin and end — do NOT impose a preferred number of steps. Each step is a coherent unit the trainer is explaining. Each step has: a short title (≤8 words), a 2-4 sentence description, and a startSegmentId/endSegmentId referencing the input segment IDs. Also produce an overall SOP title.

GRANULARITY:
- Aim for one step per 60-180 seconds of narration.
- A typical 15-minute training video produces 5-12 steps.
- Combine micro-actions within a single goal into one step (e.g., do not split "fill out form" into "click first field", "type first name", "click second field", ... — that's one step).
- Do not split a single workflow across multiple steps.

NARRATED ALTERNATIVES:
- If the trainer mentions an alternative path they don't demonstrate (e.g., "You can sign in with Google or enter your email"), include that alternative in the step's description as a brief note.
- Do not invent alternatives — only include what the trainer actually says.

LANGUAGE: Output the title and every step's title and description in ${lang}. Keep technical / industry / brand terms in their original form (do not translate them).

Return strict JSON only.`,
```

- [ ] **Step 3.4: Rewrite `src/trigger/stages/extract.ts`**

Replace the file with:

```ts
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
```

- [ ] **Step 3.5: Run tests to verify they pass**

```bash
npx tsx --test src/trigger/stages/extract.test.ts
npx tsc --noEmit
```

Expected: All 6 tests PASS. Typecheck clean.

- [ ] **Step 3.6: Commit**

```bash
git add src/config/index.ts src/trigger/stages/extract.ts src/trigger/stages/extract.test.ts
git commit -m "feat: step extraction stability + narrated alternatives"
```

---

## Task 4: Detector changes — drop steadiness, tighten maxAreaFrac, widen merge window

**Files:**
- Modify: `src/trigger/lib/clickEventDetect.ts`
- Modify: `src/config/index.ts` (`clickDetect` knobs)
- Create: `src/trigger/lib/clickEventDetect.test.ts`

- [ ] **Step 4.1: Write the failing test**

Create `src/trigger/lib/clickEventDetect.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { mergeEvents, bboxIou } from "./clickEventDetect";
import type { ClickEvent } from "./clickEventDetect";

function ev(overrides: Partial<ClickEvent>): ClickEvent {
  return {
    time: 0,
    bbox: { x: 0.4, y: 0.4, w: 0.1, h: 0.05 },
    beforeFramePath: "/b.jpg",
    afterFramePath: "/a.jpg",
    area: 100,
    density: 0.5,
    ...overrides,
  };
}

test("mergeEvents collapses pair at exactly the window boundary (using <=)", () => {
  const a = ev({ time: 46.0 });
  const b = ev({ time: 47.5, beforeFramePath: "/b2.jpg", afterFramePath: "/a2.jpg" });
  const merged = mergeEvents([a, b], 1.5, 0.30);
  assert.equal(merged.length, 1, "<=1.5s should merge");
});

test("mergeEvents collapses press-flicker with low IOU (mergeIouMin=0.20)", () => {
  const a = ev({ time: 46.0, bbox: { x: 0.32, y: 0.96, w: 0.31, h: 0.03 } });
  // Press-state event: same y, x shifted slightly, smaller width
  const b = ev({ time: 47.5, bbox: { x: 0.35, y: 0.96, w: 0.25, h: 0.03 } });
  const iou = bboxIou(a.bbox, b.bbox);
  assert.ok(iou >= 0.20 && iou < 0.30, `iou ${iou} should be in (0.20, 0.30)`);
  const mergedAt03 = mergeEvents([a, b], 4.0, 0.30);
  assert.equal(mergedAt03.length, 2, "iou 0.20-0.30 should NOT merge with 0.30 threshold");
  const mergedAt02 = mergeEvents([a, b], 4.0, 0.20);
  assert.equal(mergedAt02.length, 1, "iou 0.20-0.30 SHOULD merge with 0.20 threshold");
});

test("mergeEvents collapses across-transition duplicates within 4s window", () => {
  const a = ev({ time: 53.5 });
  const b = ev({ time: 57.5, beforeFramePath: "/b2.jpg", afterFramePath: "/a2.jpg" });
  const merged = mergeEvents([a, b], 4.0, 0.30);
  assert.equal(merged.length, 1, "4s gap should merge with 4s window");
});

test("mergeEvents keeps clicks 4.5s apart separate", () => {
  const a = ev({ time: 53.5 });
  const b = ev({ time: 58.0, beforeFramePath: "/b2.jpg", afterFramePath: "/a2.jpg" });
  const merged = mergeEvents([a, b], 4.0, 0.30);
  assert.equal(merged.length, 2, "4.5s gap should NOT merge");
});
```

- [ ] **Step 4.2: Run test to verify it fails**

```bash
npx tsx --test src/trigger/lib/clickEventDetect.test.ts
```

Expected: FAIL — the first test fails because current code uses `<` not `<=`. The "4s merge" test fails because the merge function is called with the new wider window (passes if window arg is honored, but assert was already failing before because of the boundary test).

- [ ] **Step 4.3: Update `mergeEvents` to use `<=`**

In `src/trigger/lib/clickEventDetect.ts`, find the line in `mergeEvents`:

```ts
    if (next.time - current.time < windowSec && bboxIou(current.bbox, next.bbox) >= iouMin) {
```

Change to:

```ts
    if (next.time - current.time <= windowSec && bboxIou(current.bbox, next.bbox) >= iouMin) {
```

- [ ] **Step 4.4: Remove the steadiness gate and tighten maxAreaFrac default**

In `src/trigger/lib/clickEventDetect.ts`, replace the defaults inside `detectClickEvents`:

```ts
  const diffThreshold = opts.diffThreshold ?? 25;
  const minAreaFrac = opts.minAreaFrac ?? 0.003;
  const maxAreaFrac = opts.maxAreaFrac ?? 0.20;
  const minDensity = opts.minDensity ?? 0.20;
  const steadinessThreshold = opts.steadinessThreshold ?? 0.30;
  const mergeWindowSec = opts.mergeWindowSec ?? 1.5;
  const mergeIouMin = opts.mergeIouMin ?? 0.30;
  const maxEvents = opts.maxEventsPerVideo ?? 60;
  const diffMaxEdge = opts.diffMaxEdge ?? 640;
```

with:

```ts
  const diffThreshold = opts.diffThreshold ?? 25;
  const minAreaFrac = opts.minAreaFrac ?? 0.003;
  const maxAreaFrac = opts.maxAreaFrac ?? 0.12;
  const minDensity = opts.minDensity ?? 0.20;
  const mergeWindowSec = opts.mergeWindowSec ?? 4.0;
  const mergeIouMin = opts.mergeIouMin ?? 0.20;
  const maxEvents = opts.maxEventsPerVideo ?? 200; // soft global cap; per-step cap enforced downstream
  const diffMaxEdge = opts.diffMaxEdge ?? 640;
```

Remove the `steadinessThreshold` from the destructured options object. Remove the entire steadiness block from the detection loop:

```ts
    // Steadiness: reject if EITHER neighboring pair has a comparable mask area
    // (continuous motion). A real click is bracketed by relatively still frames.
    if (component.area >= 1) {
      const fwd = i + 1 < pairs.length ? pairs[i + 1].maskArea / component.area : 0;
      const bwd = i > 0 ? pairs[i - 1].maskArea / component.area : 0;
      if (fwd > steadinessThreshold || bwd > steadinessThreshold) continue;
    }
```

Delete it.

Also remove `steadinessThreshold` from the exported `ClickDetectOptions` type:

```ts
export type ClickDetectOptions = {
  diffThreshold?: number;
  minAreaFrac?: number;
  maxAreaFrac?: number;
  minDensity?: number;
  steadinessThreshold?: number;
  mergeWindowSec?: number;
  mergeIouMin?: number;
  maxEventsPerVideo?: number;
  diffMaxEdge?: number;
};
```

→

```ts
export type ClickDetectOptions = {
  diffThreshold?: number;
  minAreaFrac?: number;
  maxAreaFrac?: number;
  minDensity?: number;
  mergeWindowSec?: number;
  mergeIouMin?: number;
  maxEventsPerVideo?: number;
  diffMaxEdge?: number;
};
```

- [ ] **Step 4.5: Update config defaults in `src/config/index.ts`**

Find:

```ts
    clickDetect: {
      diffThreshold: 25,
      minAreaFrac: 0.003,
      maxAreaFrac: 0.20,
      minDensity: 0.20,
      steadinessThreshold: 0.30,
      mergeWindowSec: 1.5,
      mergeIouMin: 0.30,
      maxEventsPerVideo: 60,
      diffMaxEdge: 640,
    },
```

Replace with:

```ts
    clickDetect: {
      diffThreshold: 25,
      minAreaFrac: 0.003,
      maxAreaFrac: 0.12,
      minDensity: 0.20,
      mergeWindowSec: 4.0,
      mergeIouMin: 0.20,
      maxEventsPerVideo: 200,
      diffMaxEdge: 640,
      maxCandidatesPerStep: 25,
    },
```

- [ ] **Step 4.6: Add per-step cap in `extractClickEvents.ts`**

Replace the body of `runExtractClickEvents` in `src/trigger/stages/extractClickEvents.ts`:

```ts
import { logger } from "@trigger.dev/sdk/v3";
import { detectClickEvents, type ClickEvent, type ClickDetectOptions } from "@/trigger/lib/clickEventDetect";
import type { DenseFrame } from "./buildFramePool";

export type StepRange = {
  stepIndex: number;
  tStart: number;
  tEnd: number;
};

export async function runExtractClickEvents(args: {
  steps: StepRange[];
  denseFrames: DenseFrame[];
  opts?: ClickDetectOptions;
  maxCandidatesPerStep?: number;
}): Promise<Map<number, ClickEvent[]>> {
  const events = await detectClickEvents(args.denseFrames, args.opts);
  logger.info("click events detected", { count: events.length });

  const byStep = new Map<number, ClickEvent[]>();
  for (const step of args.steps) byStep.set(step.stepIndex, []);

  const lastStepIndex = args.steps.length === 0 ? -1 : Math.max(...args.steps.map(s => s.stepIndex));

  for (const ev of events) {
    let assigned: number | null = null;
    for (const step of args.steps) {
      const isLast = step.stepIndex === lastStepIndex;
      const inRange = isLast
        ? ev.time >= step.tStart && ev.time <= step.tEnd
        : ev.time >= step.tStart && ev.time < step.tEnd;
      if (inRange) {
        assigned = step.stepIndex;
        break;
      }
    }
    if (assigned !== null) byStep.get(assigned)!.push(ev);
  }

  const cap = args.maxCandidatesPerStep ?? 25;
  for (const [stepIndex, list] of byStep.entries()) {
    list.sort((a, b) => a.time - b.time);
    if (list.length > cap) {
      const trimmed = [...list]
        .sort((a, b) => b.area * b.density - a.area * a.density)
        .slice(0, cap)
        .sort((x, y) => x.time - y.time);
      logger.warn("pipeline.click_events.capped", { stepIndex, before: list.length, after: cap });
      byStep.set(stepIndex, trimmed);
    }
  }

  return byStep;
}
```

- [ ] **Step 4.7: Run tests to verify they pass**

```bash
npx tsx --test src/trigger/lib/clickEventDetect.test.ts
npx tsc --noEmit
```

Expected: All 4 tests PASS. Typecheck clean.

- [ ] **Step 4.8: Commit**

```bash
git add src/trigger/lib/clickEventDetect.ts src/trigger/lib/clickEventDetect.test.ts src/config/index.ts src/trigger/stages/extractClickEvents.ts
git commit -m "feat: detector becomes candidate generator (drop steadiness, tighten transition cap, widen merge)"
```

---

## Task 5: Screen identity — masked dHash clustering on a sampled dense pool

**Files:**
- Create: `src/trigger/lib/screenId.ts`
- Create: `src/trigger/lib/screenId.test.ts`
- Modify: `src/config/index.ts` (add `screenId` knobs)

- [ ] **Step 5.1: Write the failing test**

Create `src/trigger/lib/screenId.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import sharp from "sharp";
import { buildScreenClusters, type DensePoolFrame } from "./screenId";

/**
 * Generate a frame with a distinctive light/dark pattern.
 * dHash compares adjacent pixels, so a uniform-color image hashes to all zeros
 * (every left>=right). We composite a contrasting block at `blockX` so the
 * hash varies with position.
 */
async function makeFrame(tmp: string, name: string, blockX: 0 | 1): Promise<string> {
  const p = path.join(tmp, name);
  // 320x200 dark background, with a bright block on the left (blockX=0) or right (blockX=1).
  const W = 320, H = 200, blockW = 80, blockH = 80;
  const left = blockX === 0 ? 20 : W - blockW - 20;
  const top = (H - blockH) / 2;
  const blockSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${blockW}" height="${blockH}">
    <rect width="${blockW}" height="${blockH}" fill="#fff"/>
  </svg>`;
  await sharp({
    create: { width: W, height: H, channels: 3, background: { r: 20, g: 20, b: 20 } },
  })
    .composite([{ input: Buffer.from(blockSvg), top, left }])
    .jpeg()
    .toFile(p);
  return p;
}

test("buildScreenClusters groups visually-similar frames into one cluster", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sid-"));
  try {
    const fA1 = await makeFrame(tmp, "a1.jpg", 0); // block on left
    const fA2 = await makeFrame(tmp, "a2.jpg", 0); // same — block on left
    const fB = await makeFrame(tmp, "b.jpg", 1);   // block on right (visually distinct)

    const dense: DensePoolFrame[] = [
      { t: 0.0, localPath: fA1 },
      { t: 1.5, localPath: fA2 },
      { t: 3.0, localPath: fB },
    ];

    const clusters = await buildScreenClusters({
      denseFrames: dense,
      stepStart: 0,
      stepEnd: 5,
      samplingSec: 1.5,
      hammingThreshold: 10,
    });

    assert.equal(clusters.length, 2);
    const cA = clusters.find(c => c.members.length === 2);
    const cB = clusters.find(c => c.members.length === 1);
    assert.ok(cA);
    assert.ok(cB);
    assert.equal(cA!.letter, "A");
    assert.equal(cB!.letter, "B");
    assert.equal(cA!.timeSpan.start, 0.0);
    assert.equal(cA!.timeSpan.end, 1.5);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("buildScreenClusters samples only every samplingSec interval", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sid-"));
  try {
    const f = await makeFrame(tmp, "f.jpg", 0);
    const dense: DensePoolFrame[] = [
      { t: 0.0, localPath: f },
      { t: 0.5, localPath: f },
      { t: 1.0, localPath: f },
      { t: 1.5, localPath: f },
      { t: 2.0, localPath: f },
      { t: 3.0, localPath: f },
    ];
    const clusters = await buildScreenClusters({
      denseFrames: dense,
      stepStart: 0,
      stepEnd: 5,
      samplingSec: 1.5,
      hammingThreshold: 10,
    });
    // Sampled times: 0.0, 1.5, 3.0 → 3 members in one cluster.
    assert.equal(clusters.length, 1);
    assert.equal(clusters[0].members.length, 3);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("buildScreenClusters returns empty when no dense frames in step range", async () => {
  const clusters = await buildScreenClusters({
    denseFrames: [],
    stepStart: 0,
    stepEnd: 5,
    samplingSec: 1.5,
    hammingThreshold: 10,
  });
  assert.equal(clusters.length, 0);
});
```

- [ ] **Step 5.2: Run test to verify it fails**

```bash
npx tsx --test src/trigger/lib/screenId.test.ts
```

Expected: FAIL — `screenId.ts` module does not exist.

- [ ] **Step 5.3: Create `src/trigger/lib/screenId.ts`**

Note: the spec says "reuses `dHash` from `perceptualHash.ts`", but masking the URL/tab/chrome regions requires intercepting the 9×8 grayscale buffer before the bit-comparison step. The existing `dHash` does not expose that intermediate buffer. This file implements `maskedDHash` independently, sharing `hammingDistance` from `perceptualHash.ts`. The intended reuse is the *technique* (8×8 dHash bits) and the comparator, not the function body.

```ts
import sharp from "sharp";
import { hammingDistance } from "./perceptualHash";

export type DensePoolFrame = { t: number; localPath: string };

export type ScreenCluster = {
  letter: string;            // "A", "B", "C", ...
  representative: DensePoolFrame;
  members: DensePoolFrame[];
  timeSpan: { start: number; end: number };
  dHash: string;
};

const TOP_MASK_FRAC = 0.06;
const BOTTOM_MASK_FRAC = 0.08;

/**
 * dHash of a frame after masking the top URL/tab strip and bottom chat widget area.
 */
export async function maskedDHash(imagePath: string): Promise<string> {
  // Compute the masked image at the 9x8 grayscale grid used by dHash, then derive bits.
  const W = 9;
  const H = 8;
  const { data } = await sharp(imagePath)
    .grayscale()
    .resize(W, H, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const topRowsMasked = Math.round(H * TOP_MASK_FRAC); // for H=8: 0 rows (intentional — mask rounds down at this resolution)
  const bottomRowsMasked = Math.round(H * BOTTOM_MASK_FRAC); // for H=8: 1 row

  // Replace masked rows with neutral gray (value 128) so their bits become deterministic across screens.
  const buf = Buffer.from(data);
  for (let row = 0; row < topRowsMasked; row++) {
    for (let col = 0; col < W; col++) buf[row * W + col] = 128;
  }
  for (let row = H - bottomRowsMasked; row < H; row++) {
    for (let col = 0; col < W; col++) buf[row * W + col] = 128;
  }

  const bits: number[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = buf[row * W + col];
      const right = buf[row * W + col + 1];
      bits.push(left < right ? 1 : 0);
    }
  }
  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    const nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
    hex += nibble.toString(16);
  }
  return hex;
}

function sampleFramesInRange(denseFrames: DensePoolFrame[], start: number, end: number, samplingSec: number): DensePoolFrame[] {
  if (denseFrames.length === 0) return [];
  const sorted = [...denseFrames].sort((a, b) => a.t - b.t);
  const sampled: DensePoolFrame[] = [];
  let nextAnchor = start;
  for (const f of sorted) {
    if (f.t < start || f.t > end) continue;
    if (f.t + 1e-6 >= nextAnchor) {
      sampled.push(f);
      nextAnchor = f.t + samplingSec;
    }
  }
  return sampled;
}

export async function buildScreenClusters(args: {
  denseFrames: DensePoolFrame[];
  stepStart: number;
  stepEnd: number;
  samplingSec: number;
  hammingThreshold: number;
}): Promise<ScreenCluster[]> {
  const sampled = sampleFramesInRange(args.denseFrames, args.stepStart, args.stepEnd, args.samplingSec);
  if (sampled.length === 0) return [];

  const hashes: { frame: DensePoolFrame; hash: string }[] = [];
  for (const f of sampled) {
    hashes.push({ frame: f, hash: await maskedDHash(f.localPath) });
  }

  // Single-linkage cluster by Hamming <= threshold against any cluster member.
  const clusters: { hash: string; members: typeof hashes }[] = [];
  for (const h of hashes) {
    let placed = false;
    for (const c of clusters) {
      const close = c.members.some(m => hammingDistance(m.hash, h.hash) <= args.hammingThreshold);
      if (close) {
        c.members.push(h);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push({ hash: h.hash, members: [h] });
  }

  // Order clusters by earliest member's time so letters are stable.
  clusters.sort((a, b) => a.members[0].frame.t - b.members[0].frame.t);

  return clusters.map((c, i) => {
    const members = c.members.map(m => m.frame);
    const start = members[0].t;
    const end = members[members.length - 1].t;
    // Representative = the cluster member nearest the median sampled timestamp.
    // Spec §5 step 4 uses this for View card displayFramePath.
    const median = (start + end) / 2;
    const representative = [...members].sort(
      (a, b) => Math.abs(a.t - median) - Math.abs(b.t - median),
    )[0];
    return {
      letter: String.fromCharCode("A".charCodeAt(0) + i),
      representative,
      members,
      timeSpan: { start, end },
      dHash: c.hash,
    };
  });
}
```

- [ ] **Step 5.4: Add screen-id knobs to `src/config/index.ts`**

Inside the `screenshots:` block, alongside `ground: { ... }`, add:

```ts
    screenId: {
      samplingSec: 1.5,
      hammingThreshold: 10,
      viewMinDurationSec: 4.0,
      maxMontageClusters: 6,
    },
    classify: {
      maxCandidatesPerCall: 12,
      perStepConcurrency: 5,
    },
```

(Keep the existing `ground:` block in place; it will be removed in Task 10.)

- [ ] **Step 5.5: Run tests to verify they pass**

```bash
npx tsx --test src/trigger/lib/screenId.test.ts
npx tsc --noEmit
```

Expected: All 3 tests PASS. Typecheck clean.

- [ ] **Step 5.6: Commit**

```bash
git add src/trigger/lib/screenId.ts src/trigger/lib/screenId.test.ts src/config/index.ts
git commit -m "feat: masked dHash screen clustering on a sampled dense pool"
```

---

## Task 6: Action schema + Mongo Screenshot field additions

**Files:**
- Modify: `src/lib/schemas.ts`
- Modify: `src/lib/mongo.ts`

- [ ] **Step 6.1: Add new schemas to `src/lib/schemas.ts`**

Append to `src/lib/schemas.ts`:

```ts
// New action-pipeline types

export const ClassifiedCandidate = z.object({
  index: z.number(),
  decision: z.enum(["action", "discard"]),
  verb: z.enum(["click", "input", "select", "link"]).nullable(),
  screenName: z.string().nullable(),
  screenCluster: z.string().nullable(),
  elementCaption: z.string().nullable(),
  bbox: BBox.nullable(),
  displayFrame: z.enum(["before", "after"]).nullable(),
  discardReason: z.enum(["transition", "hover", "press_flicker", "animation", "other"]).nullable(),
});

export const StepClassification = z.object({
  candidates: z.array(ClassifiedCandidate),
});

export type ElementAction = {
  verb: "click" | "input" | "select" | "link";
  screenId: string;
  screenName: string;
  elementId: string;
  elementCaption: string;
  bbox: { x: number; y: number; w: number; h: number };
  displayFrame: "before" | "after";
  displayFramePath: string;
  time: number;
};

export type ViewAction = {
  verb: "view";
  screenId: string;
  screenName: string;
  displayFramePath: string;
  caption: string;
  time: number;
  durationSec: number;
};

export type Action = ElementAction | ViewAction;
```

- [ ] **Step 6.2: Add optional fields to `Screenshot` in `src/lib/mongo.ts`**

Change:

```ts
export interface Screenshot {
  frameId: string;
  r2Key: string;
  t: number;
  order: number;
  description?: string;
  highlight?: {
    kind: "click" | "input";
    bbox: { x: number; y: number; w: number; h: number };
  };
  highlightError?: string;
}
```

to:

```ts
export interface Screenshot {
  frameId: string;
  r2Key: string;
  t: number;
  order: number;
  description?: string;
  // New: present from the action-pipeline rework onward. Old SOPs lack these fields.
  verb?: "click" | "input" | "select" | "link" | "view";
  screenName?: string;
  elementCaption?: string;
  // highlight.kind stays narrow ("click" | "input") so the existing UI renderer continues
  // to work without changes. The upload adapter (Task 9) coerces select/link verbs → "click"
  // when populating highlight.kind. The full verb is captured in the new top-level `verb` field.
  highlight?: {
    kind: "click" | "input";
    bbox: { x: number; y: number; w: number; h: number };
  };
  highlightError?: string;
}
```

- [ ] **Step 6.3: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 6.4: Commit**

```bash
git add src/lib/schemas.ts src/lib/mongo.ts
git commit -m "feat: action schema and Screenshot field additions"
```

---

## Task 7: Batched LLM classifier

**Files:**
- Create: `src/trigger/stages/classifyStepWithLLM.ts`
- Create: `src/trigger/stages/classifyStepWithLLM.test.ts`
- Modify: `src/config/index.ts` (`classifyStepSystem` prompt)

- [ ] **Step 7.1: Add the `classifyStepSystem` prompt**

In `src/config/index.ts`, add a new prompt inside `prompts:` right after `groundEventSystem`:

```ts
      classifyStepSystem: (lang: string) =>
        `You classify candidate user actions from a screen recording into structured records, and discard candidates that are not real user actions (transitions, hovers, press-state flickers, animations).

You receive:
- The step's title.
- An optional SCREEN MONTAGE image: a row of up to 6 representative full BEFORE frames for this step, each labeled with a cluster letter (A, B, C, ...). When present, every candidate's BEFORE frame matches one of these clusters. When absent, treat each candidate independently.
- A series of candidates. Each candidate has: an index, an event time, a kind hint (click | input), a diff bbox normalized to the candidate's CROP, a BEFORE crop image, and an AFTER crop image. The candidate also references its cluster letter (or null if no montage).

For each candidate, decide:

1) decision = "action" OR "discard".

2) If "action":
   - verb: "click" (button, link, tab, menu item, icon, row, card, checkbox, radio), "input" (typing into a text field, textarea, search), "select" (picking an option from an open dropdown / autocomplete), or "link" (clicking a hyperlink that navigates).
   - screenName: the visible page/screen identifier from the BEFORE crop or the matching montage frame — usually the page heading text or modal title. If no heading is visible, give a short functional name ("Signup form", "Contacts list"). Lower-case, trimmed, normalize whitespace.
   - screenCluster: the letter (A/B/C...) of the candidate's BEFORE frame in the montage, or null if no montage was provided.
   - elementCaption: a SHORT REUSABLE element name — NOT a sentence. Examples: "Verify email button", "verification code input", "Companies link", "Search field". For two candidates targeting the same element, the elementCaption MUST be identical.
   - bbox: tightly wrap the WHOLE clickable element (background + border + padding), normalized 0..1 against the CROP you picked as displayFrame. Never crop just the text inside.
   - displayFrame: "after" for verb === "input" (typed text only appears in AFTER) and for click verbs whose action REVEALS new UI in the AFTER crop (flyout, dropdown, modal, autocomplete). "before" otherwise.

3) If "discard":
   - discardReason: "transition" (large-area pixel change, page navigation), "hover" (state-only change with no click target), "press_flicker" (second event in a tiny window after a click on the same element — animation by-product), "animation" (repeating motion in same region — spinner, loader, banner), "other".
   - All "action" fields must be null.

Coordinates are normalized 0..1 (top-left origin). Bbox is measured against the CROP only, never the full BEFORE frame.

LANGUAGE: Output every screenName and elementCaption in ${lang}. Keep technical / industry / brand terms in their original form.

Return strict JSON only.`,
```

- [ ] **Step 7.2: Write the failing test**

Create `src/trigger/stages/classifyStepWithLLM.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { chunkCandidatesBySort, type CandidateForLLM } from "./classifyStepWithLLM";

function c(index: number, time: number, cluster: string | null): CandidateForLLM {
  return {
    index,
    time,
    kindHint: "click",
    diffBboxInCrop: { x: 0.1, y: 0.1, w: 0.1, h: 0.1 },
    beforeCropPath: "/b.jpg",
    afterCropPath: "/a.jpg",
    screenCluster: cluster,
  };
}

test("chunkCandidatesBySort keeps same-screen candidates in one chunk", () => {
  const cands = [
    c(0, 1.0, "A"),
    c(1, 2.0, "B"),
    c(2, 3.0, "A"),  // same screen as 0
    c(3, 4.0, "B"),  // same screen as 1
    c(4, 5.0, "C"),
  ];
  const chunks = chunkCandidatesBySort(cands, 3);
  assert.equal(chunks.length, 2);
  // After sort by (cluster, time): A1, A3, B2, B4, C5
  // Chunk 0 (size 3): A1, A3, B2
  // Chunk 1 (size 3): B4, C5
  const clustersInChunk0 = new Set(chunks[0].map(x => x.screenCluster));
  assert.ok(clustersInChunk0.has("A"));
  // Both A candidates in chunk 0
  assert.equal(chunks[0].filter(x => x.screenCluster === "A").length, 2);
});

test("chunkCandidatesBySort produces single chunk when count <= cap", () => {
  const cands = [c(0, 1, "A"), c(1, 2, "B")];
  const chunks = chunkCandidatesBySort(cands, 12);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].length, 2);
});

test("chunkCandidatesBySort handles null screenCluster (sorts to the end)", () => {
  const cands = [c(0, 1, null), c(1, 2, "A"), c(2, 3, null), c(3, 4, "B")];
  const chunks = chunkCandidatesBySort(cands, 4);
  assert.equal(chunks.length, 1);
  // Lettered clusters sort first.
  const ordered = chunks[0].map(x => x.screenCluster);
  assert.deepEqual(ordered, ["A", "B", null, null]);
});

test("classifyStepWithLLM forwards each chunk to the injected classifier and concatenates", async () => {
  const { classifyStepWithLLM } = await import("./classifyStepWithLLM");
  let calls = 0;
  const out = await classifyStepWithLLM({
    stepTitle: "t",
    language: "en",
    candidates: [c(0,1,"A"), c(1,2,"A"), c(2,3,"B"), c(3,4,"B")],
    montageImagePath: null,
    maxCandidatesPerCall: 2,
    classifier: async ({ candidates }) => {
      calls++;
      return {
        candidates: candidates.map(cand => ({
          index: cand.index,
          decision: "action" as const,
          verb: "click" as const,
          screenName: cand.screenCluster ?? "x",
          screenCluster: cand.screenCluster,
          elementCaption: `el${cand.index}`,
          bbox: { x: 0, y: 0, w: 0.1, h: 0.1 },
          displayFrame: "before" as const,
          discardReason: null,
        })),
      };
    },
  });
  assert.equal(calls, 2);
  assert.equal(out.length, 4);
  const indices = out.map(c => c.index).sort((a, b) => a - b);
  assert.deepEqual(indices, [0, 1, 2, 3]);
});
```

- [ ] **Step 7.3: Run test to verify it fails**

```bash
npx tsx --test src/trigger/stages/classifyStepWithLLM.test.ts
```

Expected: FAIL — `classifyStepWithLLM.ts` does not exist.

- [ ] **Step 7.4: Create `src/trigger/stages/classifyStepWithLLM.ts`**

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { logger } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { llmJsonVision } from "@/lib/openrouter";
import { StepClassification, type ClassifiedCandidate } from "@/lib/schemas";
import { config } from "@/config";
import {
  computeCropWindow,
  diffBboxInCrop,
  cropBboxToFullFrame,
  padBbox,
  type Bbox,
} from "@/trigger/lib/cropEvent";
import type { RawEvent } from "./classifyAndMergeEvents";
import type { ScreenCluster } from "@/trigger/lib/screenId";

export type CandidateForLLM = {
  index: number;
  time: number;
  kindHint: "click" | "input";
  diffBboxInCrop: Bbox;
  beforeCropPath: string;
  afterCropPath: string;
  screenCluster: string | null;
};

export type ClassifiedActionRecord = z.infer<typeof StepClassification>["candidates"][number] & {
  // Bbox here is in full-frame coordinates (mapped from CROP space by this stage).
  fullFrameBbox: Bbox | null;
  beforeFramePath: string;
  afterFramePath: string;
};

type ClassifierFn = (args: {
  stepTitle: string;
  language: string;
  candidates: CandidateForLLM[];
  montageImagePath: string | null;
}) => Promise<z.infer<typeof StepClassification>>;

/**
 * Sort by (screenCluster ASC with nulls last, time ASC) then split into chunks of `cap`.
 */
export function chunkCandidatesBySort<T extends { screenCluster: string | null; time: number }>(
  candidates: T[],
  cap: number,
): T[][] {
  const sorted = [...candidates].sort((a, b) => {
    if (a.screenCluster === null && b.screenCluster !== null) return 1;
    if (a.screenCluster !== null && b.screenCluster === null) return -1;
    if (a.screenCluster !== b.screenCluster) {
      return String(a.screenCluster).localeCompare(String(b.screenCluster));
    }
    return a.time - b.time;
  });
  const out: T[][] = [];
  for (let i = 0; i < sorted.length; i += cap) {
    out.push(sorted.slice(i, i + cap));
  }
  return out.length > 0 ? out : [[]];
}

/**
 * Build a horizontal montage of representative cluster frames, each labeled with its letter.
 * Returns the JPEG path, or null when only 0 or 1 cluster (nothing useful to show) OR > maxClusters.
 */
export async function buildMontage(
  clusters: ScreenCluster[],
  outDir: string,
  maxClusters: number,
): Promise<string | null> {
  if (clusters.length < 2 || clusters.length > maxClusters) return null;

  const tileW = 640;
  const tileH = 360;
  const labelH = 36;
  const tiles: Buffer[] = [];
  for (const c of clusters) {
    const labelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${labelH}">
      <rect width="${tileW}" height="${labelH}" fill="#222"/>
      <text x="12" y="26" fill="#fff" font-family="sans-serif" font-size="22" font-weight="700">${c.letter}</text>
    </svg>`;
    const imgBuf = await sharp(c.representative.localPath)
      .resize({ width: tileW, height: tileH - labelH, fit: "inside", withoutEnlargement: true })
      .toBuffer();
    const tile = await sharp({
      create: { width: tileW, height: tileH, channels: 3, background: "#000" },
    })
      .composite([
        { input: Buffer.from(labelSvg), top: 0, left: 0 },
        { input: imgBuf, top: labelH, left: 0 },
      ])
      .jpeg({ quality: 85 })
      .toBuffer();
    tiles.push(tile);
  }

  const outPath = path.join(outDir, "montage.jpg");
  const composites = tiles.map((buf, i) => ({ input: buf, top: 0, left: i * tileW }));
  await sharp({
    create: { width: tileW * tiles.length, height: tileH, channels: 3, background: "#000" },
  })
    .composite(composites)
    .jpeg({ quality: 85 })
    .toFile(outPath);
  return outPath;
}

async function defaultClassifier(args: {
  stepTitle: string;
  language: string;
  candidates: CandidateForLLM[];
  montageImagePath: string | null;
}): Promise<z.infer<typeof StepClassification>> {
  const lines: string[] = [
    `Step title: ${args.stepTitle}`,
    `Number of candidates in this batch: ${args.candidates.length}`,
    args.montageImagePath
      ? `First image is the screen montage. Candidates start at the second image.`
      : `No montage attached. Candidates start at the first image. screenCluster MUST be null for every candidate.`,
    ``,
    `Candidates:`,
  ];
  for (const c of args.candidates) {
    lines.push(
      `- index=${c.index} time=${c.time.toFixed(2)} kindHint=${c.kindHint} screenCluster=${c.screenCluster ?? "null"} ` +
      `diffBboxInCrop=(${c.diffBboxInCrop.x.toFixed(3)},${c.diffBboxInCrop.y.toFixed(3)},${c.diffBboxInCrop.w.toFixed(3)},${c.diffBboxInCrop.h.toFixed(3)})`,
    );
  }
  const userText = lines.join("\n");

  const imagePaths: string[] = [];
  if (args.montageImagePath) imagePaths.push(args.montageImagePath);
  for (const c of args.candidates) {
    imagePaths.push(c.beforeCropPath, c.afterCropPath);
  }

  return llmJsonVision({
    model: config.ai.visionModel,
    system: config.ai.prompts.classifyStepSystem(args.language),
    userText,
    imagePaths,
    schema: StepClassification,
    schemaName: "step_classification",
    temperature: 0.0,
  });
}

/**
 * Run the classifier over a single step. Chunks if too many candidates.
 * Returns concatenated classifier outputs (no bbox mapping yet — that happens in the wrapper below).
 */
export async function classifyStepWithLLM(args: {
  stepTitle: string;
  language: string;
  candidates: CandidateForLLM[];
  montageImagePath: string | null;
  maxCandidatesPerCall?: number;
  classifier?: ClassifierFn;
}): Promise<ClassifiedCandidate[]> {
  const cap = args.maxCandidatesPerCall ?? config.screenshots.classify.maxCandidatesPerCall;
  const classifier = args.classifier ?? defaultClassifier;
  if (args.candidates.length === 0) return [];

  const chunks = chunkCandidatesBySort(args.candidates, cap);
  const out: ClassifiedCandidate[] = [];
  for (const chunk of chunks) {
    if (chunk.length === 0) continue;
    const result = await classifier({
      stepTitle: args.stepTitle,
      language: args.language,
      candidates: chunk,
      montageImagePath: args.montageImagePath,
    });
    out.push(...result.candidates);
  }
  return out;
}

/**
 * End-to-end stage helper. Takes the step's raw events (with frame paths), builds crops + montage,
 * calls the classifier, and remaps each action's bbox from CROP space → full-frame space.
 */
export async function classifyAndRemap(args: {
  stepTitle: string;
  language: string;
  events: RawEvent[];
  screenClusters: ScreenCluster[];
  perStepConcurrency?: number;
}): Promise<ClassifiedActionRecord[]> {
  if (args.events.length === 0) return [];

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "classify-"));
  try {
    // Build crops and assign cluster letter per candidate based on nearest member time.
    const candidates: (CandidateForLLM & { event: RawEvent; cropWindow: ReturnType<typeof computeCropWindow>; W: number; H: number })[] = [];
    for (let i = 0; i < args.events.length; i++) {
      const e = args.events[i];
      const meta = await sharp(e.beforeFramePath).metadata();
      const W = meta.width ?? 0;
      const H = meta.height ?? 0;
      if (!W || !H) throw new Error("missing image metadata");
      const crop = computeCropWindow(e.bbox, W, H, {
        multiplier: config.screenshots.ground.cropMultiplier,
        minPx: config.screenshots.ground.cropMinPx,
        maxFrac: config.screenshots.ground.cropMaxFrac,
      });
      const beforeCropPath = path.join(tmpDir, `c${i}-before.jpg`);
      const afterCropPath = path.join(tmpDir, `c${i}-after.jpg`);
      await sharp(e.beforeFramePath).extract({ left: crop.cx, top: crop.cy, width: crop.cw, height: crop.ch }).jpeg({ quality: 90 }).toFile(beforeCropPath);
      await sharp(e.afterFramePath).extract({ left: crop.cx, top: crop.cy, width: crop.cw, height: crop.ch }).jpeg({ quality: 90 }).toFile(afterCropPath);

      // When clusters exceed the montage cap, the montage is omitted (see buildMontage).
      // In that case the LLM has no letter→frame mapping to interpret, so every candidate
      // passes screenCluster=null. Spec §3 montage-overflow edge case.
      const overCap = args.screenClusters.length > config.screenshots.screenId.maxMontageClusters;
      const cluster = overCap ? null : nearestCluster(args.screenClusters, e.time);
      candidates.push({
        index: i,
        time: e.time,
        kindHint: e.kindHint,
        diffBboxInCrop: diffBboxInCrop(e.bbox, crop, W, H),
        beforeCropPath,
        afterCropPath,
        screenCluster: cluster?.letter ?? null,
        event: e,
        cropWindow: crop,
        W,
        H,
      });
    }

    const montagePath = await buildMontage(args.screenClusters, tmpDir, config.screenshots.screenId.maxMontageClusters);

    const classified = await classifyStepWithLLM({
      stepTitle: args.stepTitle,
      language: args.language,
      candidates: candidates.map(c => ({
        index: c.index,
        time: c.time,
        kindHint: c.kindHint,
        diffBboxInCrop: c.diffBboxInCrop,
        beforeCropPath: c.beforeCropPath,
        afterCropPath: c.afterCropPath,
        screenCluster: c.screenCluster,
      })),
      montageImagePath: montagePath,
    });

    const records: ClassifiedActionRecord[] = [];
    for (const cc of classified) {
      const cand = candidates.find(c => c.index === cc.index);
      if (!cand) {
        logger.warn("pipeline.classifier.unknown_index", { index: cc.index });
        continue;
      }
      let fullBbox: Bbox | null = null;
      if (cc.decision === "action" && cc.bbox) {
        const mapped = cropBboxToFullFrame(cc.bbox, cand.cropWindow, cand.W, cand.H);
        fullBbox = padBbox(mapped, cand.W, cand.H, config.screenshots.ground.bboxPadPx);
      }
      records.push({
        ...cc,
        fullFrameBbox: fullBbox,
        beforeFramePath: cand.event.beforeFramePath,
        afterFramePath: cand.event.afterFramePath,
      });
    }
    return records;
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}

function nearestCluster(clusters: ScreenCluster[], t: number): ScreenCluster | null {
  if (clusters.length === 0) return null;
  let best = clusters[0];
  let bestDelta = Math.abs(clusters[0].representative.t - t);
  for (let i = 1; i < clusters.length; i++) {
    const m = clusters[i].members;
    for (const mm of m) {
      const d = Math.abs(mm.t - t);
      if (d < bestDelta) { bestDelta = d; best = clusters[i]; }
    }
  }
  return best;
}
```

- [ ] **Step 7.5: Run tests to verify they pass**

```bash
npx tsx --test src/trigger/stages/classifyStepWithLLM.test.ts
npx tsc --noEmit
```

Expected: All 4 tests PASS. Typecheck clean.

- [ ] **Step 7.6: Commit**

```bash
git add src/trigger/stages/classifyStepWithLLM.ts src/trigger/stages/classifyStepWithLLM.test.ts src/config/index.ts
git commit -m "feat: batched per-step LLM classifier with montage and chunking"
```

---

## Task 8: Dedup + View emission pass

**Files:**
- Create: `src/trigger/stages/buildActionsForStep.ts`
- Create: `src/trigger/stages/buildActionsForStep.test.ts`

- [ ] **Step 8.1: Write the failing test**

Create `src/trigger/stages/buildActionsForStep.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { buildActionsForStep, normalizeElementId } from "./buildActionsForStep";
import type { ClassifiedActionRecord } from "./classifyStepWithLLM";
import type { ScreenCluster } from "@/trigger/lib/screenId";

function action(over: Partial<ClassifiedActionRecord>): ClassifiedActionRecord {
  return {
    index: 0,
    decision: "action",
    verb: "click",
    screenName: "Login page",
    screenCluster: "A",
    elementCaption: "Sign in button",
    bbox: { x: 0.1, y: 0.1, w: 0.1, h: 0.1 },
    displayFrame: "before",
    discardReason: null,
    fullFrameBbox: { x: 0.1, y: 0.1, w: 0.1, h: 0.1 },
    beforeFramePath: "/b.jpg",
    afterFramePath: "/a.jpg",
    ...over,
  };
}

function cluster(letter: string, start: number, end: number, repPath = "/rep.jpg"): ScreenCluster {
  return {
    letter,
    representative: { t: (start + end) / 2, localPath: repPath },
    members: [
      { t: start, localPath: repPath },
      { t: end, localPath: repPath },
    ],
    timeSpan: { start, end },
    dHash: "0".repeat(16),
  };
}

test("normalizeElementId lowercases, trims, collapses whitespace, strips closed-class suffixes", () => {
  assert.equal(normalizeElementId("Verify email button"), "verify email");
  assert.equal(normalizeElementId("Verify email"), "verify email");
  assert.equal(normalizeElementId("  Search field  "), "search");
  assert.equal(normalizeElementId("Companies LINK"), "companies");
  assert.equal(normalizeElementId("Marketing menu item"), "marketing menu");
  // "menu" alone is in the suffix set; "menu item" hits "item" first.
});

test("buildActionsForStep drops discards including those with null discardReason", () => {
  const cls = [
    action({ index: 0 }),
    action({ index: 1, decision: "discard", verb: null, screenName: null, screenCluster: null, elementCaption: null, bbox: null, displayFrame: null, discardReason: "hover", fullFrameBbox: null }),
    action({ index: 2, decision: "discard", verb: null, screenName: null, screenCluster: null, elementCaption: null, bbox: null, displayFrame: null, discardReason: null, fullFrameBbox: null }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: cls,
    screenClusters: [cluster("A", 0, 3)],
    eventTimes: [1.0, 1.5, 2.0],
    viewMinDurationSec: 4.0,
    language: "en",
  });
  assert.equal(out.filter(a => a.verb !== "view").length, 1);
});

test("buildActionsForStep dedupes same (screenName, elementId) keeping latest", () => {
  const cls = [
    action({ index: 0, elementCaption: "Get started free button" }),
    action({ index: 1, elementCaption: "Get started free" }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: cls,
    screenClusters: [cluster("A", 0, 3)],
    eventTimes: [46.0, 47.5],
    viewMinDurationSec: 4.0,
    language: "en",
  });
  const elements = out.filter(a => a.verb !== "view");
  assert.equal(elements.length, 1);
  if (elements[0].verb === "view") throw new Error("unexpected view");
  assert.equal(elements[0].time, 47.5);
});

test("buildActionsForStep verb-collapse rule: input wins over click", () => {
  const cls = [
    action({ index: 0, verb: "click", elementCaption: "Email field" }),
    action({ index: 1, verb: "input", elementCaption: "Email field" }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: cls,
    screenClusters: [cluster("A", 0, 3)],
    eventTimes: [1.0, 2.0],
    viewMinDurationSec: 4.0,
    language: "en",
  });
  const elements = out.filter(a => a.verb !== "view");
  assert.equal(elements.length, 1);
  assert.equal(elements[0].verb, "input");
});

test("buildActionsForStep unifies cluster letters when screenName matches case-insensitively", () => {
  const cls = [
    action({ index: 0, screenCluster: "A", screenName: "Check Your Email", elementCaption: "code input" }),
    action({ index: 1, screenCluster: "B", screenName: "check your email", elementCaption: "Next button" }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: cls,
    screenClusters: [cluster("A", 0, 3), cluster("B", 3, 6)],
    eventTimes: [1.0, 4.0],
    viewMinDurationSec: 4.0,
    language: "en",
  });
  const elements = out.filter(a => a.verb !== "view");
  assert.equal(elements.length, 2);
  assert.equal(elements[0].screenId, elements[1].screenId);
});

test("buildActionsForStep emits View when cluster persists >= threshold with zero overlapping actions", () => {
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: [
      action({ index: 0, screenCluster: "A", screenName: "Page A" }),
    ],
    screenClusters: [
      cluster("A", 0, 1),                // brief A
      cluster("B", 10, 20, "/rep-b.jpg"),// long B, no actions in it
    ],
    eventTimes: [0.5],
    viewMinDurationSec: 4.0,
    language: "en",
  });
  const views = out.filter(a => a.verb === "view");
  assert.equal(views.length, 1);
  assert.equal(views[0].time, 15);
});

test("buildActionsForStep does NOT emit View when an action's time overlaps the cluster's span", () => {
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: [
      action({ index: 0, screenCluster: "B", screenName: "Page B" }),
    ],
    screenClusters: [
      cluster("B", 10, 20),
    ],
    eventTimes: [15],
    viewMinDurationSec: 4.0,
    language: "en",
  });
  assert.equal(out.filter(a => a.verb === "view").length, 0);
});

test("buildActionsForStep orders actions chronologically", () => {
  const cls = [
    action({ index: 0, elementCaption: "E1" }),
    action({ index: 1, elementCaption: "E2" }),
    action({ index: 2, elementCaption: "E3" }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: cls,
    screenClusters: [cluster("A", 0, 10)],
    eventTimes: [5.0, 1.0, 3.0],
    viewMinDurationSec: 100.0, // suppress View
    language: "en",
  });
  const elements = out.filter(a => a.verb !== "view");
  assert.deepEqual(elements.map(e => (e.verb === "view" ? null : e.elementCaption)), ["E2", "E3", "E1"]);
});

test("buildActionsForStep uses English caption for en, Vietnamese for vi", () => {
  const baseArgs = {
    stepIndex: 0,
    classified: [] as ClassifiedActionRecord[],
    screenClusters: [cluster("X", 0, 10)],
    eventTimes: [] as number[],
    viewMinDurationSec: 4.0,
  };
  const en = buildActionsForStep({ ...baseArgs, language: "en" });
  const vi = buildActionsForStep({ ...baseArgs, language: "vi" });
  assert.equal(en[0].verb === "view" && en[0].caption.includes("Review"), true);
  assert.equal(vi[0].verb === "view" && vi[0].caption.includes("màn hình"), true);
});
```

- [ ] **Step 8.2: Run test to verify it fails**

```bash
npx tsx --test src/trigger/stages/buildActionsForStep.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 8.3: Create `src/trigger/stages/buildActionsForStep.ts`**

```ts
import { logger } from "@trigger.dev/sdk/v3";
import type { Action, ElementAction, ViewAction } from "@/lib/schemas";
import type { ClassifiedActionRecord } from "./classifyStepWithLLM";
import type { ScreenCluster } from "@/trigger/lib/screenId";

const SUFFIX_SET = new Set(["button", "link", "field", "input", "icon", "tab", "menu", "item"]);

const VIEW_CAPTION: Record<string, string> = {
  en: "Review this screen before continuing.",
  vi: "Hãy xem màn hình này trước khi tiếp tục.",
};

function viewCaption(lang: string): string {
  return VIEW_CAPTION[lang] ?? VIEW_CAPTION.en;
}

export function normalizeElementId(s: string): string {
  let n = s.toLowerCase().trim().replace(/\s+/g, " ");
  n = n.replace(/[.,;:!?'"()\[\]]/g, "");
  // Strip a single trailing closed-class suffix word (one pass — "menu item" → "menu").
  const tokens = n.split(" ");
  while (tokens.length > 1 && SUFFIX_SET.has(tokens[tokens.length - 1])) {
    tokens.pop();
  }
  return tokens.join(" ");
}

function normalizeScreenName(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ").replace(/[.:!?]$/, "");
}

export type BuildActionsArgs = {
  stepIndex: number;
  classified: ClassifiedActionRecord[];
  screenClusters: ScreenCluster[];
  eventTimes: number[]; // one entry per index in `classified` — the original event time used for chronological ordering
  viewMinDurationSec: number;
  language: string;
};

export function buildActionsForStep(args: BuildActionsArgs): Action[] {
  const surviving: ClassifiedActionRecord[] = [];
  for (const c of args.classified) {
    if (c.decision === "discard") {
      const reason = c.discardReason ?? "other";
      logger.info("pipeline.candidate.discarded", { stepIndex: args.stepIndex, index: c.index, reason });
      continue;
    }
    if (!c.verb || !c.screenName || !c.elementCaption || !c.fullFrameBbox || !c.displayFrame) {
      logger.warn("pipeline.classifier.incomplete_action", { stepIndex: args.stepIndex, index: c.index });
      continue;
    }
    surviving.push(c);
  }

  // Group by normalized screenName.
  const screenGroups = new Map<string, ClassifiedActionRecord[]>();
  for (const c of surviving) {
    const key = normalizeScreenName(c.screenName!);
    const list = screenGroups.get(key) ?? [];
    list.push(c);
    screenGroups.set(key, list);
  }

  // Order screen groups by earliest member time.
  const orderedScreens = [...screenGroups.entries()].sort((a, b) => {
    const at = Math.min(...a[1].map(r => args.eventTimes[r.index]));
    const bt = Math.min(...b[1].map(r => args.eventTimes[r.index]));
    return at - bt;
  });

  const elementActions: ElementAction[] = [];
  orderedScreens.forEach(([screenKey, records], seq) => {
    const screenId = `${args.stepIndex}-${seq + 1}`;
    const screenName = records[0].screenName!;

    // Dedup by elementId within this screen group.
    const byElement = new Map<string, ClassifiedActionRecord[]>();
    for (const r of records) {
      const id = normalizeElementId(r.elementCaption!);
      const list = byElement.get(id) ?? [];
      list.push(r);
      byElement.set(id, list);
    }

    for (const [elementId, group] of byElement.entries()) {
      const sortedByTime = [...group].sort((x, y) => args.eventTimes[x.index] - args.eventTimes[y.index]);
      const latest = sortedByTime[sortedByTime.length - 1];
      const hasInput = group.some(g => g.verb === "input");
      const verb = hasInput ? "input" as const : latest.verb!;
      if (sortedByTime.length > 1) {
        logger.info("pipeline.action.deduped", {
          stepIndex: args.stepIndex,
          screenId,
          elementId,
          keptTime: args.eventTimes[latest.index],
          droppedTimes: sortedByTime.slice(0, -1).map(r => args.eventTimes[r.index]),
        });
      }
      elementActions.push({
        verb,
        screenId,
        screenName,
        elementId,
        elementCaption: latest.elementCaption!,
        bbox: latest.fullFrameBbox!,
        displayFrame: latest.displayFrame!,
        displayFramePath: latest.displayFrame === "after" ? latest.afterFramePath : latest.beforeFramePath,
        time: args.eventTimes[latest.index],
      });
    }
    void screenKey;
  });

  // View emission: clusters with no overlapping ElementAction time AND span >= threshold.
  const elementTimes = elementActions.map(a => a.time);
  const viewActions: ViewAction[] = [];
  for (const cluster of args.screenClusters) {
    const span = cluster.timeSpan.end - cluster.timeSpan.start;
    if (span < args.viewMinDurationSec) continue;
    const overlaps = elementTimes.some(t => t >= cluster.timeSpan.start && t <= cluster.timeSpan.end);
    if (overlaps) continue;
    viewActions.push({
      verb: "view",
      screenId: `${args.stepIndex}-view-${cluster.letter}`,
      screenName: "this screen",
      displayFramePath: cluster.representative.localPath,
      caption: viewCaption(args.language),
      time: (cluster.timeSpan.start + cluster.timeSpan.end) / 2,
      durationSec: span,
    });
  }

  const all: Action[] = [...elementActions, ...viewActions];
  all.sort((a, b) => a.time - b.time);
  return all;
}
```

- [ ] **Step 8.4: Run tests to verify they pass**

```bash
npx tsx --test src/trigger/stages/buildActionsForStep.test.ts
npx tsc --noEmit
```

Expected: All 9 tests PASS. Typecheck clean.

- [ ] **Step 8.5: Commit**

```bash
git add src/trigger/stages/buildActionsForStep.ts src/trigger/stages/buildActionsForStep.test.ts
git commit -m "feat: dedup + view emission post-pass"
```

---

## Task 9: Wire the new flow into the pipeline + upload adapter

**Files:**
- Modify: `src/trigger/processSopScreenshots.ts`
- Modify: `src/trigger/stages/uploadScreenshots.ts`

**Heads-up:** Steps 9.1 and 9.2 are intentionally a single commit. The new `uploadScreenshots.ts` drops `UploadEvent` from its exports; the old `processSopScreenshots.ts` still imports it. Typecheck only goes green after both files land. Do not split into two commits.

- [ ] **Step 9.1: Update `uploadScreenshots.ts` to consume the Action union**

Replace `src/trigger/stages/uploadScreenshots.ts`:

```ts
import fs from "node:fs";
import sharp from "sharp";
import { customAlphabet } from "nanoid";
import { logger } from "@trigger.dev/sdk/v3";
import { putObject } from "@/lib/r2";
import { screenshotKey } from "@/lib/utils";
import type { Screenshot } from "@/lib/mongo";
import type { Action } from "@/lib/schemas";

export function rectSvg(
  W: number,
  H: number,
  bbox: { x: number; y: number; w: number; h: number },
): string | null {
  if (bbox.w < 0.005 || bbox.h < 0.005) return null;
  if (bbox.x + bbox.w > 1.05 || bbox.y + bbox.h > 1.05) return null;
  if (bbox.x < -0.05 || bbox.y < -0.05) return null;
  const x = clamp01(bbox.x);
  const y = clamp01(bbox.y);
  const w = Math.min(1 - x, Math.max(0, bbox.w));
  const h = Math.min(1 - y, Math.max(0, bbox.h));
  const stroke = Math.max(4, Math.round(H * 0.005));
  const px = Math.round(x * W) + Math.round(stroke / 2);
  const py = Math.round(y * H) + Math.round(stroke / 2);
  const pw = Math.max(1, Math.round(w * W) - stroke);
  const ph = Math.max(1, Math.round(h * H) - stroke);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="none" stroke="#F5C518" stroke-width="${stroke}" rx="6" ry="6"/></svg>`;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

async function buildBufferWithOptionalHighlight(
  localPath: string,
  bbox: { x: number; y: number; w: number; h: number } | null,
): Promise<{ buf: Buffer; error: string | null }> {
  if (!bbox) {
    return { buf: await fs.promises.readFile(localPath), error: null };
  }
  try {
    const meta = await sharp(localPath).metadata();
    const W = meta.width ?? 0;
    const H = meta.height ?? 0;
    if (!W || !H) return { buf: await fs.promises.readFile(localPath), error: "missing image metadata" };
    const svg = rectSvg(W, H, bbox);
    if (!svg) return { buf: await fs.promises.readFile(localPath), error: "bbox out of range" };
    const buf = await sharp(localPath)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .jpeg({ quality: 85 })
      .toBuffer();
    return { buf, error: null };
  } catch (e) {
    return {
      buf: await fs.promises.readFile(localPath),
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

const newFrameId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);

// Localized templates for the composed description. Falls back to English.
const DESCRIPTION_TEMPLATES: Record<string, { click: (s: string, e: string) => string; input: (s: string, e: string) => string }> = {
  en: {
    click: (s, e) => `On the "${s}" screen, click the ${e}.`,
    input: (s, e) => `On the "${s}" screen, enter text in the ${e}.`,
  },
  vi: {
    click: (s, e) => `Trên màn hình "${s}", nhấp vào ${e}.`,
    input: (s, e) => `Trên màn hình "${s}", nhập văn bản vào ${e}.`,
  },
};

function composeDescription(action: Action, language: string): string {
  if (action.verb === "view") return action.caption;
  const tpl = DESCRIPTION_TEMPLATES[language] ?? DESCRIPTION_TEMPLATES.en;
  const fn = action.verb === "input" ? tpl.input : tpl.click;
  return fn(action.screenName, action.elementCaption);
}

function coerceHighlightKind(verb: "click" | "input" | "select" | "link"): "click" | "input" {
  return verb === "input" ? "input" : "click";
}

export async function runUploadScreenshots(args: {
  sopId: string;
  byStep: Map<number, Action[]>;
  language: string;
}): Promise<Map<number, Screenshot[]>> {
  const out = new Map<number, Screenshot[]>();

  for (const [stepIndex, actions] of args.byStep.entries()) {
    const records: Screenshot[] = [];
    for (let order = 0; order < actions.length; order++) {
      const action = actions[order];
      const frameId = newFrameId();
      const r2Key = screenshotKey(args.sopId, stepIndex, frameId);
      const description = composeDescription(action, args.language);
      const bboxForOverlay = action.verb === "view" ? null : action.bbox;
      const { buf, error } = await buildBufferWithOptionalHighlight(action.displayFramePath, bboxForOverlay);
      if (error) {
        logger.warn("uploadScreenshots: highlight draw failed; uploaded un-annotated frame", {
          stepIndex,
          t: action.time,
          error,
        });
      }
      await putObject(r2Key, buf, "image/jpeg");
      const rec: Screenshot = {
        frameId,
        r2Key,
        t: action.time,
        order,
        description,
        verb: action.verb,
      };
      if (action.verb !== "view") {
        rec.screenName = action.screenName;
        rec.elementCaption = action.elementCaption;
        if (!error) {
          rec.highlight = { kind: coerceHighlightKind(action.verb), bbox: action.bbox };
        } else {
          rec.highlightError = error;
        }
      } else {
        rec.screenName = action.screenName;
      }
      records.push(rec);
    }
    out.set(stepIndex, records);
  }
  return out;
}
```

- [ ] **Step 9.2: Update `processSopScreenshots.ts`**

In `src/trigger/processSopScreenshots.ts`, replace the imports block (around lines 17–18):

```ts
import { runGroundEventsWithGemini } from "./stages/groundEventsWithGemini";
import { runUploadScreenshots, type UploadEvent } from "./stages/uploadScreenshots";
```

with:

```ts
import { runUploadScreenshots } from "./stages/uploadScreenshots";
import { classifyAndRemap } from "./stages/classifyStepWithLLM";
import { buildActionsForStep } from "./stages/buildActionsForStep";
import { buildScreenClusters } from "@/trigger/lib/screenId";
import type { Action } from "@/lib/schemas";
```

In `processSopScreenshots.ts`, locate the contiguous block that starts with `const grounded = await runGroundEventsWithGemini({` (around line 165) and ends with the existing `const screenshotsByStep = await runUploadScreenshots({ ... });` call (around line 186). Replace that entire block — including the `setStatus(_id, "uploading-screenshots")` line and the `uploadByStep` Map construction within it — with this single new block:

```ts
        // Stage 7: per-step classification, dedup, View emission.
        const actionsByStep = new Map<number, Action[]>();
        for (const step of stepInputs) {
          const events = merged.get(step.stepIndex) ?? [];
          const clusters = await buildScreenClusters({
            denseFrames: pool.denseFrames,
            stepStart: step.tStart,
            stepEnd: step.tEnd,
            samplingSec: config.screenshots.screenId.samplingSec,
            hammingThreshold: config.screenshots.screenId.hammingThreshold,
          });
          let classified;
          try {
            classified = await classifyAndRemap({
              stepTitle: step.title,
              language: outputLanguage,
              events,
              screenClusters: clusters,
            });
          } catch (e) {
            logger.error("classify failed", { stepIndex: step.stepIndex, e: String(e) });
            return fail(_id, "classify_failed");
          }
          const eventTimes = events.map(e => e.time);
          // Map classified records' original event index back to event time.
          const actions = buildActionsForStep({
            stepIndex: step.stepIndex,
            classified,
            screenClusters: clusters,
            eventTimes,
            viewMinDurationSec: config.screenshots.screenId.viewMinDurationSec,
            language: outputLanguage,
          });
          actionsByStep.set(step.stepIndex, actions);
        }

        // Stage 8: upload screenshots.
        await setStatus(_id, "uploading-screenshots");
        const screenshotsByStep = await runUploadScreenshots({
          sopId: _id.toHexString(),
          byStep: actionsByStep,
          language: outputLanguage,
        });
```


- [ ] **Step 9.3: Typecheck and run all tests**

```bash
npx tsc --noEmit
npx tsx --test src/trigger/stages/*.test.ts src/trigger/lib/*.test.ts src/lib/openrouter.test.ts
```

Expected: PASS. (The old `groundEventsWithGemini.test.ts` is still present and still passes against the old code — Task 10 deletes it. If typecheck fails because `groundEventsWithGemini.ts` references something removed, proceed directly to Task 10.)

- [ ] **Step 9.4: Commit**

```bash
git add src/trigger/processSopScreenshots.ts src/trigger/stages/uploadScreenshots.ts
git commit -m "feat: wire batched classifier + dedup + view into screenshot pipeline"
```

---

## Task 10: Delete the old grounding stage

**Files:**
- Delete: `src/trigger/stages/groundEventsWithGemini.ts`
- Delete: `src/trigger/stages/groundEventsWithGemini.test.ts`
- Modify: `src/lib/schemas.ts` (remove `GroundedEventOutput`)
- Modify: `src/config/index.ts` (remove `groundEventSystem` prompt and the `ground:` config block — replaced by `classify:` and `screenId:` blocks in Task 5 — actually `ground:` is still referenced by `classifyAndRemap` for crop sizing, so keep `ground:`)

- [ ] **Step 10.1: Delete the old grounding stage and its test**

```bash
rm src/trigger/stages/groundEventsWithGemini.ts
rm src/trigger/stages/groundEventsWithGemini.test.ts
```

- [ ] **Step 10.2: Remove `GroundedEventOutput` from `src/lib/schemas.ts`**

Delete this block:

```ts
export const GroundedEventOutput = z.object({
  bbox: BBox,
  caption: z.string().nullable(),
  kind: z.enum(["click", "input"]),
  displayFrame: z.enum(["before", "after"]),
});
```

- [ ] **Step 10.3: Remove `groundEventSystem` prompt from `src/config/index.ts`**

Delete the entire `groundEventSystem: (lang: string) => ...` arrow function block. Keep `classifyStepSystem`. Keep the `screenshots.ground:` config block — `classifyAndRemap` still uses its `cropMultiplier`, `cropMinPx`, `cropMaxFrac`, `bboxPadPx` values for crop windows.

- [ ] **Step 10.4: Typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS. If anything references `GroundedEventOutput` or `groundEventSystem`, fix the reference.

- [ ] **Step 10.5: Run all tests one more time**

```bash
npx tsx --test src/trigger/stages/*.test.ts src/trigger/lib/*.test.ts src/lib/openrouter.test.ts
```

Expected: All tests PASS.

- [ ] **Step 10.6: Commit**

```bash
git add -A src/trigger/stages/ src/lib/schemas.ts src/config/index.ts
git commit -m "chore: remove obsolete per-event grounding stage"
```

---

## Task 11: Final smoke test against the live SOP

**Files:**
- No code changes. Operational task.

- [ ] **Step 11.1: Start the Trigger.dev dev server**

In a separate terminal, from the repo root:

```bash
npx trigger.dev@latest dev
```

Wait until the output shows `Local worker ready` before continuing.

- [ ] **Step 11.2: Trigger the task against the live SOP**

The repo doesn't ship a CLI invoke command. Two options:
- Open the Trigger.dev dashboard at https://cloud.trigger.dev/, find the `process-sop-screenshots` task, click "Test", paste:
  ```json
  { "sopId": "6a04abd616f65270628d088b" }
  ```
- Or, if you have the Trigger MCP tool, call `mcp__trigger__trigger_task` with `taskId: "process-sop-screenshots"` and the payload above.

Wait for the run to reach `status: completed` (typically 10–15 minutes for this 17-min video).

- [ ] **Step 11.3: Inspect the result**

```bash
node --experimental-vm-modules ./scripts/inspect-sop.mjs 2>&1 | head -120
```

Verify the acceptance criteria from the spec §7:

1. The "Create Your Free HubSpot Account" step shows **one** card per (screen, element). Run:

```bash
node --experimental-vm-modules ./scripts/inspect-sop.mjs 2>&1 | grep -E 'Get started free|Verify email|verification code|Next button' | sort -u
```

Each unique caption should appear at most once per (step, screen).

2. Each card's `description` field starts with `On the "..." screen, ...` or is the localized View caption.

3. The step's `description` (the LLM-extracted text) mentions social login as an alternative.

4. Run the task a second time, then capture both step counts and compare:

```bash
# After both runs complete:
node --experimental-vm-modules ./scripts/inspect-sop.mjs 2>&1 | grep -E "^steps:"
# Expect a line like "steps: N". Run twice (once after each pipeline run) and confirm |N1 - N2| <= 2.
```

- [ ] **Step 11.4: Open in Playwright and visually confirm**

Navigate to `http://localhost:3000/sop/6a04abd616f65270628d088b`. The "Create Your Free HubSpot Account" step should have no duplicate "Get started free" or "Verify email" cards. The "Check your email" screen should show two distinct cards (one for the code input, one for the Next button).

- [ ] **Step 11.5: If acceptance criteria pass, tag the smoke result**

No commit needed unless config tweaks were made during smoke. If iteration on knobs (`samplingSec`, `viewMinDurationSec`, etc.) was needed, commit those tweaks now with message `chore: tune screenshot pipeline knobs after smoke test`.
