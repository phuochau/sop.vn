# Export SOP as PDF — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Xuất PDF" button on `/sop/[id]` that generates a print-optimized PDF document from an existing SOP, using LLM-rewritten prose and 3 keyframes per step, delivered via a Trigger.dev background job.

**Architecture:** New Trigger.dev task `generateSopPdf` orchestrates: LLM Overview synthesis + per-step LLM rewrites (parallel) → React-PDF render → R2 upload → Mongo update. UI polls a status endpoint and downloads when ready. Keyframe extraction is moved upstream into `processSop` so the PDF task is video-free.

**Tech Stack:** Next.js 16 App Router, React 19, Trigger.dev v3, MongoDB, Cloudflare R2 (S3 SDK), `@react-pdf/renderer` (new), `fluent-ffmpeg`, `zod`, OpenRouter.

**Spec:** `docs/superpowers/specs/2026-04-25-export-pdf-design.md`

**Refinements made in this plan (within spec scope):**
- Spec assumed transcript persistence might be missing — confirmed `transcript` and `segments` already persist on `SopDoc`. No backfill needed.
- UI polls `/api/sop/[id]/pdf` every 2s instead of using `useRealtimeRun` — matches existing `processing/[id]/page.tsx` pattern, avoids new dep.
- PDF served via API redirect route (like `/api/clips/...`), so cached URLs in Mongo are stable API paths, not presigned R2 URLs.
- Step gains `keyframeR2Keys: string[]` (R2 keys, not URLs) to match existing `clipR2Key` / `posterR2Key` naming.

---

## File Structure

**New files:**
- `src/trigger/generateSopPdf.ts` — Trigger.dev task entry point, orchestrates the pipeline
- `src/trigger/stages/keyframes.ts` — extracts 3 keyframes per step using ffmpeg, uploads to R2 (called from `processSop`)
- `src/trigger/stages/synthesizeOverview.ts` — LLM call A
- `src/trigger/stages/synthesizeStep.ts` — LLM call B (per-step rewrite, with transcript slicing helper)
- `src/trigger/stages/synthesizeStep.test.ts` — unit tests for transcript slicing helper
- `src/trigger/stages/renderPdf.tsx` — React-PDF document component + `renderToBuffer` wrapper
- `src/trigger/stages/renderPdf.test.ts` — smoke test producing a buffer
- `src/app/api/sop/[id]/pdf/route.ts` — POST (kick off / cache hit) + GET (status)
- `src/app/api/sop/[id]/pdf/file/route.ts` — GET 302 redirect to fresh presigned R2 URL
- `src/components/ExportPdfButton.tsx` — client component with idle/generating/ready/error states
- `public/fonts/BeVietnamPro-Regular.ttf` — font asset
- `public/fonts/BeVietnamPro-Bold.ttf` — font asset

**Modified files:**
- `src/lib/mongo.ts` — extend `SopDoc` with `pdf` subdoc; extend `Step` with `keyframeR2Keys`
- `src/lib/schemas.ts` — add `OverviewOutput` and `StepRewriteOutput`
- `src/lib/utils.ts` — add `pdfKey(sopId, ts)` and `keyframeKey(sopId, stepIndex, frameIndex)`
- `src/lib/openrouter.ts` — extend `zodToJsonSchemaLike` to support `ZodOptional` (callouts may need optional fields)
- `src/config/index.ts` — add `pdfModel` + prompts for Overview and Step rewrites
- `src/trigger/processSop.ts` — call `runKeyframes` after `runClip`, persist `keyframeR2Keys` per step
- `src/trigger/cleanupVideos.ts` — also reset stale `pdf` subdocs on swept SOPs
- `src/app/api/sop/[id]/route.ts` — include `pdf` field in response
- `src/app/sop/[id]/page.tsx` — mount `<ExportPdfButton />` next to the existing share buttons

---

## Task 1: Add Mongo schema, util keys, and Zod output schemas

**Files:**
- Modify: `src/lib/mongo.ts`
- Modify: `src/lib/utils.ts`
- Modify: `src/lib/schemas.ts`
- Modify: `src/lib/openrouter.ts`
- Modify: `src/config/index.ts`

- [ ] **Step 1: Extend `SopDoc` and `Step` types**

In `src/lib/mongo.ts`, extend the `Step` interface to add `keyframeR2Keys` and extend `SopDoc` to add the `pdf` subdoc. Replace lines 29-54 with:

```ts
export interface Step {
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  clipR2Key: string;
  posterR2Key: string;
  keyframeR2Keys: string[]; // 3 keyframes evenly spaced across [startTime, endTime]
}

export type PdfStatus = "idle" | "generating" | "ready" | "error";

export interface SopPdfState {
  status: PdfStatus;
  r2Key?: string;        // R2 key of the latest generated PDF
  generatedAt?: Date;    // when status flipped to "ready"
  startedAt?: Date;      // when status flipped to "generating"; used for staleness
  errorMessage?: string;
  runId?: string;        // current Trigger.dev run id, for dedupe
}

export interface SopDoc {
  _id: ObjectId;
  title: string;                     // AI-generated in Stage 4
  category: string;                  // AI-detected in Stage 3
  status: SopStatus;
  errorCode: ErrorCode;
  videoR2Key: string | null;
  videoExpiresAt: Date;
  transcript: string | null;
  segments: Segment[];
  segmentsClean: CleanSegment[] | null;
  domainSummary: string | null;
  steps: Step[];
  shareToken: string;
  pdf?: SopPdfState;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 2: Add R2 key helpers**

In `src/lib/utils.ts`, append after the existing `posterKey` function:

```ts
export function keyframeKey(sopId: string, stepIndex: number, frameIndex: number) {
  return `sops/${sopId}/step-${stepIndex}-frame-${frameIndex}.jpg`;
}
export function pdfKey(sopId: string, ts: number) {
  return `sops/${sopId}/sop-${ts}.pdf`;
}
```

- [ ] **Step 3: Add Zod output schemas**

In `src/lib/schemas.ts`, append:

```ts
export const OverviewOutput = z.object({
  purpose: z.string(),
  audience: z.string(),
  prerequisites: z.array(z.string()),
  toolsMaterials: z.array(z.string()),
  estimatedDuration: z.string(),
});

export const StepRewriteOutput = z.object({
  prose: z.string(),
  subBullets: z.array(z.string()),
  callouts: z.array(z.object({
    kind: z.enum(["warning", "tip", "note"]),
    text: z.string(),
  })),
});
```

- [ ] **Step 4: Verify llmJson supports the new schemas**

The current `zodToJsonSchemaLike` in `src/lib/openrouter.ts` supports `ZodObject`, `ZodArray`, `ZodString`, `ZodNumber`, `ZodEnum`. The new schemas use only those types — no changes needed. Confirm by reading the file. If the implementer hits an "Unsupported Zod type" error at runtime, they should switch to the npm package `zod-to-json-schema` per the comment on line 58.

- [ ] **Step 5: Add PDF model + prompts to config**

In `src/config/index.ts`, inside the `ai` object (between line 24 `sopModel` and line 25 `maxRetries`), add:

```ts
    pdfModel: "google/gemini-2.5-flash",
```

And inside `prompts` (between line 35 `sopSystem` and line 36 `}`), add:

```ts
      pdfOverviewSystem:
        `You are writing the opening of a printed Vietnamese SOP document. The reader cannot watch the source video — they only have your text. Read the full transcript and step list, then produce a concise overview: purpose (2-3 sentences), audience (one sentence), prerequisites (bullets), tools/materials mentioned (bullets), and estimated duration ("~N phút"). Vietnamese output. No filler, no speculation beyond what the transcript supports.`,
      pdfStepSystem:
        `You rewrite a single step of a Vietnamese training SOP for a reader who cannot watch the video. Convert spoken Vietnamese (transcript slice) into clear written instructions. Output: 1-3 short paragraphs of prose, an ordered list of discrete actions in imperative voice (subBullets), and any warnings/tips/notes as callouts with kind="warning"|"tip"|"note". Do not invent steps not present in the transcript. If there are no callouts, return an empty array.`,
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors related to mongo, utils, schemas, openrouter, or config. (Pre-existing errors elsewhere are not introduced by this task and may be ignored.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/mongo.ts src/lib/utils.ts src/lib/schemas.ts src/config/index.ts
git commit -m "feat(pdf): add schema, key helpers, and prompts for PDF export"
```

---

## Task 2: Keyframe extraction stage + processSop integration

**Files:**
- Create: `src/trigger/stages/keyframes.ts`
- Create: `src/trigger/stages/keyframes.test.ts`
- Modify: `src/trigger/processSop.ts`

- [ ] **Step 1: Write a unit test for the timestamp-picker helper**

Create `src/trigger/stages/keyframes.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { pickKeyframeTimestamps } from "./keyframes";

test("pickKeyframeTimestamps returns 3 evenly-spaced times inside the range", () => {
  const ts = pickKeyframeTimestamps(10, 20);
  assert.equal(ts.length, 3);
  assert.ok(ts[0] > 10 && ts[0] < ts[1] && ts[1] < ts[2] && ts[2] < 20);
  // 25%, 50%, 75% of the range
  assert.equal(ts[0], 12.5);
  assert.equal(ts[1], 15);
  assert.equal(ts[2], 17.5);
});

test("pickKeyframeTimestamps handles a tiny range without collapsing", () => {
  const ts = pickKeyframeTimestamps(5, 5.4);
  assert.equal(ts.length, 3);
  assert.ok(ts[0] < ts[1] && ts[1] < ts[2]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/trigger/stages/keyframes.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the keyframes stage**

Create `src/trigger/stages/keyframes.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import ffmpeg from "fluent-ffmpeg";
import { logger } from "@trigger.dev/sdk/v3";
import { presignGet, putObject } from "@/lib/r2";
import { keyframeKey } from "@/lib/utils";
import type { Step } from "@/lib/mongo";

export function pickKeyframeTimestamps(start: number, end: number): number[] {
  const span = end - start;
  return [start + span * 0.25, start + span * 0.5, start + span * 0.75];
}

function grabFrame(input: string, out: string, atSec: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .screenshots({
        timestamps: [atSec],
        filename: path.basename(out),
        folder: path.dirname(out),
        size: "640x?",
      })
      .on("end", () => resolve())
      .on("error", reject);
  });
}

async function downloadTo(tmpPath: string, url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(tmpPath, buf);
}

/**
 * Extracts 3 keyframes per step from the source video and uploads them to R2.
 * Returns a copy of `steps` with `keyframeR2Keys` populated.
 * On per-step failure, that step's `keyframeR2Keys` is empty (caller falls back to posterR2Key).
 */
export async function runKeyframes(args: {
  sopId: string;
  videoR2Key: string;
  steps: Step[];
}): Promise<Step[]> {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sop-kf-"));
  const srcUrl = await presignGet(args.videoR2Key, 3600);
  const srcPath = path.join(tmp, "src.mp4");
  await downloadTo(srcPath, srcUrl);

  const out: Step[] = [];
  for (let i = 0; i < args.steps.length; i++) {
    const step = args.steps[i];
    const timestamps = pickKeyframeTimestamps(step.startTime, step.endTime);
    const keys: string[] = [];
    for (let f = 0; f < timestamps.length; f++) {
      const framePath = path.join(tmp, `step-${i}-frame-${f}.jpg`);
      try {
        await grabFrame(srcPath, framePath, timestamps[f]);
        const buf = await fs.promises.readFile(framePath);
        const k = keyframeKey(args.sopId, i, f);
        await putObject(k, buf, "image/jpeg");
        keys.push(k);
      } catch (e) {
        logger.warn("keyframe failed", { stepIndex: i, frameIndex: f, e: String(e) });
      }
    }
    out.push({ ...step, keyframeR2Keys: keys });
  }
  await fs.promises.rm(tmp, { recursive: true, force: true });
  return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test src/trigger/stages/keyframes.test.ts`
Expected: PASS — both tests green.

- [ ] **Step 5: Wire keyframes into processSop**

In `src/trigger/processSop.ts`, modify the Stage 5 block. Replace lines 81-99 (from `// Stage 5` through the final `await (await sops()).updateOne(...)` for `status: "done"`) with:

```ts
      // Stage 5
      await setStatus(_id, "clipping", { title: extracted.title });
      let steps;
      try {
        steps = await runClip({
          sopId: _id.toHexString(),
          videoR2Key: doc.videoR2Key,
          rawSegments: segments,
          extractedSteps: extracted.steps,
        });
      } catch (e) {
        logger.error("clip failed", { e: String(e) });
        return fail(_id, "clipping_failed");
      }

      // Stage 5b — extract 3 keyframes per step (non-fatal on failure)
      try {
        steps = await runKeyframes({
          sopId: _id.toHexString(),
          videoR2Key: doc.videoR2Key,
          steps,
        });
      } catch (e) {
        logger.warn("keyframes failed; PDF export will fall back to posters", { e: String(e) });
        steps = steps.map(s => ({ ...s, keyframeR2Keys: [] }));
      }

      await (await sops()).updateOne(
        { _id },
        { $set: { steps, status: "done" as SopStatus, updatedAt: new Date() } }
      );
```

Add the import at the top of the file (next to other stage imports, around line 11):

```ts
import { runKeyframes } from "./stages/keyframes";
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 7: Commit**

```bash
git add src/trigger/stages/keyframes.ts src/trigger/stages/keyframes.test.ts src/trigger/processSop.ts
git commit -m "feat(pdf): extract 3 keyframes per step in processSop pipeline"
```

---

## Task 3: synthesizeOverview stage

**Files:**
- Create: `src/trigger/stages/synthesizeOverview.ts`

- [ ] **Step 1: Create the stage**

Create `src/trigger/stages/synthesizeOverview.ts`:

```ts
import { llmJson } from "@/lib/openrouter";
import { OverviewOutput } from "@/lib/schemas";
import { config } from "@/config";
import type { z } from "zod";

export type Overview = z.infer<typeof OverviewOutput>;

export async function runSynthesizeOverview(args: {
  title: string;
  category: string;
  transcript: string;
  stepTitles: string[];
}): Promise<Overview> {
  const userPrompt =
    `SOP title: ${args.title}\n` +
    `Category: ${args.category}\n\n` +
    `Step titles:\n${args.stepTitles.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n` +
    `Full transcript:\n${args.transcript}\n\n` +
    `Return strict JSON: { "purpose", "audience", "prerequisites": string[], "toolsMaterials": string[], "estimatedDuration" }.`;

  return llmJson({
    model: config.ai.pdfModel,
    system: config.ai.prompts.pdfOverviewSystem,
    user: userPrompt,
    schema: OverviewOutput,
    schemaName: "pdf_overview",
    maxRetries: config.ai.maxRetries,
  });
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/trigger/stages/synthesizeOverview.ts
git commit -m "feat(pdf): add Overview synthesis stage"
```

---

## Task 4: synthesizeStep stage with transcript slicing

**Files:**
- Create: `src/trigger/stages/synthesizeStep.ts`
- Create: `src/trigger/stages/synthesizeStep.test.ts`

- [ ] **Step 1: Write the failing test for the transcript-slicing helper**

Create `src/trigger/stages/synthesizeStep.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { sliceTranscriptByTime } from "./synthesizeStep";

test("sliceTranscriptByTime concatenates segments overlapping the range", () => {
  const segs = [
    { id: 0, start: 0,  end: 5,  text: "alpha" },
    { id: 1, start: 5,  end: 10, text: "beta" },
    { id: 2, start: 10, end: 15, text: "gamma" },
    { id: 3, start: 15, end: 20, text: "delta" },
  ];
  // step from 6s to 14s overlaps segments 1 and 2
  const out = sliceTranscriptByTime(segs, 6, 14);
  assert.equal(out, "beta gamma");
});

test("sliceTranscriptByTime returns empty string when no overlap", () => {
  const segs = [{ id: 0, start: 0, end: 5, text: "alpha" }];
  assert.equal(sliceTranscriptByTime(segs, 100, 200), "");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/trigger/stages/synthesizeStep.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the stage**

Create `src/trigger/stages/synthesizeStep.ts`:

```ts
import { llmJson } from "@/lib/openrouter";
import { StepRewriteOutput } from "@/lib/schemas";
import { config } from "@/config";
import type { Segment } from "@/lib/mongo";
import type { z } from "zod";

export type StepRewrite = z.infer<typeof StepRewriteOutput>;

/**
 * Returns the concatenated text of all segments overlapping [start, end].
 * A segment overlaps if its end > start AND its start < end.
 */
export function sliceTranscriptByTime(segments: Segment[], start: number, end: number): string {
  return segments
    .filter(s => s.end > start && s.start < end)
    .map(s => s.text)
    .join(" ")
    .trim();
}

export async function runSynthesizeStep(args: {
  step: { title: string; description: string; startTime: number; endTime: number };
  segments: Segment[];
  prevTitle: string | null;
}): Promise<StepRewrite> {
  const transcriptSlice = sliceTranscriptByTime(args.segments, args.step.startTime, args.step.endTime);

  const userPrompt =
    `Step title: ${args.step.title}\n` +
    `Original short description: ${args.step.description}\n` +
    (args.prevTitle ? `Previous step title (for continuity, do not repeat its content): ${args.prevTitle}\n` : "") +
    `\nTranscript slice for this step:\n${transcriptSlice || "(empty — fall back to the original description)"}\n\n` +
    `Return strict JSON: { "prose", "subBullets": string[], "callouts": [{ "kind": "warning"|"tip"|"note", "text" }] }.`;

  return llmJson({
    model: config.ai.pdfModel,
    system: config.ai.prompts.pdfStepSystem,
    user: userPrompt,
    schema: StepRewriteOutput,
    schemaName: "pdf_step_rewrite",
    maxRetries: config.ai.maxRetries,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/trigger/stages/synthesizeStep.test.ts`
Expected: PASS — both tests green.

- [ ] **Step 5: Commit**

```bash
git add src/trigger/stages/synthesizeStep.ts src/trigger/stages/synthesizeStep.test.ts
git commit -m "feat(pdf): add per-step rewrite synthesis with transcript slicing"
```

---

## Task 5: PDF rendering with React-PDF

**Files:**
- Create: `src/trigger/stages/renderPdf.tsx`
- Create: `src/trigger/stages/renderPdf.test.ts`
- Create: `public/fonts/BeVietnamPro-Regular.ttf`
- Create: `public/fonts/BeVietnamPro-Bold.ttf`

- [ ] **Step 1: Install `@react-pdf/renderer`**

Run:

```bash
npm install @react-pdf/renderer@^4
```

- [ ] **Step 2: Download Be Vietnam Pro font files**

Run from project root:

```bash
mkdir -p public/fonts
curl -L -o public/fonts/BeVietnamPro-Regular.ttf "https://github.com/google/fonts/raw/main/ofl/bevietnampro/BeVietnamPro-Regular.ttf"
curl -L -o public/fonts/BeVietnamPro-Bold.ttf "https://github.com/google/fonts/raw/main/ofl/bevietnampro/BeVietnamPro-Bold.ttf"
ls -lh public/fonts/
```

Expected: two `.ttf` files, each > 100KB.

- [ ] **Step 3: Write the failing smoke test**

Create `src/trigger/stages/renderPdf.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { renderSopPdf } from "./renderPdf";

test("renderSopPdf produces a non-empty PDF buffer", async () => {
  const buf = await renderSopPdf({
    title: "Pha cà phê espresso",
    category: "Coffee & Drinks",
    createdAt: new Date("2026-04-25T10:00:00Z"),
    overview: {
      purpose: "Hướng dẫn pha một ly espresso chuẩn.",
      audience: "Nhân viên pha chế mới.",
      prerequisites: ["Máy espresso đã được làm nóng"],
      toolsMaterials: ["Cà phê xay mịn", "Tamper"],
      estimatedDuration: "~3 phút",
    },
    steps: [
      {
        index: 0,
        title: "Xay cà phê",
        startTime: 0,
        endTime: 30,
        rewrite: {
          prose: "Xay 18g cà phê ở mức mịn vừa.",
          subBullets: ["Cân 18g hạt", "Xay ở mức 3"],
          callouts: [{ kind: "tip", text: "Xay ngay trước khi pha." }],
        },
        keyframes: [], // empty in test — renderer must handle missing images
        posterImage: null,
      },
    ],
  });
  assert.ok(buf instanceof Buffer);
  assert.ok(buf.length > 1000, `expected > 1KB PDF, got ${buf.length}`);
  // PDF magic number
  assert.equal(buf.subarray(0, 4).toString(), "%PDF");
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx tsx --test src/trigger/stages/renderPdf.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 5: Create the renderer**

Create `src/trigger/stages/renderPdf.tsx`:

```tsx
import path from "node:path";
import React from "react";
import {
  Document, Page, Text, View, Image, Font, StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

Font.register({
  family: "BeVietnamPro",
  fonts: [
    { src: path.join(process.cwd(), "public/fonts/BeVietnamPro-Regular.ttf"), fontWeight: 400 },
    { src: path.join(process.cwd(), "public/fonts/BeVietnamPro-Bold.ttf"),    fontWeight: 700 },
  ],
});

const COLORS = {
  body:   "#0A0A0A",
  meta:   "#6B7280",
  accent: "#0066FF",
  rule:   "#E5E7EB",
  warn:   "#F59E0B",
  tip:    "#10B981",
  note:   "#6B7280",
};

const s = StyleSheet.create({
  page:        { paddingTop: 56, paddingBottom: 64, paddingHorizontal: 56, fontFamily: "BeVietnamPro", color: COLORS.body, fontSize: 11, lineHeight: 1.5 },
  brand:       { fontSize: 9, color: COLORS.meta, letterSpacing: 1 },
  categoryPill:{ marginTop: 16, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "#F3F4F6", fontSize: 9, color: COLORS.meta },
  title:       { fontSize: 26, fontWeight: 700, marginTop: 12 },
  metaRow:     { flexDirection: "row", marginTop: 8, fontSize: 10, color: COLORS.meta },
  metaItem:    { marginRight: 16 },
  rule:        { borderBottomWidth: 1, borderBottomColor: COLORS.rule, marginVertical: 16 },

  sectionLabel:{ fontSize: 10, fontWeight: 700, color: COLORS.body, marginTop: 12, marginBottom: 4 },
  sectionBody: { fontSize: 11, color: COLORS.body },
  bullet:      { flexDirection: "row", marginBottom: 2 },
  bulletDot:   { width: 12, fontSize: 11 },
  bulletText:  { flex: 1, fontSize: 11 },

  tocItem:     { flexDirection: "row", marginVertical: 3, fontSize: 11 },
  tocNum:      { width: 28, fontWeight: 700, color: COLORS.accent },
  tocTitle:    { flex: 1 },
  tocTime:     { color: COLORS.meta, fontSize: 10 },

  stepHeader:  { fontSize: 9, color: COLORS.meta, marginBottom: 4 },
  stepTitle:   { fontSize: 18, fontWeight: 700, marginBottom: 12 },
  frameStrip:  { flexDirection: "row", marginBottom: 12 },
  frame:       { width: 150, height: 84, marginRight: 8, objectFit: "cover", borderRadius: 4, backgroundColor: "#F3F4F6" },
  prose:       { marginBottom: 8 },
  callout:     { marginTop: 8, padding: 8, borderLeftWidth: 3, borderLeftColor: COLORS.warn, backgroundColor: "#FFFBEB", fontSize: 10 },
  calloutTip:  { borderLeftColor: COLORS.tip, backgroundColor: "#ECFDF5" },
  calloutNote: { borderLeftColor: COLORS.note, backgroundColor: "#F9FAFB" },

  footer:      { position: "absolute", bottom: 32, left: 56, right: 56, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: COLORS.rule, paddingTop: 8, fontSize: 9, color: COLORS.meta },
});

export type RenderInput = {
  title: string;
  category: string;
  createdAt: Date;
  overview: {
    purpose: string;
    audience: string;
    prerequisites: string[];
    toolsMaterials: string[];
    estimatedDuration: string;
  } | null;
  steps: Array<{
    index: number;
    title: string;
    startTime: number;
    endTime: number;
    rewrite: {
      prose: string;
      subBullets: string[];
      callouts: Array<{ kind: "warning" | "tip" | "note"; text: string }>;
    } | null;
    keyframes: Buffer[]; // 0 to 3 image buffers
    posterImage: Buffer | null; // fallback when keyframes is empty
  }>;
};

function fmtTimestamp(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function fmtDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function calloutStyle(kind: "warning" | "tip" | "note") {
  if (kind === "tip") return [s.callout, s.calloutTip];
  if (kind === "note") return [s.callout, s.calloutNote];
  return [s.callout];
}

const Footer = ({ title }: { title: string }) => (
  <View style={s.footer} fixed>
    <Text>{title}</Text>
    <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
  </View>
);

export function SopPdfDocument(input: RenderInput) {
  const totalDuration = input.steps.length > 0
    ? input.steps[input.steps.length - 1].endTime
    : 0;

  return (
    <Document>
      {/* Cover page */}
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>SOPVN</Text>
        <Text style={s.categoryPill}>{input.category}</Text>
        <Text style={s.title}>{input.title}</Text>
        <View style={s.metaRow}>
          <Text style={s.metaItem}>Tạo lúc {fmtDate(input.createdAt)}</Text>
          <Text style={s.metaItem}>{Math.round(totalDuration)}s · {input.steps.length} bước</Text>
        </View>
        <View style={s.rule} />
        {input.overview && (
          <>
            <Text style={s.sectionLabel}>Mục đích</Text>
            <Text style={s.sectionBody}>{input.overview.purpose}</Text>
            <Text style={s.sectionLabel}>Đối tượng</Text>
            <Text style={s.sectionBody}>{input.overview.audience}</Text>
            {input.overview.prerequisites.length > 0 && (
              <>
                <Text style={s.sectionLabel}>Yêu cầu trước</Text>
                {input.overview.prerequisites.map((p, i) => (
                  <View key={i} style={s.bullet}>
                    <Text style={s.bulletDot}>•</Text><Text style={s.bulletText}>{p}</Text>
                  </View>
                ))}
              </>
            )}
            {input.overview.toolsMaterials.length > 0 && (
              <>
                <Text style={s.sectionLabel}>Công cụ / Nguyên liệu</Text>
                {input.overview.toolsMaterials.map((p, i) => (
                  <View key={i} style={s.bullet}>
                    <Text style={s.bulletDot}>•</Text><Text style={s.bulletText}>{p}</Text>
                  </View>
                ))}
              </>
            )}
            <Text style={s.sectionLabel}>Thời lượng ước tính</Text>
            <Text style={s.sectionBody}>{input.overview.estimatedDuration}</Text>
          </>
        )}
        <Footer title={input.title} />
      </Page>

      {/* Table of contents (skipped if ≤3 steps) */}
      {input.steps.length > 3 && (
        <Page size="A4" style={s.page}>
          <Text style={s.title}>Mục lục</Text>
          <View style={s.rule} />
          {input.steps.map((step, i) => (
            <View key={i} style={s.tocItem}>
              <Text style={s.tocNum}>{String(i + 1).padStart(2, "0")}</Text>
              <Text style={s.tocTitle}>{step.title}</Text>
              <Text style={s.tocTime}>{fmtTimestamp(step.startTime)}</Text>
            </View>
          ))}
          <Footer title={input.title} />
        </Page>
      )}

      {/* One page per step */}
      {input.steps.map((step, i) => {
        const images = step.keyframes.length > 0
          ? step.keyframes
          : (step.posterImage ? [step.posterImage] : []);
        return (
          <Page key={i} size="A4" style={s.page} break={i > 0 ? false : false}>
            <Text style={s.stepHeader}>
              Bước {String(i + 1).padStart(2, "0")} · {fmtTimestamp(step.startTime)} – {fmtTimestamp(step.endTime)}
            </Text>
            <Text style={s.stepTitle}>{step.title}</Text>
            {images.length > 0 && (
              <View style={s.frameStrip}>
                {images.map((img, fi) => (
                  <Image key={fi} src={img} style={s.frame} />
                ))}
              </View>
            )}
            {step.rewrite && (
              <>
                <Text style={s.prose}>{step.rewrite.prose}</Text>
                {step.rewrite.subBullets.map((b, bi) => (
                  <View key={bi} style={s.bullet}>
                    <Text style={s.bulletDot}>•</Text><Text style={s.bulletText}>{b}</Text>
                  </View>
                ))}
                {step.rewrite.callouts.map((c, ci) => (
                  <View key={ci} style={calloutStyle(c.kind)}>
                    <Text>{c.kind === "warning" ? "⚠ " : c.kind === "tip" ? "💡 " : "ℹ "}{c.text}</Text>
                  </View>
                ))}
              </>
            )}
            <Footer title={input.title} />
          </Page>
        );
      })}
    </Document>
  );
}

export async function renderSopPdf(input: RenderInput): Promise<Buffer> {
  const doc = SopPdfDocument(input);
  return renderToBuffer(doc);
}
```

- [ ] **Step 6: Run smoke test to verify it passes**

Run: `npx tsx --test src/trigger/stages/renderPdf.test.ts`
Expected: PASS — buffer ≥ 1KB and starts with `%PDF`.

If the test fails with "font not found" or similar, verify the `.ttf` files exist at `public/fonts/` and the registered paths in `Font.register` resolve from `process.cwd()`.

- [ ] **Step 7: Commit**

```bash
git add public/fonts/BeVietnamPro-Regular.ttf public/fonts/BeVietnamPro-Bold.ttf src/trigger/stages/renderPdf.tsx src/trigger/stages/renderPdf.test.ts package.json package-lock.json
git commit -m "feat(pdf): add React-PDF renderer with Be Vietnam Pro font"
```

---

## Task 6: generateSopPdf Trigger.dev task

**Files:**
- Create: `src/trigger/generateSopPdf.ts`

- [ ] **Step 1: Create the task**

Create `src/trigger/generateSopPdf.ts`:

```ts
import { task, logger } from "@trigger.dev/sdk/v3";
import { ObjectId } from "mongodb";
import { sops, type SopDoc } from "@/lib/mongo";
import { presignGet, putObject } from "@/lib/r2";
import { pdfKey } from "@/lib/utils";
import { runSynthesizeOverview, type Overview } from "./stages/synthesizeOverview";
import { runSynthesizeStep, type StepRewrite } from "./stages/synthesizeStep";
import { renderSopPdf, type RenderInput } from "./stages/renderPdf";

async function fetchR2Buffer(key: string): Promise<Buffer> {
  const url = await presignGet(key, 600);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${key}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function setPdfState(id: ObjectId, patch: Record<string, unknown>) {
  // Mongo dot-notation set, only the changed pdf.* sub-fields
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
    });
  } catch (e) {
    logger.warn("overview synth failed; rendering without overview", { e: String(e) });
    return null;
  }
}

async function loadStepRewriteSafely(doc: SopDoc, stepIndex: number): Promise<StepRewrite | null> {
  const step = doc.steps[stepIndex];
  const prevTitle = stepIndex > 0 ? doc.steps[stepIndex - 1].title : null;
  try {
    return await runSynthesizeStep({
      step,
      segments: doc.segments,
      prevTitle,
    });
  } catch (e) {
    logger.warn("step rewrite failed; using fallback", { stepIndex, e: String(e) });
    // Fallback: synthesize a minimal rewrite from the existing description
    return {
      prose: step.description,
      subBullets: [],
      callouts: [],
    };
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
      // Stage 2 + 3 in parallel: Overview synthesis + per-step rewrites
      const [overview, stepRewrites, stepImagesArr] = await Promise.all([
        loadOverviewSafely(doc),
        Promise.all(doc.steps.map((_, i) => loadStepRewriteSafely(doc, i))),
        Promise.all(doc.steps.map((_, i) => loadStepImages(doc, i))),
      ]);

      // Stage 4: render
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

      // Stage 5: upload
      const ts = Date.now();
      const key = pdfKey(payload.sopId, ts);
      await putObject(key, buf, "application/pdf");

      // Stage 6: finalize
      await setPdfState(_id, {
        status: "ready",
        r2Key: key,
        generatedAt: new Date(),
        errorMessage: null,
      });
      logger.info("pdf ready", { sopId: payload.sopId, key, bytes: buf.length });
    } catch (e) {
      const msg = String(e);
      logger.error("generateSopPdf failed", { e: msg });
      await setPdfState(_id, { status: "error", errorMessage: msg });
    }
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/trigger/generateSopPdf.ts
git commit -m "feat(pdf): add generateSopPdf Trigger.dev task"
```

---

## Task 7: API routes — POST/GET /api/sop/[id]/pdf and file redirect

**Files:**
- Create: `src/app/api/sop/[id]/pdf/route.ts`
- Create: `src/app/api/sop/[id]/pdf/file/route.ts`
- Modify: `src/app/api/sop/[id]/route.ts`

- [ ] **Step 1: Create POST + GET handler**

Create `src/app/api/sop/[id]/pdf/route.ts`:

```ts
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { tasks } from "@trigger.dev/sdk/v3";
import { sops } from "@/lib/mongo";

const STALE_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  const _id = new ObjectId(id);
  const col = await sops();
  const doc = await col.findOne({ _id });
  if (!doc || doc.status !== "done") return NextResponse.json({ error: "not_ready" }, { status: 404 });

  const pdf = doc.pdf;
  const now = new Date();

  // Cache hit: ready and SOP unchanged since
  if (pdf?.status === "ready" && pdf.generatedAt && doc.updatedAt <= pdf.generatedAt) {
    return NextResponse.json({ status: "ready", url: `/api/sop/${id}/pdf/file` });
  }

  // Already generating, not stale → return existing runId
  if (pdf?.status === "generating" && pdf.startedAt && now.getTime() - new Date(pdf.startedAt).getTime() < STALE_MS) {
    return NextResponse.json({ status: "generating", runId: pdf.runId });
  }

  // Trigger fresh run (atomic: set generating + startedAt + runId)
  const handle = await tasks.trigger("generate-sop-pdf", { sopId: id });
  await col.updateOne(
    { _id },
    {
      $set: {
        "pdf.status": "generating",
        "pdf.startedAt": now,
        "pdf.runId": handle.id,
        "pdf.errorMessage": null,
        updatedAt: now,
      },
    }
  );
  return NextResponse.json({ status: "generating", runId: handle.id });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });
  const doc = await (await sops()).findOne(
    { _id: new ObjectId(id) },
    { projection: { pdf: 1, updatedAt: 1 } }
  );
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const pdf = doc.pdf ?? { status: "idle" };
  return NextResponse.json({
    status: pdf.status,
    url: pdf.status === "ready" ? `/api/sop/${id}/pdf/file` : null,
    errorMessage: pdf.errorMessage ?? null,
    runId: pdf.runId ?? null,
  });
}
```

- [ ] **Step 2: Create the file-redirect route**

Create `src/app/api/sop/[id]/pdf/file/route.ts`:

```ts
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { sops } from "@/lib/mongo";
import { presignGet } from "@/lib/r2";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });
  const doc = await (await sops()).findOne(
    { _id: new ObjectId(id) },
    { projection: { pdf: 1, title: 1 } }
  );
  if (!doc?.pdf?.r2Key || doc.pdf.status !== "ready") {
    return NextResponse.json({ error: "not_ready" }, { status: 404 });
  }
  const url = await presignGet(doc.pdf.r2Key, 600); // 10 min
  return NextResponse.redirect(url, 302);
}
```

- [ ] **Step 3: Include pdf state in the SOP fetch endpoint**

In `src/app/api/sop/[id]/route.ts`, modify the JSON response. Replace lines 11-26 (`return NextResponse.json({ ... })`) with:

```ts
  return NextResponse.json({
    id: doc._id.toHexString(),
    title: doc.title,
    category: doc.category,
    createdAt: doc.createdAt,
    shareToken: doc.shareToken,
    pdf: {
      status: doc.pdf?.status ?? "idle",
      url: doc.pdf?.status === "ready" ? `/api/sop/${doc._id.toHexString()}/pdf/file` : null,
    },
    steps: doc.steps.map((s, i) => ({
      index: i,
      title: s.title,
      description: s.description,
      startTime: s.startTime,
      endTime: s.endTime,
      clipUrl: `/api/clips/${doc._id.toHexString()}/step-${i}.mp4`,
      posterUrl: `/api/clips/${doc._id.toHexString()}/step-${i}.jpg`,
    })),
  });
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/sop/[id]/pdf src/app/api/sop/[id]/route.ts
git commit -m "feat(pdf): API routes for PDF generation, status polling, and download"
```

---

## Task 8: Export PDF button (client component)

**Files:**
- Create: `src/components/ExportPdfButton.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/ExportPdfButton.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { FileDown, Loader2, RotateCcw } from "lucide-react";

type PdfState = {
  status: "idle" | "generating" | "ready" | "error";
  url: string | null;
  errorMessage?: string | null;
};

export function ExportPdfButton({ sopId, initial }: { sopId: string; initial: { status: string; url: string | null } }) {
  const [state, setState] = useState<PdfState>({
    status: (initial.status as PdfState["status"]) ?? "idle",
    url: initial.url,
  });
  const [autoDownloaded, setAutoDownloaded] = useState(false);

  // Poll while generating
  useEffect(() => {
    if (state.status !== "generating") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/sop/${sopId}/pdf`, { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (cancelled) return;
        setState({ status: j.status, url: j.url, errorMessage: j.errorMessage });
      } catch {
        // ignore transient errors; will retry
      }
    };
    const id = setInterval(tick, 2000);
    return () => { cancelled = true; clearInterval(id); };
  }, [state.status, sopId]);

  // Auto-trigger download once when status flips to ready (and we kicked off the job this session)
  useEffect(() => {
    if (state.status === "ready" && state.url && !autoDownloaded) {
      const a = document.createElement("a");
      a.href = state.url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setAutoDownloaded(true);
    }
  }, [state.status, state.url, autoDownloaded]);

  async function start() {
    setAutoDownloaded(false);
    setState(s => ({ ...s, status: "generating" }));
    const r = await fetch(`/api/sop/${sopId}/pdf`, { method: "POST" });
    const j = await r.json();
    if (j.status === "ready") {
      setState({ status: "ready", url: j.url });
    } else if (j.status === "generating") {
      setState({ status: "generating", url: null });
    } else {
      setState({ status: "error", url: null, errorMessage: j.error ?? "unknown" });
    }
  }

  if (state.status === "generating") {
    return (
      <button
        disabled
        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-[#6B7280]"
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
        Đang tạo PDF...
      </button>
    );
  }
  if (state.status === "error") {
    return (
      <button
        onClick={start}
        className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-700 hover:bg-red-100 transition"
      >
        <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
        Thử lại
      </button>
    );
  }
  // idle or ready
  return (
    <button
      onClick={start}
      className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-[#0A0A0A] hover:bg-gray-50 transition"
    >
      <FileDown className="w-3.5 h-3.5" strokeWidth={2} />
      Xuất PDF
    </button>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ExportPdfButton.tsx
git commit -m "feat(pdf): export button with idle/generating/ready/error states"
```

---

## Task 9: Mount the button on the SOP page; update cleanup task

**Files:**
- Modify: `src/app/sop/[id]/page.tsx`
- Modify: `src/trigger/cleanupVideos.ts`

- [ ] **Step 1: Extend the `Sop` type and mount the button**

In `src/app/sop/[id]/page.tsx`:

After line 27 (closing brace of `Sop` type), the `Sop` type must include `pdf`. Replace lines 20-27 with:

```ts
type Sop = {
  id: string;
  title: string;
  category: string;
  createdAt: string;
  shareToken: string;
  pdf: { status: string; url: string | null };
  steps: Step[];
};
```

Add the import near the top of the file (with the other component imports, after line 5):

```ts
import { ExportPdfButton } from "@/components/ExportPdfButton";
```

In the action-button row, locate the existing `<ShareButton ... variant="primary" />` (line 92) and add the export button right after it. Replace lines 90-104 (the entire `<div className="flex flex-wrap items-center gap-2 pt-2">` block) with:

```tsx
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <ShareButton token={sop.shareToken} variant="outline" />
            <ShareButton token={sop.shareToken} variant="primary" />
            <ExportPdfButton sopId={sop.id} initial={sop.pdf} />
            <button className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-[#0A0A0A] hover:bg-gray-50 transition">
              <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
              Chỉnh sửa
            </button>
            <Link
              href="/upload"
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-[#0A0A0A] hover:bg-gray-50 transition"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              Tạo SOP khác
            </Link>
          </div>
```

- [ ] **Step 2: Extend cleanupVideos to sweep stale PDFs and reset state**

Replace the entire contents of `src/trigger/cleanupVideos.ts` with:

```ts
import { schedules, logger } from "@trigger.dev/sdk/v3";
import { sops } from "@/lib/mongo";
import { deleteObject } from "@/lib/r2";

const PDF_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const cleanupVideos = schedules.task({
  id: "cleanup-videos",
  cron: "0 3 * * *", // 03:00 UTC daily
  run: async () => {
    const col = await sops();
    const now = new Date();

    // Sweep expired source videos (existing behavior)
    const expired = await col.find({ videoExpiresAt: { $lt: now }, videoR2Key: { $ne: null } }).toArray();
    for (const d of expired) {
      if (!d.videoR2Key) continue;
      try { await deleteObject(d.videoR2Key); }
      catch (e) { logger.warn("r2 delete failed", { key: d.videoR2Key, e: String(e) }); }
      await col.updateOne({ _id: d._id }, { $set: { videoR2Key: null, updatedAt: now } });
    }

    // Sweep stale PDFs: status=ready and generatedAt older than TTL.
    // Reset pdf state so the next click regenerates rather than 404ing on a deleted object.
    const stalePdfBefore = new Date(now.getTime() - PDF_TTL_MS);
    const stalePdfs = await col.find({
      "pdf.status": "ready",
      "pdf.generatedAt": { $lt: stalePdfBefore },
    }).toArray();
    for (const d of stalePdfs) {
      const key = d.pdf?.r2Key;
      if (key) {
        try { await deleteObject(key); }
        catch (e) { logger.warn("r2 delete pdf failed", { key, e: String(e) }); }
      }
      await col.updateOne(
        { _id: d._id },
        { $set: { "pdf.status": "idle", "pdf.r2Key": null, "pdf.generatedAt": null, updatedAt: now } }
      );
    }

    logger.info(`cleanup: videos=${expired.length} pdfs=${stalePdfs.length}`);
  },
});
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 4: Manual end-to-end smoke test**

Run the dev server and Trigger.dev dev locally:

```bash
npm run dev
# in a separate terminal:
npx trigger.dev@latest dev
```

Then:
1. Open an existing completed SOP at `http://localhost:3000/sop/<id>`.
2. Click "Xuất PDF".
3. Watch the button transition: `idle → generating → ready` and the PDF auto-downloads.
4. Open the PDF — verify cover page, TOC (if >3 steps), per-step pages with keyframe strip, callouts, and footer with page numbers.
5. Click "Xuất PDF" again — should be instant (cache hit), no spinner.
6. Verify Vietnamese diacritics render correctly (check ă, â, ê, ô, ơ, ư, đ, plus tone marks).

If the dev SOP doesn't have `keyframeR2Keys` yet (created before Task 2 ran in production), it will fall back to the single poster image — that's expected behavior. To test the full keyframe strip path, upload a fresh SOP through the existing upload flow.

- [ ] **Step 5: Commit**

```bash
git add src/app/sop/[id]/page.tsx src/trigger/cleanupVideos.ts
git commit -m "feat(pdf): mount ExportPdfButton; sweep stale PDFs in cleanup task"
```

---

## Self-Review Notes

Spec coverage:
- Goals 1–4 ✅ (Tasks 8, 5, 5, 6+8)
- Mongo schema additions ✅ (Task 1)
- Pipeline stages 1–6 ✅ (Task 6)
- Upstream keyframe extraction ✅ (Task 2)
- LLM Calls A and B with Zod validation ✅ (Tasks 3, 4)
- Graceful degradation (per-step fail, overview fail, missing keyframes) ✅ (Task 6 `loadXxxSafely` helpers)
- PDF layout: cover, TOC, per-step page with keyframe strip + prose + sub-bullets + callouts + footer ✅ (Task 5)
- Be Vietnam Pro font ✅ (Task 5)
- API routes POST/GET + concurrency guard with 5-min staleness ✅ (Task 7)
- Cache invalidation via `sop.updatedAt` ≤ `pdf.generatedAt` ✅ (Task 7)
- File proxy for stable URLs ✅ (Task 7 `pdf/file/route.ts`)
- UI states idle/generating/ready/error with auto-download ✅ (Task 8)
- Cleanup of stale PDFs with state reset ✅ (Task 9)

Open from spec: R2 presigned URL TTL — resolved by file-proxy route (10-min TTL on the redirect itself, the cached Mongo URL is the API path which is permanent).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-25-export-pdf.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
