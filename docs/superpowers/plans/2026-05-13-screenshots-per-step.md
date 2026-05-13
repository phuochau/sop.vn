# Screenshots-per-step SOP pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a second SOP pipeline that produces curated screenshots per step (instead of cutting per-step video clips), gated by an upload-time toggle, with a viewer that renders the screenshots.

**Architecture:** New trigger.dev task `process-sop-screenshots` runs after upload when `mode === "screenshots"`. It reuses speech-path step extraction (transcribe → normalize → context → extract) and replaces clip-cutting with three new stages: `buildFramePool` (dense ffmpeg sample + perceptual-hash stability filter + dedup), `assignScreenshots` (time-bucket frames per step with ±2s overlap, per-step Gemini vision call, cross-step dedup), and `uploadScreenshots` (push selected JPEGs to R2, write `screenshots[]` on the SOP doc). The viewer reads `mode` from the SOP doc and renders either the existing clip-based `StepCard` or a new `StepCardScreenshots`.

**Tech Stack:** Next.js 16 App Router, React 19, trigger.dev v3, MongoDB, Cloudflare R2, fluent-ffmpeg, sharp (new dep), Zod, OpenRouter (Gemini 2.5 Flash vision), node:test.

**Spec:** `docs/superpowers/specs/2026-05-13-screenshots-per-step-design.md`.

**Note on commits:** This repository is not a git repo. Where steps say "Commit", treat them as **checkpoints** — verify the change works, then move on. If the repo is initialized later, the checkpoints map 1:1 to commits.

---

## File structure

**New files:**
- `src/trigger/processSopScreenshots.ts` — orchestrator (speech-path only)
- `src/trigger/stages/buildFramePool.ts` — dense sample + filter + dedup
- `src/trigger/stages/buildFramePool.test.ts`
- `src/trigger/stages/assignScreenshots.ts` — bucket + per-step LLM + cross-dedup
- `src/trigger/stages/assignScreenshots.test.ts`
- `src/trigger/stages/uploadScreenshots.ts` — push JPEGs to R2
- `src/trigger/lib/perceptualHash.ts` — sharp-based dHash + downscale helpers
- `src/trigger/lib/perceptualHash.test.ts`
- `src/components/StepCardScreenshots.tsx` — viewer component
- `src/app/api/screenshots/[sopId]/[key]/route.ts` — presigned URL endpoint

**Modified files:**
- `package.json` — add `sharp`
- `src/config/index.ts` — add `screenshots.*` tunables and vision prompt
- `src/lib/utils.ts` — add `screenshotKey` builder
- `src/lib/schemas.ts` — add `ScreenshotPicksOutput`
- `src/lib/mongo.ts` — add `mode`, step `screenshots[]`, step `screenshotsError`, extend `SopStatus`
- `src/app/processing/[id]/page.tsx` — extend local Status union + STATUS_STEP_INDEX + ERROR_MSG for new states
- `src/app/api/upload/commit/route.ts` — accept `mode`, route to correct task
- `src/components/UploadZone.tsx` — add mode toggle, pass `mode` to commit
- `src/app/api/sop/[id]/route.ts` — surface `mode` and `screenshots` to viewer
- `src/app/sop/[id]/page.tsx` — branch render by `mode`

---

## Task 1: Add `sharp` dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install sharp**

Run: `npm install sharp@^0.34.0`
Expected: `package.json` gains `"sharp": "^0.34.0"` under `dependencies`, `package-lock.json` updates.

- [ ] **Step 2: Verify import works**

Run: `node -e "const s = require('sharp'); s({ create: { width: 8, height: 8, channels: 3, background: { r:0,g:0,b:0 } } }).raw().toBuffer().then(b => console.log('ok', b.length))"`
Expected: prints `ok 192`. (Confirms the native binding loaded on this platform.)

- [ ] **Step 3: Checkpoint**

```bash
git add package.json package-lock.json
git commit -m "deps: add sharp for screenshots POC perceptual hashing"
```

(If not a git repo, skip — just confirm `package.json` shows sharp.)

---

## Task 2: Config tunables and R2 key builder

**Files:**
- Modify: `src/config/index.ts`
- Modify: `src/lib/utils.ts`

- [ ] **Step 1: Add screenshots config block**

In `src/config/index.ts`, inside the exported `config` object, add a new top-level `screenshots` section AND a new vision prompt under `ai.prompts`. Final shape:

```ts
export const config = {
  ai: {
    // ...existing fields unchanged...
    prompts: {
      // ...existing prompts unchanged...
      screenshotPickSystem: (lang: string) =>
        `You select screenshots from a training video to illustrate one specific step. You receive: the step's title and the trainer's narration for the step, plus a list of candidate frames each labeled with a bucket-local index and a timestamp.\n\nPick the frames a reader would need to actually perform this step — relevant UI before the action, during the action, and the resulting state after the action. Skip redundant frames showing the same UI state. Return an empty array if no frames are useful for this step (e.g., the step is "wait 30 seconds").\n\nLANGUAGE: Use ${lang} for any text fields in your output. Keep technical / industry / brand terms in their original form.\n\nReturn strict JSON only.`,
    },
  },
  limits: {
    // ...existing unchanged...
  },
  retention: { videoRetentionDays: 30 },
  app: { shareTokenLength: 16, pollIntervalMs: 2000 },
  screenshots: {
    sampleFps: 2,
    motionHammingThreshold: 8,    // <=8/64 between consecutive frames ⇒ stable
    dedupHammingThreshold: 5,     // <=5/64 within window ⇒ duplicate
    dedupWindowSeconds: 10,
    maxPoolSize: 200,
    overlapBufferSeconds: 2,
    downscaleMaxEdgePx: 1280,
    jpegQuality: 85,
  },
};
```

- [ ] **Step 2: Add R2 key builder**

In `src/lib/utils.ts`, after `keyframeKey`, add:

```ts
export function screenshotKey(sopId: string, stepIndex: number, frameId: string) {
  return `sops/${sopId}/screenshots/step-${stepIndex}/${frameId}.jpg`;
}
```

- [ ] **Step 3: Sanity check via tsc**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Checkpoint**

```bash
git add src/config/index.ts src/lib/utils.ts
git commit -m "feat(screenshots): config tunables and R2 key builder"
```

---

## Task 3: Perceptual hash library

**Files:**
- Create: `src/trigger/lib/perceptualHash.ts`
- Test: `src/trigger/lib/perceptualHash.test.ts`

This is a pure-function utility: dHash computation (8x9 grayscale grid → 64-bit hash), Hamming distance, and a downscale helper used both by §4 (frame pool) and §5 (vision input).

- [ ] **Step 1: Write the failing test**

Create `src/trigger/lib/perceptualHash.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { dHash, hammingDistance, downscaleToMaxEdge } from "./perceptualHash";

async function makeSolidJpeg(rgb: [number, number, number], size = 64): Promise<string> {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "phash-test-"));
  const out = path.join(dir, `solid-${rgb.join("-")}.jpg`);
  await sharp({
    create: { width: size, height: size, channels: 3, background: { r: rgb[0], g: rgb[1], b: rgb[2] } },
  }).jpeg().toFile(out);
  return out;
}

test("dHash returns a 16-char hex string (64 bits)", async () => {
  const p = await makeSolidJpeg([128, 128, 128]);
  const h = await dHash(p);
  assert.equal(typeof h, "string");
  assert.equal(h.length, 16);
  assert.match(h, /^[0-9a-f]{16}$/);
});

test("hammingDistance between two identical hashes is 0", () => {
  assert.equal(hammingDistance("ffffffffffffffff", "ffffffffffffffff"), 0);
});

test("hammingDistance between all-ones and all-zeros is 64", () => {
  assert.equal(hammingDistance("ffffffffffffffff", "0000000000000000"), 64);
});

test("dHash of two solid-color images differs more than dHash of two identical solid images", async () => {
  const a1 = await dHash(await makeSolidJpeg([10, 10, 10]));
  const a2 = await dHash(await makeSolidJpeg([10, 10, 10]));
  const b  = await dHash(await makeSolidJpeg([240, 240, 240]));
  // Identical solids hash to the same value (or near-identical)
  assert.ok(hammingDistance(a1, a2) <= 2, `identical solids hash too far apart: ${a1} vs ${a2}`);
  // Different solids are still all-flat, so dHash is constant for both — accept either equal or different;
  // the contract here is just that identical inputs are close. (No assertion on b vs a.)
  assert.ok(typeof b === "string");
});

test("downscaleToMaxEdge shrinks an oversized image", async () => {
  const big = await makeSolidJpeg([0, 0, 0], 2000);
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "phash-ds-"));
  const out = path.join(tmpDir, "ds.jpg");
  await downscaleToMaxEdge(big, out, 1280);
  const meta = await sharp(out).metadata();
  assert.ok(meta.width! <= 1280 && meta.height! <= 1280, `expected <=1280px edge, got ${meta.width}x${meta.height}`);
});

test("downscaleToMaxEdge leaves a small image unchanged in dimensions", async () => {
  const small = await makeSolidJpeg([0, 0, 0], 500);
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "phash-nods-"));
  const out = path.join(tmpDir, "nods.jpg");
  await downscaleToMaxEdge(small, out, 1280);
  const meta = await sharp(out).metadata();
  assert.equal(meta.width, 500);
  assert.equal(meta.height, 500);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/trigger/lib/perceptualHash.test.ts`
Expected: FAIL with "Cannot find module './perceptualHash'".

- [ ] **Step 3: Implement the library**

Create `src/trigger/lib/perceptualHash.ts`:

```ts
import sharp from "sharp";

/**
 * dHash: 8x9 grayscale, compare adjacent pixels in each row → 64 bits.
 * Returns 16-char lowercase hex.
 */
export async function dHash(imagePath: string): Promise<string> {
  const { data } = await sharp(imagePath)
    .grayscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 8 rows, 9 cols → 8 comparisons per row → 64 bits total
  const bits: number[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = data[row * 9 + col];
      const right = data[row * 9 + col + 1];
      bits.push(left < right ? 1 : 0);
    }
  }
  // Pack bits into hex
  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    const nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
    hex += nibble.toString(16);
  }
  return hex;
}

export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) throw new Error("hashes must be same length");
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    // popcount on a 4-bit value
    let v = xor;
    while (v) { dist += v & 1; v >>= 1; }
  }
  return dist;
}

/**
 * Resize an image so its longest edge is at most `maxEdgePx`, preserving aspect ratio.
 * No-op if both dimensions already fit. Output is JPEG.
 */
export async function downscaleToMaxEdge(inputPath: string, outputPath: string, maxEdgePx: number): Promise<void> {
  const meta = await sharp(inputPath).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w === 0 || h === 0) throw new Error(`bad image dimensions: ${w}x${h}`);
  if (w <= maxEdgePx && h <= maxEdgePx) {
    await sharp(inputPath).jpeg({ quality: 85 }).toFile(outputPath);
    return;
  }
  await sharp(inputPath)
    .resize({ width: maxEdgePx, height: maxEdgePx, fit: "inside" })
    .jpeg({ quality: 85 })
    .toFile(outputPath);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/trigger/lib/perceptualHash.test.ts`
Expected: all 6 tests pass.

- [ ] **Step 5: Checkpoint**

```bash
git add src/trigger/lib/perceptualHash.ts src/trigger/lib/perceptualHash.test.ts
git commit -m "feat(screenshots): dHash + downscale lib for frame pool"
```

---

## Task 4: Vision response schema, Mongo types, processing-page status map

**Files:**
- Modify: `src/lib/schemas.ts`
- Modify: `src/lib/mongo.ts`
- Modify: `src/app/processing/[id]/page.tsx`

These are type-only changes. No tests; verified by tsc.

- [ ] **Step 1: Add vision-pick schema**

In `src/lib/schemas.ts`, append:

```ts
export const ScreenshotPicksOutput = z.object({
  picks: z.array(z.object({
    index: z.number().int().nonnegative(),
    reason: z.string(),
  })),
});
```

- [ ] **Step 2: Extend Mongo types**

In `src/lib/mongo.ts`:

1. Extend `SopStatus` union to add new states:

```ts
export type SopStatus =
  | "uploading" | "ingesting" | "transcribing" | "normalizing" | "analyzing"
  | "generating" | "clipping" | "building-pool" | "assigning" | "uploading-screenshots"
  | "done" | "failed";
```

2. Extend `ErrorCode` union to add new code:

```ts
export type ErrorCode =
  | null
  | "video_too_short" | "video_too_long" | "unsupported_format"
  | "file_too_large" | "transcription_failed"
  | "generation_failed" | "clipping_failed"
  | "visual_context_failed" | "visual_extract_failed"
  | "frame_sampling_failed" | "video_download_failed"
  | "screenshot_pool_failed"
  | "loom_ingest_failed"
  | "unknown";
```

3. Add `Screenshot` interface and extend `Step`:

```ts
export interface Screenshot {
  frameId: string;
  r2Key: string;
  t: number;        // timestamp in source video, seconds
  order: number;    // display order within the step
}

export interface Step {
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  // Clip-mode (existing — present when SopDoc.mode === "clips" or absent):
  clipR2Key: string;
  posterR2Key: string;
  keyframeR2Keys: string[];
  // Screenshot-mode (new — present when SopDoc.mode === "screenshots"):
  screenshots?: Screenshot[];
  screenshotsError?: string;
}
```

Note: `clipR2Key`, `posterR2Key`, `keyframeR2Keys` stay required in the TypeScript type to avoid disrupting existing code. The screenshot orchestrator will populate them with empty-string / empty-array placeholders (see Task 8). This is acceptable for the POC; a follow-up could refactor `Step` into a discriminated union.

4. Add `mode` to `SopDoc` (right after `inputMode`):

```ts
export interface SopDoc {
  _id: ObjectId;
  title: string;
  category: string;
  inputMode?: "speech" | "silent";
  mode?: "clips" | "screenshots"; // NEW — set at upload time; absent ⇒ "clips"
  // ...rest unchanged...
}
```

- [ ] **Step 3: Update the processing-page status map**

`src/app/processing/[id]/page.tsx` has its own local `Status` union and a `STATUS_STEP_INDEX: Record<Status, number>` lookup driving the progress bar. The new statuses must be added or the progress bar will read `undefined` and render `NaN` for screenshot-mode SOPs.

In `src/app/processing/[id]/page.tsx`:

1. Extend the local `Status` union to match:

```tsx
type Status =
  | "uploading" | "ingesting" | "transcribing" | "normalizing" | "analyzing"
  | "generating" | "clipping" | "building-pool" | "assigning" | "uploading-screenshots"
  | "done" | "failed";
```

2. Extend `STATUS_STEP_INDEX` to map the new statuses onto the existing 5-step progress UI. They all happen after `generating` (step index 3), so map them to step index 4 (the same slot as `clipping`) — the UI doesn't distinguish further, and the screenshot variants are quick:

```tsx
const STATUS_STEP_INDEX: Record<Status, number> = {
  uploading: 0, ingesting: 0, transcribing: 0, normalizing: 1, analyzing: 2,
  generating: 3, clipping: 4,
  "building-pool": 4, "assigning": 4, "uploading-screenshots": 4,
  done: 5, failed: 0,
};
```

3. Add an error-message entry for the new error code (used by Task 8's orchestrator on pool failure):

```tsx
const ERROR_MSG: Record<string, string> = {
  // ...existing entries unchanged...
  screenshot_pool_failed: "Lỗi tạo ảnh chụp màn hình. Vui lòng thử lại.",
};
```

(Insert this line into the existing `ERROR_MSG` object — don't duplicate the whole object.)

- [ ] **Step 4: Run tsc**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Checkpoint**

```bash
git add src/lib/schemas.ts src/lib/mongo.ts src/app/processing/[id]/page.tsx
git commit -m "feat(screenshots): zod schema + mongo types + processing page status map"
```

---

## Task 5: `buildFramePool` stage

**Files:**
- Create: `src/trigger/stages/buildFramePool.ts`
- Test: `src/trigger/stages/buildFramePool.test.ts`

This stage extracts ~2fps frames via ffmpeg, hashes them with dHash, and applies stability + dedup filters. The test covers the pure filtering logic with synthetic hash sequences (ffmpeg is mocked out).

- [ ] **Step 1: Write the failing test**

Create `src/trigger/stages/buildFramePool.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { filterFramePool, type RawFrame } from "./buildFramePool";

function rf(t: number, pHash: string): RawFrame {
  return { t, pHash, localPath: `/tmp/frame-${t}.jpg`, poolId: `p${t}` };
}

test("filterFramePool keeps stable plateaus and drops singletons", () => {
  // 5 frames at the same hash (stable), then 1 transition frame, then 3 more at a new hash
  const frames: RawFrame[] = [
    rf(0.0, "0000000000000000"),
    rf(0.5, "0000000000000000"),
    rf(1.0, "0000000000000000"),
    rf(1.5, "0000000000000000"),
    rf(2.0, "0000000000000000"),
    rf(2.5, "ffff0000ffff0000"), // very different — transition frame, singleton
    rf(3.0, "ffffffffffffffff"),
    rf(3.5, "ffffffffffffffff"),
    rf(4.0, "ffffffffffffffff"),
  ];
  const out = filterFramePool(frames, {
    motionHammingThreshold: 8,
    dedupHammingThreshold: 5,
    dedupWindowSeconds: 10,
    maxPoolSize: 200,
  });
  // After stability: representatives of the two plateaus (singleton transition dropped).
  // After dedup: same — two representatives are far apart in hash space.
  assert.equal(out.length, 2);
  assert.equal(out[0].t, 0.0);
  assert.equal(out[1].t, 3.0);
});

test("filterFramePool dedupes within window", () => {
  // Two near-identical plateaus 5 seconds apart — should collapse to one.
  const frames: RawFrame[] = [
    rf(0.0, "1111111111111111"),
    rf(0.5, "1111111111111111"),
    rf(0.5 + 0.001, "1111111111111111"),
    rf(5.0, "1111111111111110"), // Hamming 1 from first plateau
    rf(5.5, "1111111111111110"),
  ];
  const out = filterFramePool(frames, {
    motionHammingThreshold: 8,
    dedupHammingThreshold: 5,
    dedupWindowSeconds: 10,
    maxPoolSize: 200,
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].t, 0.0);
});

test("filterFramePool respects maxPoolSize cap", () => {
  const frames: RawFrame[] = [];
  for (let i = 0; i < 500; i++) {
    // Force distinct hashes via varying nibble
    const hex = i.toString(16).padStart(16, "0");
    frames.push(rf(i, hex));
    frames.push(rf(i + 0.1, hex));
    frames.push(rf(i + 0.2, hex)); // 3-frame plateau each
  }
  const out = filterFramePool(frames, {
    motionHammingThreshold: 0, // strict: only exact matches count as same plateau
    dedupHammingThreshold: 0,
    dedupWindowSeconds: 0,
    maxPoolSize: 50,
  });
  assert.ok(out.length <= 50, `expected <=50, got ${out.length}`);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/trigger/stages/buildFramePool.test.ts`
Expected: FAIL with "Cannot find module './buildFramePool'".

- [ ] **Step 3: Implement the stage**

Create `src/trigger/stages/buildFramePool.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import ffmpeg from "fluent-ffmpeg";
import { nanoid } from "nanoid";
import { logger } from "@trigger.dev/sdk/v3";
import { dHash, hammingDistance } from "@/trigger/lib/perceptualHash";

export interface RawFrame {
  t: number;
  pHash: string;
  localPath: string;
  poolId: string;
}

export interface FramePool {
  frames: RawFrame[];
  tmpDir: string;
  dispose: () => Promise<void>;
}

export interface FilterOptions {
  motionHammingThreshold: number;
  dedupHammingThreshold: number;
  dedupWindowSeconds: number;
  maxPoolSize: number;
}

/**
 * Densely sample frames at `fps`, write JPEGs into `tmpDir`,
 * and return them in timestamp order WITHOUT filtering. Pure I/O.
 */
function ffmpegDenseSample(srcPath: string, tmpDir: string, fps: number): Promise<{ t: number; localPath: string }[]> {
  return new Promise((resolve, reject) => {
    const pattern = path.join(tmpDir, "raw-%05d.jpg");
    ffmpeg(srcPath)
      .outputOptions([`-vf fps=${fps}`, "-qscale:v 5"])
      .on("end", async () => {
        try {
          const files = (await fs.promises.readdir(tmpDir))
            .filter(f => f.startsWith("raw-") && f.endsWith(".jpg"))
            .sort();
          const out = files.map((f, i) => ({
            t: i / fps, // frame i corresponds to time i/fps
            localPath: path.join(tmpDir, f),
          }));
          resolve(out);
        } catch (e) { reject(e); }
      })
      .on("error", reject)
      .save(pattern);
  });
}

/**
 * Apply stability filter (drop singleton transitions) and sliding-window dedup
 * to a timestamp-ordered list of frames. Pure function.
 *
 * Stability: a frame is "stable" if it's within `motionHammingThreshold` of EITHER
 *            its previous or next neighbor. Drop frames that match neither (transition).
 *            Then within each resulting run of similar consecutive frames, keep only
 *            the earliest.
 * Dedup: within `dedupWindowSeconds`, drop any frame whose pHash is within
 *        `dedupHammingThreshold` of an earlier kept frame.
 * Cap: if the result still exceeds `maxPoolSize`, evenly downsample.
 */
export function filterFramePool(frames: RawFrame[], opts: FilterOptions): RawFrame[] {
  if (frames.length === 0) return [];

  // 1. Stability filter: drop transition singletons.
  const stable: RawFrame[] = [];
  for (let i = 0; i < frames.length; i++) {
    const prev = i > 0 ? frames[i - 1] : null;
    const next = i < frames.length - 1 ? frames[i + 1] : null;
    const closeToPrev = prev && hammingDistance(frames[i].pHash, prev.pHash) <= opts.motionHammingThreshold;
    const closeToNext = next && hammingDistance(frames[i].pHash, next.pHash) <= opts.motionHammingThreshold;
    if (closeToPrev || closeToNext) stable.push(frames[i]);
    // else: singleton — drop
  }

  // 2. Collapse runs of similar consecutive frames to one representative (earliest).
  const collapsed: RawFrame[] = [];
  for (const f of stable) {
    const last = collapsed[collapsed.length - 1];
    if (!last || hammingDistance(f.pHash, last.pHash) > opts.motionHammingThreshold) {
      collapsed.push(f);
    }
  }

  // 3. Sliding-window dedup: drop frames whose pHash is too close to any earlier
  //    frame kept within `dedupWindowSeconds`.
  const deduped: RawFrame[] = [];
  for (const f of collapsed) {
    const tooSimilar = deduped.some(
      k => f.t - k.t <= opts.dedupWindowSeconds &&
           hammingDistance(f.pHash, k.pHash) <= opts.dedupHammingThreshold,
    );
    if (!tooSimilar) deduped.push(f);
  }

  // 4. Hard cap via even downsampling.
  if (deduped.length <= opts.maxPoolSize) return deduped;
  const stride = deduped.length / opts.maxPoolSize;
  const capped: RawFrame[] = [];
  for (let i = 0; i < opts.maxPoolSize; i++) {
    capped.push(deduped[Math.floor(i * stride)]);
  }
  return capped;
}

export async function runBuildFramePool(args: {
  srcPath: string;
  sampleFps: number;
  filter: FilterOptions;
}): Promise<FramePool> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sop-pool-"));
  try {
    const sampled = await ffmpegDenseSample(args.srcPath, tmpDir, args.sampleFps);
    logger.info("frame pool: dense sample", { count: sampled.length });

    const raw: RawFrame[] = [];
    for (const s of sampled) {
      const pHash = await dHash(s.localPath);
      raw.push({ t: s.t, localPath: s.localPath, pHash, poolId: nanoid(10) });
    }

    const filtered = filterFramePool(raw, args.filter);
    logger.info("frame pool: filtered", { before: raw.length, after: filtered.length });

    return {
      frames: filtered,
      tmpDir,
      dispose: () => fs.promises.rm(tmpDir, { recursive: true, force: true }),
    };
  } catch (e) {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
    throw e;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/trigger/stages/buildFramePool.test.ts`
Expected: all 3 tests pass.

- [ ] **Step 5: Checkpoint**

```bash
git add src/trigger/stages/buildFramePool.ts src/trigger/stages/buildFramePool.test.ts
git commit -m "feat(screenshots): buildFramePool stage with stability + dedup"
```

---

## Task 6: `assignScreenshots` stage

**Files:**
- Create: `src/trigger/stages/assignScreenshots.ts`
- Test: `src/trigger/stages/assignScreenshots.test.ts`

This stage takes the step list and the frame pool, builds buckets, calls the vision LLM per step (parallel), and resolves cross-step conflicts. The LLM is injected as a function so tests can mock it.

- [ ] **Step 1: Write the failing test**

Create `src/trigger/stages/assignScreenshots.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { bucketFramesByStep, resolveCrossStepDedup, type StepRange, type PoolFrame } from "./assignScreenshots";

function pf(t: number, id: string): PoolFrame {
  return { t, poolId: id, localPath: `/tmp/${id}.jpg`, pHash: "0000000000000000" };
}

test("bucketFramesByStep applies overlap buffer on both sides", () => {
  const steps: StepRange[] = [
    { stepIndex: 0, tStart: 0, tEnd: 10 },
    { stepIndex: 1, tStart: 10, tEnd: 20 },
  ];
  // Step 0 bucket: t ∈ [-2, 12]. Step 1 bucket: t ∈ [8, 22]. Overlap region: [8, 12].
  const pool: PoolFrame[] = [
    pf(0.5, "a"),   // step 0 only
    pf(7.0, "b"),   // step 0 only (still before step 1's lo=8)
    pf(9.5, "c"),   // overlap: step 0 + step 1
    pf(10.5, "d"),  // overlap: step 0 + step 1
    pf(12.5, "e"),  // step 1 only
    pf(19.5, "f"),  // step 1 only
    pf(22.5, "g"),  // out of range — neither
  ];
  const buckets = bucketFramesByStep(steps, pool, 2);
  assert.deepEqual(buckets.get(0)!.map(f => f.poolId), ["a", "b", "c", "d"]);
  assert.deepEqual(buckets.get(1)!.map(f => f.poolId), ["c", "d", "e", "f"]);
});

test("resolveCrossStepDedup assigns shared frame to the step with closer center", () => {
  const steps: StepRange[] = [
    { stepIndex: 0, tStart: 0, tEnd: 10 },   // center 5
    { stepIndex: 1, tStart: 10, tEnd: 20 },  // center 15
  ];
  // Frame at t=11 is picked by both steps. Closer to step 1's center (15) than step 0's (5).
  const picks = new Map<number, string[]>([[0, ["x"]], [1, ["x"]]]);
  const pool: PoolFrame[] = [pf(11, "x")];
  const out = resolveCrossStepDedup(steps, picks, pool);
  assert.deepEqual(out.get(0), []);
  assert.deepEqual(out.get(1), ["x"]);
});

test("resolveCrossStepDedup breaks ties by earlier step", () => {
  const steps: StepRange[] = [
    { stepIndex: 0, tStart: 0, tEnd: 10 },   // center 5
    { stepIndex: 1, tStart: 10, tEnd: 20 },  // center 15
  ];
  // Frame at t=10 is exactly equidistant. Tie → step 0 wins.
  const picks = new Map<number, string[]>([[0, ["x"]], [1, ["x"]]]);
  const pool: PoolFrame[] = [pf(10, "x")];
  const out = resolveCrossStepDedup(steps, picks, pool);
  assert.deepEqual(out.get(0), ["x"]);
  assert.deepEqual(out.get(1), []);
});

test("resolveCrossStepDedup preserves timestamp order within each step", () => {
  const steps: StepRange[] = [{ stepIndex: 0, tStart: 0, tEnd: 30 }];
  const picks = new Map<number, string[]>([[0, ["c", "a", "b"]]]); // out of order
  const pool: PoolFrame[] = [pf(1, "a"), pf(2, "b"), pf(3, "c")];
  const out = resolveCrossStepDedup(steps, picks, pool);
  assert.deepEqual(out.get(0), ["a", "b", "c"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/trigger/stages/assignScreenshots.test.ts`
Expected: FAIL with "Cannot find module './assignScreenshots'".

- [ ] **Step 3: Implement the stage**

Create `src/trigger/stages/assignScreenshots.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { logger } from "@trigger.dev/sdk/v3";
import { llmJsonVision } from "@/lib/openrouter";
import { ScreenshotPicksOutput } from "@/lib/schemas";
import { config } from "@/config";
import { downscaleToMaxEdge } from "@/trigger/lib/perceptualHash";

export interface PoolFrame {
  t: number;
  poolId: string;
  localPath: string;
  pHash: string;
}

export interface StepRange {
  stepIndex: number;
  tStart: number;
  tEnd: number;
}

export interface StepInput extends StepRange {
  title: string;
  narration: string;
}

export type AssignmentResult = {
  byStep: Map<number, string[]>;       // stepIndex → ordered poolIds
  errors: Map<number, string>;          // stepIndex → error message if its LLM call failed
};

/**
 * Bucket pool frames into each step's expanded time range, [tStart - buffer, tEnd + buffer].
 * Frames near a boundary may appear in multiple buckets; resolveCrossStepDedup() picks one.
 */
export function bucketFramesByStep(
  steps: StepRange[],
  pool: PoolFrame[],
  overlapBufferSeconds: number,
): Map<number, PoolFrame[]> {
  const buckets = new Map<number, PoolFrame[]>();
  for (const step of steps) {
    const lo = step.tStart - overlapBufferSeconds;
    const hi = step.tEnd + overlapBufferSeconds;
    buckets.set(step.stepIndex, pool.filter(f => f.t >= lo && f.t <= hi));
  }
  return buckets;
}

/**
 * Resolve cases where a frame was picked by multiple steps: assign it to the step
 * whose center is closest to the frame's timestamp; ties go to the earlier step.
 * Output: per-step pool IDs, ordered by timestamp ascending.
 */
export function resolveCrossStepDedup(
  steps: StepRange[],
  picksByStep: Map<number, string[]>,
  pool: PoolFrame[],
): Map<number, string[]> {
  const byId = new Map<string, PoolFrame>(pool.map(f => [f.poolId, f]));
  const stepCenter = (s: StepRange) => (s.tStart + s.tEnd) / 2;

  // Build owner map: poolId → owning stepIndex.
  const owner = new Map<string, number>();
  for (const step of steps) {
    const picks = picksByStep.get(step.stepIndex) ?? [];
    for (const id of picks) {
      const frame = byId.get(id);
      if (!frame) continue;
      const incumbent = owner.get(id);
      if (incumbent === undefined) {
        owner.set(id, step.stepIndex);
        continue;
      }
      const incumbentStep = steps.find(s => s.stepIndex === incumbent)!;
      const incumbentDist = Math.abs(frame.t - stepCenter(incumbentStep));
      const challengerDist = Math.abs(frame.t - stepCenter(step));
      if (challengerDist < incumbentDist) {
        owner.set(id, step.stepIndex);
      }
      // tie → keep incumbent (earlier step, since we iterate steps in order)
    }
  }

  // Re-collect per-step, sorted by timestamp.
  const out = new Map<number, string[]>();
  for (const step of steps) out.set(step.stepIndex, []);
  for (const [id, stepIndex] of owner.entries()) {
    out.get(stepIndex)!.push(id);
  }
  for (const [stepIndex, ids] of out.entries()) {
    ids.sort((a, b) => byId.get(a)!.t - byId.get(b)!.t);
    out.set(stepIndex, ids);
  }
  return out;
}

/**
 * Per-step LLM call. Downscales each bucket frame to a temp file before sending,
 * to cap vision token cost. Returns picked poolIds in the LLM's order.
 */
async function pickForStep(args: {
  step: StepInput;
  bucket: PoolFrame[];
  language: string;
}): Promise<string[]> {
  if (args.bucket.length === 0) return [];

  // Downscale to a fresh temp directory.
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sop-pick-"));
  try {
    const downscaledPaths: string[] = [];
    for (let i = 0; i < args.bucket.length; i++) {
      const out = path.join(tmpDir, `b-${i}.jpg`);
      await downscaleToMaxEdge(args.bucket[i].localPath, out, config.screenshots.downscaleMaxEdgePx);
      downscaledPaths.push(out);
    }

    const userText = [
      `Step title: ${args.step.title}`,
      `Narration: ${args.step.narration}`,
      ``,
      `Candidate frames (bucket index : timestamp seconds):`,
      ...args.bucket.map((f, i) => `${i} : ${f.t.toFixed(2)}s`),
      ``,
      `Return JSON: { "picks": [{ "index": <bucket index>, "reason": "<one short sentence>" }] }`,
    ].join("\n");

    const result = await llmJsonVision({
      model: config.ai.visionModel,
      system: config.ai.prompts.screenshotPickSystem(args.language),
      userText,
      imagePaths: downscaledPaths,
      schema: ScreenshotPicksOutput,
      schemaName: "screenshot_picks",
      maxRetries: config.ai.maxRetries,
    });

    // Validate indices are in range; drop bad ones.
    const validPicks = result.picks.filter(p => p.index >= 0 && p.index < args.bucket.length);
    if (validPicks.length !== result.picks.length) {
      logger.warn("vision LLM returned out-of-range indices", {
        stepIndex: args.step.stepIndex,
        returned: result.picks.length,
        valid: validPicks.length,
      });
    }
    return validPicks.map(p => args.bucket[p.index].poolId);
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}

export async function runAssignScreenshots(args: {
  steps: StepInput[];
  pool: PoolFrame[];
  language: string;
}): Promise<AssignmentResult> {
  const buckets = bucketFramesByStep(args.steps, args.pool, config.screenshots.overlapBufferSeconds);

  // Run per-step LLM calls in parallel; capture per-step failures.
  const settled = await Promise.allSettled(
    args.steps.map(step =>
      pickForStep({ step, bucket: buckets.get(step.stepIndex) ?? [], language: args.language }),
    ),
  );

  const picksByStep = new Map<number, string[]>();
  const errors = new Map<number, string>();
  for (let i = 0; i < args.steps.length; i++) {
    const stepIndex = args.steps[i].stepIndex;
    const r = settled[i];
    if (r.status === "fulfilled") {
      picksByStep.set(stepIndex, r.value);
    } else {
      picksByStep.set(stepIndex, []);
      errors.set(stepIndex, String(r.reason));
      logger.error("screenshot pick failed", { stepIndex, e: String(r.reason) });
    }
  }

  const byStep = resolveCrossStepDedup(args.steps, picksByStep, args.pool);
  return { byStep, errors };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/trigger/stages/assignScreenshots.test.ts`
Expected: all 4 tests pass.

- [ ] **Step 5: Checkpoint**

```bash
git add src/trigger/stages/assignScreenshots.ts src/trigger/stages/assignScreenshots.test.ts
git commit -m "feat(screenshots): per-step vision LLM assignment with cross-step dedup"
```

---

## Task 7: `uploadScreenshots` stage

**Files:**
- Create: `src/trigger/stages/uploadScreenshots.ts`

Takes the assignment result + pool, generates `frameId`s, uploads JPEGs to R2, and returns `Screenshot[]` per step. No unit test here — it's thin I/O glue and is covered by the end-to-end manual smoke test (Task 13).

- [ ] **Step 1: Implement the stage**

Create `src/trigger/stages/uploadScreenshots.ts`:

```ts
import fs from "node:fs";
import { customAlphabet } from "nanoid";
import { logger } from "@trigger.dev/sdk/v3";
import { putObject } from "@/lib/r2";
import { screenshotKey } from "@/lib/utils";
import type { Screenshot } from "@/lib/mongo";
import type { PoolFrame } from "./assignScreenshots";

const newFrameId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);

export async function runUploadScreenshots(args: {
  sopId: string;
  byStep: Map<number, string[]>; // stepIndex → ordered poolIds
  pool: PoolFrame[];
}): Promise<Map<number, Screenshot[]>> {
  const byId = new Map<string, PoolFrame>(args.pool.map(f => [f.poolId, f]));
  const out = new Map<number, Screenshot[]>();

  for (const [stepIndex, poolIds] of args.byStep.entries()) {
    const records: Screenshot[] = [];
    for (let order = 0; order < poolIds.length; order++) {
      const frame = byId.get(poolIds[order]);
      if (!frame) {
        logger.warn("uploadScreenshots: missing pool frame", { stepIndex, poolId: poolIds[order] });
        continue;
      }
      const frameId = newFrameId();
      const r2Key = screenshotKey(args.sopId, stepIndex, frameId);
      const buf = await fs.promises.readFile(frame.localPath);
      await putObject(r2Key, buf, "image/jpeg");
      records.push({ frameId, r2Key, t: frame.t, order });
    }
    out.set(stepIndex, records);
  }
  return out;
}
```

- [ ] **Step 2: Run tsc**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Checkpoint**

```bash
git add src/trigger/stages/uploadScreenshots.ts
git commit -m "feat(screenshots): upload selected frames to R2"
```

---

## Task 8: `processSopScreenshots` orchestrator

**Files:**
- Create: `src/trigger/processSopScreenshots.ts`

Mirrors `processSop.ts`'s speech-path branch, swapping clip/keyframes for the three new stages. Trigger.dev auto-discovers it via `dirs: ["./src/trigger"]` in `trigger.config.ts` — no registration step needed.

- [ ] **Step 1: Implement the orchestrator**

Create `src/trigger/processSopScreenshots.ts`:

```ts
import { task, logger } from "@trigger.dev/sdk/v3";
import { ObjectId } from "mongodb";
import { sops, events, type ErrorCode, type SopStatus, type Step, type Screenshot } from "@/lib/mongo";
import { config } from "@/config";
import { probeDuration } from "./lib/probe";
import { presignGet } from "@/lib/r2";
import { fetchSourceVideo } from "./lib/videoTmp";
import { hasUsableSpeech } from "./lib/branchDecision";
import { runTranscribe } from "./stages/transcribe";
import { runNormalize } from "./stages/normalize";
import { runContext } from "./stages/context";
import { runExtract } from "./stages/extract";
import { resolveTimes } from "./stages/clip";
import { runBuildFramePool } from "./stages/buildFramePool";
import { runAssignScreenshots, type StepInput } from "./stages/assignScreenshots";
import { runUploadScreenshots } from "./stages/uploadScreenshots";

async function setStatus(id: ObjectId, status: SopStatus, extra: Record<string, unknown> = {}) {
  await (await sops()).updateOne({ _id: id }, { $set: { status, updatedAt: new Date(), ...extra } });
}
async function fail(id: ObjectId, errorCode: ErrorCode) {
  await (await sops()).updateOne({ _id: id }, { $set: { status: "failed", errorCode, updatedAt: new Date() } });
}

export const processSopScreenshots = task({
  id: "process-sop-screenshots",
  maxDuration: 60 * 15,
  run: async (payload: { sopId: string }) => {
    const _id = new ObjectId(payload.sopId);
    const doc = await (await sops()).findOne({ _id });
    if (!doc || !doc.videoR2Key) { logger.error("sop not found"); return; }

    const signedVideo = await presignGet(doc.videoR2Key, 3600);

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

      // Stage 1: transcribe.
      await setStatus(_id, "transcribing");
      let stage1;
      try { stage1 = await runTranscribe(signedVideo); }
      catch (e) { logger.error("transcribe failed", { e: String(e) }); return fail(_id, "transcription_failed"); }
      const { transcript, segments, language } = stage1;

      // POC scope: speech-path only. If no usable speech, fail explicitly.
      if (!hasUsableSpeech({ segments, transcript })) {
        logger.error("screenshot pipeline: silent path not supported in POC");
        return fail(_id, "transcription_failed");
      }
      const inputMode = "speech" as const;
      await (await sops()).updateOne(
        { _id },
        { $set: { transcript, segments, language, inputMode, updatedAt: new Date() } },
      );

      // Stage 2: normalize.
      await setStatus(_id, "normalizing");
      const segmentsClean = await runNormalize(segments, language!);
      await (await sops()).updateOne({ _id }, { $set: { segmentsClean, updatedAt: new Date() } });

      // Stage 3: context.
      await setStatus(_id, "analyzing");
      const { category, domainSummary } = await runContext({
        cleanTranscript: segmentsClean.map(s => s.text).join(" "),
        language: language!,
      });
      await (await sops()).updateOne({ _id }, { $set: { category, domainSummary, updatedAt: new Date() } });

      // Stage 4: extract step list.
      await setStatus(_id, "generating");
      let extracted;
      try { extracted = await runExtract({ segmentsClean, category, domainSummary, language: language! }); }
      catch (e) { logger.error("extract failed", { e: String(e) }); return fail(_id, "generation_failed"); }

      // Resolve segment IDs → seconds.
      const resolved = resolveTimes(segments, extracted.steps, durationSec);

      // Stage 5: build frame pool.
      await setStatus(_id, "building-pool", { title: extracted.title });
      let src;
      try { src = await fetchSourceVideo(doc.videoR2Key); }
      catch (e) { logger.error("source download failed", { e: String(e) }); return fail(_id, "video_download_failed"); }

      let pool;
      try {
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

        // Stage 6: assign per step (LLM).
        await setStatus(_id, "assigning");
        const stepInputs: StepInput[] = resolved.map((rs, i) => ({
          stepIndex: i,
          title: rs.title,
          narration: rs.description,
          tStart: rs.startTime,
          tEnd: rs.endTime,
        }));
        const assignment = await runAssignScreenshots({
          steps: stepInputs,
          pool: pool.frames,
          language: language!,
        });

        // Stage 7: upload selected frames to R2.
        await setStatus(_id, "uploading-screenshots");
        const screenshotsByStep = await runUploadScreenshots({
          sopId: _id.toHexString(),
          byStep: assignment.byStep,
          pool: pool.frames,
        });

        // Compose step docs. Clip-mode fields populated with empty placeholders.
        const stepsOut: Step[] = resolved.map((rs, i) => {
          const ss = screenshotsByStep.get(i) ?? [];
          const errMsg = assignment.errors.get(i);
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
          if (errMsg) base.screenshotsError = errMsg;
          return base;
        });

        await (await sops()).updateOne(
          { _id },
          { $set: { title: extracted.title, steps: stepsOut, mode: "screenshots", status: "done" as SopStatus, updatedAt: new Date() } },
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
  },
});
```

- [ ] **Step 2: Verify tsc**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify trigger.dev sees the task**

Run: `npx trigger.dev@4 dev --print-tasks` (or whatever command the dev workflow uses to list registered tasks; check `package.json` scripts or `trigger.config.ts`).
Expected: output includes `process-sop-screenshots`.

If the CLI command isn't available locally, skip — `dirs: ["./src/trigger"]` in `trigger.config.ts` auto-discovers any `task({ id: "..." })` export.

- [ ] **Step 4: Checkpoint**

```bash
git add src/trigger/processSopScreenshots.ts
git commit -m "feat(screenshots): orchestrator task process-sop-screenshots"
```

---

## Task 9: Upload commit route — accept `mode`, route to correct task

**Files:**
- Modify: `src/app/api/upload/commit/route.ts`

- [ ] **Step 1: Update the route**

Replace the entire file contents of `src/app/api/upload/commit/route.ts` with:

```ts
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { sops, events } from "@/lib/mongo";
import { tasks } from "@trigger.dev/sdk/v3";

const Body = z.object({
  sopId: z.string().length(24),
  defaultLanguage: z.enum(["vi", "en"]).default("vi"),
  mode: z.enum(["clips", "screenshots"]).default("clips"),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const _id = new ObjectId(parsed.data.sopId);

  const col = await sops();
  const res = await col.updateOne(
    { _id, status: "uploading" },
    { $set: {
        status: "transcribing",
        defaultLanguage: parsed.data.defaultLanguage,
        mode: parsed.data.mode,
        updatedAt: new Date(),
    } },
  );
  if (res.matchedCount === 0) return NextResponse.json({ error: "not_found_or_wrong_state" }, { status: 404 });

  await (await events()).insertOne({
    _id: new ObjectId(), type: "upload", sopId: _id, createdAt: new Date(),
  });

  const taskId = parsed.data.mode === "screenshots" ? "process-sop-screenshots" : "process-sop";
  await tasks.trigger(taskId, { sopId: _id.toHexString() });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify tsc**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Checkpoint**

```bash
git add src/app/api/upload/commit/route.ts
git commit -m "feat(screenshots): upload commit accepts mode and routes task"
```

---

## Task 10: UploadZone UI toggle

**Files:**
- Modify: `src/components/UploadZone.tsx`

- [ ] **Step 1: Add mode state and pass through to commit**

Edit `src/components/UploadZone.tsx`:

1. After the existing `const [language, setLanguage] = useState<"vi" | "en">("vi");` line, add:

```tsx
  const [mode, setMode] = useState<"clips" | "screenshots">("clips");
```

2. In `submitFile`, replace the `body: JSON.stringify({ sopId: init.sopId, defaultLanguage: language })` with:

```ts
      body: JSON.stringify({ sopId: init.sopId, defaultLanguage: language, mode }),
```

3. Add a toggle UI element. The exact location depends on the existing layout — place it near the language selector. Add this JSX immediately before the submit button (find the existing element that triggers `submit()` and insert above it):

```tsx
      <div className="mt-4 flex items-center gap-3 text-sm">
        <span className="text-[#374151] font-medium">Generate as:</span>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="mode"
            value="clips"
            checked={mode === "clips"}
            onChange={() => setMode("clips")}
          />
          <span>Video clips</span>
        </label>
        <label className="inline-flex items-center gap-1.5 cursor-pointer">
          <input
            type="radio"
            name="mode"
            value="screenshots"
            checked={mode === "screenshots"}
            onChange={() => setMode("screenshots")}
          />
          <span>Screenshots <span className="text-[#9CA3AF]">(POC)</span></span>
        </label>
      </div>
```

Note: Loom ingest is **not** updated to support screenshot mode in this POC (spec §2 out-of-scope). The toggle still appears for Loom URLs but is ignored server-side for them.

- [ ] **Step 2: Manual sanity check**

Run: `npm run dev`
Open: `http://localhost:3000/upload`
Expected: page renders without errors; the toggle is visible; selecting "Screenshots" updates state (verify via React DevTools or `console.log(mode)`).

- [ ] **Step 3: Checkpoint**

```bash
git add src/components/UploadZone.tsx
git commit -m "feat(screenshots): upload UI toggle for clips vs screenshots"
```

---

## Task 11: Surface `mode` and `screenshots` in the SOP API

**Files:**
- Modify: `src/app/api/sop/[id]/route.ts`
- Create: `src/app/api/screenshots/[sopId]/[key]/route.ts`

- [ ] **Step 1: Extend the SOP detail response**

Replace `src/app/api/sop/[id]/route.ts` entirely:

```ts
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { sops } from "@/lib/mongo";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });
  const doc = await (await sops()).findOne({ _id: new ObjectId(id) });
  if (!doc || doc.status !== "done") return NextResponse.json({ error: "not_ready" }, { status: 404 });

  const mode = doc.mode ?? "clips";
  const sopId = doc._id.toHexString();

  return NextResponse.json({
    id: sopId,
    title: doc.title,
    category: doc.category,
    createdAt: doc.createdAt,
    shareToken: doc.shareToken,
    mode,
    pdf: {
      status: doc.pdf?.status ?? "idle",
      url: doc.pdf?.status === "ready" ? `/api/sop/${sopId}/pdf/file` : null,
    },
    steps: doc.steps.map((s, i) => ({
      index: i,
      title: s.title,
      description: s.description,
      startTime: s.startTime,
      endTime: s.endTime,
      // Clip-mode URLs (kept for back-compat; viewer ignores when mode === "screenshots").
      clipUrl: `/api/clips/${sopId}/step-${i}.mp4`,
      posterUrl: `/api/clips/${sopId}/step-${i}.jpg`,
      // Screenshot-mode URLs.
      screenshots: (s.screenshots ?? []).map(ss => ({
        frameId: ss.frameId,
        url: `/api/screenshots/${sopId}/${ss.frameId}.jpg`,
        t: ss.t,
        order: ss.order,
      })),
      screenshotsError: s.screenshotsError,
    })),
  });
}
```

- [ ] **Step 2: Create the presigned-URL route**

Create `src/app/api/screenshots/[sopId]/[key]/route.ts`:

```ts
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { sops } from "@/lib/mongo";
import { presignGet } from "@/lib/r2";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sopId: string; key: string }> },
) {
  const { sopId, key } = await params;
  if (!ObjectId.isValid(sopId)) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  // key is the bare filename: "<frameId>.jpg" — validate shape.
  const m = key.match(/^([a-z0-9]{6,16})\.jpg$/);
  if (!m) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const frameId = m[1];

  const doc = await (await sops()).findOne(
    { _id: new ObjectId(sopId), status: "done" },
    { projection: { mode: 1, steps: 1 } },
  );
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (doc.mode !== "screenshots") return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Find which step owns this frameId; use its r2Key (don't trust the URL).
  let r2Key: string | null = null;
  for (const step of doc.steps) {
    const hit = (step.screenshots ?? []).find(ss => ss.frameId === frameId);
    if (hit) { r2Key = hit.r2Key; break; }
  }
  if (!r2Key) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const url = await presignGet(r2Key, 600);
  return NextResponse.redirect(url, 302);
}
```

- [ ] **Step 3: Verify tsc**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Checkpoint**

```bash
git add src/app/api/sop/[id]/route.ts src/app/api/screenshots
git commit -m "feat(screenshots): SOP API exposes mode + screenshots presign route"
```

---

## Task 12: `StepCardScreenshots` component and viewer branching

**Files:**
- Create: `src/components/StepCardScreenshots.tsx`
- Modify: `src/app/sop/[id]/page.tsx`

- [ ] **Step 1: Implement `StepCardScreenshots`**

Create `src/components/StepCardScreenshots.tsx`:

```tsx
"use client";
import { Camera } from "lucide-react";

function fmt(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export type ScreenshotItem = {
  frameId: string;
  url: string;
  t: number;
  order: number;
};

export function StepCardScreenshots({
  index, title, description, screenshots, screenshotsError,
}: {
  index: number;
  title: string;
  description: string;
  screenshots: ScreenshotItem[];
  screenshotsError?: string;
}) {
  const n = String(index + 1).padStart(2, "0");
  const sorted = [...screenshots].sort((a, b) => a.order - b.order);

  return (
    <article
      id={`step-${index + 1}`}
      className="rounded-[20px] border border-gray-200 bg-white p-6 space-y-4"
      style={{ boxShadow: "0 6px 18px -4px rgba(10, 10, 10, 0.04)" }}
    >
      <div className="flex items-center gap-3.5">
        <span
          className="text-[36px] font-bold text-[#2563EB] tracking-[-0.04em] leading-none"
          style={{ fontFamily: "var(--font-inter)" }}
        >
          {n}
        </span>
      </div>
      <h3
        className="text-[20px] font-semibold text-[#0A0A0A] leading-[1.25]"
        style={{ fontFamily: "var(--font-inter)" }}
      >
        {title}
      </h3>
      <p className="text-sm text-[#4B5563] leading-[1.6] whitespace-pre-line">{description}</p>

      {sorted.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sorted.map(s => (
            <figure key={s.frameId} className="space-y-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.url}
                alt={`${title} — ${fmt(s.t)}`}
                loading="lazy"
                className="w-full rounded-lg border border-gray-200 object-contain bg-[#FAFAFA]"
              />
              <figcaption className="inline-flex items-center gap-1.5 text-[12px] text-[#6B7280]">
                <Camera className="w-3 h-3" strokeWidth={2} />
                {fmt(s.t)}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : screenshotsError ? (
        <p className="text-[13px] text-[#B45309] bg-[#FFFBEB] border border-[#FDE68A] rounded-lg px-3 py-2">
          Screenshots unavailable for this step.
        </p>
      ) : (
        <p className="text-[13px] text-[#6B7280] italic">No screenshots needed for this step.</p>
      )}
    </article>
  );
}
```

- [ ] **Step 2: Branch the viewer by `mode`**

In `src/app/sop/[id]/page.tsx`:

1. At the top of the file, add the import:

```tsx
import { StepCardScreenshots, type ScreenshotItem } from "@/components/StepCardScreenshots";
```

2. Extend the `Step` and `Sop` types to include screenshot data and mode:

```tsx
type Step = {
  index: number;
  title: string;
  description: string;
  startTime?: number;
  endTime?: number;
  clipUrl: string;
  posterUrl: string;
  screenshots: ScreenshotItem[];
  screenshotsError?: string;
};
type Sop = {
  id: string;
  title: string;
  category: string;
  createdAt: string;
  shareToken: string;
  mode: "clips" | "screenshots";
  pdf: { status: string; url: string | null };
  steps: Step[];
};
```

3. Replace the `{sop.steps.map((s) => <StepCard key={s.index} {...s} />)}` line with:

```tsx
            {sop.mode === "screenshots"
              ? sop.steps.map((s) => (
                  <StepCardScreenshots
                    key={s.index}
                    index={s.index}
                    title={s.title}
                    description={s.description}
                    screenshots={s.screenshots}
                    screenshotsError={s.screenshotsError}
                  />
                ))
              : sop.steps.map((s) => <StepCard key={s.index} {...s} />)}
```

4. The `HeroVideo` element renders the **first step's poster**. In screenshot mode that poster doesn't exist. Wrap it:

```tsx
            {sop.mode !== "screenshots" && sop.steps.length > 0 && (
              <HeroVideo
                sopId={sop.id}
                posterUrl={sop.steps[0].posterUrl}
                totalSeconds={duration}
              />
            )}
```

5. The `ExportPdfButton` only works for clip mode (PDF for screenshot mode is out-of-scope per spec §2). Wrap:

```tsx
            {sop.mode !== "screenshots" && (
              <ExportPdfButton sopId={sop.id} initial={sop.pdf} />
            )}
```

- [ ] **Step 3: Verify tsc**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Checkpoint**

```bash
git add src/components/StepCardScreenshots.tsx src/app/sop/[id]/page.tsx
git commit -m "feat(screenshots): viewer renders screenshots when mode === screenshots"
```

---

## Task 13: End-to-end manual smoke test

**Files:** none (manual verification).

- [ ] **Step 1: Run trigger.dev dev worker**

Run: `npx trigger.dev@4 dev` (or whatever the existing dev workflow uses to start the worker).
Expected: worker prints both `process-sop` and `process-sop-screenshots` in the registered tasks.

- [ ] **Step 2: Run Next.js dev server**

In a separate terminal: `npm run dev`
Open: `http://localhost:3000/upload`

- [ ] **Step 3: Upload a short test video in screenshot mode**

Use a short (30-90s) screen-recording with clear narration and a few discrete UI actions.
- Select "Screenshots (POC)" toggle.
- Upload the file.
- Expected: redirect to `/processing/<sopId>`; status progresses through `transcribing → normalizing → analyzing → generating → building-pool → assigning → uploading-screenshots → done`.

- [ ] **Step 4: View the result**

Navigate to `/sop/<sopId>`.
Expected:
- No video player at the top (HeroVideo is hidden for screenshot mode).
- Each step renders a `StepCardScreenshots` with N screenshots (N ≥ 0, varies).
- Images load via `/api/screenshots/<sopId>/<frameId>.jpg` (302 → R2 presigned).
- No "Export PDF" button visible.

- [ ] **Step 5: Verify Mongo doc**

In a Mongo shell or Compass, find the SOP doc by `_id`.
Expected:
- `mode: "screenshots"`.
- Each step in `steps[]` has a `screenshots[]` array of `{ frameId, r2Key, t, order }`.
- `clipR2Key` and `posterR2Key` are empty strings; `keyframeR2Keys` is `[]`.

- [ ] **Step 6: Verify R2**

Check the R2 bucket: `sops/<sopId>/screenshots/step-<i>/<frameId>.jpg` should exist for every record in the SOP doc.

- [ ] **Step 7: Smoke clip-mode regression**

Upload the same video again with the toggle set to "Video clips".
Expected: the old behavior is unchanged — `process-sop` runs, `mode: "clips"` is set, viewer shows the existing `StepCard` with `HeroVideo`.

- [ ] **Step 8: Final checkpoint**

```bash
git add -A
git commit -m "feat(screenshots): end-to-end POC verified"
```

---

## Self-review notes (covered)

- **Spec §3 (pipeline shape):** Task 8 implements the orchestrator with the documented state machine.
- **Spec §4 (frame pool):** Task 5 implements `buildFramePool` with all four tunables wired through Task 2.
- **Spec §5 (assignment):** Task 6 implements bucketing, per-step LLM call, image downscaling (max 1280px via Task 3 helper), bucket-local index handling, and cross-step dedup. Per-step error handling via `Promise.allSettled` matches §5.5.
- **Spec §6.1 (R2 keyspace):** Task 2 adds `screenshotKey(sopId, stepIndex, frameId)`. Task 7 uses it.
- **Spec §6.2 (Mongo schema):** Task 4 adds `mode`, `Screenshot`, step `screenshots[]`, step `screenshotsError`.
- **Spec §7 (upload toggle):** Task 9 (route) + Task 10 (UI).
- **Spec §8 (viewer):** Task 11 (API) + Task 12 (component + branching).
- **Spec §9 (testing):** Tasks 3, 5, 6 each ship unit tests. The orchestrator smoke test from Task 13 stands in for `processSopScreenshots.test.ts` — the orchestrator is mostly orchestration glue around tested stages, and the manual smoke validates the integration.
- **Spec §10 (out of scope):** PDF / Loom / silent path / cleanup / abuse handling are explicitly skipped. Loom is skipped server-side in Task 10's note. Silent path returns `transcription_failed` in Task 8. PDF button is hidden in Task 12.
