# Physical / Clip Pipeline — Implementation Plan (Sub-project B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `physical` video produces a finished SOP whose steps each carry one trimmed video clip + poster thumbnail, viewable on the share page — via a new branch inside the existing pipeline.

**Architecture:** The pipeline (`processSopScreenshots.ts`) reuses its front half (Stage 0 analyze, transcribe, normalize, extract/visualExtract) for both screen and physical video. After step extraction, a boolean `isPhysical` selects the back-half: the existing screen stages, or three new clip stages (extract clips → upload clips → compose). Clips are stored in R2 and served to the share page as presigned URLs.

**Tech Stack:** TypeScript, Next.js (App Router), trigger.dev v4, fluent-ffmpeg, MongoDB, Cloudflare R2 (AWS S3 SDK). Tests: Node's test runner via `npx tsx --test <file>`. Type-check: `npx tsc --noEmit`.

**Spec:** `docs/superpowers/specs/2026-05-18-physical-clip-pipeline-design.md`

---

## File Structure

**New files:**
- `src/trigger/lib/extractClip.ts` — ffmpeg trim helper.
- `src/trigger/stages/extractClips.ts` — `runExtractClips` stage.
- `src/trigger/stages/uploadClips.ts` — `runUploadClips` stage.
- `src/app/api/share/[token]/mapClips.ts` — pure clip-mapping helper for the share API.
- `src/components/StepCardClips.tsx` — clip renderer component.
- Test files: `extractClip.test.ts`, `extractClips.test.ts`, `uploadClips.test.ts`, `mapClips.test.ts`, `utils.test.ts` (key helpers).

**Modified files:**
- `src/lib/mongo.ts` — `Clip` interface, `Step.clips`/`clipsError`, `SopStatus` + `ErrorCode` additions.
- `src/lib/utils.ts` — `clipKey`, `clipPosterKey`.
- `src/trigger/processSopScreenshots.ts` — Stage 0 routing + physical branch + dispose.
- `src/app/api/share/[token]/route.ts` — `clips` in the step output.
- `src/app/share/[token]/page.tsx` — `Step` type widening, component selection.
- `src/app/processing/[id]/page.tsx` — `Status` union, `STATUS_STEP_INDEX`, `ERROR_MSG`.

**Testing convention:** The codebase unit-tests `src/lib` helpers and `src/trigger` stages, but has no test harness for Next.js route handlers, React components, or the orchestrator task. This plan follows that convention: pure logic and stages get tests; the route's logic is extracted into a pure, testable `mapClips.ts` helper; `StepCardClips.tsx`, `page.tsx`, `processing/page.tsx`, and the orchestrator branch are verified by `npx tsc --noEmit` and the final end-to-end run.

---

## Task 1: Data model + R2 key helpers

**Files:**
- Modify: `src/lib/mongo.ts`
- Modify: `src/lib/utils.ts`
- Test: `src/lib/utils.test.ts` (new)

- [ ] **Step 1: Write the failing test for the key helpers**

Create `src/lib/utils.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { clipKey, clipPosterKey } from "./utils";

test("clipKey follows the sops/ + step- key convention", () => {
  assert.equal(clipKey("SOP1", 2, "abc123"), "sops/SOP1/clips/step-2/abc123.mp4");
});

test("clipPosterKey appends -poster.jpg under the same prefix", () => {
  assert.equal(clipPosterKey("SOP1", 2, "abc123"), "sops/SOP1/clips/step-2/abc123-poster.jpg");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/lib/utils.test.ts`
Expected: FAIL — `clipKey` / `clipPosterKey` are not exported.

- [ ] **Step 3: Add the key helpers**

In `src/lib/utils.ts`, immediately after the existing `screenshotKey` function (line ~21), add:

```ts
export function clipKey(sopId: string, stepIndex: number, clipId: string) {
  return `sops/${sopId}/clips/step-${stepIndex}/${clipId}.mp4`;
}
export function clipPosterKey(sopId: string, stepIndex: number, clipId: string) {
  return `sops/${sopId}/clips/step-${stepIndex}/${clipId}-poster.jpg`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test src/lib/utils.test.ts`
Expected: PASS — both tests.

- [ ] **Step 5: Extend the data model in `src/lib/mongo.ts`**

(a) In the `SopStatus` union (currently ends `... "uploading-screenshots" | "done" | "failed"`), add the two new statuses before `"done"`:

```ts
export type SopStatus =
  | "uploading" | "ingesting" | "transcribing" | "normalizing" | "analyzing"
  | "generating" | "building-pool" | "assigning" | "uploading-screenshots"
  | "building-clips" | "uploading-clips"
  | "done" | "failed";
```

(b) In the `ErrorCode` union, add `"clip_extract_failed"` — place it after `"screenshot_pool_failed"`:

```ts
  | "screenshot_pool_failed"
  | "clip_extract_failed"
```

(c) Add the `Clip` interface immediately before the `Step` interface:

```ts
export interface Clip {
  clipId: string;        // nanoid(10), unique per clip
  r2Key: string;         // mp4 object key in R2
  posterR2Key: string;   // jpg poster object key in R2
  startTime: number;     // clip start in source video, seconds
  endTime: number;       // clip end in source video, seconds
  order: number;         // display order within the step (0 in v1 — one clip)
}
```

(d) In the `Step` interface, add two optional fields after `screenshotsError`:

```ts
export interface Step {
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  screenshots?: Screenshot[];
  screenshotsError?: string;
  clips?: Clip[];
  clipsError?: string;
}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS — clean. (`Clip`, the new statuses, and the new error code are all additive; no existing consumer breaks.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/mongo.ts src/lib/utils.ts src/lib/utils.test.ts
git commit -m "feat(clips): Clip data model, clip statuses, R2 key helpers

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: `extractClip` ffmpeg helper

**Files:**
- Create: `src/trigger/lib/extractClip.ts`
- Test: `src/trigger/lib/extractClip.test.ts`

- [ ] **Step 1: Write the failing integration test**

Create `src/trigger/lib/extractClip.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import ffmpeg from "fluent-ffmpeg";
import { extractClip } from "./extractClip";

function probeDuration(file: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, data) => {
      if (err) return reject(err);
      resolve(Number(data.format?.duration ?? 0));
    });
  });
}

test("extractClip trims the source to the requested span", async () => {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "clip-"));
  const out = path.join(dir, "clip.mp4");
  try {
    await extractClip("samples/trimmed-hubspot_crm.mp4", out, 10, 14);
    assert.ok(fs.existsSync(out), "output file exists");
    const dur = await probeDuration(out);
    assert.ok(Math.abs(dur - 4) <= 0.5, `duration ~4s, got ${dur}`);
  } finally {
    await fs.promises.rm(dir, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/trigger/lib/extractClip.test.ts`
Expected: FAIL — `extractClip` is not defined.

- [ ] **Step 3: Implement the helper**

Create `src/trigger/lib/extractClip.ts`:

```ts
import ffmpeg from "fluent-ffmpeg";

/**
 * Trims `srcPath` to the span [startSec, endSec] and writes an mp4 to `outPath`.
 * Re-encodes (libx264/aac) so cut boundaries are frame-accurate rather than
 * snapped to keyframes; `-preset veryfast` keeps re-encode time low.
 * `-movflags +faststart` enables progressive web playback.
 */
export function extractClip(
  srcPath: string,
  outPath: string,
  startSec: number,
  endSec: number,
): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(srcPath)
      .seekInput(startSec)
      .duration(endSec - startSec)
      .videoCodec("libx264")
      .audioCodec("aac")
      .outputOptions(["-preset veryfast", "-movflags +faststart"])
      .on("end", () => resolve())
      .on("error", reject)
      .save(outPath);
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test src/trigger/lib/extractClip.test.ts`
Expected: PASS. (ffmpeg is available — the project bundles it via the `ffmpeg()` build extension and other tests already shell out to it.)

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/trigger/lib/extractClip.ts src/trigger/lib/extractClip.test.ts
git commit -m "feat(clips): extractClip ffmpeg trim helper

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: `runExtractClips` stage

**Files:**
- Create: `src/trigger/stages/extractClips.ts`
- Test: `src/trigger/stages/extractClips.test.ts`

The stage trims one clip per step plus a poster frame at the step midpoint. Per-step failures are isolated: a failing step records an `error` string and does not abort the others. `extractClip` and `grabFrame` are injectable for testing.

- [ ] **Step 1: Write the failing test**

Create `src/trigger/stages/extractClips.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { runExtractClips } from "./extractClips";

test("runExtractClips produces one clip + poster per step with correct bounds", async () => {
  const calls: { kind: string; start?: number; end?: number; at?: number }[] = [];
  const res = await runExtractClips({
    srcPath: "/fake/src.mp4",
    steps: [
      { startTime: 0, endTime: 10 },
      { startTime: 10, endTime: 30 },
    ],
    extractClip: async (_src, out, start, end) => {
      calls.push({ kind: "clip", start, end });
      await fs.promises.writeFile(out, "clip");
    },
    grabFrame: async (_src, out, at) => {
      calls.push({ kind: "poster", at });
      await fs.promises.writeFile(out, "poster");
    },
  });
  try {
    assert.equal(res.clips.length, 2);
    assert.equal(res.clips[0].stepIndex, 0);
    assert.equal(res.clips[0].startTime, 0);
    assert.equal(res.clips[0].endTime, 10);
    assert.equal(res.clips[0].error, undefined);
    assert.ok(fs.existsSync(res.clips[0].clipPath));
    assert.ok(fs.existsSync(res.clips[0].posterPath));
    // poster grabbed at the step midpoint
    assert.deepEqual(calls.filter(c => c.kind === "poster").map(c => c.at), [5, 20]);
  } finally {
    await res.dispose();
  }
});

test("runExtractClips isolates a failing step via an error string", async () => {
  const res = await runExtractClips({
    srcPath: "/fake/src.mp4",
    steps: [
      { startTime: 0, endTime: 10 },
      { startTime: 10, endTime: 20 },
    ],
    extractClip: async (_src, out, _start, end) => {
      if (end === 10) throw new Error("ffmpeg boom");
      await fs.promises.writeFile(out, "clip");
    },
    grabFrame: async (_src, out) => { await fs.promises.writeFile(out, "poster"); },
  });
  try {
    assert.equal(res.clips.length, 2);
    assert.ok(res.clips[0].error && res.clips[0].error.includes("ffmpeg boom"));
    assert.equal(res.clips[1].error, undefined);
  } finally {
    await res.dispose();
  }
});

test("runExtractClips dispose removes the temp dir", async () => {
  const res = await runExtractClips({
    srcPath: "/fake/src.mp4",
    steps: [{ startTime: 0, endTime: 5 }],
    extractClip: async (_s, out) => { await fs.promises.writeFile(out, "c"); },
    grabFrame: async (_s, out) => { await fs.promises.writeFile(out, "p"); },
  });
  const dir = res.tmpDir;
  await res.dispose();
  assert.equal(fs.existsSync(dir), false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/trigger/stages/extractClips.test.ts`
Expected: FAIL — `runExtractClips` is not defined.

- [ ] **Step 3: Implement the stage**

Create `src/trigger/stages/extractClips.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { extractClip as realExtractClip } from "@/trigger/lib/extractClip";
import { grabFrame as realGrabFrame } from "@/trigger/lib/videoTmp";

export type ExtractClipFn = (
  srcPath: string, outPath: string, startSec: number, endSec: number,
) => Promise<void>;
export type GrabFrameFn = (input: string, out: string, atSec: number) => Promise<void>;

/** One step's clip extraction result. `error` is set when this step failed;
 *  the other steps are unaffected. */
export interface ExtractedClip {
  stepIndex: number;
  clipPath: string;
  posterPath: string;
  startTime: number;
  endTime: number;
  error?: string;
}

/**
 * Trims one clip per step (with a midpoint poster frame) into a fresh temp dir.
 * Per-step failures are recorded as `error` and do not abort other steps.
 * The returned temp paths must outlive the upload stage, so the caller is
 * responsible for calling `dispose()` — typically in the orchestrator's
 * outer `finally`.
 */
export async function runExtractClips(args: {
  srcPath: string;
  steps: { startTime: number; endTime: number }[];
  extractClip?: ExtractClipFn;
  grabFrame?: GrabFrameFn;
}): Promise<{ clips: ExtractedClip[]; tmpDir: string; dispose: () => Promise<void> }> {
  const extractClip = args.extractClip ?? realExtractClip;
  const grabFrame = args.grabFrame ?? realGrabFrame;
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sop-clips-"));
  const dispose = async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  };
  try {
    const clips: ExtractedClip[] = [];
    for (let i = 0; i < args.steps.length; i++) {
      const { startTime, endTime } = args.steps[i];
      const clipPath = path.join(tmpDir, `clip-${i}.mp4`);
      const posterPath = path.join(tmpDir, `clip-${i}-poster.jpg`);
      const rec: ExtractedClip = { stepIndex: i, clipPath, posterPath, startTime, endTime };
      try {
        await extractClip(args.srcPath, clipPath, startTime, endTime);
        await grabFrame(args.srcPath, posterPath, (startTime + endTime) / 2);
      } catch (e) {
        rec.error = e instanceof Error ? e.message : String(e);
      }
      clips.push(rec);
    }
    return { clips, tmpDir, dispose };
  } catch (e) {
    await dispose();
    throw e;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test src/trigger/stages/extractClips.test.ts`
Expected: PASS — all three tests.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/trigger/stages/extractClips.ts src/trigger/stages/extractClips.test.ts
git commit -m "feat(clips): runExtractClips stage — one clip + poster per step

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: `runUploadClips` stage + `composeClipSteps`

**Files:**
- Create: `src/trigger/stages/uploadClips.ts`
- Test: `src/trigger/stages/uploadClips.test.ts`

`putObject` is injected (the spec notes `uploadScreenshots.ts` hard-imports it with no seam, so it is not a mirror-able pattern). The stage uploads the mp4 + poster per successfully-extracted step and produces `Clip` records; a step that failed extraction (has `error`) is passed through as a `clipsError` with no upload. This file also exports `composeClipSteps` — a pure function that assembles the final `Step[]` — so the physical compose logic is testable without the orchestrator.

- [ ] **Step 1: Write the failing test**

Create `src/trigger/stages/uploadClips.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { runUploadClips, composeClipSteps, type StepClips } from "./uploadClips";

async function tmpFile(content: string): Promise<string> {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "uc-"));
  const p = path.join(dir, "f");
  await fs.promises.writeFile(p, content);
  return p;
}

test("runUploadClips uploads mp4 + poster and builds a Clip per step", async () => {
  const puts: { key: string; contentType: string }[] = [];
  const clipPath = await tmpFile("mp4-bytes");
  const posterPath = await tmpFile("jpg-bytes");
  const byStep = await runUploadClips({
    sopId: "SOP9",
    clips: [{ stepIndex: 0, clipPath, posterPath, startTime: 2, endTime: 8 }],
    putObject: async (key, _body, contentType) => { puts.push({ key, contentType }); },
  });
  assert.equal(puts.length, 2);
  assert.equal(puts[0].contentType, "video/mp4");
  assert.equal(puts[1].contentType, "image/jpeg");
  assert.ok(puts[0].key.startsWith("sops/SOP9/clips/step-0/"));
  assert.ok(puts[0].key.endsWith(".mp4"));
  assert.ok(puts[1].key.endsWith("-poster.jpg"));
  const entry = byStep.get(0)!;
  assert.equal(entry.error, undefined);
  assert.equal(entry.clips.length, 1);
  assert.equal(entry.clips[0].order, 0);
  assert.equal(entry.clips[0].startTime, 2);
  assert.equal(entry.clips[0].endTime, 8);
  assert.equal(entry.clips[0].r2Key, puts[0].key);
  assert.equal(entry.clips[0].posterR2Key, puts[1].key);
});

test("runUploadClips passes a failed-extraction step through as clipsError, no upload", async () => {
  const puts: string[] = [];
  const byStep = await runUploadClips({
    sopId: "SOP9",
    clips: [{ stepIndex: 0, clipPath: "/x", posterPath: "/y", startTime: 0, endTime: 5, error: "ffmpeg boom" }],
    putObject: async (key) => { puts.push(key); },
  });
  assert.equal(puts.length, 0);
  const entry = byStep.get(0)!;
  assert.equal(entry.clips.length, 0);
  assert.ok(entry.error && entry.error.includes("ffmpeg boom"));
});

test("composeClipSteps sets clips / clipsError per step and never sets screenshots", () => {
  const byStep: Map<number, StepClips> = new Map([
    [0, { clips: [{ clipId: "c", r2Key: "k", posterR2Key: "p", startTime: 0, endTime: 5, order: 0 }] }],
    [1, { clips: [], error: "boom" }],
  ]);
  const steps = composeClipSteps(
    [
      { title: "A", description: "a", startTime: 0, endTime: 5 },
      { title: "B", description: "b", startTime: 5, endTime: 10 },
    ],
    byStep,
  );
  assert.equal(steps.length, 2);
  assert.equal(steps[0].clips?.length, 1);
  assert.equal(steps[0].clipsError, undefined);
  assert.equal(steps[0].screenshots, undefined);
  assert.equal(steps[1].clips, undefined);
  assert.equal(steps[1].clipsError, "boom");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/trigger/stages/uploadClips.test.ts`
Expected: FAIL — `runUploadClips` is not defined.

- [ ] **Step 3: Implement the stage**

Create `src/trigger/stages/uploadClips.ts`:

```ts
import fs from "node:fs";
import { customAlphabet } from "nanoid";
import { putObject as realPutObject } from "@/lib/r2";
import { clipKey, clipPosterKey } from "@/lib/utils";
import type { Clip, Step } from "@/lib/mongo";
import type { ExtractedClip } from "./extractClips";

export type PutObjectFn = (key: string, body: Buffer, contentType: string) => Promise<void>;

// Lowercase + digits, length 10 — matches the `newFrameId` convention in
// uploadScreenshots.ts.
const newClipId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);

export interface StepClips {
  clips: Clip[];
  error?: string;
}

/**
 * Uploads each extracted clip's mp4 + poster to R2 and builds `Clip` records,
 * keyed by step index. A step that failed extraction is passed through as a
 * `clipsError` with no upload. `putObject` is injectable for testing.
 */
export async function runUploadClips(args: {
  sopId: string;
  clips: ExtractedClip[];
  putObject?: PutObjectFn;
}): Promise<Map<number, StepClips>> {
  const putObject = args.putObject ?? realPutObject;
  const out = new Map<number, StepClips>();
  for (const ec of args.clips) {
    if (ec.error) {
      out.set(ec.stepIndex, { clips: [], error: ec.error });
      continue;
    }
    const clipId = newClipId();
    const r2Key = clipKey(args.sopId, ec.stepIndex, clipId);
    const posterR2Key = clipPosterKey(args.sopId, ec.stepIndex, clipId);
    const clipBuf = await fs.promises.readFile(ec.clipPath);
    const posterBuf = await fs.promises.readFile(ec.posterPath);
    await putObject(r2Key, clipBuf, "video/mp4");
    await putObject(posterR2Key, posterBuf, "image/jpeg");
    out.set(ec.stepIndex, {
      clips: [{
        clipId, r2Key, posterR2Key,
        startTime: ec.startTime, endTime: ec.endTime, order: 0,
      }],
    });
  }
  return out;
}

/** One resolved step's metadata — the subset `composeClipSteps` needs. */
export interface ResolvedStepLite {
  title: string;
  description: string;
  startTime: number;
  endTime: number;
}

/**
 * Assembles the final `Step[]` for a physical SOP: each resolved step gets its
 * uploaded `clips` (or a `clipsError`) from `clipsByStep`. `screenshots` is
 * never set. Pure — testable without the orchestrator.
 */
export function composeClipSteps(
  resolved: ResolvedStepLite[],
  clipsByStep: Map<number, StepClips>,
): Step[] {
  return resolved.map((rs, i) => {
    const entry = clipsByStep.get(i);
    const base: Step = {
      title: rs.title,
      description: rs.description,
      startTime: rs.startTime,
      endTime: rs.endTime,
    };
    if (entry?.clips.length) base.clips = entry.clips;
    if (entry?.error) base.clipsError = entry.error;
    return base;
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test src/trigger/stages/uploadClips.test.ts`
Expected: PASS — all three tests (`runUploadClips` ×2, `composeClipSteps` ×1).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/trigger/stages/uploadClips.ts src/trigger/stages/uploadClips.test.ts
git commit -m "feat(clips): runUploadClips stage + composeClipSteps

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Orchestrator — Stage 0 routing + physical branch

**Files:**
- Modify: `src/trigger/processSopScreenshots.ts`

No unit test — the orchestrator task has no test harness in this codebase. Verified by `npx tsc --noEmit` and the end-to-end run. Work carefully and re-read the file before editing.

- [ ] **Step 1: Add imports**

At the top of `src/trigger/processSopScreenshots.ts`, add imports for the two new stages alongside the existing stage imports:

```ts
import { runExtractClips } from "./stages/extractClips";
import { runUploadClips, composeClipSteps } from "./stages/uploadClips";
```

- [ ] **Step 2: Declare the clip-dispose handle at outer scope**

Find the line `let pool: Awaited<ReturnType<typeof runBuildFramePool>> | undefined;` (~line 89). Immediately after it, add:

```ts
      let clipDispose: (() => Promise<void>) | undefined;
```

- [ ] **Step 3: Replace the Stage 0 gate with the router**

Find this block (~lines 104-116):

```ts
      if (!decideAppGate(analysis.appUIFrameCount, analysis.totalFrames)) {
        logger.info("rejected: not an app recording", {
          sopId: _id.toHexString(),
          appUIFrameCount: analysis.appUIFrameCount,
          totalFrames: analysis.totalFrames,
        });
        return fail(_id, "not_an_app");
      }
      const { category, domainSummary, appType, industry } = analysis;
```

Replace it with:

```ts
      if (analysis.appType === "none") {
        logger.info("rejected: not a usable recording", {
          sopId: _id.toHexString(),
          appUIFrameCount: analysis.appUIFrameCount,
          totalFrames: analysis.totalFrames,
        });
        return fail(_id, "not_an_app");
      }
      const isPhysical = analysis.appType === "physical";
      if (!isPhysical && !decideAppGate(analysis.appUIFrameCount, analysis.totalFrames)) {
        logger.info("rejected: not an app recording", {
          sopId: _id.toHexString(),
          appUIFrameCount: analysis.appUIFrameCount,
          totalFrames: analysis.totalFrames,
        });
        return fail(_id, "not_an_app");
      }
      const { category, domainSummary, appType, industry } = analysis;
```

The `updateOne` persisting `category`/`domainSummary`/`appType`/`industry` immediately below is unchanged and still runs for both paths.

`analysis` is the resolved `VideoAnalysisOutput` (`runAnalyzeVideo`'s return type). Its `appType` field is a required `z.enum(["web","mobile","desktop","physical","none"])` — never `undefined` — so the `=== "none"` / `=== "physical"` checks are exhaustive and type-safe.

- [ ] **Step 4: Wrap the screen back-half — insert the physical branch + `else {` opener**

The screen back-half runs from the `// Stage 4: build frame pool.` comment (~line 202) through the `sop_completed` event insert (~line 331), ending just before the `} finally {` at ~line 332.

This step inserts **only the opening**: the physical branch followed by `} else {`. The matching closing `}` for the `else` is added in Step 5 (folded into the `finally`-block edit) — this avoids an ambiguous edit anchor, because the physical branch below contains its own `sop_completed` insert identical to the screen path's.

Insert the following immediately before `// Stage 4: build frame pool.` (i.e. the new text ends with `} else {` and the existing `// Stage 4` line follows it):

```ts
      if (isPhysical) {
        // Physical path: extract one clip per step, upload, compose.
        await setStatus(_id, "building-clips", { title });
        let extracted;
        try {
          extracted = await runExtractClips({
            srcPath: src.srcPath,
            steps: resolved.map(r => ({ startTime: r.startTime, endTime: r.endTime })),
          });
          clipDispose = extracted.dispose;
        } catch (e) {
          logger.error("clip extraction failed", { e: String(e) });
          return fail(_id, "clip_extract_failed");
        }

        await setStatus(_id, "uploading-clips");
        const clipsByStep = await runUploadClips({
          sopId: _id.toHexString(),
          clips: extracted.clips,
        });

        const stepsOut: Step[] = composeClipSteps(resolved, clipsByStep);

        await (await sops()).updateOne(
          { _id },
          { $set: { title, steps: stepsOut, status: "done" as SopStatus, updatedAt: new Date() } },
        );
        await (await events()).insertOne({
          _id: new ObjectId(), type: "sop_completed", sopId: _id, createdAt: new Date(),
        });
      } else {
      // Stage 4: build frame pool.
      await setStatus(_id, "building-pool", { title });
```

The screen-path lines from `// Stage 4` through the `sop_completed` insert are now inside the `else` block. **Leave their indentation unchanged** — do NOT re-indent the moved region. `tsc` and `next build`/ESLint (`next/core-web-vitals`) do not enforce indentation, re-indenting ~130 lines is error-prone, and — critically — Step 5's edit anchor depends on the `sop_completed` insert keeping its original indentation. The moved block sitting one indent-level shallow inside its `else` is a cosmetic-only difference. The `else`'s closing `}` is **not** added here; Step 5 adds it.

Note on empty extraction: if `resolved` is empty, `composeClipSteps` returns `[]` and the SOP is persisted `done` with zero steps — the same behaviour the screen path already has for an empty `resolved` (there is no separate empty-steps guard in the existing code). No new guard is added; the physical path matches the screen path here.

- [ ] **Step 5: Close the `else` block and dispose the clip temp dir**

Find the `finally` block (~line 332) — the screen path's `sop_completed` insert sits immediately above it:

```ts
      await (await events()).insertOne({
        _id: new ObjectId(), type: "sop_completed", sopId: _id, createdAt: new Date(),
      });
    } finally {
      if (pool) await pool.dispose();
      await src.dispose();
    }
```

Replace it with (this single edit both closes the `else` opened in Step 4 — the `}` before `} finally {` — and adds the clip-dispose call):

```ts
      await (await events()).insertOne({
        _id: new ObjectId(), type: "sop_completed", sopId: _id, createdAt: new Date(),
      });
      }
    } finally {
      if (pool) await pool.dispose();
      if (clipDispose) await clipDispose();
      await src.dispose();
    }
```

This `old_string` is unique in the file (the `} finally {` line anchors it), so the edit is unambiguous even though a second `sop_completed` insert exists in the physical branch.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS — clean. If `ObjectId` / `events` / `Step` / `SopStatus` are reported as undefined in the new physical block, confirm they are already imported at the top of the file (they are used by the existing screen tail) — they should be.

- [ ] **Step 7: Run the full stage test suite to confirm nothing regressed**

Run: `npx tsx --test src/trigger/stages/extractClips.test.ts src/trigger/stages/uploadClips.test.ts src/lib/utils.test.ts`
Expected: PASS — all tests.

- [ ] **Step 8: Commit**

```bash
git add src/trigger/processSopScreenshots.ts
git commit -m "feat(clips): orchestrator routes physical video to the clip pipeline

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: Share API — expose clips

**Files:**
- Create: `src/app/api/share/[token]/mapClips.ts`
- Modify: `src/app/api/share/[token]/route.ts`
- Test: `src/app/api/share/[token]/mapClips.test.ts`

The clip-mapping logic is extracted into a pure, testable helper; the route wires it in.

- [ ] **Step 1: Write the failing test**

Create `src/app/api/share/[token]/mapClips.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { mapClipsForStep } from "./mapClips";
import type { Clip } from "@/lib/mongo";

const clip: Clip = {
  clipId: "c1", r2Key: "sops/S/clips/step-0/c1.mp4",
  posterR2Key: "sops/S/clips/step-0/c1-poster.jpg",
  startTime: 1, endTime: 9, order: 0,
};

test("mapClipsForStep presigns clip + poster keys", async () => {
  const out = await mapClipsForStep([clip], async (key) => `signed:${key}`);
  assert.equal(out.length, 1);
  assert.equal(out[0].clipId, "c1");
  assert.equal(out[0].url, "signed:sops/S/clips/step-0/c1.mp4");
  assert.equal(out[0].posterUrl, "signed:sops/S/clips/step-0/c1-poster.jpg");
  assert.equal(out[0].startTime, 1);
  assert.equal(out[0].endTime, 9);
  assert.equal(out[0].order, 0);
});

test("mapClipsForStep returns [] for an undefined clip array", async () => {
  const out = await mapClipsForStep(undefined, async (k) => `signed:${k}`);
  assert.deepEqual(out, []);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/app/api/share/[token]/mapClips.test.ts`
Expected: FAIL — `mapClipsForStep` is not defined.

- [ ] **Step 3: Implement the helper**

Create `src/app/api/share/[token]/mapClips.ts`:

```ts
import type { Clip } from "@/lib/mongo";

/** A clip as exposed by the share API — presigned, ready for the UI. */
export interface ClipItem {
  clipId: string;
  url: string;
  posterUrl: string;
  startTime: number;
  endTime: number;
  order: number;
}

export type PresignFn = (key: string) => Promise<string>;

/** Presigns a step's clips for the share response. `presign` is injectable. */
export async function mapClipsForStep(
  clips: Clip[] | undefined,
  presign: PresignFn,
): Promise<ClipItem[]> {
  return Promise.all((clips ?? []).map(async (c) => ({
    clipId: c.clipId,
    url: await presign(c.r2Key),
    posterUrl: await presign(c.posterR2Key),
    startTime: c.startTime,
    endTime: c.endTime,
    order: c.order,
  })));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test src/app/api/share/[token]/mapClips.test.ts`
Expected: PASS — both tests.

- [ ] **Step 5: Wire the helper into the route**

In `src/app/api/share/[token]/route.ts`, **replace the existing single line** `import { sops, events } from "@/lib/mongo";` with these three lines (the `NextResponse` and `ObjectId` imports above it are unchanged — do not duplicate them):

```ts
import { sops, events } from "@/lib/mongo";
import { presignGet } from "@/lib/r2";
import { mapClipsForStep } from "./mapClips";
```

Add a TTL constant after the imports:

```ts
const CLIP_URL_TTL_SEC = 21600; // 6 hours — long enough to outlast clip playback
```

Replace the response object's `steps` mapping (currently `steps: doc.steps.map((s, i) => ({ ... }))`) so the mapper is async and emits `clips`:

```ts
  return NextResponse.json({
    title: doc.title,
    category: doc.category,
    createdAt: doc.createdAt,
    steps: await Promise.all(doc.steps.map(async (s, i) => ({
      index: i,
      title: s.title,
      description: s.description,
      startTime: s.startTime,
      endTime: s.endTime,
      screenshots: (s.screenshots ?? []).map(ss => ({
        frameId: ss.frameId,
        url: `/api/screenshots/${sopId}/${ss.frameId}.jpg`,
        t: ss.t,
        order: ss.order,
        description: ss.description,
        highlight: ss.highlight,
        automation: ss.automation,
      })),
      screenshotsError: s.screenshotsError,
      clips: await mapClipsForStep(s.clips, (key) => presignGet(key, CLIP_URL_TTL_SEC)),
      clipsError: s.clipsError,
    }))),
  });
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS — clean. (`presignGet(key, expiresIn)` matches the real signature in `src/lib/r2.ts`.)

- [ ] **Step 7: Commit**

```bash
git add src/app/api/share/[token]/mapClips.ts src/app/api/share/[token]/mapClips.test.ts src/app/api/share/[token]/route.ts
git commit -m "feat(clips): share API exposes presigned clip URLs

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: UI — clip renderer + per-step selection

**Files:**
- Create: `src/components/StepCardClips.tsx`
- Modify: `src/app/share/[token]/page.tsx`

No automated test — the codebase has no React component test harness. Verified by `npx tsc --noEmit` and `npx next build`.

- [ ] **Step 1: Create the `StepCardClips` component**

First **read `src/components/StepCardScreenshots.tsx`** in full. `StepCardClips` must reuse that component's card shell *verbatim* so the two card types look identical on the page — specifically, copy exactly:

- the `<article>` wrapper (its `className`, any `id` attribute such as `id={`step-${index+1}`}`, and any inline `style`),
- the step-number badge markup and classes,
- the title `<h3>` and the description `<p>` markup and classes,
- the `screenshotsError` amber-notice element's markup and classes (for the `clipsError` notice).

Only the body differs: where `StepCardScreenshots` renders its PhotoSwipe image gallery, `StepCardClips` renders a one-column grid of `<video>` players. Create `src/components/StepCardClips.tsx` with this shape — fill the shell pieces marked `/* copy from StepCardScreenshots */` from the file you just read:

```tsx
export type ClipItem = {
  clipId: string;
  url: string;
  posterUrl: string;
  startTime: number;
  endTime: number;
  order: number;
};

export function StepCardClips({
  index,
  title,
  description,
  clips,
  clipsError,
}: {
  index: number;
  title: string;
  description: string;
  clips: ClipItem[];
  clipsError?: string;
}) {
  const sorted = [...clips].sort((a, b) => a.order - b.order);

  return (
    /* <article> wrapper — copy attributes/classes/style from StepCardScreenshots */
    <article /* copy from StepCardScreenshots */>
      {/* step-number badge — copy markup from StepCardScreenshots */}
      {/* <h3> title — copy markup from StepCardScreenshots */}
      {/* <p> description — copy markup from StepCardScreenshots */}

      {sorted.length > 0 ? (
        <div className="grid grid-cols-1 gap-3">
          {sorted.map((c) => (
            <video
              key={c.clipId}
              controls
              preload="metadata"
              poster={c.posterUrl}
              src={c.url}
              className="w-full rounded-lg border border-gray-200 bg-black"
            />
          ))}
        </div>
      ) : clipsError ? (
        /* amber notice — copy the screenshotsError <p> markup/classes from
           StepCardScreenshots, with the text below */
        <p /* copy classes from StepCardScreenshots screenshotsError notice */>
          Clip không khả dụng cho bước này.
        </p>
      ) : null}
    </article>
  );
}
```

Keep the `index`/`title`/`description` prop names and types identical to `StepCardScreenshots` so the page's render loop can pass the same props.

- [ ] **Step 2: Widen the `Step` type and add per-step selection in `page.tsx`**

In `src/app/share/[token]/page.tsx`:

(a) Update the imports (line 4 area) to add the clip component:

```ts
import { StepCardScreenshots, type ScreenshotItem } from "@/components/StepCardScreenshots";
import { StepCardClips, type ClipItem } from "@/components/StepCardClips";
```

(b) Widen the local `Step` type (lines 7-15):

```ts
type Step = {
  index: number;
  title: string;
  description: string;
  startTime?: number;
  endTime?: number;
  screenshots?: ScreenshotItem[];
  screenshotsError?: string;
  clips?: ClipItem[];
  clipsError?: string;
};
```

(c) In the steps render loop (lines 110-119), select the component per step:

```tsx
        <section className="max-w-[840px] mx-auto px-6 md:px-12 py-10 space-y-5">
          {sop.steps.map((s) =>
            (s.clips && s.clips.length > 0) || s.clipsError ? (
              <StepCardClips
                key={s.index}
                index={s.index}
                title={s.title}
                description={s.description}
                clips={s.clips ?? []}
                clipsError={s.clipsError}
              />
            ) : (
              <StepCardScreenshots
                key={s.index}
                index={s.index}
                title={s.title}
                description={s.description}
                screenshots={s.screenshots ?? []}
                screenshotsError={s.screenshotsError}
              />
            ),
          )}
        </section>
```

- [ ] **Step 3: Type-check and build**

Run: `npx tsc --noEmit`
Expected: PASS.

Run: `npx next build`
Expected: build succeeds. (`StepCardScreenshots`'s `screenshots` prop is `ScreenshotItem[]`; passing `s.screenshots ?? []` satisfies it. If `StepCardScreenshots` declares `screenshots` as required and non-nullable, `?? []` covers it.)

- [ ] **Step 4: Commit**

```bash
git add src/components/StepCardClips.tsx src/app/share/[token]/page.tsx
git commit -m "feat(clips): StepCardClips renderer + per-step component selection

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Processing-status page — new statuses

**Files:**
- Modify: `src/app/processing/[id]/page.tsx`

No automated test. Verified by `npx tsc --noEmit`.

- [ ] **Step 1: Add the two statuses to the local `Status` union**

In `src/app/processing/[id]/page.tsx`, update the `Status` type (lines 11-14):

```ts
type Status =
  | "uploading" | "ingesting" | "analyzing" | "transcribing" | "normalizing"
  | "generating" | "building-pool" | "assigning" | "uploading-screenshots"
  | "building-clips" | "uploading-clips"
  | "done" | "failed";
```

- [ ] **Step 2: Map the new statuses in `STATUS_STEP_INDEX`**

Update `STATUS_STEP_INDEX` (lines 24-31) — `building-clips` shares the progress index of `building-pool` (4) and `uploading-clips` shares `uploading-screenshots` (4):

```ts
const STATUS_STEP_INDEX: Record<Status, number> = {
  uploading: 0, ingesting: 0, analyzing: 0,
  transcribing: 1,
  normalizing: 2,
  generating: 3,
  "building-pool": 4, "assigning": 4, "uploading-screenshots": 4,
  "building-clips": 4, "uploading-clips": 4,
  done: 5, failed: 0,
};
```

- [ ] **Step 3: Add a `clip_extract_failed` message to `ERROR_MSG`**

In the `ERROR_MSG` map (lines 33-45), add an entry after `screenshot_pool_failed`:

```ts
  screenshot_pool_failed: "Lỗi tạo ảnh chụp màn hình. Vui lòng thử lại.",
  clip_extract_failed: "Lỗi cắt video thành các đoạn. Vui lòng thử lại.",
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS — `STATUS_STEP_INDEX` is `Record<Status, number>`, so the two new union members are required keys; adding them keeps the record exhaustive.

- [ ] **Step 5: Commit**

```bash
git add src/app/processing/[id]/page.tsx
git commit -m "feat(clips): processing page handles building-clips/uploading-clips statuses

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Verification (after all tasks)

- [ ] `npx tsc --noEmit` — clean.
- [ ] `npx tsx --test src/lib/utils.test.ts src/trigger/lib/extractClip.test.ts src/trigger/stages/extractClips.test.ts src/trigger/stages/uploadClips.test.ts src/app/api/share/[token]/mapClips.test.ts` — all pass.
- [ ] `npx next build` — succeeds.
- [ ] Spec coverage check: `Clip` model + statuses + error code (Task 1), `extractClip` helper (Task 2), `runExtractClips` (Task 3), `runUploadClips` with `putObject` DI + `composeClipSteps` pure compose test (Task 4), Stage 0 routing + physical branch + dispose (Task 5), share API presigned clips (Task 6), `StepCardClips` + per-step selection (Task 7), processing-page statuses (Task 8).
- [ ] End-to-end: trigger a run on a physical-process video; confirm `appType: "physical"`, status reaches `done`, each step has one `clip` with a playable mp4 + poster, and the share page renders `<video>` players.
