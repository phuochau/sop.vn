# Asset Metadata Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist original source metadata (size/dimensions/duration/fps/ext/mime) on `SopDoc.source`, per-asset metadata on every `Screenshot` and `Clip`, and a debugging breadcrumb on `Screenshot.highlight.source` (subStepIndex + grounder).

**Architecture:** New optional fields on `SopDoc`, `Screenshot`, and `Clip`. A new `src/lib/probeSource.ts` helper wraps `ffmpeg.ffprobe` for full metadata extraction. `HighlightDecision` gains a `grounder` discriminator threaded out of `pointFallbackHighlight`. Source meta runs at the upload-commit boundary (direct upload) or inside the `ingest-loom` trigger task right after stream completion (Loom). Per-asset meta is captured inside the existing stages (`uploadScreenshots`, `extractClips`, `uploadClips`) where the data is already in scope.

**Tech Stack:** TypeScript (strict), Next.js 16 App Router, Trigger.dev v4, MongoDB, fluent-ffmpeg, sharp, Zod, `node:test` via `npx tsx --test`.

---

## File Structure

**Create:**
- `src/lib/probeSource.ts` — shared metadata probe helper, built on `ffmpeg.ffprobe`.
- `src/lib/probeSource.test.ts` — fixture-based unit tests.

**Modify:**
- `src/lib/mongo.ts` — extend `SopDoc`, `Screenshot`, `Clip` interfaces.
- `src/lib/schemas.ts` — extend `HighlightDecision` with `grounder?`; extend `Action.highlight` with `source?`.
- `src/app/api/upload/commit/route.ts` — probe source video, set `source` on the SOP doc.
- `src/trigger/ingestLoom.ts` — probe source video after stream succeeds, set `source` in the same `$set` as `videoSizeBytes`.
- `src/trigger/stages/locateHighlight.ts` — propagate `grounder` into yes decisions.
- `src/trigger/stages/highlightActions.ts` — copy `grounder` + `subStepIndex` onto `action.highlight.source`.
- `src/trigger/stages/uploadScreenshots.ts` — capture buffer size + sharp dimensions; persist on `Screenshot`.
- `src/trigger/stages/extractClips.ts` — probe each extracted clip + poster; thread metadata out via `ExtractedClip`.
- `src/trigger/stages/uploadClips.ts` — copy metadata onto each `Clip` record.

**Test (modify existing):**
- `src/trigger/stages/uploadScreenshots.test.ts` — assert new fields on persisted records.
- `src/trigger/stages/uploadClips.test.ts` — assert new fields on persisted records.
- `src/trigger/stages/highlightActions.test.ts` — assert `highlight.source` populated.

---

## Task 1: Add `probeSource` helper and tests

**Files:**
- Create: `src/lib/probeSource.ts`
- Test: `src/lib/probeSource.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/probeSource.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { probeSourceFile } from "./probeSource";

// Reuse a small real sample from samples/ — no fixture commit needed.
const FIXTURE = path.join(process.cwd(), "samples/trimmed-hubspot_crm.mp4");

test("probeSourceFile returns full metadata for an mp4", async () => {
  const meta = await probeSourceFile(FIXTURE);
  assert.equal(meta.ext, "mp4");
  assert.equal(meta.mime, "video/mp4");
  assert.ok(meta.sizeBytes > 0);
  assert.ok(meta.width > 0);
  assert.ok(meta.height > 0);
  assert.ok(meta.durationSec > 0);
  assert.ok(meta.fps > 0);
  assert.ok(meta.codec.length > 0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx tsx --test src/lib/probeSource.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement minimal helper**

```ts
// src/lib/probeSource.ts
import fs from "node:fs";
import path from "node:path";
import ffmpeg from "fluent-ffmpeg";

export interface SourceMetadata {
  sizeBytes: number;
  width: number;
  height: number;
  durationSec: number;
  fps: number;
  ext: string;   // lowercased, no leading dot
  mime: string;
  codec: string; // ffprobe video stream codec_name, "" if unknown
}

const MIME_BY_EXT: Record<string, string> = {
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  m4v: "video/x-m4v",
};

function parseFps(rate: string | undefined): number {
  if (!rate) return 0;
  const [num, den] = rate.split("/").map(Number);
  if (!num || !den) return 0;
  return num / den;
}

export async function probeSourceFile(filePath: string): Promise<SourceMetadata> {
  const stat = await fs.promises.stat(filePath);
  const ext = path.extname(filePath).replace(/^\./, "").toLowerCase();
  const data = await new Promise<ffmpeg.FfprobeData>((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, d) => (err ? reject(err) : resolve(d)));
  });
  const video = data.streams.find((s) => s.codec_type === "video");
  const width  = Number(video?.width  ?? 0);
  const height = Number(video?.height ?? 0);
  const fps    = parseFps(video?.avg_frame_rate ?? video?.r_frame_rate);
  const durationSec = Number(data.format.duration ?? 0);
  const codec = video?.codec_name ?? "";
  return {
    sizeBytes: stat.size,
    width, height,
    durationSec, fps,
    ext,
    mime: MIME_BY_EXT[ext] ?? "application/octet-stream",
    codec,
  };
}

export async function probeSourceFromUrl(signedUrl: string, ext: string): Promise<SourceMetadata> {
  const os = await import("node:os");
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "probe-src-"));
  const file = path.join(tmp, `src.${ext}`);
  try {
    const res = await fetch(signedUrl);
    if (!res.ok) throw new Error(`download failed: ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await fs.promises.writeFile(file, buf);
    return await probeSourceFile(file);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx tsx --test src/lib/probeSource.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/probeSource.ts src/lib/probeSource.test.ts
git commit -m "feat(asset-meta): add probeSource helper for source metadata"
```

---

## Task 2: Extend Mongo interfaces

**Files:**
- Modify: `src/lib/mongo.ts`

- [ ] **Step 1: Extend `Screenshot`**

In `src/lib/mongo.ts`, inside `interface Screenshot { ... }`, append BEFORE the closing brace:

```ts
  // Asset metadata captured at upload time; absent on legacy rows.
  sizeBytes?: number;
  width?: number;
  height?: number;
  ext?: string;   // "jpg"
  mime?: string;  // "image/jpeg"
```

- [ ] **Step 2: Extend `Clip`**

In the `Clip` interface, append BEFORE the closing brace:

```ts
  // Asset metadata captured at extract+upload time; absent on legacy rows.
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSec?: number;
  ext?: string;   // "mp4"
  mime?: string;  // "video/mp4"
  codec?: string; // ffprobe stream.codec_name, e.g. "h264"
  posterSizeBytes?: number;
  posterWidth?: number;
  posterHeight?: number;
  posterMime?: string; // "image/jpeg"
```

- [ ] **Step 3: Extend `SopDoc`**

In the `SopDoc` interface, AFTER the existing `videoSizeBytes?: number;` line, insert:

```ts
  source?: {
    sizeBytes: number;
    width: number;
    height: number;
    durationSec: number;
    fps: number;
    ext: string;
    mime: string;
    codec: string;
  };
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mongo.ts
git commit -m "feat(asset-meta): extend Mongo types with source + per-asset metadata"
```

---

## Task 3: Extend `HighlightDecision` with `grounder`

**Files:**
- Modify: `src/lib/schemas.ts`
- Modify: `src/trigger/stages/locateHighlight.ts`

- [ ] **Step 1: Extend the Zod schema**

In `src/lib/schemas.ts`, replace the `HighlightDecision` declaration with:

```ts
export const HighlightDecision = z.object({
  highlight: z.enum(["yes", "no"]),
  point: Point.nullable().optional(),
  bbox: BBox.nullable(),
  noHighlightReason: z
    .enum(["view_action", "no_specific_target", "non_ui_frame", "grounding_unavailable"])
    .nullable(),
  grounder: z.enum(["ui-tars", "qwen3-vl"]).optional(),
});
```

Also extend the inline `Action.highlight` type. Replace:

```ts
  highlight?: {
    kind: "click" | "input";
    bbox?: { x: number; y: number; w: number; h: number };
    point?: { x: number; y: number };
  };
```

with:

```ts
  highlight?: {
    kind: "click" | "input";
    bbox?: { x: number; y: number; w: number; h: number };
    point?: { x: number; y: number };
    source?: {
      subStepIndex: number;
      actionId?: string;        // reserved — currently unset because Action has no stable id
      grounder?: "ui-tars" | "qwen3-vl";
    };
  };
```

- [ ] **Step 2: Thread `grounder` through `pointFallbackHighlight`**

In `src/trigger/stages/locateHighlight.ts`, change `yesDecision` to accept and embed the grounder:

```ts
function yesDecision(
  point: { x: number; y: number },
  grounder: "ui-tars" | "qwen3-vl",
): Decision {
  return {
    highlight: "yes",
    point,
    bbox: null,
    noHighlightReason: null,
    grounder,
  };
}
```

Update the two yes paths inside `pointFallbackHighlight`:

```ts
    if (r.point) return yesDecision(r.point, "ui-tars");
```

```ts
    if (r.point) return yesDecision(r.point, "qwen3-vl");
```

The `no` return at the bottom does not need `grounder` (it's optional and absent).

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/schemas.ts src/trigger/stages/locateHighlight.ts
git commit -m "feat(asset-meta): add grounder identity to HighlightDecision + Action.highlight.source"
```

---

## Task 4: Populate `highlight.source` in `highlightActions`

**Files:**
- Modify: `src/trigger/stages/highlightActions.ts`
- Test: `src/trigger/stages/highlightActions.test.ts`

- [ ] **Step 1: Read the existing test to understand the harness**

Run: `cat src/trigger/stages/highlightActions.test.ts | head -80`
(Familiarize with the dependency-injection style for `highlighter`.)

- [ ] **Step 2: Write a failing test asserting `highlight.source`**

Append to `src/trigger/stages/highlightActions.test.ts`:

```ts
test("highlightActions writes highlight.source with subStepIndex + grounder", async () => {
  const actions: Action[] = [
    {
      stepIndex: 0, order: 0, verb: "click",
      description: "open menu", screenName: "home", elementCaption: "menu",
      displayFramePath: "/tmp/f.jpg", time: 1.0,
    },
    {
      stepIndex: 0, order: 1, verb: "click",
      description: "click save", screenName: "form", elementCaption: "save",
      displayFramePath: "/tmp/g.jpg", time: 2.0,
    },
  ];
  const highlighter = async () => ({
    highlight: "yes" as const,
    point: { x: 0.5, y: 0.5 },
    bbox: null,
    noHighlightReason: null,
    grounder: "ui-tars" as const,
  });
  const out = await highlightActions({ actions, highlighter });
  assert.deepEqual(out[0].highlight?.source, { subStepIndex: 0, grounder: "ui-tars" });
  assert.deepEqual(out[1].highlight?.source, { subStepIndex: 1, grounder: "ui-tars" });
});
```

(Use the existing `import` statements and `Action` import already in the file.)

- [ ] **Step 3: Run the failing test**

Run: `npx tsx --test src/trigger/stages/highlightActions.test.ts`
Expected: FAIL — `highlight.source` is undefined.

- [ ] **Step 4: Implement**

In `src/trigger/stages/highlightActions.ts`, replace the ENTIRE existing `for (const action of args.actions) { ... }` loop with the indexed-loop version below (so `idx` is available for `subStepIndex`):

```ts
  for (let idx = 0; idx < args.actions.length; idx++) {
    const action = args.actions[idx];
    if (action.verb === "view") continue;
    const decision = await highlighter({
      intent: action.description,
      verb: action.verb,
      framePath: action.displayFramePath,
    });
    if (decision.highlight === "yes" && decision.point) {
      action.highlight = {
        kind: highlightKind(action.verb),
        point: { x: decision.point.x, y: decision.point.y },
        source: {
          subStepIndex: idx,
          ...(decision.grounder ? { grounder: decision.grounder } : {}),
        },
      };
    }
  }
```

- [ ] **Step 5: Run tests**

Run: `npx tsx --test src/trigger/stages/highlightActions.test.ts`
Expected: PASS (including all pre-existing tests).

- [ ] **Step 6: Commit**

```bash
git add src/trigger/stages/highlightActions.ts src/trigger/stages/highlightActions.test.ts
git commit -m "feat(asset-meta): populate highlight.source breadcrumb in highlightActions"
```

---

## Task 5: Capture screenshot metadata in `uploadScreenshots`

**Files:**
- Modify: `src/trigger/stages/uploadScreenshots.ts`
- Test: `src/trigger/stages/uploadScreenshots.test.ts`

- [ ] **Step 1: Write the failing test**

The existing test file already tests `buildBufferWithOptionalHighlight` directly against `__fixtures__/sample-1080p.jpg` (see existing tests with `FIXTURE` constant). The new behaviour — returning `width`/`height` alongside `buf` — can be tested at the same level without touching `runUploadScreenshots`. Append:

```ts
test("buildBufferWithOptionalHighlight returns image width/height alongside the buffer (no-geom)", async () => {
  const { buf, error, width, height } = await buildBufferWithOptionalHighlight(FIXTURE, null);
  assert.equal(error, null);
  assert.ok(buf.length > 0);
  assert.equal(width, 1920);
  assert.equal(height, 1080);
});

test("buildBufferWithOptionalHighlight returns width/height when compositing a point", async () => {
  const { buf, error, width, height } = await buildBufferWithOptionalHighlight(
    FIXTURE,
    { point: { x: 0.5, y: 0.5 } },
  );
  assert.equal(error, null);
  assert.ok(buf.length > 0);
  assert.equal(width, 1920);
  assert.equal(height, 1080);
});
```

(`FIXTURE` and `buildBufferWithOptionalHighlight` are already imported in the file.)

Why we don't unit-test `runUploadScreenshots` here: it imports `putObject` from `@/lib/r2` at module scope and has no injection seam. Refactoring it for testability is out of scope for this metadata pass — the metadata wiring inside `runUploadScreenshots` (size from `buf.length`, dims passed through, ext/mime literals) is trivial enough that the `buildBufferWithOptionalHighlight` tests plus a successful type-check cover it. Task 9 includes an end-to-end smoke step that confirms it for real.

- [ ] **Step 2: Run the failing test**

Run: `npx tsx --test src/trigger/stages/uploadScreenshots.test.ts`
Expected: FAIL — new fields undefined.

- [ ] **Step 3: Implement — capture from sharp + buffer**

In `src/trigger/stages/uploadScreenshots.ts`, modify `buildBufferWithOptionalHighlight` to also return width/height. Replace its return shape:

```ts
export async function buildBufferWithOptionalHighlight(
  localPath: string,
  geom: HighlightGeom,
): Promise<{ buf: Buffer; error: string | null; width: number; height: number }> {
```

Inside the function:
- After reading metadata for the no-geom branch:

```ts
  if (!geom) {
    const buf = await fs.promises.readFile(localPath);
    const meta = await sharp(buf).metadata();
    return { buf, error: null, width: meta.width ?? 0, height: meta.height ?? 0 };
  }
```

- In the highlight branch where `W`/`H` are computed, include them in every return:

```ts
    if (!W || !H) {
      const buf = await fs.promises.readFile(localPath);
      return { buf, error: "missing image metadata", width: W, height: H };
    }
    // ... existing svg logic ...
    if ("point" in geom) {
      svg = circleSvg(W, H, geom.point);
    } else {
      svg = rectSvg(W, H, geom.bbox);
      if (!svg) {
        const buf = await fs.promises.readFile(localPath);
        return { buf, error: "bbox out of range", width: W, height: H };
      }
    }
    const buf = await sharp(localPath)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .jpeg({ quality: 85 })
      .toBuffer();
    return { buf, error: null, width: W, height: H };
```

- In the `catch` block:

```ts
  } catch (e) {
    const buf = await fs.promises.readFile(localPath);
    const meta = await sharp(buf).metadata().catch(() => ({ width: 0, height: 0 }));
    return {
      buf,
      error: e instanceof Error ? e.message : String(e),
      width: meta.width ?? 0,
      height: meta.height ?? 0,
    };
  }
```

Then in `runUploadScreenshots`, replace the destructure + record block:

```ts
      const { buf, error, width, height } = await buildBufferWithOptionalHighlight(action.displayFramePath, geom);
      // ... existing logger.warn block unchanged ...
      await putObject(r2Key, buf, "image/jpeg");
      const rec: Screenshot = {
        frameId,
        r2Key,
        t: action.time,
        order,
        sizeBytes: buf.length,
        width,
        height,
        ext: "jpg",
        mime: "image/jpeg",
        ...screenshotMetaFromAction(action),
      };
```

- [ ] **Step 4: Run tests**

Run: `npx tsx --test src/trigger/stages/uploadScreenshots.test.ts`
Expected: PASS (all tests, including the new one).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/trigger/stages/uploadScreenshots.ts src/trigger/stages/uploadScreenshots.test.ts
git commit -m "feat(asset-meta): capture size + dimensions on Screenshot uploads"
```

---

## Task 6: Capture clip + poster metadata in `extractClips` and `uploadClips`

**Files:**
- Modify: `src/trigger/stages/extractClips.ts`
- Modify: `src/trigger/stages/uploadClips.ts`
- Test: `src/trigger/stages/uploadClips.test.ts`

- [ ] **Step 1: Extend `ExtractedClip` with metadata**

In `src/trigger/stages/extractClips.ts`, add to the `ExtractedClip` interface (additive, all optional so existing test fixtures still type-check):

```ts
export interface ExtractedClip {
  stepIndex: number;
  clipPath: string;
  posterPath: string;
  startTime: number;
  endTime: number;
  error?: string;
  meta?: {
    sizeBytes: number;
    width: number;
    height: number;
    durationSec: number;
    codec: string;
    posterSizeBytes: number;
    posterWidth: number;
    posterHeight: number;
  };
}
```

- [ ] **Step 2: Probe each clip + poster after extraction**

At the top of `extractClips.ts`, add the imports:

```ts
import sharp from "sharp";
import { probeSourceFile } from "@/lib/probeSource";
```

Then in `runExtractClips`, locate the existing inner try (currently lines 49-54):

```ts
      try {
        await extractClip(args.srcPath, clipPath, startTime, endTime);
        await grabFrame(args.srcPath, posterPath, (startTime + endTime) / 2);
      } catch (e) {
        rec.error = e instanceof Error ? e.message : String(e);
      }
```

Splice a nested best-effort try **between** the `grabFrame` line and the outer `catch`, so the final shape is:

```ts
      try {
        await extractClip(args.srcPath, clipPath, startTime, endTime);
        await grabFrame(args.srcPath, posterPath, (startTime + endTime) / 2);
        try {
          const clipMeta = await probeSourceFile(clipPath);
          const posterMeta = await sharp(posterPath).metadata();
          const posterStat = await fs.promises.stat(posterPath);
          rec.meta = {
            sizeBytes: clipMeta.sizeBytes,
            width: clipMeta.width,
            height: clipMeta.height,
            durationSec: clipMeta.durationSec,
            codec: clipMeta.codec,
            posterSizeBytes: posterStat.size,
            posterWidth: posterMeta.width ?? 0,
            posterHeight: posterMeta.height ?? 0,
          };
        } catch {
          // Best-effort: leave rec.meta undefined; upload still proceeds.
        }
      } catch (e) {
        rec.error = e instanceof Error ? e.message : String(e);
      }
```

`probeSourceFile` already returns `codec` (Task 1 includes it), so no separate ffprobe helper is needed.

- [ ] **Step 3: Write the failing test in uploadClips**

Add `import type { ExtractedClip } from "./extractClips";` to the test file's imports if not already present, then append:

```ts
test("runUploadClips copies ExtractedClip.meta onto Clip records", async () => {
  const ec: ExtractedClip = {
    stepIndex: 0,
    clipPath: "/dev/null/clip.mp4",
    posterPath: "/dev/null/poster.jpg",
    startTime: 0,
    endTime: 2,
    meta: {
      sizeBytes: 12345,
      width: 1920,
      height: 1080,
      durationSec: 2.0,
      codec: "h264",
      posterSizeBytes: 4321,
      posterWidth: 1920,
      posterHeight: 1080,
    },
  };
  // Use the existing in-file fs stub if present; else mock readFile via the
  // pattern nearby tests use. Stub putObject to a no-op recorder.
  const result = await runUploadClips({
    sopId: "sop123",
    clips: [ec],
    putObject: async () => {},
  });
  const clip = result.get(0)!.clips[0];
  assert.equal(clip.sizeBytes, 12345);
  assert.equal(clip.width, 1920);
  assert.equal(clip.height, 1080);
  assert.equal(clip.durationSec, 2.0);
  assert.equal(clip.codec, "h264");
  assert.equal(clip.ext, "mp4");
  assert.equal(clip.mime, "video/mp4");
  assert.equal(clip.posterSizeBytes, 4321);
  assert.equal(clip.posterWidth, 1920);
  assert.equal(clip.posterHeight, 1080);
  assert.equal(clip.posterMime, "image/jpeg");
});
```

If the existing tests don't stub `fs.readFile`, you'll need a tiny fixture under `__fixtures__/` and use real paths — follow the prevailing pattern.

- [ ] **Step 4: Run the failing test**

Run: `npx tsx --test src/trigger/stages/uploadClips.test.ts`
Expected: FAIL — new fields undefined on `Clip`.

- [ ] **Step 5: Wire metadata onto `Clip` in `uploadClips.ts`**

In `runUploadClips`, replace the `out.set(...)` call inside the success branch with:

```ts
    const clip: Clip = {
      clipId, r2Key, posterR2Key,
      startTime: ec.startTime, endTime: ec.endTime, order: 0,
      ext: "mp4",
      mime: "video/mp4",
      posterMime: "image/jpeg",
      ...(ec.meta ? {
        sizeBytes: ec.meta.sizeBytes,
        width: ec.meta.width,
        height: ec.meta.height,
        durationSec: ec.meta.durationSec,
        codec: ec.meta.codec,
        posterSizeBytes: ec.meta.posterSizeBytes,
        posterWidth: ec.meta.posterWidth,
        posterHeight: ec.meta.posterHeight,
      } : {}),
    };
    out.set(ec.stepIndex, { clips: [clip] });
```

- [ ] **Step 6: Run tests**

Run: `npx tsx --test src/trigger/stages/uploadClips.test.ts src/trigger/stages/extractClips.test.ts`
Expected: PASS.

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/trigger/stages/extractClips.ts src/trigger/stages/uploadClips.ts src/trigger/stages/uploadClips.test.ts
git commit -m "feat(asset-meta): capture clip + poster metadata in extract/upload pipeline"
```

---

## Task 7: Wire source probe into `POST /api/upload/commit`

**Files:**
- Modify: `src/app/api/upload/commit/route.ts`

- [ ] **Step 1: Look up the videoR2Key + ext for the SOP**

Replace the `$set` block in `src/app/api/upload/commit/route.ts` with probe-then-update:

```ts
import { presignGet } from "@/lib/r2";
import { probeSourceFromUrl } from "@/lib/probeSource";
import path from "node:path";
import { logger } from "@trigger.dev/sdk/v3";
```

Then in the handler, REPLACE the existing `const col = await sops(); const res = await col.updateOne(...); if (res.matchedCount === 0) ...` block with the version below. It uses `findOneAndUpdate(returnDocument: "before")` to atomically flip status while returning the prior doc, then probes the source (now safe because the status is no longer "uploading"), then applies a best-effort second `$set` for the metadata:

```ts
import type { SourceMetadata } from "@/lib/probeSource";

  const col = await sops();
  const before = await col.findOneAndUpdate(
    { _id, status: "uploading" },
    { $set: {
        status: "transcribing",
        defaultLanguage: parsed.data.defaultLanguage,
        outputFormat: parsed.data.outputFormat,
        updatedAt: new Date(),
    } },
    { returnDocument: "before" },
  );
  if (!before) return NextResponse.json({ error: "not_found_or_wrong_state" }, { status: 404 });

  let source: SourceMetadata | undefined;
  if (before.videoR2Key) {
    try {
      const signedUrl = await presignGet(before.videoR2Key);
      const ext = path.extname(before.videoR2Key).replace(/^\./, "").toLowerCase() || "mp4";
      source = await probeSourceFromUrl(signedUrl, ext);
    } catch (e) {
      logger.warn("upload/commit: probeSource failed; continuing without source meta", {
        sopId: parsed.data.sopId, error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  if (source) {
    await col.updateOne(
      { _id },
      { $set: { source, videoSizeBytes: source.sizeBytes, updatedAt: new Date() } },
    );
  }
```

Latency note: `probeSourceFromUrl` downloads the source to /tmp before ffprobe, which is acceptable for the POC. If this hurts UX in production, a follow-up can move the probe into the next Trigger.dev task — out of scope here per spec.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/upload/commit/route.ts
git commit -m "feat(asset-meta): probe source metadata at upload commit"
```

---

## Task 8: Wire source probe into `ingest-loom` trigger

**Files:**
- Modify: `src/trigger/ingestLoom.ts`

- [ ] **Step 1: Probe after stream succeeds**

Open `src/trigger/ingestLoom.ts`. Find the existing block (around line 100-103):

```ts
    await col.updateOne(
      { _id },
      { $set: { status: "transcribing", videoSizeBytes: streamed.bytes, updatedAt: new Date() } },
    );
```

Add imports at the top:

```ts
import { presignGet } from "@/lib/r2";
import { probeSourceFromUrl, type SourceMetadata } from "@/lib/probeSource";
import path from "node:path";
```

Replace the `updateOne` block with a probe-then-update:

```ts
    let source: SourceMetadata | undefined;
    try {
      const signedUrl = await presignGet(doc.videoR2Key);
      const ext = path.extname(doc.videoR2Key).replace(/^\./, "").toLowerCase() || "mp4";
      source = await probeSourceFromUrl(signedUrl, ext);
    } catch (e) {
      logger.warn("ingestLoom: probeSource failed; continuing without source meta", {
        sopId: _id.toHexString(), error: e instanceof Error ? e.message : String(e),
      });
    }
    await col.updateOne(
      { _id },
      { $set: {
          status: "transcribing",
          videoSizeBytes: streamed.bytes,
          ...(source ? { source } : {}),
          updatedAt: new Date(),
      } },
    );
```

(If `logger` is not already imported in this file, add `import { logger } from "@trigger.dev/sdk/v3";`.)

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/trigger/ingestLoom.ts
git commit -m "feat(asset-meta): probe source metadata in ingest-loom after stream"
```

---

## Task 9: Final verification — full suite + type-check

**Files:** none

- [ ] **Step 1: Run the full test suite**

Run: `npx tsx --test 'src/**/*.test.ts'`
Expected: All tests PASS.

- [ ] **Step 2: Type-check the whole project**

Run: `npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Confirm no committed files were missed**

Run: `git status`
Expected: clean working tree.

- [ ] **Step 4: End-to-end smoke check (manual)**

Per spec §Testing line 233-235, verify the wired fields end-to-end. Pick one fixture from `samples/` (e.g. a short physical video), upload via the local dev server, wait for `status: done`, then inspect the SOP using `scripts/inspect-sop.ts` (or extend it with a `--meta` flag). Confirm at minimum:

- `sop.source.sizeBytes > 0`, `source.width > 0`, `source.height > 0`, `source.codec.length > 0`
- For a screenshots SOP: `step.screenshots[0].sizeBytes > 0`, `width > 0`, `mime === "image/jpeg"`, and when a highlight was found `screenshots[*].highlight.source.grounder` is `"ui-tars"` or `"qwen3-vl"`
- For a clips SOP: `step.clips[0].sizeBytes > 0`, `codec.length > 0`, `posterSizeBytes > 0`

Record the SOP id used in the final PR message. If the dev environment isn't available, document the gap rather than skipping silently.

---

## Notes for the implementer

- **DRY**: `probeSourceFile` is the single ffprobe wrapper and returns `codec` directly. Call it for any clip-level probing too — do not write a second ffprobe helper.
- **YAGNI**: Do not add UI changes. This is a data-layer pass.
- **TDD**: Each new behavior gets a failing test first.
- **No backfill**: legacy SOPs simply lack the new fields; all new fields are optional. Do not write a backfill script.
- **Error handling at probe**: best-effort. Log + continue. Never fail the request or the orchestrator because metadata couldn't be probed.
- **Fixtures**: reuse `__fixtures__/sample-1080p.jpg` (already present, 1920×1080) and `__fixtures__/sample-physical.mp4` (or whichever mp4 already exists). Do not commit new binaries.
