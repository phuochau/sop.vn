# Silent-video pipeline implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a silent-video branch to the SOP pipeline so videos with no usable speech are processed via visual analysis (Gemini-vision over sampled frames) instead of failing with `silent_audio`.

**Architecture:** After `runTranscribe`, branch on `hasUsableSpeech`. The silent branch samples frames with ffmpeg, sends them as image arrays to Gemini via OpenRouter for context (category) and step extraction, then converges with the speech path at a refactored `runClip` that takes pre-resolved `{ startTime, endTime }` steps.

**Tech Stack:** TypeScript, Next.js (custom build), Trigger.dev, MongoDB, OpenRouter (chat completions w/ image content parts), fluent-ffmpeg, Zod.

**Reference:** `docs/superpowers/specs/2026-04-25-silent-video-design.md` (committed at `e356072`).

---

## File map

**Create:**
- `src/trigger/lib/sampleFrames.ts` — fixed-count + density frame extractors.
- `src/trigger/lib/sampleFrames.test.ts`
- `src/trigger/lib/branchDecision.ts` — pure helper exporting `hasUsableSpeech`.
- `src/trigger/lib/branchDecision.test.ts`
- `src/trigger/stages/visualContext.ts`
- `src/trigger/stages/visualContext.test.ts`
- `src/trigger/stages/visualExtract.ts`
- `src/trigger/stages/visualExtract.test.ts`

**Modify:**
- `src/lib/mongo.ts` — `ErrorCode`, `SopDoc` (add `inputMode`, `defaultLanguage`).
- `src/lib/schemas.ts` — add `VisualSopExtractOutput`.
- `src/lib/fal.ts` — widen `language` return to `string | null`.
- `src/lib/openrouter.ts` — add `llmJsonVision`.
- `src/config/index.ts` — add `config.ai.visionModel`.
- `src/trigger/stages/transcribe.ts` — non-fatal on no-audio / empty segments.
- `src/trigger/stages/clip.ts` — refactor `runClip` signature; drop internal probe + fetch.
- `src/trigger/processSop.ts` — branch logic + error mapping.
- `src/app/api/upload/commit/route.ts` — accept `defaultLanguage`.
- `src/components/UploadZone.tsx` — language selector + send `defaultLanguage` on commit.

---

## Task 1: Type/schema scaffolding

**Files:**
- Modify: `src/lib/mongo.ts:20-24, 50-68`
- Modify: `src/lib/schemas.ts` (append)
- Modify: `src/config/index.ts:18-26`

- [ ] **Step 1: Update `ErrorCode` and `SopDoc`**

In `src/lib/mongo.ts`, replace the `ErrorCode` union and add fields to `SopDoc`:

```ts
export type ErrorCode =
  | null
  | "video_too_short" | "video_too_long" | "unsupported_format"
  | "file_too_large" | "transcription_failed"
  | "generation_failed" | "clipping_failed"
  | "visual_context_failed" | "visual_extract_failed"
  | "frame_sampling_failed" | "video_download_failed"
  | "unknown";
```

Then in `SopDoc`, add:

```ts
  inputMode?: "speech" | "silent";
  defaultLanguage?: string;
```

(Both optional; existing docs lack them.)

- [ ] **Step 2: Add `VisualSopExtractOutput` Zod schema**

In `src/lib/schemas.ts`, append:

```ts
export const VisualSopExtractOutput = z.object({
  title: z.string(),
  steps: z.array(z.object({
    title: z.string(),
    description: z.string(),
    startTime: z.number(),
    endTime: z.number(),
  })).min(1),
});
```

- [ ] **Step 3: Add vision-model config knob and prompts**

In `src/config/index.ts`, inside the `ai` block (after `pdfModel`), add:

```ts
    visionModel: "google/gemini-2.5-flash",
```

Then inside `prompts`, append two new functions:

```ts
      visualContextSystem: (lang: string) =>
        `You classify training videos by looking at sampled frames. Identify the single best-fit category and write a 1-2 sentence summary of what the video teaches.\n\nLANGUAGE: Output the summary in ${lang}. Keep technical / industry / brand terms in their original form.`,
      visualSopSystem: (domainHint: string, lang: string) =>
        `You convert silent how-to videos into structured SOPs. You receive frames sampled from the video plus the second-offset of each frame. Identify the discrete actions being performed. For each action, write a clear instructional step in the output language. Each step has: a short title (≤8 words), a 2-4 sentence description describing what to do, and startTime/endTime in seconds within the video duration. Order steps chronologically and do not overlap them. Return at least one step.\n\nLANGUAGE: Output the title and every step's title and description in ${lang}. Keep technical / industry / brand terms in their original form (do not translate them).${
          domainHint ? `\n\nDomain vocabulary to prefer when relevant: ${domainHint}` : ""
        }\n\nReturn strict JSON only.`,
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS *except* for one known error: `processSop.ts:50` references the removed `"silent_audio"` ErrorCode value. This is intermediate breakage that Task 9 resolves by rewriting `processSop.ts`. Tasks 2–8 may surface a few additional intermediate errors in `processSop.ts` referencing the old shapes; treat any error confined to that single file as expected until Task 9. Stop and investigate if errors appear in *other* files.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mongo.ts src/lib/schemas.ts src/config/index.ts
git commit -m "feat(types): add silent-path schemas and error codes"
```

---

## Task 2: `fal.ts` language widening

**Files:**
- Modify: `src/lib/fal.ts:10-14, 38-43`

- [ ] **Step 1: Widen the return type and drop the `"vi"` fallback for the empty case**

Replace lines 10-14 with:

```ts
export async function transcribeAudio(signedUrl: string): Promise<{
  transcript: string;
  segments: Segment[];
  language: string | null;
}> {
```

And replace lines 39-42 (the `transcript`/`language`/`return`) with:

```ts
  const transcript = segments.map(s => s.text).join(" ");
  const language: string | null = segments.length === 0
    ? null
    : String(data?.language ?? data?.detected_language ?? data?.inferred_language ?? "vi");
  return { transcript, segments, language };
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS *except* for known intermediate errors in `processSop.ts` (the `silent_audio` reference and possibly new `language: string | null` mismatches at calls into `runNormalize`/`runContext`/`runExtract`). Both are resolved by Task 9. Errors outside `processSop.ts` are unexpected — stop and investigate.

- [ ] **Step 3: Commit**

```bash
git add src/lib/fal.ts
git commit -m "refactor(fal): widen transcribeAudio language to string | null"
```

---

## Task 3: `transcribe.ts` non-fatal empty result

**Files:**
- Modify: `src/trigger/stages/transcribe.ts:8-41`

- [ ] **Step 1: Return empty result on no-audio**

Replace `if (!hasAudio) throw new Error("NO_AUDIO_STREAM");` (line 22) with:

```ts
    if (!hasAudio) return { transcript: "", segments: [], language: null };
```

- [ ] **Step 2: Type-check and run existing tests**

Run: `npx tsc --noEmit`
Expected: Passes.

(`transcribe.ts` has no dedicated unit test today; skipping a stage-level test here. The branch decision is covered in Task 6.)

- [ ] **Step 3: Commit**

```bash
git add src/trigger/stages/transcribe.ts
git commit -m "refactor(transcribe): return empty result instead of throwing on no audio"
```

---

## Task 4: `sampleFrames` library

**Files:**
- Create: `src/trigger/lib/sampleFrames.ts`
- Create: `src/trigger/lib/sampleFrames.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `src/trigger/lib/sampleFrames.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import path from "node:path";
import fs from "node:fs";
import { sampleFrames, computeFrameCount } from "./sampleFrames";

test("computeFrameCount fixed mode", () => {
  assert.equal(computeFrameCount({ durationSec: 30, mode: "fixed" }), 8);
  assert.equal(computeFrameCount({ durationSec: 5, mode: "fixed" }), 5);
  assert.equal(computeFrameCount({ durationSec: 3, mode: "fixed" }), 3);
  assert.equal(computeFrameCount({ durationSec: 2, mode: "fixed" }), 2);
});

test("computeFrameCount density mode (targetFps 0.5, max 60)", () => {
  assert.equal(computeFrameCount({ durationSec: 5, mode: "density" }), 3);
  assert.equal(computeFrameCount({ durationSec: 30, mode: "density" }), 15);
  assert.equal(computeFrameCount({ durationSec: 200, mode: "density" }), 60);
  assert.equal(computeFrameCount({ durationSec: 1, mode: "density" }), 2);
});

test("sampleFrames extracts frames against a sample fixture", async (t) => {
  const fixture = path.resolve("samples/sample.mp4");
  if (!fs.existsSync(fixture)) {
    t.skip("samples/sample.mp4 missing");
    return;
  }
  const result = await sampleFrames(fixture, 10, { mode: "fixed" });
  try {
    assert.ok(result.paths.length >= 2 && result.paths.length <= 8);
    assert.equal(result.paths.length, result.timestamps.length);
    for (let i = 1; i < result.timestamps.length; i++) {
      assert.ok(result.timestamps[i] > result.timestamps[i - 1]);
      assert.ok(result.timestamps[i] >= 0 && result.timestamps[i] <= 10);
    }
    for (const p of result.paths) {
      const stat = await fs.promises.stat(p);
      assert.ok(stat.size > 0);
    }
  } finally {
    await result.dispose();
  }
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npx tsx --test src/trigger/lib/sampleFrames.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `sampleFrames.ts`**

Create `src/trigger/lib/sampleFrames.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import ffmpeg from "fluent-ffmpeg";

export type SampleMode = "fixed" | "density";

const DENSITY_TARGET_FPS = 0.5;
const DENSITY_MAX = 60;
const FIXED_MIN = 2;
const FIXED_MAX = 8;

function clamp(min: number, max: number, n: number) {
  return Math.max(min, Math.min(max, n));
}

export function computeFrameCount(opts: { durationSec: number; mode: SampleMode }): number {
  if (opts.mode === "fixed") {
    return clamp(FIXED_MIN, FIXED_MAX, Math.floor(opts.durationSec));
  }
  return clamp(FIXED_MIN, DENSITY_MAX, Math.ceil(opts.durationSec * DENSITY_TARGET_FPS));
}

function evenlySpacedTimestamps(durationSec: number, count: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    out.push(((i + 1) * durationSec) / (count + 1));
  }
  return out;
}

function grabAt(srcPath: string, outPath: string, atSec: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(srcPath)
      .seekInput(atSec)
      .frames(1)
      .outputOptions(["-vf scale=768:-2", "-qscale:v 5"])
      .on("end", () => resolve())
      .on("error", reject)
      .save(outPath);
  });
}

export async function sampleFrames(
  srcPath: string,
  durationSec: number,
  opts: { mode: SampleMode }
): Promise<{
  paths: string[];
  timestamps: number[];
  tmpDir: string;
  dispose: () => Promise<void>;
}> {
  const count = computeFrameCount({ durationSec, mode: opts.mode });
  const timestamps = evenlySpacedTimestamps(durationSec, count);
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sop-frames-"));
  const paths: string[] = [];
  try {
    for (let i = 0; i < timestamps.length; i++) {
      const out = path.join(tmpDir, `frame-${i}.jpg`);
      await grabAt(srcPath, out, timestamps[i]);
      paths.push(out);
    }
    return {
      paths,
      timestamps,
      tmpDir,
      dispose: () => fs.promises.rm(tmpDir, { recursive: true, force: true }),
    };
  } catch (e) {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
    throw e;
  }
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx tsx --test src/trigger/lib/sampleFrames.test.ts`
Expected: PASS (or the fixture test skips if `samples/sample.mp4` is absent; the two pure-math tests must pass).

- [ ] **Step 5: Commit**

```bash
git add src/trigger/lib/sampleFrames.ts src/trigger/lib/sampleFrames.test.ts
git commit -m "feat(sampleFrames): ffmpeg-based fixed/density frame extractor"
```

---

## Task 5: `llmJsonVision` helper

**Files:**
- Modify: `src/lib/openrouter.ts` (append)

- [ ] **Step 1: Add the import**

At the top of `src/lib/openrouter.ts` (next to the existing `import { z, ... }` line), add:

```ts
import fs from "node:fs";
```

- [ ] **Step 2: Append the helper**

At the end of `src/lib/openrouter.ts`, append:

```ts
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
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: Passes (modulo the known intermediate error in `processSop.ts:50` referencing `silent_audio` — see Task 1 notes; resolved by Task 9).

(No dedicated unit test for `llmJsonVision`; it is exercised by `visualContext.test.ts` and `visualExtract.test.ts` via mocking `fetch`.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/openrouter.ts
git commit -m "feat(openrouter): add llmJsonVision for image-array calls"
```

---

## Task 6: `runVisualContext` stage

**Files:**
- Create: `src/trigger/stages/visualContext.ts`
- Create: `src/trigger/stages/visualContext.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/trigger/stages/visualContext.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

test("runVisualContext returns parsed category + summary", async () => {
  // Stub two tiny JPEGs on disk so llmJsonVision's readFile succeeds.
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "vc-"));
  const f1 = path.join(tmp, "a.jpg");
  const f2 = path.join(tmp, "b.jpg");
  await fs.promises.writeFile(f1, Buffer.from([0xff, 0xd8, 0xff]));
  await fs.promises.writeFile(f2, Buffer.from([0xff, 0xd8, 0xff]));

  const originalFetch = global.fetch;
  global.fetch = (async () => ({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify({ category: "Coffee & Drinks", domainSummary: "Pha cà phê espresso." }) } }],
    }),
    text: async () => "",
  })) as unknown as typeof fetch;

  try {
    const { runVisualContext } = await import("./visualContext");
    const out = await runVisualContext({ framePaths: [f1, f2], language: "vi" });
    assert.equal(out.category, "Coffee & Drinks");
    assert.ok(out.domainSummary.length > 0);
  } finally {
    global.fetch = originalFetch;
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the test, verify it fails**

Run: `npx tsx --test src/trigger/stages/visualContext.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `visualContext.ts`**

Note: unlike `runContext` (speech path), this stage does **not** swallow errors — failures propagate so `processSop.ts` can map them to `visual_context_failed` per the spec.

Create `src/trigger/stages/visualContext.ts`:

```ts
import { llmJsonVision } from "@/lib/openrouter";
import { ContextOutput } from "@/lib/schemas";
import { config, type Category } from "@/config";

export async function runVisualContext(args: {
  framePaths: string[];
  language: string;
}): Promise<{ category: Category; domainSummary: string }> {
  return llmJsonVision({
    model: config.ai.visionModel,
    system: config.ai.prompts.visualContextSystem(args.language),
    userText:
      `These ${args.framePaths.length} frames are sampled evenly across a how-to video. ` +
      `Return { "category": <one of the enum values>, "domainSummary": string }.`,
    imagePaths: args.framePaths,
    schema: ContextOutput,
    schemaName: "context",
    maxRetries: config.ai.maxRetries,
  });
}
```

- [ ] **Step 4: Run the test, verify it passes**

Run: `npx tsx --test src/trigger/stages/visualContext.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/trigger/stages/visualContext.ts src/trigger/stages/visualContext.test.ts
git commit -m "feat(stages): runVisualContext for silent-path category detection"
```

---

## Task 7: `runVisualExtract` stage

**Files:**
- Create: `src/trigger/stages/visualExtract.ts`
- Create: `src/trigger/stages/visualExtract.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/trigger/stages/visualExtract.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

async function withStubbedFetch(payload: unknown, fn: () => Promise<void>) {
  const original = global.fetch;
  global.fetch = (async () => ({
    ok: true,
    json: async () => ({ choices: [{ message: { content: JSON.stringify(payload) } }] }),
    text: async () => "",
  })) as unknown as typeof fetch;
  try { await fn(); } finally { global.fetch = original; }
}

async function tmpJpegs(n: number): Promise<{ paths: string[]; cleanup: () => Promise<void> }> {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "ve-"));
  const paths: string[] = [];
  for (let i = 0; i < n; i++) {
    const p = path.join(dir, `f-${i}.jpg`);
    await fs.promises.writeFile(p, Buffer.from([0xff, 0xd8, 0xff]));
    paths.push(p);
  }
  return { paths, cleanup: () => fs.promises.rm(dir, { recursive: true, force: true }) };
}

test("runVisualExtract parses valid response", async () => {
  const { paths, cleanup } = await tmpJpegs(3);
  await withStubbedFetch(
    { title: "Pha espresso", steps: [{ title: "Xay", description: "Xay hạt mịn.", startTime: 0, endTime: 5 }] },
    async () => {
      const { runVisualExtract } = await import("./visualExtract");
      const out = await runVisualExtract({
        framePaths: paths,
        frameTimestamps: [1, 3, 5],
        durationSec: 6,
        category: "Coffee & Drinks",
        language: "vi",
      });
      assert.equal(out.title, "Pha espresso");
      assert.equal(out.steps.length, 1);
      assert.equal(out.steps[0].startTime, 0);
    }
  );
  await cleanup();
});

test("runVisualExtract rejects when endTime exceeds duration", async () => {
  const { paths, cleanup } = await tmpJpegs(2);
  await withStubbedFetch(
    { title: "x", steps: [{ title: "s", description: "d", startTime: 0, endTime: 999 }] },
    async () => {
      const { runVisualExtract } = await import("./visualExtract");
      await assert.rejects(() => runVisualExtract({
        framePaths: paths, frameTimestamps: [1, 2], durationSec: 5,
        category: "Other", language: "vi",
      }));
    }
  );
  await cleanup();
});

test("runVisualExtract rejects unsorted steps", async () => {
  const { paths, cleanup } = await tmpJpegs(2);
  await withStubbedFetch(
    {
      title: "x",
      steps: [
        { title: "a", description: "", startTime: 5, endTime: 10 },
        { title: "b", description: "", startTime: 1, endTime: 4 },
      ],
    },
    async () => {
      const { runVisualExtract } = await import("./visualExtract");
      await assert.rejects(() => runVisualExtract({
        framePaths: paths, frameTimestamps: [1, 2], durationSec: 15,
        category: "Other", language: "vi",
      }));
    }
  );
  await cleanup();
});
```

- [ ] **Step 2: Run the tests, verify they fail**

Run: `npx tsx --test src/trigger/stages/visualExtract.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `visualExtract.ts`**

Create `src/trigger/stages/visualExtract.ts`:

```ts
import { llmJsonVision } from "@/lib/openrouter";
import { VisualSopExtractOutput } from "@/lib/schemas";
import { config, type Category } from "@/config";

export async function runVisualExtract(args: {
  framePaths: string[];
  frameTimestamps: number[];
  durationSec: number;
  category: Category;
  language: string;
}): Promise<{ title: string; steps: { title: string; description: string; startTime: number; endTime: number }[] }> {
  const domainHint = config.ai.domainTerminology[args.category] ?? "";
  const frameLines = args.frameTimestamps
    .map((t, i) => `Frame ${i + 1}: ${t.toFixed(2)}s`)
    .join("\n");

  const out = await llmJsonVision({
    model: config.ai.visionModel,
    system: config.ai.prompts.visualSopSystem(domainHint, args.language),
    userText:
      `Video duration: ${args.durationSec.toFixed(2)} seconds.\n` +
      `Category: ${args.category}.\n` +
      `Frame timestamps (frames are attached in this order):\n${frameLines}\n\n` +
      `Return { "title": string, "steps": [{ "title", "description", "startTime", "endTime" }] }. ` +
      `Steps must be ordered chronologically, non-overlapping, with timestamps within [0, ${args.durationSec.toFixed(2)}]. ` +
      `Return at least one step.`,
    imagePaths: args.framePaths,
    schema: VisualSopExtractOutput,
    schemaName: "visual_sop_extract",
    maxRetries: config.ai.maxRetries,
  });

  // Post-validate: ordering + range. Throw on violation so callers map to visual_extract_failed.
  let prevEnd = 0;
  for (const s of out.steps) {
    if (s.startTime < prevEnd) throw new Error("steps not chronologically ordered");
    if (s.endTime <= s.startTime) throw new Error("step endTime <= startTime");
    if (s.endTime > args.durationSec) throw new Error("step endTime exceeds video duration");
    prevEnd = s.endTime;
  }
  return out;
}
```

- [ ] **Step 4: Run the tests, verify they pass**

Run: `npx tsx --test src/trigger/stages/visualExtract.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/trigger/stages/visualExtract.ts src/trigger/stages/visualExtract.test.ts
git commit -m "feat(stages): runVisualExtract for silent-path step extraction"
```

---

## Task 8: Refactor `runClip`

**Files:**
- Modify: `src/trigger/stages/clip.ts`
- Modify: `src/trigger/stages/clip.test.ts` (no signature change for `resolveTimes`, just confirm existing test still passes)

- [ ] **Step 1: Replace the imports block at the top of `src/trigger/stages/clip.ts`** with the trimmed set (drops `fetchSourceVideo`, keeps everything else):

```ts
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import ffmpeg from "fluent-ffmpeg";
import { logger } from "@trigger.dev/sdk/v3";
import { putObject } from "@/lib/r2";
import { clipKey, posterKey } from "@/lib/utils";
import type { Segment, Step } from "@/lib/mongo";
import { grabFrame } from "@/trigger/lib/videoTmp";
```

- [ ] **Step 2: Replace `runClip` to take pre-resolved steps and an externally-owned srcPath**

In `src/trigger/stages/clip.ts`, replace the `ffprobeDuration` helper and the `runClip` function (lines 34-101) with:

```ts
function cutClip(input: string, out: string, start: number, end: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .setStartTime(start)
      .duration(end - start)
      .outputOptions(["-c copy", "-movflags +faststart"])
      .on("end", () => resolve())
      .on("error", reject)
      .save(out);
  });
}

export async function runClip(args: {
  sopId: string;
  srcPath: string;
  resolvedSteps: { title: string; description: string; startTime: number; endTime: number }[];
}): Promise<{ steps: Step[] }> {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sop-"));
  try {
    const steps: Step[] = [];
    for (let i = 0; i < args.resolvedSteps.length; i++) {
      const r = args.resolvedSteps[i];
      const clipPath = path.join(tmp, `step-${i}.mp4`);
      const posterPath = path.join(tmp, `step-${i}.jpg`);
      try {
        await cutClip(args.srcPath, clipPath, r.startTime, r.endTime);
        await grabFrame(args.srcPath, posterPath, r.startTime + (r.endTime - r.startTime) / 2);
      } catch (e) {
        logger.warn("ffmpeg failed for step, skipping", { i, e: String(e) });
        continue;
      }
      const clipBuf = await fs.promises.readFile(clipPath);
      const posterBuf = await fs.promises.readFile(posterPath);
      const ck = clipKey(args.sopId, i);
      const pk = posterKey(args.sopId, i);
      await putObject(ck, clipBuf, "video/mp4");
      await putObject(pk, posterBuf, "image/jpeg");
      steps.push({
        title: r.title, description: r.description,
        startTime: r.startTime, endTime: r.endTime,
        clipR2Key: ck, posterR2Key: pk,
        keyframeR2Keys: [],
      });
    }
    if (steps.length === 0) throw new Error("no clips produced");
    return { steps };
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
}
```

- [ ] **Step 3: Run existing `clip.test.ts`**

Run: `npx tsx --test src/trigger/stages/clip.test.ts`
Expected: PASS — `resolveTimes` is unchanged.

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: One expected error in `processSop.ts` (it still calls `runClip` with old args). Task 9 fixes it.

- [ ] **Step 5: Commit**

```bash
git add src/trigger/stages/clip.ts
git commit -m "refactor(clip): runClip takes pre-resolved steps and external srcPath"
```

---

## Task 9a: `branchDecision` helper

**Files:**
- Create: `src/trigger/lib/branchDecision.ts`
- Create: `src/trigger/lib/branchDecision.test.ts`

Extracted into its own file (instead of importing from `processSop.ts`) so the test does not pull in Trigger.dev / Mongo / fal at import time.

- [ ] **Step 1: Write the failing test**

Create `src/trigger/lib/branchDecision.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { hasUsableSpeech } from "./branchDecision";

test("hasUsableSpeech: empty", () => {
  assert.equal(hasUsableSpeech({ segments: [], transcript: "" }), false);
});
test("hasUsableSpeech: empty segments but long transcript → false", () => {
  const t = "word ".repeat(50);
  assert.equal(hasUsableSpeech({ segments: [], transcript: t }), false);
});
test("hasUsableSpeech: 5-word transcript with segments → false", () => {
  assert.equal(
    hasUsableSpeech({ segments: [{ id: 0, start: 0, end: 1, text: "x" }], transcript: "one two three four five" }),
    false
  );
});
test("hasUsableSpeech: 50-word transcript with segments → true", () => {
  const t = "word ".repeat(50);
  assert.equal(
    hasUsableSpeech({ segments: [{ id: 0, start: 0, end: 1, text: "x" }], transcript: t }),
    true
  );
});
```

- [ ] **Step 2: Run, verify it fails**

Run: `npx tsx --test src/trigger/lib/branchDecision.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

Create `src/trigger/lib/branchDecision.ts`:

```ts
import type { Segment } from "@/lib/mongo";

export function hasUsableSpeech(args: { segments: Segment[]; transcript: string }): boolean {
  const wordCount = args.transcript.trim().split(/\s+/).filter(Boolean).length;
  return args.segments.length > 0 && wordCount >= 30;
}
```

- [ ] **Step 4: Run, verify pass**

Run: `npx tsx --test src/trigger/lib/branchDecision.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/trigger/lib/branchDecision.ts src/trigger/lib/branchDecision.test.ts
git commit -m "feat(branchDecision): hasUsableSpeech helper"
```

---

## Task 9: `processSop` branch logic

**Files:**
- Modify: `src/trigger/processSop.ts` (full rewrite of the `try` body)

- [ ] **Step 1: Rewrite `processSop.ts`**

Replace the entire file `src/trigger/processSop.ts` with:

```ts
import { task, logger } from "@trigger.dev/sdk/v3";
import { ObjectId } from "mongodb";
import { sops, events, type ErrorCode, type SopStatus } from "@/lib/mongo";
import { config, type Category } from "@/config";
import { probeDuration } from "./lib/probe";
import { presignGet } from "@/lib/r2";
import { fetchSourceVideo } from "./lib/videoTmp";
import { hasUsableSpeech } from "./lib/branchDecision";
import { runTranscribe } from "./stages/transcribe";
import { runNormalize } from "./stages/normalize";
import { runContext } from "./stages/context";
import { runExtract } from "./stages/extract";
import { resolveTimes, runClip } from "./stages/clip";
import { runKeyframes } from "./stages/keyframes";
import { sampleFrames } from "./lib/sampleFrames";
import { runVisualContext } from "./stages/visualContext";
import { runVisualExtract } from "./stages/visualExtract";

async function setStatus(id: ObjectId, status: SopStatus, extra: Record<string, unknown> = {}) {
  await (await sops()).updateOne({ _id: id }, { $set: { status, updatedAt: new Date(), ...extra } });
}
async function fail(id: ObjectId, errorCode: ErrorCode) {
  await (await sops()).updateOne({ _id: id }, { $set: { status: "failed", errorCode, updatedAt: new Date() } });
}

export const processSop = task({
  id: "process-sop",
  maxDuration: 60 * 15,
  run: async (payload: { sopId: string }) => {
    const _id = new ObjectId(payload.sopId);
    const doc = await (await sops()).findOne({ _id });
    if (!doc || !doc.videoR2Key) { logger.error("sop not found"); return; }

    const signedVideo = await presignGet(doc.videoR2Key, 3600);
    const defaultLanguage = doc.defaultLanguage ?? "vi";

    try {
      // Pre-stage: validate duration. Capture for downstream reuse.
      let durationSec: number;
      try {
        durationSec = await probeDuration(signedVideo);
        if (durationSec < config.limits.minVideoDurationSec) return fail(_id, "video_too_short");
        if (durationSec > config.limits.maxVideoDurationSec) return fail(_id, "video_too_long");
      } catch (e) {
        logger.error("probe failed", { e: String(e) });
        return fail(_id, "unknown");
      }

      // Stage 1: transcribe (non-fatal on no-audio / empty result)
      await setStatus(_id, "transcribing");
      let stage1;
      try {
        stage1 = await runTranscribe(signedVideo);
      } catch (e) {
        logger.error("transcribe failed", { e: String(e) });
        return fail(_id, "transcription_failed");
      }
      const { transcript, segments, language } = stage1;

      // Branch
      const useSpeech = hasUsableSpeech({ segments, transcript });
      const inputMode: "speech" | "silent" = useSpeech ? "speech" : "silent";
      logger.info("branch chosen", { inputMode });

      if (useSpeech) {
        // Invariant: hasUsableSpeech requires segments.length > 0, and fal.ts only returns
        // language: null when segments.length === 0. So language is non-null here.
        await (await sops()).updateOne(
          { _id },
          { $set: { transcript, segments, language, inputMode, updatedAt: new Date() } }
        );

        // Stage 2: normalize
        await setStatus(_id, "normalizing");
        const segmentsClean = await runNormalize(segments, language!);
        await (await sops()).updateOne({ _id }, { $set: { segmentsClean, updatedAt: new Date() } });

        // Stage 3: context
        await setStatus(_id, "analyzing");
        const { category, domainSummary } = await runContext({
          cleanTranscript: segmentsClean.map(s => s.text).join(" "),
          language: language!,
        });
        await (await sops()).updateOne(
          { _id },
          { $set: { category, domainSummary, updatedAt: new Date() } }
        );

        // Stage 4: extract
        await setStatus(_id, "generating");
        let extracted;
        try {
          extracted = await runExtract({ segmentsClean, category, language: language! });
        } catch (e) {
          logger.error("extract failed", { e: String(e) });
          return fail(_id, "generation_failed");
        }

        // Stage 5: clip + keyframes (caller owns srcPath)
        await setStatus(_id, "clipping", { title: extracted.title });
        let src;
        try { src = await fetchSourceVideo(doc.videoR2Key); }
        catch (e) { logger.error("source download failed", { e: String(e) }); return fail(_id, "video_download_failed"); }
        try {
          const resolved = resolveTimes(segments, extracted.steps, durationSec);
          let stepsOut;
          try {
            stepsOut = (await runClip({ sopId: _id.toHexString(), srcPath: src.srcPath, resolvedSteps: resolved })).steps;
          } catch (e) {
            logger.error("clip failed", { e: String(e) });
            return fail(_id, "clipping_failed");
          }
          try {
            stepsOut = await runKeyframes({ sopId: _id.toHexString(), srcPath: src.srcPath, steps: stepsOut });
          } catch (e) {
            logger.warn("keyframes failed; PDF export will fall back to posters", { e: String(e) });
            stepsOut = stepsOut.map(s => ({ ...s, keyframeR2Keys: [] }));
          }
          await (await sops()).updateOne(
            { _id },
            { $set: { steps: stepsOut, status: "done" as SopStatus, updatedAt: new Date() } }
          );
        } finally { await src.dispose(); }

        await (await events()).insertOne({
          _id: new ObjectId(), type: "sop_completed", sopId: _id, createdAt: new Date(),
        });
        return;
      }

      // ── Silent path ─────────────────────────────────────────────────────
      const tag = { inputMode };  // attached to every silent-branch log entry
      await (await sops()).updateOne(
        { _id },
        { $set: { transcript: "", segments: [], language: defaultLanguage, inputMode, updatedAt: new Date() } }
      );

      let src;
      try { src = await fetchSourceVideo(doc.videoR2Key); }
      catch (e) { logger.error("source download failed", { ...tag, e: String(e) }); return fail(_id, "video_download_failed"); }

      let ctxFrames: Awaited<ReturnType<typeof sampleFrames>> | null = null;
      let extFrames: Awaited<ReturnType<typeof sampleFrames>> | null = null;
      try {
        // Stage 3 (silent): visual context
        await setStatus(_id, "analyzing");
        try { ctxFrames = await sampleFrames(src.srcPath, durationSec, { mode: "fixed" }); }
        catch (e) { logger.error("frame sampling (context) failed", { ...tag, e: String(e) }); return fail(_id, "frame_sampling_failed"); }

        let category!: Category;
        let domainSummary!: string;
        try {
          const ctx = await runVisualContext({ framePaths: ctxFrames.paths, language: defaultLanguage });
          category = ctx.category;
          domainSummary = ctx.domainSummary;
        } catch (e) {
          logger.error("visual context failed", { ...tag, e: String(e) });
          return fail(_id, "visual_context_failed");
        }
        await (await sops()).updateOne(
          { _id },
          { $set: { category, domainSummary, updatedAt: new Date() } }
        );

        // Stage 4 (silent): visual extract
        await setStatus(_id, "generating");
        try { extFrames = await sampleFrames(src.srcPath, durationSec, { mode: "density" }); }
        catch (e) { logger.error("frame sampling (extract) failed", { ...tag, e: String(e) }); return fail(_id, "frame_sampling_failed"); }

        let extracted!: Awaited<ReturnType<typeof runVisualExtract>>;
        try {
          extracted = await runVisualExtract({
            framePaths: extFrames.paths,
            frameTimestamps: extFrames.timestamps,
            durationSec,
            category,
            language: defaultLanguage,
          });
        } catch (e) {
          logger.error("visual extract failed", { ...tag, e: String(e) });
          return fail(_id, "visual_extract_failed");
        }

        // Stage 5: clip + keyframes
        await setStatus(_id, "clipping", { title: extracted.title });
        let stepsOut!: Awaited<ReturnType<typeof runKeyframes>>;
        try {
          stepsOut = (await runClip({
            sopId: _id.toHexString(),
            srcPath: src.srcPath,
            resolvedSteps: extracted.steps,
          })).steps;
        } catch (e) {
          logger.error("clip failed", { ...tag, e: String(e) });
          return fail(_id, "clipping_failed");
        }
        try {
          stepsOut = await runKeyframes({ sopId: _id.toHexString(), srcPath: src.srcPath, steps: stepsOut });
        } catch (e) {
          logger.warn("keyframes failed; PDF export will fall back to posters", { ...tag, e: String(e) });
          stepsOut = stepsOut.map(s => ({ ...s, keyframeR2Keys: [] }));
        }
        await (await sops()).updateOne(
          { _id },
          { $set: { steps: stepsOut, status: "done" as SopStatus, updatedAt: new Date() } }
        );
        await (await events()).insertOne({
          _id: new ObjectId(), type: "sop_completed", sopId: _id, createdAt: new Date(),
        });
      } finally {
        if (ctxFrames) await ctxFrames.dispose();
        if (extFrames) await extFrames.dispose();
        await src.dispose();
      }
    } catch (e) {
      logger.error("processSop unhandled", { e: String(e) });
      await fail(_id, "unknown");
    }
  },
});
```

- [ ] **Step 2: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: PASS for all files (intermediate breakage from Tasks 1–8 is now resolved).

- [ ] **Step 3: Run all stage and lib tests** *(explicit list — globs vary by shell)*

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
Expected: PASS for all.

- [ ] **Step 4: Commit**

```bash
git add src/trigger/processSop.ts
git commit -m "feat(processSop): branch on hasUsableSpeech; silent path via visual stages"
```

---

## Task 10: Upload UI + commit-route language

**Files:**
- Modify: `src/components/UploadZone.tsx:14, 50-54, 151-155`
- Modify: `src/app/api/upload/commit/route.ts`

- [ ] **Step 1: Add language state + selector to `UploadZone`**

In `src/components/UploadZone.tsx`:

After line 14 (`const [isPublic, setIsPublic] = useState(false);`), add:

```tsx
  const [language, setLanguage] = useState<"vi" | "en">("vi");
```

Replace the existing language pill (lines 152-155):

```tsx
            <div className="inline-flex items-center gap-2.5 rounded-xl border border-gray-200 bg-[#FAFAFA] px-3.5 py-2.5">
              <Globe className="w-4 h-4 text-[#0A0A0A]" strokeWidth={2} />
              <span className="text-sm font-medium text-[#0A0A0A]">Tiếng Việt</span>
            </div>
```

with:

```tsx
            <div className="flex flex-col items-start gap-1">
              <div className="inline-flex items-center gap-2.5 rounded-xl border border-gray-200 bg-[#FAFAFA] px-3.5 py-2.5">
                <Globe className="w-4 h-4 text-[#0A0A0A]" strokeWidth={2} />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as "vi" | "en")}
                  className="bg-transparent text-sm font-medium text-[#0A0A0A] outline-none"
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </div>
              <span className="text-[11px] text-[#9CA3AF] pl-1">
                Chỉ dùng khi video không có người nói.
              </span>
            </div>
```

Replace the commit-fetch body (line 53):

```tsx
        body: JSON.stringify({ sopId: init.sopId, defaultLanguage: language }),
```

- [ ] **Step 2: Update commit route to accept and persist `defaultLanguage`**

Apply two targeted edits to `src/app/api/upload/commit/route.ts` (preserving everything else exactly as-is):

Edit A — replace the `Body` schema:

```ts
const Body = z.object({ sopId: z.string().length(24) });
```

with:

```ts
const Body = z.object({
  sopId: z.string().length(24),
  defaultLanguage: z.enum(["vi", "en"]).default("vi"),
});
```

Edit B — extend the `$set` payload in `updateOne`:

```ts
    { $set: { status: "transcribing", updatedAt: new Date() } }
```

with:

```ts
    { $set: { status: "transcribing", defaultLanguage: parsed.data.defaultLanguage, updatedAt: new Date() } }
```

- [ ] **Step 3: Type-check + lint**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Manual smoke test** *(if a dev environment is available)*

Run: `npm run dev`
- Open `/upload`, confirm the language selector renders with "Tiếng Việt" / "English" and helper text.
- Upload a tiny silent video (e.g., a screen recording with no audio); confirm `processing/[id]` page shows status progression and (eventually) a finished SOP. If no silent fixture is available locally, skip this step and rely on stage tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/UploadZone.tsx src/app/api/upload/commit/route.ts
git commit -m "feat(upload): language selector wired to defaultLanguage on commit"
```

---

## Task 11: Audit `language` consumers

**Files:**
- Read-only: `src/trigger/stages/synthesizeOverview.ts`, `src/trigger/stages/synthesizeStep.ts`, `src/trigger/stages/renderPdf.tsx`

- [ ] **Step 1: Confirm `language` is used as an opaque string**

For each file above, grep for `language` and confirm it is only forwarded into a prompt string (e.g., `prompts.pdfStepSystem(language)`) or rendered, never compared against specific values.

Run: `grep -n "language" src/trigger/stages/synthesizeOverview.ts src/trigger/stages/synthesizeStep.ts src/trigger/stages/renderPdf.tsx`
Expected: All matches are pass-through usages. If any compares `language === "vi"` or similar, normalize the silent-path value to the same set already used (`"vi"` and `"en"` are both already present via `defaultLanguage` enum).

- [ ] **Step 2: No code change required if audit passes**

If the audit surfaces an issue, add a fix as a follow-up commit; otherwise close this task with no diff.

- [ ] **Step 3: (If a fix was needed) Commit**

```bash
git add <files>
git commit -m "fix(language): treat language as opaque tag across consumers"
```

---

## Self-review checklist (run after writing this plan)

- ✅ **Spec coverage:**
  - Branch decision (`hasUsableSpeech`) → Tasks 9a + 9.
  - Multimodal calling strategy → Task 5 (`llmJsonVision`).
  - `sampleFrames` two modes → Task 4.
  - `runVisualContext` / `runVisualExtract` → Tasks 6, 7.
  - `transcribe.ts` non-fatal → Task 3.
  - `fal.ts` widening → Task 2.
  - `runClip` refactor → Task 8.
  - `processSop.ts` branch + error mapping → Task 9.
  - Schema/`ErrorCode` updates → Task 1.
  - Config knob → Task 1.
  - Upload UI/API → Task 10.
  - Language consumer audit → Task 11.
  - Tests (sampleFrames, branchDecision, visualContext, visualExtract) → Tasks 4, 9a, 6, 7.
  - Silent-branch logs tagged with `inputMode` (per spec) → Task 9.
  - Visual stages bubble errors (per spec) → Task 6 (no internal swallow).
- ✅ **Placeholder scan:** No "TBD"/"appropriate"/"similar to". Every code step has full code.
- ✅ **Type consistency:** `runClip` shape `{ sopId, srcPath, resolvedSteps } → { steps: Step[] }` consistent across Tasks 8 and 9. `sampleFrames` return shape `{ paths, timestamps, tmpDir, dispose }` consistent in Tasks 4 and 9. `hasUsableSpeech` exported from `processSop.ts` and consumed in Task 9 test — consistent.
