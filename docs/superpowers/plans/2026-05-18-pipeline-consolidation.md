# Pipeline Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the project to a single screenshots SOP pipeline that gates on
app-recording content and supports both narrated and silent videos.

**Architecture:** One trigger task (`process-sop-screenshots`). A new Stage 0
vision stage (`analyzeVideo`) gates every video on app content and returns
`category`/`domainSummary`. After the gate, a speech/silent branch sources the
step list; from frame-pool building onward the path is identical. The
document/clip/PDF pipeline is deleted.

**Tech Stack:** TypeScript, Next.js, trigger.dev v4, MongoDB, `node:test`, zod,
OpenRouter (`llmJsonVision`), `sharp`/`ffmpeg`.

**Reference spec:** `docs/superpowers/specs/2026-05-18-pipeline-consolidation-design.md`

**Conventions:**
- Work directly on `master`. Never use `--no-verify`. Never create empty commits.
- Run a single test file: `npx tsx --test <path-to-test-file>`.
- Typecheck: `npx tsc --noEmit`.
- Commit messages end with: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`

**Task ordering rationale:** Tasks 1–4 are additive or self-contained and leave
`tsc` green after each. Task 5 deletes the document pipeline (large but atomic —
you cannot half-delete a pipeline). Task 6 cleans the frontend. Task 7 prunes
DB types last, once nothing references them. Task 8 verifies end-to-end.

---

## File Structure

**New files:**
- `src/trigger/stages/analyzeVideo.ts` — Stage 0: app gate + context.
- `src/trigger/stages/analyzeVideo.test.ts` — its tests.
- `src/trigger/stages/resolveTimes.ts` — `resolveTimes` extracted from `clip.ts`.
- `src/trigger/stages/resolveTimes.test.ts` — renamed from `clip.test.ts`.

**Heavily modified:**
- `src/trigger/processSopScreenshots.ts` — Stage 0, speech/silent branch.
- `src/lib/schemas.ts`, `src/config/index.ts`, `src/lib/mongo.ts` — schema/config/type changes.

**Deleted:** the document/clip/PDF pipeline (see Task 5 and Task 6).

---

## Task 1: Schemas, config, and codes (additive)

Pure additions — nothing is removed here, so `tsc` stays green throughout.

**Files:**
- Modify: `src/lib/schemas.ts`
- Modify: `src/lib/mongo.ts`
- Modify: `src/config/index.ts`

- [ ] **Step 1: Add the `VideoAnalysisOutput` schema**

In `src/lib/schemas.ts`, after the `CanonicalizationOutput` block, add:

```typescript
export const VideoAnalysisOutput = z.object({
  appUIFrameCount: z.number().int().nonnegative(),
  totalFrames: z.number().int().nonnegative(),
  appType: z.enum(["web", "mobile", "desktop", "none"]),
  category: z.string(),
  domainSummary: z.string(),
});
```

- [ ] **Step 2: Add error codes**

In `src/lib/mongo.ts`, in the `ErrorCode` union, add two members (place them
after `"screenshot_pool_failed"`):

```typescript
  | "not_an_app"           // Stage 0: < 50% of sampled frames show an app UI
  | "analysis_failed"      // Stage 0: the analysis VLM call errored (retryable)
```

- [ ] **Step 3: Add `appType` to `SopDoc`**

In `src/lib/mongo.ts`, in the `SopDoc` interface, add this field (place it after
`inputMode`):

```typescript
  appType?: "web" | "mobile" | "desktop" | "none"; // detected by Stage 0
```

- [ ] **Step 4: Add the `analyzeVideoSystem` prompt**

In `src/config/index.ts`, inside `ai.prompts`, add a new prompt. Place it after
`canonicalizeSystem`. It must follow the same `(lang: string) =>` shape as the
neighbouring prompts:

```typescript
      analyzeVideoSystem: (lang: string) =>
        `You analyze frames sampled evenly across a how-to video to decide ` +
        `whether it is a screen recording of a software application.\n` +
        `An "app UI" frame shows a web app, mobile app, or desktop app — ` +
        `windows, toolbars, forms, menus, buttons, lists. NOT an app UI: a ` +
        `person talking to camera, a slideshow/presentation, real-world ` +
        `footage, a static title card, or gameplay.\n` +
        `Count how many of the given frames show an app UI. Pick the single ` +
        `best overall appType: "web", "mobile", "desktop", or "none" (use ` +
        `"none" if it is not an app recording).\n` +
        `Also return a short freeform "category" naming the domain/industry ` +
        `and a one-sentence "domainSummary".\n` +
        config.ai.prompts.languageRule(lang) + "\n" +
        `Return JSON: { "appUIFrameCount": int, "totalFrames": int, ` +
        `"appType": "web"|"mobile"|"desktop"|"none", "category": string, ` +
        `"domainSummary": string }. "totalFrames" MUST equal the number of ` +
        `frames provided.`,
```

Note: `config.ai.prompts.languageRule` is a defined helper in `config/index.ts`
(currently unused — no existing prompt calls it). Calling it here is valid and
compiles. If you prefer to match the sibling prompts, note they instead inline a
`LANGUAGE:`-style rule as a literal string — either approach works; the call
above is the simplest.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS (no errors).

- [ ] **Step 6: Commit**

```bash
git add src/lib/schemas.ts src/lib/mongo.ts src/config/index.ts
git commit -m "$(cat <<'EOF'
feat(schema): add VideoAnalysisOutput, appType, analyze error codes + prompt

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: `analyzeVideo` stage (Stage 0)

The vision gate. `sampleFrames` gains an explicit-count option; `analyzeVideo`
samples `[8,20]` frames, calls a VLM, and exposes a pure `decideAppGate`.

**Files:**
- Modify: `src/trigger/lib/sampleFrames.ts`
- Create: `src/trigger/stages/analyzeVideo.ts`
- Test: `src/trigger/stages/analyzeVideo.test.ts`

- [ ] **Step 1: Extend `sampleFrames` to accept an explicit frame count**

In `src/trigger/lib/sampleFrames.ts`, change the `sampleFrames` signature so
`opts` accepts either a mode or an explicit count. Replace the `opts: { mode:
SampleMode }` parameter and the first body line that computes `count`:

```typescript
export async function sampleFrames(
  srcPath: string,
  durationSec: number,
  opts: { mode: SampleMode } | { count: number }
): Promise<{
  paths: string[];
  timestamps: number[];
  tmpDir: string;
  dispose: () => Promise<void>;
}> {
  const count = "count" in opts
    ? Math.max(1, Math.floor(opts.count))
    : computeFrameCount({ durationSec, mode: opts.mode });
```

The rest of the function body is unchanged.

- [ ] **Step 2: Write the failing test for `decideAppGate` and `computeAppGateFrameCount`**

Create `src/trigger/stages/analyzeVideo.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert";
import { computeAppGateFrameCount, decideAppGate, runAnalyzeVideo } from "./analyzeVideo";

test("computeAppGateFrameCount clamps to [8,20]", () => {
  assert.equal(computeAppGateFrameCount(60), 8);     // 1 min -> 1, clamped to 8
  assert.equal(computeAppGateFrameCount(300), 8);    // 5 min -> 5, clamped to 8
  assert.equal(computeAppGateFrameCount(600), 10);   // 10 min -> 10
  assert.equal(computeAppGateFrameCount(1200), 20);  // 20 min -> 20
  assert.equal(computeAppGateFrameCount(3600), 20);  // 60 min -> 60, clamped to 20
});

test("decideAppGate accepts at exactly 50%", () => {
  assert.equal(decideAppGate(10, 20), true);
  assert.equal(decideAppGate(5, 10), true);
});

test("decideAppGate rejects below 50%", () => {
  assert.equal(decideAppGate(8, 20), false);
  assert.equal(decideAppGate(4, 10), false);
});

test("decideAppGate rejects when totalFrames is 0", () => {
  assert.equal(decideAppGate(0, 0), false);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx tsx --test src/trigger/stages/analyzeVideo.test.ts`
Expected: FAIL — `Cannot find module './analyzeVideo'`.

- [ ] **Step 4: Implement `analyzeVideo.ts`**

Create `src/trigger/stages/analyzeVideo.ts`:

```typescript
import type { z } from "zod";
import { llmJsonVision } from "@/lib/openrouter";
import { VideoAnalysisOutput } from "@/lib/schemas";
import { config } from "@/config";
import { sampleFrames } from "@/trigger/lib/sampleFrames";

export type AnalyzeVisionFn = (opts: {
  model: string;
  system: string;
  userText: string;
  imagePaths: string[];
  schema: typeof VideoAnalysisOutput;
  schemaName: string;
  maxRetries: number;
}) => Promise<z.infer<typeof VideoAnalysisOutput>>;

const defaultVisionFn: AnalyzeVisionFn = llmJsonVision;

/** ~1 frame per minute, clamped to [8, 20]. */
export function computeAppGateFrameCount(durationSec: number): number {
  return Math.max(8, Math.min(20, Math.round(durationSec / 60)));
}

/** Accept the video if at least half the sampled frames show an app UI. */
export function decideAppGate(appUIFrameCount: number, totalFrames: number): boolean {
  if (totalFrames <= 0) return false;
  return appUIFrameCount / totalFrames >= 0.5;
}

/**
 * Stage 0: sample frames across the whole video and ask a VLM to classify how
 * many show a software-application UI, plus an overall appType and the
 * category/domainSummary used downstream. The caller applies `decideAppGate`.
 * Throws on a VLM failure — the caller maps that to `analysis_failed`.
 */
export async function runAnalyzeVideo(args: {
  srcPath: string;
  durationSec: number;
  language: string;
  visionFn?: AnalyzeVisionFn;
}): Promise<z.infer<typeof VideoAnalysisOutput>> {
  const visionFn = args.visionFn ?? defaultVisionFn;
  const count = computeAppGateFrameCount(args.durationSec);
  const frames = await sampleFrames(args.srcPath, args.durationSec, { count });
  try {
    return await visionFn({
      model: config.ai.visionModel,
      system: config.ai.prompts.analyzeVideoSystem(args.language),
      userText:
        `These ${frames.paths.length} frames are sampled evenly across a ` +
        `how-to video. Classify each as an app UI or not, then return the ` +
        `JSON described in the system prompt. totalFrames must be ` +
        `${frames.paths.length}.`,
      imagePaths: frames.paths,
      schema: VideoAnalysisOutput,
      schemaName: "video_analysis",
      maxRetries: config.ai.maxRetries,
    });
  } finally {
    await frames.dispose();
  }
}
```

- [ ] **Step 5: Run the test to verify the pure functions pass**

Run: `npx tsx --test src/trigger/stages/analyzeVideo.test.ts`
Expected: the four pure-function tests PASS.

- [ ] **Step 6: Add a test for `runAnalyzeVideo` (injected vision fn)**

Append to `src/trigger/stages/analyzeVideo.test.ts`:

```typescript
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

async function tmpVideo(): Promise<{ srcPath: string; cleanup: () => Promise<void> }> {
  // sampleFrames runs ffmpeg on this; tests inject a fake visionFn so the
  // ffmpeg output is never inspected — a tiny real mp4 fixture is reused.
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "av-"));
  const srcPath = path.join(dir, "v.mp4");
  await fs.promises.copyFile("samples/trimmed-hubspot_crm.mp4", srcPath);
  return { srcPath, cleanup: () => fs.promises.rm(dir, { recursive: true, force: true }) };
}

test("runAnalyzeVideo returns the vision fn output", async () => {
  const { srcPath, cleanup } = await tmpVideo();
  try {
    const out = await runAnalyzeVideo({
      srcPath,
      durationSec: 600,
      language: "vi",
      visionFn: async (opts) => {
        assert.ok(opts.imagePaths.length >= 8 && opts.imagePaths.length <= 20);
        return {
          appUIFrameCount: opts.imagePaths.length,
          totalFrames: opts.imagePaths.length,
          appType: "web",
          category: "CRM",
          domainSummary: "A CRM walkthrough.",
        };
      },
    });
    assert.equal(out.appType, "web");
    assert.equal(out.appUIFrameCount, out.totalFrames);
  } finally {
    await cleanup();
  }
});

test("runAnalyzeVideo propagates a vision fn error", async () => {
  const { srcPath, cleanup } = await tmpVideo();
  try {
    await assert.rejects(
      runAnalyzeVideo({
        srcPath,
        durationSec: 600,
        language: "vi",
        visionFn: async () => { throw new Error("provider down"); },
      }),
      /provider down/,
    );
  } finally {
    await cleanup();
  }
});
```

- [ ] **Step 7: Run the full test file**

Run: `npx tsx --test src/trigger/stages/analyzeVideo.test.ts`
Expected: all six tests PASS. (The two `runAnalyzeVideo` tests invoke real
ffmpeg via `sampleFrames`; allow a few seconds.)

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/trigger/lib/sampleFrames.ts src/trigger/stages/analyzeVideo.ts src/trigger/stages/analyzeVideo.test.ts
git commit -m "$(cat <<'EOF'
feat(analyze): add analyzeVideo Stage 0 app-recording gate

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Extract `resolveTimes` into its own file

`resolveTimes` (currently in `clip.ts`) must survive the deletion of the clip
pipeline. Move it to a dedicated file; leave `clip.ts` with only `runClip` (it
is deleted in Task 5 along with its only caller, `processSop.ts`).

**Files:**
- Create: `src/trigger/stages/resolveTimes.ts`
- Create: `src/trigger/stages/resolveTimes.test.ts` (content from `clip.test.ts`)
- Delete: `src/trigger/stages/clip.test.ts`
- Modify: `src/trigger/stages/clip.ts`, `src/trigger/processSopScreenshots.ts`, `src/trigger/processSop.ts`

- [ ] **Step 1: Create `resolveTimes.ts`**

Create `src/trigger/stages/resolveTimes.ts`:

```typescript
import type { Segment } from "@/lib/mongo";

export function resolveTimes(
  rawSegments: Segment[],
  extractedSteps: { title: string; description: string; startSegmentId: number; endSegmentId: number }[],
  videoDurationSec: number
): { title: string; description: string; startTime: number; endTime: number }[] {
  const byId = new Map(rawSegments.map(s => [s.id, s]));
  const resolved: { title: string; description: string; startTime: number; endTime: number }[] = [];
  let prevEnd = 0;
  for (const s of extractedSteps) {
    const a = byId.get(s.startSegmentId);
    const b = byId.get(s.endSegmentId);
    if (!a || !b) continue;
    let start = Math.max(0, Math.min(a.start, videoDurationSec));
    const end  = Math.max(0, Math.min(b.end, videoDurationSec));
    if (end <= start) continue;
    if (start < prevEnd) start = prevEnd; // keep monotonic
    if (end <= start) continue;
    prevEnd = end;
    resolved.push({ title: s.title, description: s.description, startTime: start, endTime: end });
  }
  return resolved;
}
```

- [ ] **Step 2: Remove `resolveTimes` from `clip.ts`**

In `src/trigger/stages/clip.ts`, delete the entire `resolveTimes` function
(lines 11-32). Keep `runClip` and everything else. The `import type { Segment, Step }`
line becomes `import type { Step }` if `Segment` is now unused — check and adjust.

- [ ] **Step 3: Repoint the `resolveTimes` importers**

In `src/trigger/processSopScreenshots.ts`, change line 13 from
`import { resolveTimes } from "./stages/clip";` to:

```typescript
import { resolveTimes } from "./stages/resolveTimes";
```

In `src/trigger/processSop.ts`, change line 13 from
`import { resolveTimes, runClip } from "./stages/clip";` to:

```typescript
import { runClip } from "./stages/clip";
import { resolveTimes } from "./stages/resolveTimes";
```

- [ ] **Step 4: Create `resolveTimes.test.ts` and delete `clip.test.ts`**

Create `src/trigger/stages/resolveTimes.test.ts` with the content of the current
`src/trigger/stages/clip.test.ts`, but change the import line to:

```typescript
import { resolveTimes } from "./resolveTimes";
```

Then delete `src/trigger/stages/clip.test.ts`.

- [ ] **Step 5: Run the test**

Run: `npx tsx --test src/trigger/stages/resolveTimes.test.ts`
Expected: PASS (`resolveTimes clamps, orders, drops invalid`).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/trigger/stages/resolveTimes.ts src/trigger/stages/resolveTimes.test.ts src/trigger/stages/clip.ts src/trigger/stages/clip.test.ts src/trigger/processSopScreenshots.ts src/trigger/processSop.ts
git commit -m "$(cat <<'EOF'
refactor(resolveTimes): extract from clip.ts into its own module

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Rewrite `processSopScreenshots.ts` (Stage 0 + speech/silent branch)

Rewrite the control flow: download the source video once up front, run Stage 0,
gate, transcribe, branch into speech/silent heads, converge, run the shared
spine.

**Files:**
- Modify (full rewrite of the body): `src/trigger/processSopScreenshots.ts`

- [ ] **Step 1: Replace the entire file**

Replace the full contents of `src/trigger/processSopScreenshots.ts` with:

```typescript
import { task, logger } from "@trigger.dev/sdk/v3";
import { ObjectId } from "mongodb";
import { sops, events, type ErrorCode, type SopStatus, type Step, type Screenshot } from "@/lib/mongo";
import { config } from "@/config";
import { probeDuration } from "./lib/probe";
import { presignGet } from "@/lib/r2";
import { fetchSourceVideo } from "./lib/videoTmp";
import { sampleFrames } from "./lib/sampleFrames";
import { hasUsableSpeech } from "./lib/branchDecision";
import { runAnalyzeVideo, decideAppGate } from "./stages/analyzeVideo";
import { runTranscribe } from "./stages/transcribe";
import { runNormalize } from "./stages/normalize";
import { runExtract } from "./stages/extract";
import { runVisualExtract } from "./stages/visualExtract";
import { resolveTimes } from "./stages/resolveTimes";
import { runBuildFramePool } from "./stages/buildFramePool";
import { runUploadScreenshots } from "./stages/uploadScreenshots";
import { buildScreenClusters } from "@/trigger/lib/screenId";
import { runExtractClickEvents } from "./stages/extractClickEvents";
import { runClassifyAndMergeEvents } from "./stages/classifyAndMergeEvents";
import { classifyAndRemap } from "./stages/classifyStepWithLLM";
import { canonicalizeActions } from "./stages/canonicalizeActions";
import { buildActionsForStep } from "./stages/buildActionsForStep";
import { collapseDuplicateActions } from "./stages/collapseDuplicateActions";
import { highlightActions } from "./stages/highlightActions";
import { runWithCostTracking, withStage, recordCost } from "@/lib/aiCost";
import type { Action } from "@/lib/schemas";

type ResolvedStep = { title: string; description: string; startTime: number; endTime: number };

async function setStatus(id: ObjectId, status: SopStatus, extra: Record<string, unknown> = {}) {
  await (await sops()).updateOne({ _id: id }, { $set: { status, updatedAt: new Date(), ...extra } });
}
async function fail(id: ObjectId, errorCode: ErrorCode) {
  await (await sops()).updateOne({ _id: id }, { $set: { status: "failed", errorCode, updatedAt: new Date() } });
}

export const processSopScreenshots = task({
  id: "process-sop-screenshots",
  maxDuration: 60 * 40,
  run: async (payload: { sopId: string }) => {
    const _id = new ObjectId(payload.sopId);
    const { summary: aiCost } = await runWithCostTracking(() => runPipeline(_id));

    try {
      await (await sops()).updateOne(
        { _id },
        { $set: { aiCost, updatedAt: new Date() } },
      );
    } catch (e) {
      logger.error("aiCost write failed", { e: String(e) });
    }
    logger.info("pipeline.cost", {
      sopId: _id.toHexString(),
      totalUSD: aiCost.totalUSD,
      exactUSD: aiCost.exactUSD,
      estimatedUSD: aiCost.estimatedUSD,
      callCount: aiCost.callCount,
      byStage: aiCost.byStage,
    });
  },
});

async function runPipeline(_id: ObjectId): Promise<void> {
  const doc = await (await sops()).findOne({ _id });
  if (!doc || !doc.videoR2Key) { logger.error("sop not found"); return; }

  const signedVideo = await presignGet(doc.videoR2Key, 3600);
  const defaultLanguage = doc.defaultLanguage ?? "vi";

  try {
    // Pre-stage: duration probe.
    let durationSec: number;
    try {
      durationSec = await probeDuration(signedVideo);
      if (durationSec < config.limits.minVideoDurationSec) return fail(_id, "video_too_short");
      if (durationSec > config.limits.maxVideoDurationSec) return fail(_id, "video_too_long");
    } catch (e) {
      logger.error("probe failed", { e: String(e) });
      return fail(_id, "unknown");
    }

    // Download the source video once — Stage 0, the silent head, and the
    // frame pool all read from it.
    let src;
    try { src = await fetchSourceVideo(doc.videoR2Key); }
    catch (e) { logger.error("source download failed", { e: String(e) }); return fail(_id, "video_download_failed"); }

    let pool: Awaited<ReturnType<typeof runBuildFramePool>> | undefined;
    try {
      // Stage 0: analyze video — app-recording gate + category/domainSummary.
      await setStatus(_id, "analyzing");
      let analysis;
      try {
        analysis = await withStage("analyze", () => runAnalyzeVideo({
          srcPath: src.srcPath,
          durationSec,
          language: defaultLanguage,
        }));
      } catch (e) {
        logger.error("analyze failed", { e: String(e) });
        return fail(_id, "analysis_failed");
      }
      if (!decideAppGate(analysis.appUIFrameCount, analysis.totalFrames)) {
        logger.info("rejected: not an app recording", {
          sopId: _id.toHexString(),
          appUIFrameCount: analysis.appUIFrameCount,
          totalFrames: analysis.totalFrames,
        });
        return fail(_id, "not_an_app");
      }
      const { category, domainSummary, appType } = analysis;
      await (await sops()).updateOne(
        { _id },
        { $set: { category, domainSummary, appType, updatedAt: new Date() } },
      );

      // Stage 1: transcribe (always run).
      await setStatus(_id, "transcribing");
      let stage1;
      try {
        stage1 = await withStage("transcribe", async () => {
          const r = await runTranscribe(signedVideo);
          if (r.segments.length > 0) {
            recordCost({
              provider: "fal",
              model: "fal-ai/whisper",
              promptTokens: 0,
              completionTokens: 0,
              costUSD: (durationSec / 60) * config.costs.whisperPerMinuteUSD,
              estimated: true,
            });
          }
          return r;
        });
      }
      catch (e) { logger.error("transcribe failed", { e: String(e) }); return fail(_id, "transcription_failed"); }
      const { transcript, segments, language } = stage1;

      // Branch on usable speech (not on the presence of an audio track —
      // a silent video may still carry music or UI sounds).
      const useSpeech = hasUsableSpeech({ segments, transcript });
      const inputMode: "speech" | "silent" = useSpeech ? "speech" : "silent";
      logger.info("branch chosen", { sopId: _id.toHexString(), inputMode });

      let title: string;
      let resolved: ResolvedStep[];
      let outputLanguage: string;

      if (useSpeech) {
        // Narrated: trust Whisper's detected language for all output.
        outputLanguage = language!;
        await (await sops()).updateOne(
          { _id },
          { $set: { transcript, segments, language, inputMode, updatedAt: new Date() } },
        );

        // Stage 2: normalize (in source language).
        await setStatus(_id, "normalizing");
        const segmentsClean = await withStage("normalize", () => runNormalize(segments, language!));
        await (await sops()).updateOne({ _id }, { $set: { segmentsClean, updatedAt: new Date() } });

        // Stage 3: extract step list from the transcript.
        await setStatus(_id, "generating");
        let extracted;
        try { extracted = await withStage("extract", () => runExtract({ segmentsClean, category, domainSummary, language: outputLanguage })); }
        catch (e) { logger.error("extract failed", { e: String(e) }); return fail(_id, "generation_failed"); }
        title = extracted.title;
        resolved = resolveTimes(segments, extracted.steps, durationSec);
      } else {
        // Silent: no transcript — use the upload-form default language.
        outputLanguage = defaultLanguage;
        await (await sops()).updateOne(
          { _id },
          { $set: { transcript: "", segments: [], language: outputLanguage, inputMode, updatedAt: new Date() } },
        );

        // Stage 3 (silent): extract step list from sampled frames.
        await setStatus(_id, "generating");
        let extFrames: Awaited<ReturnType<typeof sampleFrames>> | null = null;
        try {
          try { extFrames = await sampleFrames(src.srcPath, durationSec, { mode: "density" }); }
          catch (e) { logger.error("frame sampling failed", { e: String(e) }); return fail(_id, "frame_sampling_failed"); }
          let extracted;
          try {
            extracted = await withStage("visual-extract", () => runVisualExtract({
              framePaths: extFrames!.paths,
              frameTimestamps: extFrames!.timestamps,
              durationSec,
              category,
              domainSummary,
              language: outputLanguage,
            }));
          } catch (e) { logger.error("visual extract failed", { e: String(e) }); return fail(_id, "visual_extract_failed"); }
          title = extracted.title;
          resolved = extracted.steps;
        } finally {
          if (extFrames) await extFrames.dispose();
        }
      }

      // Stage 4: build frame pool.
      await setStatus(_id, "building-pool", { title });
      try {
        pool = await runBuildFramePool({
          srcPath: src.srcPath,
          sampleFps: config.screenshots.sampleFps,
          filter: {
            motionHammingThreshold: config.screenshots.motionHammingThreshold,
            dedupHammingThreshold: config.screenshots.dedupHammingThreshold,
            dedupWindowSeconds: config.screenshots.dedupWindowSeconds,
            maxPoolSize: config.screenshots.maxPoolSize,
          },
        });
      } catch (e) {
        logger.error("frame pool failed", { e: String(e) });
        return fail(_id, "screenshot_pool_failed");
      }

      // Stage 5: detect click events, classify click-vs-input, merge typing.
      await setStatus(_id, "assigning");
      const stepInputs = resolved.map((rs, i) => ({
        stepIndex: i,
        title: rs.title,
        tStart: rs.startTime,
        tEnd: rs.endTime,
      }));

      let eventsByStep;
      try {
        eventsByStep = await runExtractClickEvents({
          steps: stepInputs.map(s => ({ stepIndex: s.stepIndex, tStart: s.tStart, tEnd: s.tEnd })),
          denseFrames: pool.denseFrames,
          opts: config.screenshots.clickDetect,
          maxCandidatesPerStep: config.screenshots.clickDetect.maxCandidatesPerStep,
        });
      } catch (e) {
        logger.error("click detect failed", { e: String(e) });
        return fail(_id, "screenshot_pool_failed");
      }

      const rawCountByStep = [...eventsByStep.entries()].map(([s, evs]) => ({ stepIndex: s, count: evs.length }));
      logger.info("pipeline.click_events", {
        sopId: _id.toHexString(),
        totalRaw: rawCountByStep.reduce((n, x) => n + x.count, 0),
        byStep: rawCountByStep,
      });

      const merged = runClassifyAndMergeEvents({ byStep: eventsByStep });
      logger.info("pipeline.classify_merge", {
        sopId: _id.toHexString(),
        byStep: [...merged.entries()].map(([s, evs]) => ({
          stepIndex: s,
          count: evs.length,
          inputs: evs.filter(e => e.kindHint === "input").length,
          clicks: evs.filter(e => e.kindHint === "click").length,
        })),
      });

      // Stage 6: per-step LLM classification, dedup + assemble, highlight pass.
      const actionsByStep = new Map<number, Action[]>();
      try {
        for (const step of stepInputs) {
          const stepEvents = merged.get(step.stepIndex) ?? [];
          const clusters = await buildScreenClusters({
            denseFrames: pool.denseFrames,
            stepStart: step.tStart,
            stepEnd: step.tEnd,
            samplingSec: config.screenshots.screenId.samplingSec,
            hammingThreshold: config.screenshots.screenId.hammingThreshold,
          });
          const classified = await withStage("classify", () => classifyAndRemap({
            stepTitle: step.title,
            language: outputLanguage,
            events: stepEvents,
            denseFrames: pool!.denseFrames,
          }));
          const canonical = await withStage("canonicalize", () => canonicalizeActions({
            classified,
            language: outputLanguage,
          }));
          const assembled = buildActionsForStep({
            stepIndex: step.stepIndex,
            classified: canonical,
            screenClusters: clusters,
            eventTimes: stepEvents.map(e => e.time),
            viewMinDurationSec: config.screenshots.screenId.viewMinDurationSec,
            language: outputLanguage,
          });
          const actions = await collapseDuplicateActions({
            actions: assembled,
            gapSec: config.screenshots.classify.duplicateGapSec,
            hammingThreshold: config.screenshots.classify.duplicateHammingThreshold,
          });
          await withStage("highlight", () => highlightActions({ actions }));
          actionsByStep.set(step.stepIndex, actions);
        }
      } catch (e) {
        logger.error("screenshot classification failed", {
          e: String(e),
          stack: e instanceof Error ? e.stack : undefined,
        });
        return fail(_id, "generation_failed");
      }

      await setStatus(_id, "uploading-screenshots");
      const screenshotsByStep = await runUploadScreenshots({
        sopId: _id.toHexString(),
        byStep: actionsByStep,
      });

      // Compose step docs.
      const stepsOut: Step[] = resolved.map((rs, i) => {
        const ss = screenshotsByStep.get(i) ?? [];
        const base: Step = {
          title: rs.title,
          description: rs.description,
          startTime: rs.startTime,
          endTime: rs.endTime,
          clipR2Key: "",
          posterR2Key: "",
          keyframeR2Keys: [],
          screenshots: ss as Screenshot[],
        };
        return base;
      });

      await (await sops()).updateOne(
        { _id },
        { $set: { title, steps: stepsOut, mode: "screenshots", status: "done" as SopStatus, updatedAt: new Date() } },
      );
      await (await events()).insertOne({
        _id: new ObjectId(), type: "sop_completed", sopId: _id, createdAt: new Date(),
      });
    } finally {
      if (pool) await pool.dispose();
      await src.dispose();
    }
  } catch (e) {
    logger.error("processSopScreenshots unhandled", { e: String(e) });
    await fail(_id, "unknown");
  }
}
```

> Note: `clipR2Key`/`posterR2Key`/`keyframeR2Keys` and `mode: "screenshots"`
> are still written here — the `Step`/`SopDoc` types still declare them. Task 7
> removes both the type fields and these writes together.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. (`context.ts`, `visualContext.ts`, `processSop.ts` still exist —
they are deleted in Task 5. Nothing in this rewrite imports them.)

- [ ] **Step 3: Run the existing trigger-stage tests touched indirectly**

Run: `npx tsx --test src/trigger/stages/resolveTimes.test.ts src/trigger/stages/analyzeVideo.test.ts`
Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/trigger/processSopScreenshots.ts
git commit -m "$(cat <<'EOF'
feat(pipeline): Stage 0 app gate + speech/silent branch

Download source once up front; run analyzeVideo gate; branch into
speech (transcript) and silent (visualExtract) heads that converge
on a resolved step list.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Delete the document/clip trigger pipeline + adapt trigger callers

This is one atomic task — the pipeline cannot be half-deleted. After it, `tsc`
must be green again.

**Files:**
- Delete: `src/trigger/processSop.ts`, `src/trigger/generateSopPdf.ts`,
  `src/trigger/stages/clip.ts`, `src/trigger/stages/keyframes.ts`,
  `src/trigger/stages/keyframes.test.ts`, `src/trigger/stages/synthesizeOverview.ts`,
  `src/trigger/stages/synthesizeStep.ts`, `src/trigger/stages/synthesizeStep.test.ts`,
  `src/trigger/stages/renderPdf.tsx`, `src/trigger/stages/renderPdf.test.ts`,
  `src/trigger/stages/visualStep.ts`, `src/trigger/stages/visualStep.test.ts`,
  `src/trigger/stages/visualOverview.ts`, `src/trigger/stages/visualOverview.test.ts`,
  `src/trigger/stages/context.ts`, `src/trigger/stages/visualContext.ts`
- Modify: `src/trigger/ingestLoom.ts`, `src/trigger/cleanupVideos.ts`,
  `src/lib/utils.ts`, `src/lib/schemas.ts`, `src/config/index.ts`

- [ ] **Step 1: Delete the document/clip stage files**

```bash
git rm src/trigger/processSop.ts src/trigger/generateSopPdf.ts \
  src/trigger/stages/clip.ts src/trigger/stages/keyframes.ts \
  src/trigger/stages/synthesizeOverview.ts src/trigger/stages/synthesizeStep.ts \
  src/trigger/stages/renderPdf.tsx src/trigger/stages/visualStep.ts \
  src/trigger/stages/visualOverview.ts src/trigger/stages/context.ts \
  src/trigger/stages/visualContext.ts
```

Then delete the test files for these deleted stages (run `ls
src/trigger/stages/*.test.ts` first to confirm which exist, then `git rm`
each): `keyframes.test.ts`, `synthesizeStep.test.ts`, `renderPdf.test.ts`,
`visualStep.test.ts`, `visualOverview.test.ts`, `visualContext.test.ts`.
(`context.ts` and `synthesizeOverview.ts` have no test file.)

- [ ] **Step 2: Adapt `ingestLoom.ts` to trigger the screenshots task**

In `src/trigger/ingestLoom.ts`, both `tasks.trigger("process-sop", …)` calls
(around lines 65 and 106) and their idempotency keys must change. Replace the
task id `"process-sop"` with `"process-sop-screenshots"` in both calls, and
change the idempotency key from `` `${payload.sopId}-process-sop` `` to
`` `${payload.sopId}-process-sop-screenshots` `` in both. Also update the log
line at ~line 63 (`"ingestLoom: resuming process-sop trigger"`) to say
`process-sop-screenshots`.

- [ ] **Step 3: Adapt `cleanupVideos.ts` — remove the stale-PDF sweep**

In `src/trigger/cleanupVideos.ts`, delete the entire "Sweep stale PDFs" block
(the `const stalePdfBefore …` through the `for (const d of stalePdfs)` loop).
Remove the `PDF_TTL_MS` constant (search for it near the top of the file).
Update the final log line — change `` `cleanup: videos=${expired.length} pdfs=${stalePdfs.length} stuckIngest=${stuck.length}` ``
to `` `cleanup: videos=${expired.length} stuckIngest=${stuck.length}` ``.
If `deleteObject` is now unused, remove its import.

- [ ] **Step 4: Remove the orphaned `pdfKey` helper from `utils.ts`**

In `src/lib/utils.ts`, delete the `pdfKey` function (around lines 28-30). Leave
`clipKey`/`posterKey` if other code still uses them — verify with
`grep -rn "clipKey\|posterKey" src/`; if they are unused after this task,
remove them too.

- [ ] **Step 5: Remove orphaned schemas**

In `src/lib/schemas.ts`, delete the `OverviewOutput`, `StepRewriteOutput`, and
`ContextOutput` schema declarations. Keep `VisualSopExtractOutput` (used by
`visualExtract.ts`) and `VideoAnalysisOutput`.

- [ ] **Step 6: Remove orphaned config**

In `src/config/index.ts`:
- Remove the `contextModel` and `pdfModel` fields from the `ai` object.
- Remove these prompts from `ai.prompts`: `contextSystem`, `pdfOverviewSystem`,
  `pdfStepSystem`, `visualContextSystem`, `pdfVisualOverviewSystem`,
  `pdfVisualStepSystem`.
- Keep `visualSopSystem` (used by `visualExtract.ts`), `visionModel`, and the
  new `analyzeVideoSystem`.

- [ ] **Step 7: Typecheck — the regression gate**

Run: `npx tsc --noEmit`
Expected: PASS. If it fails, a surviving file still imports a deleted file,
schema, or prompt. Fix the importer (it should be in Task 6's scope) or confirm
the deletion list. Do not proceed until green.

- [ ] **Step 8: Run the full trigger test suite**

Run: `npx tsx --test src/trigger/stages/*.test.ts src/trigger/*.test.ts`
Expected: all PASS (no test references a deleted stage).

- [ ] **Step 9: Commit**

```bash
git add -A src/trigger src/lib/schemas.ts src/lib/utils.ts src/config/index.ts
git commit -m "$(cat <<'EOF'
feat(pipeline): delete document/clip pipeline, adapt trigger callers

Remove processSop, PDF/clip/keyframe/synthesize/visual* stages;
ingestLoom triggers process-sop-screenshots; drop stale-PDF sweep,
pdfKey helper, orphaned schemas and config.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Delete the frontend clip/PDF surface + adapt routes and pages

**Files:**
- Delete: `src/app/api/sop/[id]/pdf/route.ts`, `src/app/api/sop/[id]/pdf/file/route.ts`,
  `src/app/api/clips/[sopId]/[key]/route.ts`, `src/components/ExportPdfButton.tsx`,
  `src/components/HeroVideo.tsx`, `src/components/StepCard.tsx`
- Modify: `src/app/api/sop/[id]/route.ts`, `src/app/api/screenshots/[sopId]/[key]/route.ts`,
  `src/app/api/share/[token]/route.ts`, `src/app/sop/[id]/page.tsx`,
  `src/app/share/[token]/page.tsx`, `src/components/UploadZone.tsx`,
  `src/app/processing/[id]/page.tsx`, `src/app/api/upload/commit/route.ts`

- [ ] **Step 1: Delete the clip/PDF route and component files**

```bash
git rm "src/app/api/sop/[id]/pdf/route.ts" "src/app/api/sop/[id]/pdf/file/route.ts" \
  "src/app/api/clips/[sopId]/[key]/route.ts" \
  src/components/ExportPdfButton.tsx src/components/HeroVideo.tsx src/components/StepCard.tsx
```

If the `src/app/api/sop/[id]/pdf` and `src/app/api/clips` directories are now
empty, remove them.

- [ ] **Step 2: Adapt `src/app/api/upload/commit/route.ts`**

Remove the `mode` field from the `Body` zod schema (line ~10), the `mode` from
the persisted doc (line ~24), and the `taskId` ternary (line ~34). The trigger
call always uses `"process-sop-screenshots"`:

```typescript
  const handle = await tasks.trigger("process-sop-screenshots", { sopId: id });
```

(Match the existing variable name and surrounding code; only the task id and the
removal of the branch change.)

- [ ] **Step 3: Adapt `src/app/api/sop/[id]/route.ts`**

Remove the `const mode = doc.mode ?? "clips";` line, the `mode` field in the
response, the `pdf` object (the `pdf: { … }` block), and the per-step `clipUrl`
and `posterUrl` fields. The response keeps `id`, `title`, `category`,
`createdAt`, `shareToken`, and the `steps` array with `index`, `title`,
`description`, `startTime`, `endTime`, `screenshots`, `screenshotsError`.

- [ ] **Step 4: Adapt `src/app/api/screenshots/[sopId]/[key]/route.ts`**

Remove the `if (doc.mode !== "screenshots") return …404…` line. The query
already filters `status: "done"` and `projection: { mode: 1, steps: 1 }` —
change the projection to `{ steps: 1 }` (drop `mode`). The route now serves
screenshots for any done SOP.

- [ ] **Step 5: Adapt `src/app/api/share/[token]/route.ts`**

Remove the per-step `clipUrl` and `posterUrl` fields (the two lines building
`/api/clips/...` URLs). Keep the rest of the per-step shape.

- [ ] **Step 6: Adapt `src/app/sop/[id]/page.tsx`**

- Remove the `HeroVideo`, `ExportPdfButton`, and `StepCard` imports.
- In the `Sop` / `Step` types, remove the `mode`, `pdf`, and `clipUrl` fields.
- Remove the `{sop.mode !== "screenshots" && (…ExportPdfButton…)}` block.
- Remove the `{sop.mode !== "screenshots" && …(<HeroVideo …/>)}` block.
- Remove the `mode`-conditional clip-vs-screenshot branch; always render the
  screenshots view (`StepCardScreenshots`).

- [ ] **Step 7: Adapt `src/app/share/[token]/page.tsx`**

- Remove `clipUrl` and `posterUrl` from the `Step` type.
- Remove the `posterUrl` `<img>` renders and the `<ClientVideo clipUrl=… posterUrl=…>`
  usage (line ~231); render the screenshots view, mirroring `sop/[id]/page.tsx`.
- Remove the local `ClientVideo` function definition (line ~237) — it is a
  function declared in this same file, not an imported component.

- [ ] **Step 8: Adapt `src/components/UploadZone.tsx`**

- Remove the `mode` state (`const [mode, setMode] = useState…`).
- Remove `mode` from the commit POST body.
- Remove the "Video clips / Screenshots" radio toggle JSX (the two `<input
  name="mode">` blocks and their wrapper/label).

- [ ] **Step 9: Adapt `src/app/processing/[id]/page.tsx`**

- Remove `"clipping"` from the local `Status` union.
- Remove the `clipping_failed:` entry from the `ERROR_MSG` map. Add a
  `not_an_app:` entry, e.g.
  `not_an_app: "Video không phải bản ghi ứng dụng. Vui lòng tải video quay màn hình một ứng dụng web, di động hoặc máy tính."`
  (`analysis_failed` may reuse the generic `unknown` fallback.)
- **Fix the progress ordering.** Stage 0 (`analyzing`) now runs *first*, before
  `transcribing` — but the current `STATUS_STEP_INDEX` maps `analyzing` to 2 and
  `transcribing` to 0, so the progress bar would jump backward. Replace `STEPS`
  and `STATUS_STEP_INDEX` with a monotonic mapping that matches the new stage
  order (the Vietnamese labels are reasonable defaults — the user may refine the
  copy):

```typescript
const STEPS = [
  "Kiểm tra video",
  "Chuyển giọng nói thành văn bản",
  "Chuẩn hóa nội dung",
  "Phân tích các bước",
  "Tạo ảnh chụp màn hình",
];

const STATUS_STEP_INDEX: Record<Status, number> = {
  uploading: 0, ingesting: 0, analyzing: 0,
  transcribing: 1,
  normalizing: 2,
  generating: 3,
  "building-pool": 4, "assigning": 4, "uploading-screenshots": 4,
  done: 5, failed: 0,
};
```

- [ ] **Step 10: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. If a deleted component/route/field is still referenced, fix the
referencing file.

- [ ] **Step 11: Sweep for stragglers**

Run: `grep -rn "process-sop\"\|generate-sop-pdf\|ExportPdfButton\|HeroVideo\|StepCard\b\|/api/clips\|\.pdf\b\|clipUrl\|posterUrl" src/`
Expected: no hits in surviving files (hits only inside, e.g., `StepCardScreenshots`
naming are fine — confirm each). Resolve anything real.

- [ ] **Step 12: Commit**

```bash
git add -A src/app src/components
git commit -m "$(cat <<'EOF'
feat(web): delete clip/PDF frontend surface, drop mode branching

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Prune `mongo.ts` DB types + remove dead writes

Done last — only now does nothing reference these fields.

**Files:**
- Modify: `src/lib/mongo.ts`, `src/trigger/processSopScreenshots.ts`,
  `src/trigger/ingestLoom.test.ts`

- [ ] **Step 1: Prune the `Step` interface**

In `src/lib/mongo.ts`, in the `Step` interface, remove `clipR2Key`,
`posterR2Key`, and `keyframeR2Keys`, and the now-stale clip/screenshot-mode
comments. The interface becomes:

```typescript
export interface Step {
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  screenshots?: Screenshot[];
  screenshotsError?: string;
}
```

- [ ] **Step 2: Remove PDF and mode types from `mongo.ts`**

- Remove the `PdfStatus` type and the `SopPdfState` interface.
- In `SopDoc`, remove the `pdf?: SopPdfState;` field and the
  `mode?: "clips" | "screenshots";` field (with its comment).
- Remove `"clipping"` from the `SopStatus` union.
- Remove `clipping_failed` and `visual_context_failed` from the `ErrorCode`
  union. Keep `visual_extract_failed` and `loom_ingest_failed`.

- [ ] **Step 3: Remove the dead writes in `processSopScreenshots.ts`**

In `src/trigger/processSopScreenshots.ts`, in the `stepsOut` `.map`, drop
`clipR2Key: ""`, `posterR2Key: ""`, and `keyframeR2Keys: []` from the `base`
object. In the final `sops().updateOne` `$set`, remove `mode: "screenshots"`.
The `base` object becomes:

```typescript
        const base: Step = {
          title: rs.title,
          description: rs.description,
          startTime: rs.startTime,
          endTime: rs.endTime,
          screenshots: ss as Screenshot[],
        };
```

- [ ] **Step 4: Fix `ingestLoom.test.ts`**

In `src/trigger/ingestLoom.test.ts`, remove `"clipping"` from the `as const`
status array (around line 19) passed to `decideIngest`.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS. A failure here names any remaining reader of the pruned fields —
fix it (it belongs in Task 5 or 6 scope).

- [ ] **Step 6: Run the trigger tests**

Run: `npx tsx --test src/trigger/ingestLoom.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/mongo.ts src/trigger/processSopScreenshots.ts src/trigger/ingestLoom.test.ts
git commit -m "$(cat <<'EOF'
feat(schema): prune clip/PDF/mode DB types, drop dead step writes

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Full verification

**Files:** none modified — verification only.

- [ ] **Step 1: Full typecheck**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 2: Full test suite**

Run: `npx tsx --test src/**/*.test.ts` (or enumerate the test files if the
glob is not expanded by the shell: `npx tsx --test $(find src -name '*.test.ts')`).
Expected: all PASS.

- [ ] **Step 3: Next.js build**

Run: `npx next build`
Expected: build succeeds (catches any remaining frontend import error that
`tsc --noEmit` alone might miss in route/page files).

- [ ] **Step 4: E2E — narrated video (regression)**

Trigger the pipeline on `samples/hubspot_crm.mp4` (the existing benchmark) via
the project's usual run path (`scripts/upload-full.mjs` or the dev trigger).
Expected: status reaches `done`; screenshots are produced; sampled accuracy is
~96%, in line with the `stable-2026-05-17-caption-canonicalization` baseline;
the run is gated as an app recording (not rejected).

- [ ] **Step 5: E2E — silent video (new path)**

**Open item from the spec:** there is no confirmed silent app-recording sample
in `samples/`. Obtain one (a screen recording of a web/mobile/desktop app with
no narration — background music is fine). Trigger the pipeline on it and
confirm: the silent branch is chosen (`inputMode: "silent"` in the logs), the
app gate passes, `visualExtract` produces steps, and screenshots with highlight
points are generated. If no silent sample can be obtained, record this as the
one unverified path and flag it to the user.

- [ ] **Step 6: E2E — rejection (negative case)**

Trigger the pipeline on a non-app video (e.g. a talking-head clip). Expected:
the run fails with `errorCode: "not_an_app"` and no transcription/extraction
cost is incurred beyond Stage 0.

- [ ] **Step 7: Report**

Summarize to the user: typecheck/test/build status, the narrated-video accuracy
vs. baseline, the silent-video result (or that it is unverified), the rejection
result, and the run cost.

---

## Self-Review

**Spec coverage:**
- App-recording gate → Tasks 1 (schema/prompt), 2 (`analyzeVideo`), 4 (wired as Stage 0). ✓
- Silent-video support → Tasks 2 (`sampleFrames` count option), 4 (silent head). ✓
- Screenshots-only / delete document pipeline → Tasks 5, 6. ✓
- Language rule (detected for speech, default for silent) → Task 4 (`outputLanguage`). ✓
- `analyzeVideo` consolidates context → Task 4 drops `runContext`; Task 5 deletes `context.ts`/`visualContext.ts`. ✓
- File Inventory (new/adapted/deleted) → Tasks 2, 3, 5, 6, 7. ✓
- Callers & Frontend Surface → Task 6 covers every listed route/page/component. ✓
- Data & Schema (`VideoAnalysisOutput`, error codes, DB type pruning, config pruning) → Tasks 1, 5, 7. ✓
- Testing (analyzeVideo tests, `tsc` regression gate, E2E) → Tasks 2, 5, 8. ✓

**Placeholder scan:** No TBDs. The one acknowledged open item (silent E2E
sample) is the spec's accepted gap, surfaced explicitly in Task 8 Step 5.

**Type consistency:** `runAnalyzeVideo` / `decideAppGate` / `computeAppGateFrameCount`
(Task 2) match their call sites in Task 4. `resolveTimes` signature (Task 3)
matches its Task 4 call. `VideoAnalysisOutput` fields (Task 1) match
`analysis.{appUIFrameCount,totalFrames,appType,category,domainSummary}` use in
Task 4. `sampleFrames` `{ count }` option (Task 2) matches the `analyzeVideo`
call; `{ mode: "density" }` still valid for the silent head in Task 4.
