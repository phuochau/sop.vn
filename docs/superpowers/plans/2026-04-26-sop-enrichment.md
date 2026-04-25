# SOP enrichment + free-form categories implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Drop the hardcoded `CATEGORIES` enum and `DOMAIN_TERMINOLOGY` map (Part A), then add silent-path PDF synthesizers (Part B) so silent-video SOPs get a vision-derived overview + per-step prose / bullets / callouts in the PDF.

**Architecture:** Part A makes `category` a freeform LLM-generated string and threads `domainSummary` through the existing extract prompts. Part B adds two new vision stages (`runVisualOverview`, `runVisualStep`) that mirror the speech-path PDF synth shape; `generateSopPdf` branches on `doc.inputMode === "silent"`.

**Tech Stack:** TypeScript, Trigger.dev, MongoDB, OpenRouter (Gemini-vision via `llmJsonVision`), Zod, fluent-ffmpeg.

**Reference:** `docs/superpowers/specs/2026-04-26-sop-enrichment-design.md` (committed at `c9623fb`).

---

## File map

**Modify (Part A):**
- `src/config/index.ts` — drop `CATEGORIES`/`Category`/`DOMAIN_TERMINOLOGY`/`domainTerminology`/`config.categories`; update `sopSystem` and `visualSopSystem` signatures + bodies; add `pdfVisualOverviewSystem` and `pdfVisualStepSystem`.
- `src/lib/schemas.ts` — `ContextOutput.category`: enum → `z.string()`.
- `src/trigger/stages/context.ts` — drop `Category`, change return-type, change user-prompt placeholder, change failure default to `""`.
- `src/trigger/stages/visualContext.ts` — drop `Category`, change return-type, change user-prompt placeholder.
- `src/trigger/stages/extract.ts` — drop `Category`, drop `domainHint` lookup, add `domainSummary` parameter, weave it into the user prompt.
- `src/trigger/stages/visualExtract.ts` — same parameter changes as `extract.ts`; tighten user prompt to ask for a 3–6 sentence paragraph per step.
- `src/trigger/stages/visualExtract.test.ts` — pass `domainSummary` in every call.
- `src/trigger/processSop.ts` — drop `Category` import; pass `domainSummary` into both extract calls; relax `let category!: Category` → `let category!: string`.

**Modify (Part B):**
- `src/trigger/generateSopPdf.ts` — add `loadVisualOverviewSafely` and `loadVisualStepRewriteSafely`; branch on `doc.inputMode === "silent"` inside the existing top-level `try`; load step images once and feed both the renderer and the silent step synth; fetch source video once for the overview and dispose in `finally`.

**Create (Part B):**
- `src/trigger/stages/visualOverview.ts`
- `src/trigger/stages/visualOverview.test.ts`
- `src/trigger/stages/visualStep.ts`
- `src/trigger/stages/visualStep.test.ts`

---

## Task 1: Config + schema cleanup (Part A core)

**Files:**
- Modify: `src/config/index.ts`
- Modify: `src/lib/schemas.ts`

Note: this task knowingly leaves *intermediate* TS errors in five consumer files (`context.ts`, `visualContext.ts`, `extract.ts`, `visualExtract.ts`, `processSop.ts`) because they still import `Category` / call `sopSystem(domainHint, lang)` / read `domainTerminology`. Tasks 2–6 fix them in order; type-check is restored at the end of Task 6.

- [ ] **Step 1: Replace the entire contents of `src/config/index.ts`** with:

```ts
export const config = {
  ai: {
    transcriptionProvider: "fal" as const,
    transcriptionModel: "fal-ai/whisper",
    normalizeModel: "google/gemini-2.5-flash",
    contextModel: "google/gemini-2.5-flash",
    sopModel: "anthropic/claude-sonnet-4.5",
    pdfModel: "google/gemini-2.5-flash",
    visionModel: "google/gemini-2.5-flash",
    maxRetries: 1,
    prompts: {
      // Every system prompt receives the detected language code from Whisper
      // (ISO-ish, e.g. "vi", "en") or the user-selected default for silent
      // videos. Natural-language output MUST be in that language. Technical /
      // industry / brand terms (e.g. "espresso", "tamping", "gel polish") may
      // stay in their original form — do not translate them.
      languageRule: (lang: string) =>
        `LANGUAGE: Output all natural-language text in ${lang}. Match the source transcript's language exactly. Keep technical / industry / brand terms in their original form — do not translate them.`,
      normalizeSystem: (lang: string) =>
        `You clean ASR transcripts. Remove filler words, stutters, and self-corrections. Preserve meaning and the original language of each segment. CRITICAL: return the same segment IDs unchanged — do not merge, split, or renumber.\n\nLANGUAGE: Source language is ${lang}; keep cleaned segments in ${lang}.`,
      contextSystem: (lang: string) =>
        `You classify training videos. Read the transcript and return a short freeform string naming the domain or industry (e.g., "Specialty espresso brewing", "Vietnamese stir-fry cooking", "Manicure prep") plus a 1-2 sentence summary of what the video teaches.\n\nLANGUAGE: Output the summary in ${lang}. Keep technical / industry / brand terms in their original form.`,
      sopSystem: (lang: string) =>
        `You convert narrated training videos into structured SOPs. You receive cleaned, indexed transcript segments. Let the trainer's narration decide where steps begin and end — do NOT impose a preferred number of steps. Each step is a coherent unit the trainer is explaining. Each step has: a short title (≤8 words), a 2-4 sentence description, and a startSegmentId/endSegmentId referencing the input segment IDs. Also produce an overall SOP title.\n\nLANGUAGE: Output the title and every step's title and description in ${lang}. Keep technical / industry / brand terms in their original form (do not translate them).\n\nReturn strict JSON only.`,
      pdfOverviewSystem: (lang: string) =>
        `You are writing the opening of a printed SOP document. The reader cannot watch the source video — they only have your text. Read the full transcript and step list, then produce a concise overview: purpose (2-3 sentences), audience (one sentence), prerequisites (bullets), tools/materials mentioned (bullets), and estimated duration (a short phrase like "~N minutes" / "~N phút" matching the output language). No filler, no speculation beyond what the transcript supports.\n\nLANGUAGE: Output every field in ${lang}. Keep technical / industry / brand terms in their original form (do not translate them).`,
      pdfStepSystem: (lang: string) =>
        `You rewrite a single step of a training SOP for a reader who cannot watch the video. Convert the spoken transcript slice into clear written instructions. Output: 1-3 short paragraphs of prose, an ordered list of discrete actions in imperative voice (subBullets), and any warnings/tips/notes as callouts with kind="warning"|"tip"|"note". Do not invent steps not present in the transcript. If there are no callouts, return an empty array.\n\nLANGUAGE: Output prose, subBullets, and callouts in ${lang}. Keep technical / industry / brand terms in their original form (do not translate them).`,
      visualContextSystem: (lang: string) =>
        `You classify training videos by looking at sampled frames. Identify a short freeform string naming the domain or industry (e.g., "Specialty espresso brewing", "Vietnamese stir-fry cooking", "Manicure prep") and write a 1-2 sentence summary of what the video teaches.\n\nLANGUAGE: Output the summary in ${lang}. Keep technical / industry / brand terms in their original form.`,
      visualSopSystem: (lang: string) =>
        `You convert silent how-to videos into structured SOPs. You receive frames sampled from the video plus the second-offset of each frame, and a freeform "category" + a short "domainSummary" provided in the user prompt. Identify the discrete actions being performed. For each action, write a clear instructional step in the output language. Each step has: a short title (≤8 words), a 3-6 sentence paragraph description describing what to do (instructional, present-tense, imperative voice), and startTime/endTime in seconds within the video duration. Order steps chronologically and do not overlap them. Return at least one step.\n\nLANGUAGE: Output the title and every step's title and description in ${lang}. Keep technical / industry / brand terms in their original form (do not translate them).\n\nReturn strict JSON only.`,
      pdfVisualOverviewSystem: (lang: string) =>
        `You are writing the opening of a printed SOP document for a how-to video that has no spoken audio. You receive a few sampled frames, the SOP title, a freeform category, a short domainSummary, and the list of step titles. Produce a concise overview: purpose (2-3 sentences), audience (one sentence), prerequisites (3-5 bullets), tools/materials visible in the frames or implied by the category (3-8 bullets), and estimated duration (a short phrase like "~N minutes" / "~N phút" matching the output language). Base every claim on the frames or the supplied context — do not invent.\n\nLANGUAGE: Output every field in ${lang}. Keep technical / industry / brand terms in their original form (do not translate them).`,
      pdfVisualStepSystem: (lang: string) =>
        `You rewrite a single step of a silent training SOP for a reader who cannot watch the video. You receive the keyframes for this step, the step's title and short description, the previous step's title (for continuity), the SOP's freeform category, and a domainSummary. Output: 1-3 short paragraphs of prose, an ordered list of discrete actions in imperative voice (subBullets), and any warnings/tips/notes as callouts with kind="warning"|"tip"|"note". Describe only what the keyframes show or what the supplied context warrants — do not invent actions. If there are no callouts, return an empty array.\n\nLANGUAGE: Output prose, subBullets, and callouts in ${lang}. Keep technical / industry / brand terms in their original form (do not translate them).`,
    },
  },
  limits: {
    maxVideoSizeMB: 500,
    maxVideoDurationSec: 60 * 60,
    minVideoDurationSec: 10,
    allowedMimeTypes: [
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "video/x-msvideo",
    ],
  },
  retention: { videoRetentionDays: 30 },
  app: { shareTokenLength: 16, pollIntervalMs: 2000 },
};
```

(Removed: `CATEGORIES` constant, `Category` type, `DOMAIN_TERMINOLOGY` map, `domainTerminology` ai-block field, `categories` exposure on the config object.)

- [ ] **Step 2: Update `src/lib/schemas.ts`**

Find:

```ts
export const ContextOutput = z.object({
  category: z.enum([
    "Coffee & Drinks",
    "Food & Cooking",
    "Spa & Beauty",
    "Nail",
    "Other",
  ]),
  domainSummary: z.string(),
});
```

Replace with:

```ts
export const ContextOutput = z.object({
  category: z.string(),
  domainSummary: z.string(),
});
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: TS errors confined to `src/trigger/stages/{context,visualContext,extract,visualExtract}.ts` and `src/trigger/processSop.ts`. They reference the removed `Category` type / `domainTerminology` field / old `sopSystem(domainHint, lang)` signature. Tasks 2–6 fix them. Errors in any other file mean something went wrong — stop and investigate.

- [ ] **Step 4: Commit**

```bash
git add src/config/index.ts src/lib/schemas.ts
git commit -m "refactor(config): drop CATEGORIES enum + DOMAIN_TERMINOLOGY; freeform category

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: Update `context.ts` for freeform categories

**Files:**
- Modify: `src/trigger/stages/context.ts`

- [ ] **Step 1: Replace the entire contents of `src/trigger/stages/context.ts`** with:

```ts
import { llmJson } from "@/lib/openrouter";
import { ContextOutput } from "@/lib/schemas";
import { config } from "@/config";
import { logger } from "@trigger.dev/sdk/v3";

export async function runContext(args: {
  cleanTranscript: string;
  language: string;
}): Promise<{ category: string; domainSummary: string }> {
  try {
    const out = await llmJson({
      model: config.ai.contextModel,
      system: config.ai.prompts.contextSystem(args.language),
      user: `Transcript:\n${args.cleanTranscript}\n\nReturn { "category": <freeform string naming the domain/industry>, "domainSummary": string }.`,
      schema: ContextOutput,
      schemaName: "context",
      maxRetries: 0,
    });
    return out;
  } catch (e) {
    logger.warn("context detect failed — defaulting to empty category", { e: String(e) });
    return { category: "", domainSummary: "" };
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: still has known errors in `visualContext.ts`, `extract.ts`, `visualExtract.ts`, `processSop.ts`. Errors elsewhere = stop and investigate.

- [ ] **Step 3: Commit**

```bash
git add src/trigger/stages/context.ts
git commit -m "refactor(context): freeform category string; drop Category type

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: Update `visualContext.ts` for freeform categories

**Files:**
- Modify: `src/trigger/stages/visualContext.ts`

- [ ] **Step 1: Replace the entire contents of `src/trigger/stages/visualContext.ts`** with:

```ts
import { llmJsonVision } from "@/lib/openrouter";
import { ContextOutput } from "@/lib/schemas";
import { config } from "@/config";

export async function runVisualContext(args: {
  framePaths: string[];
  language: string;
}): Promise<{ category: string; domainSummary: string }> {
  return llmJsonVision({
    model: config.ai.visionModel,
    system: config.ai.prompts.visualContextSystem(args.language),
    userText:
      `These ${args.framePaths.length} frames are sampled evenly across a how-to video. ` +
      `Return { "category": <freeform string naming the domain/industry>, "domainSummary": string }.`,
    imagePaths: args.framePaths,
    schema: ContextOutput,
    schemaName: "context",
    maxRetries: config.ai.maxRetries,
  });
}
```

(Error-bubbling behavior unchanged — `runVisualContext` still does not swallow errors.)

- [ ] **Step 2: Run the existing test**

Run: `npx tsx --test src/trigger/stages/visualContext.test.ts`
Expected: PASS (1/1) — the test stub already returns `category: "Coffee & Drinks"` (a string), still valid.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: errors confined to `extract.ts`, `visualExtract.ts`, `processSop.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/trigger/stages/visualContext.ts
git commit -m "refactor(visualContext): freeform category string; drop Category type

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: Update `extract.ts` for freeform categories + domainSummary

**Files:**
- Modify: `src/trigger/stages/extract.ts`

- [ ] **Step 1: Replace the entire contents of `src/trigger/stages/extract.ts`** with:

```ts
import { llmJson } from "@/lib/openrouter";
import { SopExtractOutput } from "@/lib/schemas";
import { config } from "@/config";
import type { CleanSegment } from "@/lib/mongo";

export async function runExtract(args: {
  segmentsClean: CleanSegment[];
  category: string;
  domainSummary: string;
  language: string;
}) {
  const userPrompt =
    `Category: ${args.category}\n` +
    `Domain summary: ${args.domainSummary}\n\n` +
    `Segments (JSON, use ids to reference):\n${JSON.stringify(args.segmentsClean)}\n\n` +
    `Return { "title": string, "steps": [{ "title", "description", "startSegmentId", "endSegmentId" }] }.`;

  const out = await llmJson({
    model: config.ai.sopModel,
    system: config.ai.prompts.sopSystem(args.language),
    user: userPrompt,
    schema: SopExtractOutput,
    schemaName: "sop_extract",
    maxRetries: config.ai.maxRetries,
  });
  return out;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: errors confined to `visualExtract.ts` and `processSop.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/trigger/stages/extract.ts
git commit -m "refactor(extract): freeform category + domainSummary; drop Category type

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Update `visualExtract.ts` + tests for freeform categories + domainSummary + paragraph descriptions

**Files:**
- Modify: `src/trigger/stages/visualExtract.ts`
- Modify: `src/trigger/stages/visualExtract.test.ts`

- [ ] **Step 1: Replace the entire contents of `src/trigger/stages/visualExtract.ts`** with:

```ts
import { llmJsonVision } from "@/lib/openrouter";
import { VisualSopExtractOutput } from "@/lib/schemas";
import { config } from "@/config";

export async function runVisualExtract(args: {
  framePaths: string[];
  frameTimestamps: number[];
  durationSec: number;
  category: string;
  domainSummary: string;
  language: string;
}): Promise<{ title: string; steps: { title: string; description: string; startTime: number; endTime: number }[] }> {
  const frameLines = args.frameTimestamps
    .map((t, i) => `Frame ${i + 1}: ${t.toFixed(2)}s`)
    .join("\n");

  const userText =
    `Video duration: ${args.durationSec.toFixed(2)} seconds.\n` +
    `Category: ${args.category}\n` +
    `Domain summary: ${args.domainSummary}\n` +
    `Frame timestamps (frames are attached in this order):\n${frameLines}\n\n` +
    `Return { "title": string, "steps": [{ "title", "description", "startTime", "endTime" }] }. ` +
    `Each step description must be a 3-6 sentence instructional paragraph. ` +
    `Steps must be ordered chronologically, non-overlapping, with timestamps within [0, ${args.durationSec.toFixed(2)}]. ` +
    `Return at least one step.`;

  // We do retries here (not inside llmJsonVision) so that post-parse
  // timestamp assertions can also trigger a retry.
  const attempts = config.ai.maxRetries + 1;
  let lastErr: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const out = await llmJsonVision({
        model: config.ai.visionModel,
        system: config.ai.prompts.visualSopSystem(args.language),
        userText,
        imagePaths: args.framePaths,
        schema: VisualSopExtractOutput,
        schemaName: "visual_sop_extract",
        maxRetries: 0,
      });
      let prevEnd = 0;
      for (const s of out.steps) {
        if (s.startTime < 0) throw new Error("step startTime is negative");
        if (s.startTime < prevEnd) throw new Error("steps not chronologically ordered");
        if (s.endTime <= s.startTime) throw new Error("step endTime <= startTime");
        if (s.endTime > args.durationSec) throw new Error("step endTime exceeds video duration");
        prevEnd = s.endTime;
      }
      return out;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("visualExtract failed");
}
```

- [ ] **Step 2: Update `src/trigger/stages/visualExtract.test.ts`** to pass `domainSummary` in every `runVisualExtract` call.

The test file has 6 test calls (1 valid + 2 reject + 1 empty + 1 prompt-content + 1 retry-count). For each call, add `domainSummary: "Test domain summary"` next to the existing `category: ...`. Show a representative example — apply the same change to all calls.

For the first test ("runVisualExtract parses valid response"), find:

```ts
      const out = await runVisualExtract({
        framePaths: paths,
        frameTimestamps: [1, 3, 5],
        durationSec: 6,
        category: "Coffee & Drinks",
        language: "vi",
      });
```

Replace with:

```ts
      const out = await runVisualExtract({
        framePaths: paths,
        frameTimestamps: [1, 3, 5],
        durationSec: 6,
        category: "Coffee & Drinks",
        domainSummary: "Test domain summary",
        language: "vi",
      });
```

Apply the analogous insertion (one new `domainSummary: "Test domain summary",` line after the `category` line) to **every** `runVisualExtract({ ... })` call in the file (there are 6 of them).

- [ ] **Step 3: Run tests**

Run: `npx tsx --test src/trigger/stages/visualExtract.test.ts`
Expected: 6 PASS.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: errors confined to `processSop.ts` only (`Category` import + missing `domainSummary` argument).

- [ ] **Step 5: Commit**

```bash
git add src/trigger/stages/visualExtract.ts src/trigger/stages/visualExtract.test.ts
git commit -m "refactor(visualExtract): freeform category + domainSummary; paragraph descriptions

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Update `processSop.ts` to thread `domainSummary` and drop `Category`

**Files:**
- Modify: `src/trigger/processSop.ts`

- [ ] **Step 1: Drop the `Category` import and adjust the imports line**

Find:

```ts
import { config, type Category } from "@/config";
```

Replace with:

```ts
import { config } from "@/config";
```

- [ ] **Step 2: Update the speech-branch `runExtract` call**

Find:

```ts
        // Stage 4: extract
        await setStatus(_id, "generating");
        let extracted;
        try {
          extracted = await runExtract({ segmentsClean, category, language: language! });
```

Replace with:

```ts
        // Stage 4: extract
        await setStatus(_id, "generating");
        let extracted;
        try {
          extracted = await runExtract({ segmentsClean, category, domainSummary, language: language! });
```

(`domainSummary` is already in scope from `const { category, domainSummary } = await runContext(...)` two stages earlier.)

- [ ] **Step 3: Relax the silent-branch `category` definite-assignment**

Find:

```ts
        let category!: Category;
        let domainSummary!: string;
```

Replace with:

```ts
        let category!: string;
        let domainSummary!: string;
```

- [ ] **Step 4: Update the silent-branch `runVisualExtract` call**

Find:

```ts
          extracted = await runVisualExtract({
            framePaths: extFrames.paths,
            frameTimestamps: extFrames.timestamps,
            durationSec,
            category,
            language: defaultLanguage,
          });
```

Replace with:

```ts
          extracted = await runVisualExtract({
            framePaths: extFrames.paths,
            frameTimestamps: extFrames.timestamps,
            durationSec,
            category,
            domainSummary,
            language: defaultLanguage,
          });
```

- [ ] **Step 5: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: PASS (no output). Part A is complete.

- [ ] **Step 6: Run the full test suite**

Run:
```bash
npx tsx --test \
  src/trigger/lib/sampleFrames.test.ts \
  src/trigger/lib/branchDecision.test.ts \
  src/trigger/stages/clip.test.ts \
  src/trigger/stages/keyframes.test.ts \
  src/trigger/stages/synthesizeStep.test.ts \
  src/trigger/stages/renderPdf.test.ts \
  src/trigger/stages/visualContext.test.ts \
  src/trigger/stages/visualExtract.test.ts
```
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/trigger/processSop.ts
git commit -m "refactor(processSop): thread domainSummary; drop Category type

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: `runVisualOverview` stage + test

**Files:**
- Create: `src/trigger/stages/visualOverview.ts`
- Create: `src/trigger/stages/visualOverview.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/trigger/stages/visualOverview.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import path from "node:path";
import fs from "node:fs";

test("runVisualOverview against a real fixture (skipped if missing)", async (t) => {
  const fixture = path.resolve("samples/4_no_speech.mp4");
  if (!fs.existsSync(fixture)) {
    t.skip("samples/4_no_speech.mp4 missing");
    return;
  }

  // Probe duration so sampleFrames doesn't seek past EOF. Pick a small value
  // (5 sec) safely within any plausible fixture length to avoid an extra ffprobe.
  const durationSec = 5;

  let capturedBody: { messages: { content: string | { type: string; text?: string }[] }[] } | null = null;
  const originalFetch = global.fetch;
  global.fetch = (async (_url: string, init?: { body?: string }) => {
    capturedBody = JSON.parse(init?.body ?? "{}");
    return {
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({
          purpose: "Hướng dẫn món Bò lúc lắc.",
          audience: "Đầu bếp tập sự.",
          prerequisites: ["Bếp gas", "Chảo gang"],
          toolsMaterials: ["Thịt bò", "Hành tây", "Tỏi"],
          estimatedDuration: "~15 phút",
        }) } }],
      }),
      text: async () => "",
    };
  }) as unknown as typeof fetch;

  try {
    const { runVisualOverview } = await import("./visualOverview");
    const out = await runVisualOverview({
      srcPath: fixture,
      durationSec,
      title: "Bò lúc lắc",
      category: "Vietnamese stir-fry cooking",
      domainSummary: "Stir-fried beef with onions, a Vietnamese classic.",
      stepTitles: ["Ướp thịt", "Phi tỏi", "Xào thịt"],
      language: "vi",
    });
    assert.equal(out.purpose.length > 0, true);
    assert.equal(out.toolsMaterials.length, 3);

    const body = capturedBody as unknown as { messages: { content: string | { type: string; text?: string }[] }[] };
    const userMsg = body.messages.find(m => Array.isArray(m.content));
    assert.ok(userMsg, "user message missing");
    const textPart = (userMsg!.content as { type: string; text?: string }[]).find(p => p.type === "text");
    const text = textPart?.text ?? "";
    assert.ok(text.includes("Vietnamese stir-fry cooking"), `prompt should include category — got: ${text}`);
    assert.ok(text.includes("Stir-fried beef"), `prompt should include domainSummary — got: ${text}`);
    assert.ok(text.includes("Ướp thịt"), `prompt should include step titles — got: ${text}`);
    const sysMsg = body.messages.find(m => typeof m.content === "string");
    assert.ok(((sysMsg?.content as string) ?? "").includes("vi"), "system prompt should include language");
  } finally {
    global.fetch = originalFetch;
  }
});
```

- [ ] **Step 2: Verify failing**

Run: `npx tsx --test src/trigger/stages/visualOverview.test.ts`
Expected: FAIL — module not found (or test skipped if fixture missing — that's also acceptable).

- [ ] **Step 3: Implement `visualOverview.ts`**

Create `src/trigger/stages/visualOverview.ts`:

```ts
import { llmJsonVision } from "@/lib/openrouter";
import { OverviewOutput } from "@/lib/schemas";
import { config } from "@/config";
import { sampleFrames } from "@/trigger/lib/sampleFrames";
import type { z } from "zod";

export type Overview = z.infer<typeof OverviewOutput>;

export async function runVisualOverview(args: {
  srcPath: string;          // caller-owned, pre-downloaded source video
  durationSec: number;
  title: string;
  category: string;
  domainSummary: string;
  stepTitles: string[];
  language: string;
}): Promise<Overview> {
  const frames = await sampleFrames(args.srcPath, args.durationSec, { mode: "fixed" });
  try {
    const userText =
      `SOP title: ${args.title}\n` +
      `Category: ${args.category}\n` +
      `Domain summary: ${args.domainSummary}\n\n` +
      `Step titles:\n${args.stepTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n` +
      `These ${frames.paths.length} frames are sampled evenly across the video. ` +
      `Return strict JSON: { "purpose", "audience", "prerequisites": string[], "toolsMaterials": string[], "estimatedDuration" }.`;

    return await llmJsonVision({
      model: config.ai.visionModel,
      system: config.ai.prompts.pdfVisualOverviewSystem(args.language),
      userText,
      imagePaths: frames.paths,
      schema: OverviewOutput,
      schemaName: "pdf_visual_overview",
      maxRetries: config.ai.maxRetries,
    });
  } finally {
    await frames.dispose();
  }
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx tsx --test src/trigger/stages/visualOverview.test.ts`
Expected: PASS (or SKIP if fixture absent).

- [ ] **Step 5: Commit**

```bash
git add src/trigger/stages/visualOverview.ts src/trigger/stages/visualOverview.test.ts
git commit -m "feat(stages): runVisualOverview for silent-path PDF overview synthesis

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: `runVisualStep` stage + test

**Files:**
- Create: `src/trigger/stages/visualStep.ts`
- Create: `src/trigger/stages/visualStep.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/trigger/stages/visualStep.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";

const JPEG_HEADER = Buffer.from([0xff, 0xd8, 0xff]);

async function withStubbedFetch(payload: unknown, fn: () => Promise<void>): Promise<{ capturedBody: unknown }> {
  let capturedBody: unknown = null;
  const original = global.fetch;
  global.fetch = (async (_url: string, init?: { body?: string }) => {
    capturedBody = JSON.parse(init?.body ?? "{}");
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }),
      text: async () => "",
    };
  }) as unknown as typeof fetch;
  try { await fn(); return { capturedBody }; }
  finally { global.fetch = original; }
}

test("runVisualStep returns parsed StepRewrite when given image buffers", async () => {
  const { capturedBody } = await withStubbedFetch(
    {
      prose: "Trộn thịt với gia vị.",
      subBullets: ["Thái thịt", "Thêm tỏi", "Ướp 10 phút"],
      callouts: [{ kind: "tip", text: "Nên dùng thịt thăn." }],
    },
    async () => {
      const { runVisualStep } = await import("./visualStep");
      const out = await runVisualStep({
        step: { title: "Ướp thịt", description: "Ướp thịt bò.", startTime: 0, endTime: 30 },
        imageBuffers: [JPEG_HEADER, JPEG_HEADER, JPEG_HEADER],
        prevTitle: null,
        category: "Vietnamese stir-fry cooking",
        domainSummary: "Stir-fried beef with onions.",
        language: "vi",
      });
      assert.equal(out.prose, "Trộn thịt với gia vị.");
      assert.equal(out.subBullets.length, 3);
      assert.equal(out.callouts[0].kind, "tip");
    }
  );
  const body = capturedBody as { messages: { content: string | { type: string; text?: string }[] }[] };
  const userMsg = body.messages.find(m => Array.isArray(m.content));
  const textPart = (userMsg!.content as { type: string; text?: string }[]).find(p => p.type === "text");
  const text = textPart?.text ?? "";
  assert.ok(text.includes("Ướp thịt"), `prompt should include step title — got: ${text}`);
  assert.ok(text.includes("Vietnamese stir-fry cooking"), `prompt should include category — got: ${text}`);
  assert.ok(text.includes("Stir-fried beef"), `prompt should include domainSummary — got: ${text}`);
});

test("runVisualStep includes prevTitle when provided", async () => {
  const { capturedBody } = await withStubbedFetch(
    { prose: "x", subBullets: [], callouts: [] },
    async () => {
      const { runVisualStep } = await import("./visualStep");
      await runVisualStep({
        step: { title: "Bước 2", description: "d", startTime: 30, endTime: 60 },
        imageBuffers: [JPEG_HEADER],
        prevTitle: "Bước 1: Ướp thịt",
        category: "x", domainSummary: "y", language: "vi",
      });
    }
  );
  const body = capturedBody as { messages: { content: string | { type: string; text?: string }[] }[] };
  const userMsg = body.messages.find(m => Array.isArray(m.content));
  const textPart = (userMsg!.content as { type: string; text?: string }[]).find(p => p.type === "text");
  const text = textPart?.text ?? "";
  assert.ok(text.includes("Bước 1: Ướp thịt"), `prompt should include prevTitle — got: ${text}`);
});

test("runVisualStep short-circuits to fallback when imageBuffers is empty (no LLM call)", async () => {
  let calls = 0;
  const original = global.fetch;
  global.fetch = (async () => { calls++; throw new Error("should not be called"); }) as unknown as typeof fetch;
  try {
    const { runVisualStep } = await import("./visualStep");
    const out = await runVisualStep({
      step: { title: "Bước trống", description: "Mô tả gốc.", startTime: 0, endTime: 10 },
      imageBuffers: [],
      prevTitle: null,
      category: "x", domainSummary: "y", language: "vi",
    });
    assert.equal(out.prose, "Mô tả gốc.");
    assert.deepEqual(out.subBullets, []);
    assert.deepEqual(out.callouts, []);
    assert.equal(calls, 0);
  } finally {
    global.fetch = original;
  }
});
```

- [ ] **Step 2: Verify failing**

Run: `npx tsx --test src/trigger/stages/visualStep.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `visualStep.ts`**

Create `src/trigger/stages/visualStep.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { llmJsonVision } from "@/lib/openrouter";
import { StepRewriteOutput } from "@/lib/schemas";
import { config } from "@/config";
import type { z } from "zod";

export type StepRewrite = z.infer<typeof StepRewriteOutput>;

export async function runVisualStep(args: {
  step: { title: string; description: string; startTime: number; endTime: number };
  imageBuffers: Buffer[];
  prevTitle: string | null;
  category: string;
  domainSummary: string;
  language: string;
}): Promise<StepRewrite> {
  if (args.imageBuffers.length === 0) {
    return { prose: args.step.description, subBullets: [], callouts: [] };
  }

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sop-vstep-"));
  const paths: string[] = [];
  try {
    for (let i = 0; i < args.imageBuffers.length; i++) {
      const p = path.join(tmpDir, `img-${i}.jpg`);
      await fs.promises.writeFile(p, args.imageBuffers[i]);
      paths.push(p);
    }

    const userText =
      `Step title: ${args.step.title}\n` +
      `Original short description: ${args.step.description}\n` +
      (args.prevTitle ? `Previous step title (for continuity, do not repeat its content): ${args.prevTitle}\n` : "") +
      `Category: ${args.category}\n` +
      `Domain summary: ${args.domainSummary}\n\n` +
      `These ${paths.length} images are the keyframes for this step. ` +
      `Return strict JSON: { "prose", "subBullets": string[], "callouts": [{ "kind": "warning"|"tip"|"note", "text" }] }.`;

    return await llmJsonVision({
      model: config.ai.visionModel,
      system: config.ai.prompts.pdfVisualStepSystem(args.language),
      userText,
      imagePaths: paths,
      schema: StepRewriteOutput,
      schemaName: "pdf_visual_step",
      maxRetries: config.ai.maxRetries,
    });
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx tsx --test src/trigger/stages/visualStep.test.ts`
Expected: 3 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/trigger/stages/visualStep.ts src/trigger/stages/visualStep.test.ts
git commit -m "feat(stages): runVisualStep for silent-path PDF step rewrite

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: Branch `generateSopPdf` on `inputMode`

**Files:**
- Modify: `src/trigger/generateSopPdf.ts`

- [ ] **Step 1: Replace the entire contents of `src/trigger/generateSopPdf.ts`** with:

```ts
import { task, logger } from "@trigger.dev/sdk/v3";
import { ObjectId } from "mongodb";
import { sops, type SopDoc } from "@/lib/mongo";
import { presignGet, putObject, deleteObject } from "@/lib/r2";
import { pdfKey } from "@/lib/utils";
import { runSynthesizeOverview, type Overview } from "./stages/synthesizeOverview";
import { runSynthesizeStep, sliceTranscriptByTime, type StepRewrite } from "./stages/synthesizeStep";
import { runVisualOverview } from "./stages/visualOverview";
import { runVisualStep } from "./stages/visualStep";
import { fetchSourceVideo } from "./lib/videoTmp";
import { renderSopPdf, type RenderInput } from "./stages/renderPdf";

async function fetchR2Buffer(key: string): Promise<Buffer> {
  const url = await presignGet(key, 600);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${key}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function setPdfState(id: ObjectId, patch: Record<string, unknown>) {
  const $set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) $set[`pdf.${k}`] = v;
  await (await sops()).updateOne({ _id: id }, { $set });
}

async function loadOverviewSafely(doc: SopDoc): Promise<Overview | null> {
  if (!doc.transcript) return null;
  try {
    return await runSynthesizeOverview({
      title: doc.title,
      category: doc.category,
      transcript: doc.transcript,
      stepTitles: doc.steps.map(s => s.title),
      language: doc.language ?? "vi",
    });
  } catch (e) {
    logger.warn("overview synth failed; rendering without overview", { e: String(e) });
    return null;
  }
}

async function loadStepRewriteSafely(doc: SopDoc, stepIndex: number): Promise<StepRewrite | null> {
  const step = doc.steps[stepIndex];
  const slice = sliceTranscriptByTime(doc.segments, step.startTime, step.endTime);
  if (!slice) {
    logger.info("step has no transcript slice; using fallback", { stepIndex });
    return { prose: step.description, subBullets: [], callouts: [] };
  }
  const prevTitle = stepIndex > 0 ? doc.steps[stepIndex - 1].title : null;
  try {
    return await runSynthesizeStep({
      step,
      segments: doc.segments,
      prevTitle,
      language: doc.language ?? "vi",
    });
  } catch (e) {
    logger.warn("step rewrite failed; using fallback", { stepIndex, e: String(e) });
    return { prose: step.description, subBullets: [], callouts: [] };
  }
}

async function loadVisualOverviewSafely(doc: SopDoc, srcPath: string, durationSec: number): Promise<Overview | null> {
  try {
    return await runVisualOverview({
      srcPath,
      durationSec,
      title: doc.title,
      category: doc.category,
      domainSummary: doc.domainSummary ?? "",
      stepTitles: doc.steps.map(s => s.title),
      language: doc.language ?? doc.defaultLanguage ?? "vi",
    });
  } catch (e) {
    logger.warn("visual overview synth failed; rendering without overview", { e: String(e) });
    return null;
  }
}

async function loadVisualStepRewriteSafely(doc: SopDoc, stepIndex: number, imageBuffers: Buffer[]): Promise<StepRewrite> {
  const step = doc.steps[stepIndex];
  const prevTitle = stepIndex > 0 ? doc.steps[stepIndex - 1].title : null;
  try {
    return await runVisualStep({
      step,
      imageBuffers,
      prevTitle,
      category: doc.category,
      domainSummary: doc.domainSummary ?? "",
      language: doc.language ?? doc.defaultLanguage ?? "vi",
    });
  } catch (e) {
    logger.warn("visual step rewrite failed; using fallback", { stepIndex, e: String(e) });
    return { prose: step.description, subBullets: [], callouts: [] };
  }
}

async function loadStepImages(doc: SopDoc, stepIndex: number): Promise<{ keyframes: Buffer[]; posterImage: Buffer | null }> {
  const step = doc.steps[stepIndex];
  const keyframes: Buffer[] = [];
  for (const k of step.keyframeR2Keys ?? []) {
    try { keyframes.push(await fetchR2Buffer(k)); }
    catch (e) { logger.warn("keyframe fetch failed", { k, e: String(e) }); }
  }
  let posterImage: Buffer | null = null;
  if (keyframes.length === 0 && step.posterR2Key) {
    try { posterImage = await fetchR2Buffer(step.posterR2Key); }
    catch (e) { logger.warn("poster fetch failed", { e: String(e) }); }
  }
  return { keyframes, posterImage };
}

export const generateSopPdf = task({
  id: "generate-sop-pdf",
  maxDuration: 60 * 5,
  run: async (payload: { sopId: string }) => {
    const _id = new ObjectId(payload.sopId);
    const doc = await (await sops()).findOne({ _id });
    if (!doc || doc.status !== "done") {
      logger.error("sop not ready for pdf", { sopId: payload.sopId });
      await setPdfState(_id, { status: "error", errorMessage: "SOP not ready" });
      return;
    }

    try {
      const isSilent = doc.inputMode === "silent";

      // Load step images once — both the renderer and the silent step synth need them.
      const stepImagesArr = await Promise.all(doc.steps.map((_, i) => loadStepImages(doc, i)));

      let overview: Overview | null;
      let stepRewrites: (StepRewrite | null)[];

      if (isSilent) {
        const durationSec = doc.steps.length > 0
          ? Math.max(...doc.steps.map(s => s.endTime))
          : 0;
        if (!doc.videoR2Key) throw new Error("silent SOP missing videoR2Key");

        const src = await fetchSourceVideo(doc.videoR2Key);
        try {
          [overview, stepRewrites] = await Promise.all([
            loadVisualOverviewSafely(doc, src.srcPath, durationSec),
            Promise.all(doc.steps.map((_, i) => {
              const imgs = stepImagesArr[i];
              const buffers = imgs.keyframes.length > 0 ? imgs.keyframes : (imgs.posterImage ? [imgs.posterImage] : []);
              return loadVisualStepRewriteSafely(doc, i, buffers);
            })),
          ]);
        } finally {
          await src.dispose();
        }
      } else {
        [overview, stepRewrites] = await Promise.all([
          loadOverviewSafely(doc),
          Promise.all(doc.steps.map((_, i) => loadStepRewriteSafely(doc, i))),
        ]);
      }

      const input: RenderInput = {
        title: doc.title,
        category: doc.category,
        createdAt: doc.createdAt,
        overview,
        steps: doc.steps.map((step, i) => ({
          index: i,
          title: step.title,
          startTime: step.startTime,
          endTime: step.endTime,
          rewrite: stepRewrites[i],
          keyframes: stepImagesArr[i].keyframes,
          posterImage: stepImagesArr[i].posterImage,
        })),
      };
      const buf = await renderSopPdf(input);

      const ts = Date.now();
      const key = pdfKey(payload.sopId, ts);
      await putObject(key, buf, "application/pdf");

      const previousKey = doc.pdf?.r2Key;
      await setPdfState(_id, {
        status: "ready",
        r2Key: key,
        generatedAt: new Date(),
        errorMessage: null,
      });
      if (previousKey && previousKey !== key) {
        try { await deleteObject(previousKey); }
        catch (e) { logger.warn("failed to delete previous pdf object", { previousKey, e: String(e) }); }
      }
      logger.info("pdf ready", { sopId: payload.sopId, key, bytes: buf.length });
    } catch (e) {
      const msg = String(e);
      logger.error("generateSopPdf failed", { e: msg });
      await setPdfState(_id, { status: "error", errorMessage: msg });
    }
  },
});
```

(Note: `loadStepRewriteSafely` is typed `Promise<StepRewrite | null>` for backward-compat with the original signature. The current code path always returns a non-null `StepRewrite`, but the `| null` allows the renderer to keep treating a null rewrite as a fallback path if the upstream contract ever changes. The new `loadVisualStepRewriteSafely` returns `Promise<StepRewrite>` because its fallback shape is constructed inline and is never null.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS (no output).

- [ ] **Step 3: Run all tests**

Run:
```bash
npx tsx --test \
  src/trigger/lib/sampleFrames.test.ts \
  src/trigger/lib/branchDecision.test.ts \
  src/trigger/stages/clip.test.ts \
  src/trigger/stages/keyframes.test.ts \
  src/trigger/stages/synthesizeStep.test.ts \
  src/trigger/stages/renderPdf.test.ts \
  src/trigger/stages/visualContext.test.ts \
  src/trigger/stages/visualExtract.test.ts \
  src/trigger/stages/visualOverview.test.ts \
  src/trigger/stages/visualStep.test.ts
```
Expected: all PASS (some may SKIP — e.g. `visualOverview.test.ts` if `samples/4_no_speech.mp4` is absent).

- [ ] **Step 4: Commit**

```bash
git add src/trigger/generateSopPdf.ts
git commit -m "feat(generateSopPdf): branch on inputMode; silent PDF uses visual synth

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Self-review checklist (run after writing this plan)

- ✅ **Spec coverage:**
  - Drop CATEGORIES / Category / DOMAIN_TERMINOLOGY / config.categories / domainTerminology field → Task 1.
  - `ContextOutput.category` → `z.string()` → Task 1.
  - `sopSystem(lang)` and `visualSopSystem(lang)` signature changes + drop "Domain vocabulary" clause + bump visual sentence count → Task 1.
  - New prompts `pdfVisualOverviewSystem` and `pdfVisualStepSystem` → Task 1.
  - `context.ts` updates (return type, prompt placeholder, default) → Task 2.
  - `visualContext.ts` updates → Task 3.
  - `extract.ts` `domainSummary` parameter + drop domainHint → Task 4.
  - `visualExtract.ts` `domainSummary` + paragraph-description prompt → Task 5.
  - `processSop.ts` thread `domainSummary` to both extract calls + drop Category + relax `let category!: Category` → Task 6.
  - `runVisualOverview` + test → Task 7.
  - `runVisualStep` (Buffer[] signature; no-image fallback) + tests (parse, prevTitle, fallback) → Task 8.
  - `generateSopPdf.ts` branch on `inputMode === "silent"` + load images once + fetch source for overview only + dispose in `finally` → Task 9.

- ✅ **Placeholder scan:** no "TBD" / "appropriate" / "similar to". Every code step has full code or full diff.

- ✅ **Type consistency:**
  - `runVisualOverview` argument shape `{ srcPath, durationSec, title, category, domainSummary, stepTitles, language }` consistent across Tasks 7 and 9.
  - `runVisualStep` argument shape `{ step, imageBuffers: Buffer[], prevTitle, category, domainSummary, language }` consistent across Tasks 8 and 9.
  - `runExtract` argument shape `{ segmentsClean, category: string, domainSummary: string, language }` consistent across Tasks 4 and 6.
  - `runVisualExtract` argument shape `{ framePaths, frameTimestamps, durationSec, category: string, domainSummary: string, language }` consistent across Tasks 5 and 6.
  - `Overview` and `StepRewrite` types reused from existing `synthesizeOverview` / `synthesizeStep` modules — no duplicate definitions.
