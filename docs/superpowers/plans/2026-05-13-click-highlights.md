# Click/tap highlights on screenshots — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw a yellow rectangle on each screenshot where the user clicks/taps/types into a UI element, baked into the JPEG before R2 upload, using the same per-step vision LLM call to pick the bounding box.

**Architecture:** Extend `ScreenshotPicksOutput` with an optional `highlight: { kind, bbox } | null` per pick. The bbox is normalized 0..1 in the LLM's coordinate frame (downscaled image). `assignScreenshots` threads `highlight` through the `Pick` type and cross-step dedup. `uploadScreenshots` invokes `sharp` *only when* `highlight` is non-null — un-highlighted frames keep the byte-perfect raw upload path. A pure helper `rectSvg(W, H, bbox)` produces an SVG overlay that `sharp().composite()` rasterizes onto the original-resolution frame.

**Tech Stack:** TypeScript, Zod (existing custom JSON-schema converter — already handles `ZodNullable`), `sharp` (already a dep), trigger.dev v3, node:test + node:assert, OpenRouter (Gemini 2.5 Flash vision), MongoDB.

**Spec:** `docs/superpowers/specs/2026-05-13-click-highlights-design.md`.

---

## File Structure

- **Modify** `src/lib/schemas.ts` — add `BBox`, `Highlight`, extend `ScreenshotPicksOutput.picks[]` with `highlight: Highlight.nullable()`.
- **Modify** `src/lib/mongo.ts` — extend `Screenshot` interface with optional `highlight` and `highlightError`.
- **Modify** `src/config/index.ts` — extend `screenshotPickSystem` prompt with the highlight instructions.
- **Modify** `src/trigger/stages/assignScreenshots.ts` — extend `Pick` type with `highlight`; thread through `pickForStep` and `resolveCrossStepDedup`; update the user-text reminder line.
- **Modify** `src/trigger/stages/assignScreenshots.test.ts` — carry `highlight: null` through existing fixtures; add one case asserting non-null `highlight` survives dedup.
- **Modify** `src/trigger/stages/uploadScreenshots.ts` — add `rectSvg` and `buildUploadBuffer` helpers; switch the upload path to `buildUploadBuffer`.
- **Create** `src/trigger/stages/uploadScreenshots.test.ts` — unit tests for `rectSvg` and `buildUploadBuffer`.
- **Create** `src/trigger/stages/__fixtures__/sample-1080p.jpg` — fixture image for `buildUploadBuffer` tests (we generate it once with `sharp` and commit the bytes).
- **Modify** `src/app/api/sop/[id]/route.ts` — thread `highlight` in the screenshots response.

No new files in app routes / components — viewer is unchanged (rectangle is baked into the JPEG).

---

## Task 1: Extend Zod schema with `Highlight` and nullable `highlight` field

**Files:**
- Modify: `src/lib/schemas.ts:49-54`

- [ ] **Step 1: Edit `src/lib/schemas.ts`**

Replace lines 49–54 (the existing `ScreenshotPicksOutput`) and add `BBox` / `Highlight` above it:

```ts
export const BBox = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

export const Highlight = z.object({
  kind: z.enum(["click", "input"]),
  bbox: BBox,
});

export const ScreenshotPicksOutput = z.object({
  picks: z.array(z.object({
    index: z.number().int().nonnegative(),
    description: z.string().nullable(),
    highlight: Highlight.nullable(),
  })),
});
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: clean. (No callers yet reference `BBox` / `Highlight`. The existing `assignScreenshots.ts` reads `result.picks[].index` and `result.picks[].description` — both still present.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/schemas.ts
git commit -m "feat(schemas): add Highlight and BBox; extend ScreenshotPicksOutput with nullable highlight"
```

---

## Task 2: Extend Mongo `Screenshot` interface

**Files:**
- Modify: `src/lib/mongo.ts:35-41`

- [ ] **Step 1: Edit `src/lib/mongo.ts`**

Replace the `Screenshot` interface (lines 35–41) with:

```ts
export interface Screenshot {
  frameId: string;
  r2Key: string;
  t: number;        // timestamp in source video, seconds
  order: number;    // display order within the step
  description?: string;  // optional LLM-written caption/instruction
  highlight?: {          // optional yellow-rectangle target (baked into JPEG; field kept for future overlay-mode use)
    kind: "click" | "input";
    bbox: { x: number; y: number; w: number; h: number };
  };
  highlightError?: string; // set when rectangle drawing failed; un-annotated JPEG was uploaded instead
}
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: clean. (No existing reader breaks — every new field is optional.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/mongo.ts
git commit -m "feat(mongo): add optional highlight and highlightError to Screenshot"
```

---

## Task 3: Extend `Pick` type and thread `highlight` through `assignScreenshots`

**Files:**
- Modify: `src/trigger/stages/assignScreenshots.ts:28` (Pick type)
- Modify: `src/trigger/stages/assignScreenshots.ts:57-86` (resolveCrossStepDedup)
- Modify: `src/trigger/stages/assignScreenshots.ts:112` (user-text reminder line)
- Modify: `src/trigger/stages/assignScreenshots.ts:133-136` (pickForStep return mapping)

- [ ] **Step 1: Edit the `Pick` type (line 28)**

Replace:

```ts
export type Pick = { poolId: string; description: string | null };
```

with:

```ts
export type Highlight = { kind: "click" | "input"; bbox: { x: number; y: number; w: number; h: number } };
export type Pick = { poolId: string; description: string | null; highlight: Highlight | null };
```

- [ ] **Step 2: Edit `resolveCrossStepDedup` to thread `highlight` through the owner map**

Replace the `resolveCrossStepDedup` function body (lines 49–87) with:

```ts
export function resolveCrossStepDedup(
  steps: StepRange[],
  picksByStep: Map<number, Pick[]>,
  pool: PoolFrame[],
): Map<number, Pick[]> {
  const byId = new Map<string, PoolFrame>(pool.map(f => [f.poolId, f]));
  const stepCenter = (s: StepRange) => (s.tStart + s.tEnd) / 2;

  const owner = new Map<string, { stepIndex: number; description: string | null; highlight: Highlight | null }>();
  for (const step of steps) {
    const picks = picksByStep.get(step.stepIndex) ?? [];
    for (const p of picks) {
      const frame = byId.get(p.poolId);
      if (!frame) continue;
      const incumbent = owner.get(p.poolId);
      if (incumbent === undefined) {
        owner.set(p.poolId, { stepIndex: step.stepIndex, description: p.description, highlight: p.highlight });
        continue;
      }
      const incumbentStep = steps.find(s => s.stepIndex === incumbent.stepIndex)!;
      const incumbentDist = Math.abs(frame.t - stepCenter(incumbentStep));
      const challengerDist = Math.abs(frame.t - stepCenter(step));
      if (challengerDist < incumbentDist) {
        owner.set(p.poolId, { stepIndex: step.stepIndex, description: p.description, highlight: p.highlight });
      }
    }
  }

  const out = new Map<number, Pick[]>();
  for (const step of steps) out.set(step.stepIndex, []);
  for (const [poolId, info] of owner.entries()) {
    out.get(info.stepIndex)!.push({ poolId, description: info.description, highlight: info.highlight });
  }
  for (const [stepIndex, picks] of out.entries()) {
    picks.sort((a, b) => byId.get(a.poolId)!.t - byId.get(b.poolId)!.t);
    out.set(stepIndex, picks);
  }
  return out;
}
```

- [ ] **Step 3: Edit the user-text reminder line in `pickForStep` (line 112)**

Replace:

```ts
      `Return JSON: { "picks": [{ "index": <bucket index>, "description": "<short caption or null>" }] }`,
```

with:

```ts
      `Return JSON: { "picks": [{ "index": <bucket index>, "description": "<short caption or null>", "highlight": { "kind": "click"|"input", "bbox": { "x": <0..1>, "y": <0..1>, "w": <0..1>, "h": <0..1> } } | null }] }`,
```

- [ ] **Step 4: Edit the `pickForStep` return mapping (lines 133–136)**

Replace:

```ts
    return validPicks.map(p => ({
      poolId: args.bucket[p.index].poolId,
      description: p.description,
    }));
```

with:

```ts
    return validPicks.map(p => ({
      poolId: args.bucket[p.index].poolId,
      description: p.description,
      highlight: p.highlight,
    }));
```

- [ ] **Step 5: Run typecheck**

Run: `npx tsc --noEmit`
Expected: TS errors in `src/trigger/stages/assignScreenshots.test.ts` because the `pick(...)` helper in tests builds a `Pick` without `highlight`. Those will be fixed in Task 4. No other consumers should fail (uploadScreenshots will be updated in Task 6).

- [ ] **Step 6: Commit**

```bash
git add src/trigger/stages/assignScreenshots.ts
git commit -m "feat(assignScreenshots): thread highlight through Pick and cross-step dedup"
```

---

## Task 4: Update `assignScreenshots` tests for new `Pick` shape

**Files:**
- Modify: `src/trigger/stages/assignScreenshots.test.ts:1-62`

- [ ] **Step 1: Update the test file to carry `highlight` through fixtures**

Replace the entire file with:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { bucketFramesByStep, resolveCrossStepDedup, type StepRange, type PoolFrame, type Pick, type Highlight } from "./assignScreenshots";

function pf(t: number, id: string): PoolFrame {
  return { t, poolId: id, localPath: `/tmp/${id}.jpg`, pHash: "0000000000000000" };
}

function pick(poolId: string, description: string | null = null, highlight: Highlight | null = null): Pick {
  return { poolId, description, highlight };
}

test("bucketFramesByStep applies overlap buffer on both sides", () => {
  const steps: StepRange[] = [
    { stepIndex: 0, tStart: 0, tEnd: 10 },
    { stepIndex: 1, tStart: 10, tEnd: 20 },
  ];
  const pool: PoolFrame[] = [
    pf(0.5, "a"),
    pf(7.0, "b"),
    pf(9.5, "c"),
    pf(10.5, "d"),
    pf(12.5, "e"),
    pf(19.5, "f"),
    pf(22.5, "g"),
  ];
  const buckets = bucketFramesByStep(steps, pool, 2);
  assert.deepEqual(buckets.get(0)!.map(f => f.poolId), ["a", "b", "c", "d"]);
  assert.deepEqual(buckets.get(1)!.map(f => f.poolId), ["c", "d", "e", "f"]);
});

test("resolveCrossStepDedup assigns shared frame to the step with closer center", () => {
  const steps: StepRange[] = [
    { stepIndex: 0, tStart: 0, tEnd: 10 },
    { stepIndex: 1, tStart: 10, tEnd: 20 },
  ];
  const picks = new Map<number, Pick[]>([
    [0, [pick("x", "first attempt")]],
    [1, [pick("x", "second attempt")]],
  ]);
  const pool: PoolFrame[] = [pf(11, "x")];
  const out = resolveCrossStepDedup(steps, picks, pool);
  assert.deepEqual(out.get(0), []);
  assert.deepEqual(out.get(1), [pick("x", "second attempt")]);
});

test("resolveCrossStepDedup breaks ties by earlier step", () => {
  const steps: StepRange[] = [
    { stepIndex: 0, tStart: 0, tEnd: 10 },
    { stepIndex: 1, tStart: 10, tEnd: 20 },
  ];
  const picks = new Map<number, Pick[]>([
    [0, [pick("x", "from step 0")]],
    [1, [pick("x", "from step 1")]],
  ]);
  const pool: PoolFrame[] = [pf(10, "x")];
  const out = resolveCrossStepDedup(steps, picks, pool);
  assert.deepEqual(out.get(0), [pick("x", "from step 0")]);
  assert.deepEqual(out.get(1), []);
});

test("resolveCrossStepDedup preserves timestamp order within each step", () => {
  const steps: StepRange[] = [{ stepIndex: 0, tStart: 0, tEnd: 30 }];
  const picks = new Map<number, Pick[]>([
    [0, [pick("c", "third"), pick("a", "first"), pick("b", "second")]],
  ]);
  const pool: PoolFrame[] = [pf(1, "a"), pf(2, "b"), pf(3, "c")];
  const out = resolveCrossStepDedup(steps, picks, pool);
  assert.deepEqual(out.get(0), [pick("a", "first"), pick("b", "second"), pick("c", "third")]);
});

test("resolveCrossStepDedup preserves highlight on the winning step", () => {
  const steps: StepRange[] = [
    { stepIndex: 0, tStart: 0, tEnd: 10 },
    { stepIndex: 1, tStart: 10, tEnd: 20 },
  ];
  const h: Highlight = { kind: "click", bbox: { x: 0.1, y: 0.2, w: 0.3, h: 0.05 } };
  const picks = new Map<number, Pick[]>([
    [0, [pick("x", "stepA", h)]],
    [1, [pick("x", "stepB", null)]],
  ]);
  // frame at t=11 → closer to step 1's center (15) than step 0's (5)
  const pool: PoolFrame[] = [pf(11, "x")];
  const out = resolveCrossStepDedup(steps, picks, pool);
  assert.deepEqual(out.get(0), []);
  assert.deepEqual(out.get(1), [pick("x", "stepB", null)]);
});
```

- [ ] **Step 2: Run the tests**

Run: `npx tsx --test src/trigger/stages/assignScreenshots.test.ts`
Expected: PASS, 5/5 tests.

- [ ] **Step 3: Run typecheck**

Run: `npx tsc --noEmit`
Expected: only errors should be in `uploadScreenshots.ts` because the existing record push doesn't include `highlight` yet. We'll fix that in Task 6. If there are unrelated errors, stop and investigate.

- [ ] **Step 4: Commit**

```bash
git add src/trigger/stages/assignScreenshots.test.ts
git commit -m "test(assignScreenshots): thread highlight through Pick fixtures"
```

---

## Task 5: Update vision-LLM prompt to request `highlight`

**Files:**
- Modify: `src/config/index.ts:37-52`

- [ ] **Step 1: Edit the `screenshotPickSystem` prompt**

Replace the full prompt body (lines 37–52) with:

```ts
      screenshotPickSystem: (lang: string) =>
        `You select screenshots from a training video to illustrate one specific step, AND write a short caption or instruction for each picked frame, AND mark where the user is clicking/tapping/typing if the frame shows a UI interaction.

You receive: the step's title and the trainer's narration, plus a list of candidate frames each labeled with a bucket-local index and a timestamp.

Pick the frames a reader would need to actually perform this step — relevant UI before the action, during the action, and the resulting state after the action. Skip redundant frames showing the same UI state. Return an empty array if no frames are useful for this step.

For each picked frame, write a "description":
- If the frame shows an action moment, write a short imperative instruction ("Cut the bell pepper into thirds").
- If the frame shows a state/result, write a brief observation ("Sauce is well combined and uniformly red").
- If the image is self-explanatory and no caption would help the reader, return null.
- Keep descriptions concise. Match the length to the value added — one short line is usually right, but you may go longer when needed.

For each picked frame, also return a "highlight":
- If the frame shows the user clicking, tapping, or selecting a specific UI element of a web or mobile app (button, link, tab, menu item, icon), return { "kind": "click", "bbox": { x, y, w, h } } tightly bounding the target element.
- If the frame shows the user typing into a specific text field, textarea, or search box, return { "kind": "input", "bbox": { ... } } bounding that field.
- If the frame is not a UI interaction, or the target element is unclear, return "highlight": null.

Coordinates are normalized 0..1 against the image you see in this prompt (not the original video resolution). x and y are the top-left of the rectangle.

Be conservative: only return a bbox when the target is unambiguous. Prefer null over a guess.

LANGUAGE: Write every description in ${lang}. Keep technical / industry / brand terms in their original form.

Return strict JSON only.`,
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: same as before (Task 6 still pending for uploadScreenshots).

- [ ] **Step 3: Commit**

```bash
git add src/config/index.ts
git commit -m "feat(config): extend screenshotPickSystem prompt to request highlight bboxes"
```

---

## Task 6: Implement `rectSvg` helper (TDD)

**Files:**
- Modify: `src/trigger/stages/uploadScreenshots.ts` (add helper)
- Create: `src/trigger/stages/uploadScreenshots.test.ts`

- [ ] **Step 1: Write the failing test file `src/trigger/stages/uploadScreenshots.test.ts`**

```ts
import { test } from "node:test";
import assert from "node:assert";
import { rectSvg } from "./uploadScreenshots";

test("rectSvg renders a yellow rect with pixel-scaled coords", () => {
  const svg = rectSvg(1920, 1080, { x: 0.1, y: 0.2, w: 0.3, h: 0.05 });
  assert.ok(svg, "should return an SVG");
  assert.match(svg!, /<svg[^>]*width="1920"[^>]*height="1080"/);
  assert.match(svg!, /<rect[^>]*stroke="#F5C518"/);
  // x ≈ 0.1 * 1920 = 192 (+ stroke/2 inset); width ≈ 0.3 * 1920 = 576 (- stroke)
  assert.match(svg!, /<rect[^>]*x="\d+"[^>]*y="\d+"[^>]*width="\d+"[^>]*height="\d+"/);
});

test("rectSvg returns null on degenerate width", () => {
  assert.equal(rectSvg(1920, 1080, { x: 0.1, y: 0.2, w: 0.001, h: 0.2 }), null);
});

test("rectSvg returns null on degenerate height", () => {
  assert.equal(rectSvg(1920, 1080, { x: 0.1, y: 0.2, w: 0.2, h: 0.001 }), null);
});

test("rectSvg returns null when bbox overshoots right edge beyond tolerance", () => {
  // x + w = 0.9 + 0.5 = 1.4 > 1.05 ⇒ reject
  assert.equal(rectSvg(1920, 1080, { x: 0.9, y: 0.2, w: 0.5, h: 0.2 }), null);
});

test("rectSvg clips mild right-edge overshoot", () => {
  // x + w = 0.9 + 0.15 = 1.05 (within tolerance) ⇒ render with w clipped to 1 - x = 0.1
  const svg = rectSvg(1000, 1000, { x: 0.9, y: 0.2, w: 0.15, h: 0.2 });
  assert.ok(svg);
  // expected pixel width ≈ 0.1 * 1000 = 100, minus stroke; stroke = max(4, round(1000*0.005)) = 5
  // so width attribute ≈ 100 - 5 = 95
  const m = svg!.match(/<rect[^>]*width="(\d+)"/);
  assert.ok(m, "should have a width");
  const px = parseInt(m![1], 10);
  assert.ok(px >= 90 && px <= 100, `expected width near 95, got ${px}`);
});

test("rectSvg rejects strongly negative origin", () => {
  assert.equal(rectSvg(1920, 1080, { x: -0.2, y: 0.2, w: 0.3, h: 0.2 }), null);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/trigger/stages/uploadScreenshots.test.ts`
Expected: FAIL — `rectSvg` is not exported from `./uploadScreenshots`.

- [ ] **Step 3: Add `rectSvg` to `src/trigger/stages/uploadScreenshots.ts`**

At the top of the file (after the existing imports, before `runUploadScreenshots`), add:

```ts
export function rectSvg(
  W: number,
  H: number,
  bbox: { x: number; y: number; w: number; h: number },
): string | null {
  // Reject degenerate or wildly out-of-range bboxes before clamping
  if (bbox.w < 0.005 || bbox.h < 0.005) return null;
  if (bbox.x + bbox.w > 1.05 || bbox.y + bbox.h > 1.05) return null;
  if (bbox.x < -0.05 || bbox.y < -0.05) return null;
  const x = clamp01(bbox.x);
  const y = clamp01(bbox.y);
  // Clip width/height to the remaining space so a bbox at x=0.9 with w=0.15 ends at the right edge
  const w = Math.min(1 - x, Math.max(0, bbox.w));
  const h = Math.min(1 - y, Math.max(0, bbox.h));
  const stroke = Math.max(4, Math.round(H * 0.005));
  // SVG strokes are centered on the path edge. Insetting by stroke/2 keeps the outer edge of the stroke aligned with the bbox the LLM picked.
  const px = Math.round(x * W) + Math.round(stroke / 2);
  const py = Math.round(y * H) + Math.round(stroke / 2);
  const pw = Math.max(1, Math.round(w * W) - stroke);
  const ph = Math.max(1, Math.round(h * H) - stroke);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="none" stroke="#F5C518" stroke-width="${stroke}" rx="6" ry="6"/></svg>`;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test src/trigger/stages/uploadScreenshots.test.ts`
Expected: PASS, 6/6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/trigger/stages/uploadScreenshots.ts src/trigger/stages/uploadScreenshots.test.ts
git commit -m "feat(uploadScreenshots): add rectSvg helper with normalized bbox → SVG"
```

---

## Task 7: Create the test fixture image

**Files:**
- Create: `src/trigger/stages/__fixtures__/sample-1080p.jpg`

- [ ] **Step 1: Verify the fixture directory does not exist yet**

Run: `ls src/trigger/stages/__fixtures__ 2>&1 || echo "missing"`
Expected: "missing" or empty.

- [ ] **Step 2: Create the directory and a small fixture image**

Write a one-shot generator script to a temp file (avoids `tsx -e` quirks with top-level await + ESM), then run it:

```bash
mkdir -p src/trigger/stages/__fixtures__
cat > /tmp/gen-fixture.mts <<'EOF'
import sharp from "sharp";
await sharp({
  create: { width: 1920, height: 1080, channels: 3, background: { r: 240, g: 240, b: 240 } },
})
  .jpeg({ quality: 85 })
  .toFile("src/trigger/stages/__fixtures__/sample-1080p.jpg");
console.log("wrote fixture");
EOF
npx tsx /tmp/gen-fixture.mts
rm /tmp/gen-fixture.mts
```

Expected: prints `wrote fixture`. Verify the file exists with `ls -la src/trigger/stages/__fixtures__/sample-1080p.jpg` (should be a few KB).

- [ ] **Step 3: Commit**

```bash
git add src/trigger/stages/__fixtures__/sample-1080p.jpg
git commit -m "test(uploadScreenshots): add 1920x1080 fixture image for buildUploadBuffer tests"
```

---

## Task 8: Implement `buildUploadBuffer` helper (TDD)

**Files:**
- Modify: `src/trigger/stages/uploadScreenshots.ts` (add helper)
- Modify: `src/trigger/stages/uploadScreenshots.test.ts` (add tests)

- [ ] **Step 1: Write failing tests for `buildUploadBuffer`**

Append to `src/trigger/stages/uploadScreenshots.test.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import { buildUploadBuffer } from "./uploadScreenshots";

const FIXTURE = path.join(__dirname, "__fixtures__", "sample-1080p.jpg");

test("buildUploadBuffer returns raw bytes when highlight is null", async () => {
  const raw = await fs.promises.readFile(FIXTURE);
  const { buf, error } = await buildUploadBuffer(FIXTURE, null);
  assert.equal(error, null);
  assert.ok(buf.equals(raw), "should return byte-identical raw file when no highlight");
});

test("buildUploadBuffer returns re-encoded bytes when highlight is valid", async () => {
  const raw = await fs.promises.readFile(FIXTURE);
  const { buf, error } = await buildUploadBuffer(FIXTURE, {
    kind: "click",
    bbox: { x: 0.1, y: 0.1, w: 0.2, h: 0.1 },
  });
  assert.equal(error, null);
  assert.ok(!buf.equals(raw), "should differ from raw (rectangle composited)");
  assert.ok(buf.length > 100, "should be a non-empty JPEG");
});

test("buildUploadBuffer falls back to raw on degenerate bbox and records the error", async () => {
  const raw = await fs.promises.readFile(FIXTURE);
  const { buf, error } = await buildUploadBuffer(FIXTURE, {
    kind: "click",
    bbox: { x: 0.1, y: 0.1, w: 0.001, h: 0.1 },
  });
  assert.equal(error, "bbox out of range");
  assert.ok(buf.equals(raw), "should return raw bytes when bbox is invalid");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx tsx --test src/trigger/stages/uploadScreenshots.test.ts`
Expected: FAIL — `buildUploadBuffer` is not exported.

- [ ] **Step 3: Add the `sharp` import and `buildUploadBuffer` function**

In `src/trigger/stages/uploadScreenshots.ts`, add the import at the top (the file already imports `Pick` from `./assignScreenshots` — do **not** add a duplicate `Pick` import):

```ts
import sharp from "sharp";
```

…and define `buildUploadBuffer` after `rectSvg` / `clamp01`:

```ts
export async function buildUploadBuffer(
  localPath: string,
  highlight: Pick["highlight"],
): Promise<{ buf: Buffer; error: string | null }> {
  if (!highlight) {
    return { buf: await fs.promises.readFile(localPath), error: null };
  }
  try {
    const meta = await sharp(localPath).metadata();
    const W = meta.width ?? 0;
    const H = meta.height ?? 0;
    if (!W || !H) {
      return { buf: await fs.promises.readFile(localPath), error: "missing image metadata" };
    }
    const svg = rectSvg(W, H, highlight.bbox);
    if (!svg) {
      return { buf: await fs.promises.readFile(localPath), error: "bbox out of range" };
    }
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
```


- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx tsx --test src/trigger/stages/uploadScreenshots.test.ts`
Expected: PASS, 9/9 tests (6 from Task 6 + 3 new).

- [ ] **Step 5: Commit**

```bash
git add src/trigger/stages/uploadScreenshots.ts src/trigger/stages/uploadScreenshots.test.ts
git commit -m "feat(uploadScreenshots): add buildUploadBuffer composing SVG rect via sharp"
```

---

## Task 9: Wire `buildUploadBuffer` into `runUploadScreenshots`

**Files:**
- Modify: `src/trigger/stages/uploadScreenshots.ts:19-42` (the per-pick loop inside `runUploadScreenshots`)

- [ ] **Step 1: Replace the per-pick loop body**

Replace lines 19–42 of `src/trigger/stages/uploadScreenshots.ts` (the `for (const [stepIndex, picks] ...)` loop, up to and including its closing brace; the `return out;` below it stays as-is) with:

```ts
  for (const [stepIndex, picks] of args.byStep.entries()) {
    const records: Screenshot[] = [];
    for (let order = 0; order < picks.length; order++) {
      const pick = picks[order];
      const frame = byId.get(pick.poolId);
      if (!frame) {
        logger.warn("uploadScreenshots: missing pool frame", { stepIndex, poolId: pick.poolId });
        continue;
      }
      const frameId = newFrameId();
      const r2Key = screenshotKey(args.sopId, stepIndex, frameId);
      const { buf, error: highlightError } = await buildUploadBuffer(frame.localPath, pick.highlight);
      if (highlightError) {
        logger.warn("uploadScreenshots: highlight draw failed; uploaded un-annotated frame", {
          stepIndex,
          poolId: pick.poolId,
          highlightError,
        });
      }
      await putObject(r2Key, buf, "image/jpeg");
      const desc = pick.description?.trim();
      records.push({
        frameId,
        r2Key,
        t: frame.t,
        order,
        ...(desc ? { description: desc } : {}),
        ...(pick.highlight && !highlightError ? { highlight: pick.highlight } : {}),
        ...(highlightError ? { highlightError } : {}),
      });
    }
    out.set(stepIndex, records);
  }
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Run all unit tests in the stages folder**

Run: `npx tsx --test src/trigger/stages/*.test.ts`
Expected: PASS for `assignScreenshots`, `buildFramePool`, `perceptualHash`, and `uploadScreenshots` test files.

- [ ] **Step 4: Commit**

```bash
git add src/trigger/stages/uploadScreenshots.ts
git commit -m "feat(uploadScreenshots): route uploads through buildUploadBuffer to bake highlights"
```

---

## Task 10: Thread `highlight` through the SOP API

**Files:**
- Modify: `src/app/api/sop/[id]/route.ts:33-40`

- [ ] **Step 1: Edit the screenshots map in the SOP response**

The relevant block currently reads (around line 33):

```ts
      screenshots: (s.screenshots ?? []).map(ss => ({
        frameId: ss.frameId,
        url: `/api/screenshots/${sopId}/${ss.frameId}.jpg`,
        t: ss.t,
        order: ss.order,
        description: ss.description,
      })),
```

Replace with:

```ts
      screenshots: (s.screenshots ?? []).map(ss => ({
        frameId: ss.frameId,
        url: `/api/screenshots/${sopId}/${ss.frameId}.jpg`,
        t: ss.t,
        order: ss.order,
        description: ss.description,
        highlight: ss.highlight,
      })),
```

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/sop/[id]/route.ts
git commit -m "feat(api): include highlight in screenshots response"
```

---

## Task 11: End-to-end smoke

**Goal:** Confirm the prompt produces sensible `highlight` values (null on non-app content, populated on app demos) and the baked rectangle lands on the right element.

- [ ] **Step 1: Ensure dev servers are running**

In two terminals:

```bash
cd /Users/hauvo/Documents/1-active-projects/Stepika/poc
pnpm dev
```

```bash
cd /Users/hauvo/Documents/1-active-projects/Stepika/poc
pnpm exec trigger.dev@latest dev --project sop
```

Wait for both: Next.js "Ready" log and trigger.dev worker connected.

- [ ] **Step 2: Run smoke on a non-app video (sample 3, Vietnamese cooking)**

Use Playwright MCP to:
1. Navigate to `http://localhost:3000`.
2. Select the screenshots-mode radio (Playwright selector: `input[type="radio"][value="screenshots"]` — the visible label is "Screenshots (POC)" with "(POC)" in a separate muted span, so a partial-text match on "Screenshots" also works).
3. Upload `/Users/hauvo/Documents/1-active-projects/Stepika/poc/samples/3.mp4`.
4. Wait for the pipeline to reach "ready" on the processing page.
5. Open the SOP and inspect the rendered images.

Expected:
- Pipeline completes without errors.
- In the SOP API response, **no screenshot** has a populated `highlight` (all `undefined` or null). Cooking video has no UI clicks.
- No yellow rectangles visible in the viewer.
- All screenshots still have Vietnamese descriptions as before (regression check on Task 5 prompt).

Verify via the SOP API JSON:

```bash
curl -s http://localhost:3000/api/sop/<sop-id> | jq '.steps[].screenshots[] | select(.highlight != null)'
```

Expected output: empty (no matches).

- [ ] **Step 3: Run smoke on an app-demo video (`hubspot_crm.mp4`)**

Repeat the upload flow with `/Users/hauvo/Documents/1-active-projects/Stepika/poc/samples/hubspot_crm.mp4` in screenshots mode.

Expected:
- Pipeline completes successfully.
- A majority of screenshots have `highlight` populated with `kind: "click"` (or `"input"` for typed fields) and a non-degenerate bbox.
- In the viewer, the yellow rectangle visibly bounds the UI element the trainer is interacting with (button, menu item, text field).
- Sub-step descriptions still render above the timestamp (no regression).

Verify via the SOP API JSON:

```bash
curl -s http://localhost:3000/api/sop/<sop-id> | jq '[.steps[].screenshots[] | select(.highlight != null)] | length'
```

Expected output: a positive integer (the exact count depends on the video).

- [ ] **Step 4: Take a viewer screenshot for the record**

Use Playwright MCP `browser_take_screenshot` on the rendered SOP page for `hubspot_crm`. Save under `/tmp/click-highlights-smoke.png`. Visually verify rectangles land on real UI elements.

- [ ] **Step 5: Commit nothing — this is verification only**

No commit. If a regression is found, file follow-up tasks; do not modify code in this task.

---

## Self-Review Notes

**Spec coverage check:**
- §3.1 schema → Task 1 ✓
- §3.2 Mongo → Task 2 ✓
- §4 prompt → Task 5 ✓; user-text reminder line → Task 3 step 3 ✓
- §5.1 Pick + resolveCrossStepDedup → Task 3 ✓
- §5.2 buildUploadBuffer → Tasks 7, 8, 9 ✓
- §5.3 rectSvg → Task 6 ✓
- §5.4 processSopScreenshots no change — confirmed by Pick type flow (no task needed)
- §5.5 SOP API → Task 10 ✓
- §6 viewer no change — confirmed (no task needed)
- §7 coordinate handling / edge cases → encoded in rectSvg tests (Task 6) and buildUploadBuffer tests (Task 8)
- §8 testing → Tasks 4, 6, 8, 11 ✓

**Placeholder scan:** No "TBD", "implement later", or vague steps. All code blocks are complete.

**Type consistency:** `Pick`, `Highlight`, `BBox` names match across schemas.ts, assignScreenshots.ts, uploadScreenshots.ts. The Mongo `Screenshot.highlight` shape matches the `Pick.highlight` shape (`{ kind, bbox }` with normalized numbers).

One known TS-error-during-progression: after Task 3, the tests in `assignScreenshots.test.ts` and the record push in `uploadScreenshots.ts` won't compile. Tasks 4 and 9 fix those respectively. The plan flags this explicitly in Task 3 Step 5 and Task 4 Step 3 to avoid alarming a fresh implementer.
