# Bbox Precision Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Layer three independent precision fixes onto `runLocateHighlight` — (D) higher-resolution VLM input, (A) hybrid cursor validation gate for click verbs only, (B) Sobel edge-snap + conditional input min-height — to address five concrete bbox failure modes observed on `samples/trimmed-hubspot_crm.mp4`.

**Architecture:** All vision operations share a single 1920-cap JPEG written once. Three modules: `cursorDetect.ts` (restored from `a36eb8f^`, provides `verifyCursorInWindow`), `snapBbox.ts` (new, Sobel + conditional input floor), and `locateHighlight.ts` (orchestrator, returns extended `LocateHighlightResult` with trace info). Cursor checks fail-safe to "no check applied" on any thrown error.

**Tech Stack:** TypeScript, `sharp` (image ops + convolve), `zod` (schemas), `llmJsonVision` (existing OpenRouter helper), node:test + node:assert.

**Spec:** `docs/superpowers/specs/2026-05-15-bbox-precision-improvements-design.md`

---

## File Structure

| File | Role |
|---|---|
| `src/lib/schemas.ts` | Add `CursorPoint`, `FocusedCursorOutput`. Extend `HighlightDecision.noHighlightReason` enum. |
| `src/lib/pipelineTrace.ts` | Add optional `cursorCheck?` and `snap?` fields to `PipelineTraceDoc`. |
| `src/config/index.ts` | Add `prompts.focusedCursorSystem`. Add `screenshots.locateHighlight` config block. |
| `src/trigger/lib/cursorDetect.ts` | **Restored from git `a36eb8f^`.** Provides `verifyCursorInWindow`. |
| `src/trigger/lib/cursorDetect.test.ts` | **Restored from git `a36eb8f^`.** |
| `src/trigger/lib/snapBbox.ts` | **New.** `snapBboxToEdges`, `applyInputMinHeight`, pixel/normalized conversion. |
| `src/trigger/lib/snapBbox.test.ts` | **New.** Tests for snap (synthetic edge frame) and input floor. |
| `src/trigger/stages/locateHighlight.ts` | Wire cursor gate (click only) + snap + min-height. Change return type to `LocateHighlightResult`. Bump resolution. |
| `src/trigger/stages/locateHighlight.test.ts` | Update existing tests for new return shape. Add new behavioral tests. |
| `src/trigger/processSopScreenshots.ts` | Adapt L277/L294/L300 to new return shape. Merge trace fields into `PipelineTraceDoc`. |
| `scripts/inspect-trace.mjs` | Dump new trace fields. |

---

## Task 1: Schemas + config

**Files:**
- Modify: `src/lib/schemas.ts:49-99`
- Modify: `src/config/index.ts:165-181` (add prompt), `src/config/index.ts:197-216` (add config block)
- Test: `src/lib/schemas.test.ts` (create if absent — see Step 1)

- [ ] **Step 1: Check if schemas test file exists**

Run: `ls src/lib/schemas.test.ts 2>/dev/null || echo MISSING`

If MISSING, this task creates it. Otherwise append to it.

- [ ] **Step 2: Write failing test for new schemas**

Append to (or create) `src/lib/schemas.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { CursorPoint, FocusedCursorOutput, HighlightDecision } from "./schemas";

test("CursorPoint accepts numeric x,y", () => {
  assert.deepEqual(CursorPoint.parse({ x: 0.5, y: 0.7 }), { x: 0.5, y: 0.7 });
});

test("FocusedCursorOutput accepts cursor object or null", () => {
  assert.deepEqual(FocusedCursorOutput.parse({ cursor: { x: 0.1, y: 0.2 } }), { cursor: { x: 0.1, y: 0.2 } });
  assert.deepEqual(FocusedCursorOutput.parse({ cursor: null }), { cursor: null });
});

test("HighlightDecision accepts new drop reasons", () => {
  const a = HighlightDecision.parse({ highlight: "no", bbox: null, elementCaption: null, noHighlightReason: "cursor_not_found" });
  assert.equal(a.noHighlightReason, "cursor_not_found");
  const b = HighlightDecision.parse({ highlight: "no", bbox: null, elementCaption: null, noHighlightReason: "cursor_outside_bbox" });
  assert.equal(b.noHighlightReason, "cursor_outside_bbox");
});
```

- [ ] **Step 3: Run test to verify fail**

Run: `npx tsx --test src/lib/schemas.test.ts`
Expected: FAIL — `CursorPoint`/`FocusedCursorOutput` not exported; `cursor_not_found` not in enum.

- [ ] **Step 4: Implement schema additions**

In `src/lib/schemas.ts`, after the existing `BBox` block (line ~54), add:

```ts
export const CursorPoint = z.object({
  x: z.number(),
  y: z.number(),
});

export const FocusedCursorOutput = z.object({
  cursor: CursorPoint.nullable(),
});
```

Replace the `HighlightDecision` definition (currently lines 94-99) with:

```ts
export const HighlightDecision = z.object({
  highlight: z.enum(["yes", "no"]),
  bbox: BBox.nullable(),
  elementCaption: z.string().nullable(),
  noHighlightReason: z.enum([
    "view_action",
    "no_specific_target",
    "non_ui_frame",
    "cursor_not_found",
    "cursor_outside_bbox",
  ]).nullable(),
});
```

- [ ] **Step 5: Add config block + prompt**

In `src/config/index.ts`, inside the `prompts` object (after `locateHighlightSystem` at line ~181), add:

```ts
      focusedCursorSystem: () =>
        `You are a precise visual locator. Find the mouse cursor in the image — the actual rendered pointer (arrow, pointing hand, I-beam, or custom). Report the cursor's tip point (where a click lands) as normalized 0..1 coordinates against the image dimensions.

Return: { "cursor": { "x": <0..1>, "y": <0..1> } } if a cursor is clearly visible, or { "cursor": null } otherwise.

Rules:
- If you do not clearly see a cursor (hidden, off-screen, mobile/touch demo with no cursor rendered, mid-transition frame), return cursor: null.
- Do NOT guess. Do NOT default to a screen center or a UI element. Return null when uncertain.
- Do NOT consider what UI element the cursor is on. Only the cursor's pixel location.

Return strict JSON only.`,
```

Inside the `screenshots` object (after `screenId` block, before the closing brace at line ~244), add:

```ts
    locateHighlight: {
      downscaleMaxEdgePx: 1920,
      snap: {
        searchExpansionFrac: 0.15,
        maxOutwardExpansionFrac: 0.20,
        minEdgeMovePx: 2,
        edgeMagnitudeFrac: 0.25,
        minRunFrac: 0.6,
      },
      inputMinHeightFrac: 0.025,
      cursor: {
        windowFrac: 0.08,
        nccThreshold: 0.55,
        bboxToleranceFrac: 0.02,
      },
    },
```

- [ ] **Step 6: Run test to verify pass**

Run: `npx tsx --test src/lib/schemas.test.ts && npx tsc --noEmit`
Expected: PASS, no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/schemas.ts src/lib/schemas.test.ts src/config/index.ts
git commit -m "feat(highlight): schemas + config for cursor gate, snap, input floor"
```

---

## Task 2: Extend `PipelineTraceDoc`

**Files:**
- Modify: `src/lib/pipelineTrace.ts:7-21`

- [ ] **Step 1: Write failing test**

Create `src/lib/pipelineTrace.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { makeTrace, type PipelineTraceDoc } from "./pipelineTrace";

test("PipelineTraceDoc accepts cursorCheck and snap optional fields", () => {
  const doc: PipelineTraceDoc = makeTrace({
    sopId: "x", stepIndex: 0, intent: "i",
    pickedLetter: "A", runnerUpLetter: null,
    pickerReasoning: "r", verifyMatch: "yes", verifyReasoning: "v",
    highlightOutcome: "yes", finalActionRecorded: true, droppedAt: "none",
    cursorCheck: { applied: true, llmCursor: { x: 0.5, y: 0.5 }, cvCursor: { x: 0.51, y: 0.49, score: 0.7 }, bboxContained: true, outcome: "passed" },
    snap: { ran: true, edgesMovedPx: { top: 0, right: 4, bottom: 0, left: 2 }, borderFound: true, inputMinHeightApplied: false },
  });
  assert.equal(doc.cursorCheck?.outcome, "passed");
  assert.equal(doc.snap?.borderFound, true);
});

test("PipelineTraceDoc still accepts docs without cursorCheck/snap", () => {
  const doc: PipelineTraceDoc = makeTrace({
    sopId: "x", stepIndex: 0, intent: "i",
    pickedLetter: "A", runnerUpLetter: null,
    pickerReasoning: "r", verifyMatch: "yes", verifyReasoning: "v",
    highlightOutcome: "yes", finalActionRecorded: true, droppedAt: "none",
  });
  assert.equal(doc.cursorCheck, undefined);
  assert.equal(doc.snap, undefined);
});
```

- [ ] **Step 2: Run test to verify fail**

Run: `npx tsx --test src/lib/pipelineTrace.test.ts`
Expected: FAIL — `cursorCheck`/`snap` not on type.

- [ ] **Step 3: Implement type extension**

In `src/lib/pipelineTrace.ts`, replace the `PipelineTraceDoc` type (lines 7-21) with:

```ts
export type CursorCheckTrace = {
  applied: boolean;
  llmCursor: { x: number; y: number } | null;
  cvCursor: { x: number; y: number; score: number } | null;
  bboxContained: boolean | null;
  outcome: "passed" | "dropped_no_cursor_llm" | "dropped_no_cv" | "dropped_outside_bbox" | "errored" | "skipped";
};

export type SnapTrace = {
  ran: boolean;
  edgesMovedPx: { top: number; right: number; bottom: number; left: number };
  borderFound: boolean;
  inputMinHeightApplied: boolean;
};

export type PipelineTraceDoc = {
  _id: ObjectId;
  sopId: string;
  stepIndex: number;
  intent: string;
  pickedLetter: string | null;
  runnerUpLetter: string | null;
  pickerReasoning: string;
  verifyMatch: GateOutcome;
  verifyReasoning: string;
  highlightOutcome: "yes" | "no" | "skipped";
  finalActionRecorded: boolean;
  droppedAt: "none" | "pick" | "verify" | "highlight";
  cursorCheck?: CursorCheckTrace;
  snap?: SnapTrace;
  createdAt: Date;
};
```

- [ ] **Step 4: Run test to verify pass**

Run: `npx tsx --test src/lib/pipelineTrace.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pipelineTrace.ts src/lib/pipelineTrace.test.ts
git commit -m "feat(highlight): extend PipelineTraceDoc with cursorCheck and snap fields"
```

---

## Task 3: Restore `cursorDetect.ts` + tests

The CV cursor detector was deleted in `a36eb8f` ("refactor: wire Gemini grounding stages, drop legacy cursor/anchor/caption code"). We restore it verbatim — it already exports `verifyCursorInWindow` with the exact signature §3.2 of the spec requires.

**Files:**
- Create: `src/trigger/lib/cursorDetect.ts` (restore)
- Create: `src/trigger/lib/cursorDetect.test.ts` (restore)

- [ ] **Step 1: Restore both files from `a36eb8f^`**

Run:
```bash
git checkout a36eb8f^ -- src/trigger/lib/cursorDetect.ts src/trigger/lib/cursorDetect.test.ts
```

- [ ] **Step 2: Verify exports**

Run: `grep -n "^export" src/trigger/lib/cursorDetect.ts`
Expected output includes:
```
export type CursorDetection = ...
export async function detectCursor(
export async function verifyCursorInWindow(
```

- [ ] **Step 3: Run tests as-restored**

Run: `npx tsx --test src/trigger/lib/cursorDetect.test.ts`
Expected: PASS. If any test fails, the failure is from changes in `sharp` or test infrastructure between then and now — fix only the failing test, do not modify production code.

- [ ] **Step 4: Add a `verifyCursorInWindow` regression test specifically for this spec's parameters**

Append to `src/trigger/lib/cursorDetect.test.ts`:

```ts
test("verifyCursorInWindow returns null when cursor claim is in empty region", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "cursor-test-"));
  try {
    const out = path.join(tmp, "frame.jpg");
    await makeSynthFrame(640, 360, 0.2, 0.2, out);  // cursor near top-left
    const res = await verifyCursorInWindow(out, 0.8, 0.8);  // claim in empty bottom-right
    assert.equal(res, null);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("verifyCursorInWindow returns null when window would be smaller than 30px", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "cursor-test-"));
  try {
    const out = path.join(tmp, "frame.jpg");
    await makeSynthFrame(200, 200, 0.5, 0.5, out);  // 200 * 0.08 = 16 < 30
    const res = await verifyCursorInWindow(out, 0.5, 0.5);
    assert.equal(res, null);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});
```

- [ ] **Step 5: Run tests**

Run: `npx tsx --test src/trigger/lib/cursorDetect.test.ts`
Expected: PASS (all tests including the two new ones).

- [ ] **Step 6: Commit**

```bash
git add src/trigger/lib/cursorDetect.ts src/trigger/lib/cursorDetect.test.ts
git commit -m "feat(highlight): restore cursorDetect module with verifyCursorInWindow"
```

---

## Task 4: `snapBbox.ts` module

**Files:**
- Create: `src/trigger/lib/snapBbox.ts`
- Create: `src/trigger/lib/snapBbox.test.ts`

This module implements the snap-to-edges algorithm from spec §3.3 and the conditional input min-height applier. It does NOT call any LLM. It is pure image processing on top of `sharp`.

- [ ] **Step 1: Write failing test for normalized↔pixel conversion**

Create `src/trigger/lib/snapBbox.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { snapBboxToEdges, applyInputMinHeight } from "./snapBbox";

async function makeFrameWithRect(w: number, h: number, rx: number, ry: number, rw: number, rh: number, outPath: string) {
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
       <rect width="${w}" height="${h}" fill="#ffffff"/>
       <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="#ff5722"/>
     </svg>`,
  );
  await sharp(svg).jpeg({ quality: 90 }).toFile(outPath);
}

test("snapBboxToEdges expands a too-small bbox onto a clear rectangle", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "snap-test-"));
  try {
    const out = path.join(tmp, "f.jpg");
    await makeFrameWithRect(800, 600, 200, 200, 400, 100, out);  // rect at px 200..600, 200..300
    // VLM bbox is 20px inside the rect on every side: 220..580, 220..280 → normalized
    const result = await snapBboxToEdges(out, { x: 220/800, y: 220/600, w: 360/800, h: 60/600 });
    // After snap, edges should be ~ at the rectangle boundaries (within minEdgeMovePx tolerance)
    const px = { x: result.bbox.x * 800, y: result.bbox.y * 600, w: result.bbox.w * 800, h: result.bbox.h * 600 };
    assert.ok(Math.abs(px.x - 200) <= 3, `left edge: ${px.x}`);
    assert.ok(Math.abs(px.x + px.w - 600) <= 3, `right edge: ${px.x + px.w}`);
    assert.ok(result.borderFound, "borderFound should be true");
    assert.ok(result.edgesMovedPx.left > 0);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("snapBboxToEdges leaves a bbox alone when no nearby edges", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "snap-test-"));
  try {
    const out = path.join(tmp, "f.jpg");
    // pure-white frame, no rectangle
    const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#ffffff"/></svg>`);
    await sharp(svg).jpeg({ quality: 90 }).toFile(out);
    const input = { x: 0.3, y: 0.3, w: 0.2, h: 0.2 };
    const result = await snapBboxToEdges(out, input);
    assert.deepEqual(result.bbox, input);
    assert.equal(result.borderFound, false);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("applyInputMinHeight expands a thin bbox when verb=input and !borderFound", () => {
  const out = applyInputMinHeight(
    { x: 0.2, y: 0.5, w: 0.4, h: 0.005 },
    "input",
    false,
    0.025,
  );
  assert.equal(out.applied, true);
  assert.ok(out.bbox.h >= 0.025 - 1e-9);
  // centered around y=0.5+0.0025 (vertical center of input)
  const vcenter = out.bbox.y + out.bbox.h / 2;
  assert.ok(Math.abs(vcenter - 0.5025) < 0.01, `vcenter=${vcenter}`);
});

test("applyInputMinHeight does NOT expand when verb=input but borderFound=true", () => {
  const input = { x: 0.2, y: 0.5, w: 0.4, h: 0.005 };
  const out = applyInputMinHeight(input, "input", true, 0.025);
  assert.equal(out.applied, false);
  assert.deepEqual(out.bbox, input);
});

test("applyInputMinHeight does NOT expand when verb=click", () => {
  const input = { x: 0.2, y: 0.5, w: 0.4, h: 0.005 };
  const out = applyInputMinHeight(input, "click", false, 0.025);
  assert.equal(out.applied, false);
  assert.deepEqual(out.bbox, input);
});

test("applyInputMinHeight does NOT expand a normal-height input", () => {
  const input = { x: 0.2, y: 0.5, w: 0.4, h: 0.04 };
  const out = applyInputMinHeight(input, "input", false, 0.025);
  assert.equal(out.applied, false);
  assert.deepEqual(out.bbox, input);
});

test("applyInputMinHeight clamps to top edge without losing floor height", () => {
  const out = applyInputMinHeight({ x: 0.2, y: 0.001, w: 0.4, h: 0.005 }, "input", false, 0.025);
  assert.equal(out.applied, true);
  assert.equal(out.bbox.y, 0);
  assert.ok(Math.abs(out.bbox.h - 0.025) < 1e-9);
});
```

- [ ] **Step 2: Run test to verify fail**

Run: `npx tsx --test src/trigger/lib/snapBbox.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement `snapBbox.ts`**

Create `src/trigger/lib/snapBbox.ts`:

```ts
import sharp from "sharp";
import type { z } from "zod";
import { BBox, SubStepPlan } from "@/lib/schemas";

type BBoxT = z.infer<typeof BBox>;
type Verb = z.infer<typeof SubStepPlan>["verb"];

const SOBEL_X = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
const SOBEL_Y = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

export type SnapResult = {
  bbox: BBoxT;
  edgesMovedPx: { top: number; right: number; bottom: number; left: number };
  borderFound: boolean;
};

export type SnapOpts = {
  searchExpansionFrac?: number;     // default 0.15
  maxOutwardExpansionFrac?: number; // default 0.20
  minEdgeMovePx?: number;           // default 2
  edgeMagnitudeFrac?: number;       // default 0.25
  minRunFrac?: number;              // default 0.6
};

export async function snapBboxToEdges(
  imagePath: string,
  bbox: BBoxT,
  opts: SnapOpts = {},
): Promise<SnapResult> {
  const searchFrac = opts.searchExpansionFrac ?? 0.15;
  const maxOutFrac = opts.maxOutwardExpansionFrac ?? 0.20;
  const minMovePx = opts.minEdgeMovePx ?? 2;
  const magFrac = opts.edgeMagnitudeFrac ?? 0.25;
  const minRunFrac = opts.minRunFrac ?? 0.6;

  const meta = await sharp(imagePath).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  if (W <= 0 || H <= 0) {
    return { bbox, edgesMovedPx: { top: 0, right: 0, bottom: 0, left: 0 }, borderFound: false };
  }

  // Bbox in pixel space
  const px0 = Math.max(0, Math.round(bbox.x * W));
  const py0 = Math.max(0, Math.round(bbox.y * H));
  const px1 = Math.min(W, Math.round((bbox.x + bbox.w) * W));
  const py1 = Math.min(H, Math.round((bbox.y + bbox.h) * H));
  const bw = px1 - px0;
  const bh = py1 - py0;
  if (bw <= 0 || bh <= 0) {
    return { bbox, edgesMovedPx: { top: 0, right: 0, bottom: 0, left: 0 }, borderFound: false };
  }

  // Search region
  const searchPxX = Math.round(searchFrac * W);
  const searchPxY = Math.round(searchFrac * H);
  const sx0 = Math.max(0, px0 - searchPxX);
  const sy0 = Math.max(0, py0 - searchPxY);
  const sx1 = Math.min(W, px1 + searchPxX);
  const sy1 = Math.min(H, py1 + searchPxY);
  const sw = sx1 - sx0;
  const sh = sy1 - sy0;
  if (sw <= 2 || sh <= 2) {
    return { bbox, edgesMovedPx: { top: 0, right: 0, bottom: 0, left: 0 }, borderFound: false };
  }

  // Extract grayscale crop
  const cropBuf = await sharp(imagePath)
    .extract({ left: sx0, top: sy0, width: sw, height: sh })
    .grayscale()
    .raw()
    .toBuffer();
  const gray = new Float32Array(sw * sh);
  for (let i = 0; i < gray.length; i++) gray[i] = cropBuf[i];

  // Compute horizontal edge magnitude (|sobelY|) and vertical edge magnitude (|sobelX|)
  const magH = new Float32Array(sw * sh); // strong at horizontal edges (rows with sharp vertical-gradient = horizontal line)
  const magV = new Float32Array(sw * sh);
  let maxH = 0, maxV = 0;
  for (let y = 1; y < sh - 1; y++) {
    for (let x = 1; x < sw - 1; x++) {
      let gx = 0, gy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const v = gray[(y + ky) * sw + (x + kx)];
          gx += v * SOBEL_X[(ky + 1) * 3 + (kx + 1)];
          gy += v * SOBEL_Y[(ky + 1) * 3 + (kx + 1)];
        }
      }
      const ah = Math.abs(gy);
      const av = Math.abs(gx);
      magH[y * sw + x] = ah;
      magV[y * sw + x] = av;
      if (ah > maxH) maxH = ah;
      if (av > maxV) maxV = av;
    }
  }

  const thH = maxH * magFrac;
  const thV = maxV * magFrac;

  // Bbox edges in CROP-relative coordinates
  const bx0 = px0 - sx0;
  const by0 = py0 - sy0;
  const bx1 = px1 - sx0;
  const by1 = py1 - sy0;

  // Scan outward — TOP edge: find nearest horizontal line above by0
  const maxOutPxY = Math.round(maxOutFrac * H);
  const maxOutPxX = Math.round(maxOutFrac * W);
  const minRunV = Math.max(8, Math.round(minRunFrac * bw)); // for horizontal lines spanning bbox width
  const minRunH = Math.max(8, Math.round(minRunFrac * bh));

  function scanHorizontalLine(yScan: number): boolean {
    if (yScan < 1 || yScan >= sh - 1) return false;
    let runCount = 0;
    for (let x = bx0; x < bx1; x++) {
      if (x < 1 || x >= sw - 1) continue;
      const best = Math.max(magH[(yScan - 1) * sw + x], magH[yScan * sw + x], magH[(yScan + 1) * sw + x]);
      if (best >= thH) runCount++;
    }
    return runCount >= minRunV;
  }
  function scanVerticalLine(xScan: number): boolean {
    if (xScan < 1 || xScan >= sw - 1) return false;
    let runCount = 0;
    for (let y = by0; y < by1; y++) {
      if (y < 1 || y >= sh - 1) continue;
      const best = Math.max(magV[y * sw + (xScan - 1)], magV[y * sw + xScan], magV[y * sw + (xScan + 1)]);
      if (best >= thV) runCount++;
    }
    return runCount >= minRunH;
  }

  // Top: scan from by0-1 down to by0-maxOutPxY
  let topMove = 0;
  for (let d = 1; d <= maxOutPxY; d++) {
    if (scanHorizontalLine(by0 - d)) { topMove = d; break; }
  }
  let bottomMove = 0;
  for (let d = 1; d <= maxOutPxY; d++) {
    if (scanHorizontalLine(by1 + d)) { bottomMove = d; break; }
  }
  let leftMove = 0;
  for (let d = 1; d <= maxOutPxX; d++) {
    if (scanVerticalLine(bx0 - d)) { leftMove = d; break; }
  }
  let rightMove = 0;
  for (let d = 1; d <= maxOutPxX; d++) {
    if (scanVerticalLine(bx1 + d)) { rightMove = d; break; }
  }

  const applyTop = topMove >= minMovePx ? topMove : 0;
  const applyBottom = bottomMove >= minMovePx ? bottomMove : 0;
  const applyLeft = leftMove >= minMovePx ? leftMove : 0;
  const applyRight = rightMove >= minMovePx ? rightMove : 0;

  const newPx0 = Math.max(0, px0 - applyLeft);
  const newPy0 = Math.max(0, py0 - applyTop);
  const newPx1 = Math.min(W, px1 + applyRight);
  const newPy1 = Math.min(H, py1 + applyBottom);

  const out: BBoxT = {
    x: newPx0 / W,
    y: newPy0 / H,
    w: (newPx1 - newPx0) / W,
    h: (newPy1 - newPy0) / H,
  };
  const borderFound = applyTop > 0 || applyBottom > 0 || applyLeft > 0 || applyRight > 0;

  return {
    bbox: out,
    edgesMovedPx: { top: applyTop, right: applyRight, bottom: applyBottom, left: applyLeft },
    borderFound,
  };
}

export type FloorResult = { bbox: BBoxT; applied: boolean };

export function applyInputMinHeight(
  bbox: BBoxT,
  verb: Verb,
  borderFound: boolean,
  minHeightFrac: number,
): FloorResult {
  if (verb !== "input") return { bbox, applied: false };
  if (borderFound) return { bbox, applied: false };
  if (bbox.h >= minHeightFrac) return { bbox, applied: false };

  const vcenter = bbox.y + bbox.h / 2;
  let newY = vcenter - minHeightFrac / 2;
  let newH = minHeightFrac;
  if (newY < 0) newY = 0;
  if (newY + newH > 1) newY = 1 - newH;
  return { bbox: { x: bbox.x, y: newY, w: bbox.w, h: newH }, applied: true };
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `npx tsx --test src/trigger/lib/snapBbox.test.ts && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/trigger/lib/snapBbox.ts src/trigger/lib/snapBbox.test.ts
git commit -m "feat(highlight): snapBbox module — sobel edge snap + input min-height"
```

---

## Task 5: Wire cursor gate into `runLocateHighlight`

**Files:**
- Modify: `src/trigger/stages/locateHighlight.ts`
- Modify: `src/trigger/stages/locateHighlight.test.ts`

This task changes the return shape to `LocateHighlightResult` and adds the click-verb cursor gate. Snap is added in Task 6.

- [ ] **Step 1: Update existing tests for new return shape**

Replace `src/trigger/stages/locateHighlight.test.ts` with:

```ts
import { test } from "node:test";
import assert from "node:assert";
import {
  coerceForViewVerb,
  bboxContainsPoint,
  type HighlighterFn,
  type CursorLocatorFn,
  type CursorVerifierFn,
  runLocateHighlightWith,
} from "./locateHighlight";

const yesHighlighter: HighlighterFn = async () => ({
  highlight: "yes",
  bbox: { x: 0.3, y: 0.3, w: 0.2, h: 0.2 },
  elementCaption: "Verify email button",
  noHighlightReason: null,
});
const cursorInside: CursorLocatorFn = async () => ({ cursor: { x: 0.4, y: 0.4 } });
const cursorOutside: CursorLocatorFn = async () => ({ cursor: { x: 0.9, y: 0.9 } });
const cursorNull: CursorLocatorFn = async () => ({ cursor: null });
const cursorThrows: CursorLocatorFn = async () => { throw new Error("upstream"); };
const cvFound: CursorVerifierFn = async (_p, x, y) => ({ x, y, score: 0.8 });
const cvNull: CursorVerifierFn = async () => null;

test("coerceForViewVerb forces no-highlight regardless of LLM output", () => {
  const out = coerceForViewVerb("view", {
    highlight: "yes",
    bbox: { x: 0, y: 0, w: 0.1, h: 0.1 },
    elementCaption: "x",
    noHighlightReason: null,
  });
  assert.equal(out.highlight, "no");
  assert.equal(out.bbox, null);
});

test("non-click verb skips cursor check", async () => {
  const r = await runLocateHighlightWith({
    intent: "Enter email", verb: "input", framePath: "/x.jpg", language: "en",
    highlighter: yesHighlighter, cursorLocator: cursorNull, cursorVerifier: cvNull,
  });
  assert.equal(r.decision.highlight, "yes");
  assert.equal(r.trace.cursorCheck.applied, false);
  assert.equal(r.trace.cursorCheck.outcome, "skipped");
});

test("click + cursor inside bbox → kept", async () => {
  const r = await runLocateHighlightWith({
    intent: "Click verify", verb: "click", framePath: "/x.jpg", language: "en",
    highlighter: yesHighlighter, cursorLocator: cursorInside, cursorVerifier: cvFound,
  });
  assert.equal(r.decision.highlight, "yes");
  assert.equal(r.trace.cursorCheck.outcome, "passed");
});

test("click + cursor outside bbox → dropped", async () => {
  const r = await runLocateHighlightWith({
    intent: "Click verify", verb: "click", framePath: "/x.jpg", language: "en",
    highlighter: yesHighlighter, cursorLocator: cursorOutside, cursorVerifier: cvFound,
  });
  assert.equal(r.decision.highlight, "no");
  assert.equal(r.decision.bbox, null);
  assert.equal(r.decision.noHighlightReason, "cursor_outside_bbox");
});

test("click + LLM cursor null → dropped with cursor_not_found", async () => {
  const r = await runLocateHighlightWith({
    intent: "Click verify", verb: "click", framePath: "/x.jpg", language: "en",
    highlighter: yesHighlighter, cursorLocator: cursorNull, cursorVerifier: cvFound,
  });
  assert.equal(r.decision.highlight, "no");
  assert.equal(r.decision.noHighlightReason, "cursor_not_found");
});

test("click + CV null → dropped with cursor_not_found", async () => {
  const r = await runLocateHighlightWith({
    intent: "Click verify", verb: "click", framePath: "/x.jpg", language: "en",
    highlighter: yesHighlighter, cursorLocator: cursorInside, cursorVerifier: cvNull,
  });
  assert.equal(r.decision.highlight, "no");
  assert.equal(r.decision.noHighlightReason, "cursor_not_found");
});

test("click + cursor LLM throws → fail-safe (bbox preserved, outcome=errored)", async () => {
  const r = await runLocateHighlightWith({
    intent: "Click verify", verb: "click", framePath: "/x.jpg", language: "en",
    highlighter: yesHighlighter, cursorLocator: cursorThrows, cursorVerifier: cvFound,
  });
  assert.equal(r.decision.highlight, "yes");
  assert.equal(r.trace.cursorCheck.outcome, "errored");
});

test("view verb → fully unchanged via coerceForViewVerb path, no cursor LLM call", async () => {
  let cursorCalled = false;
  const locator: CursorLocatorFn = async () => { cursorCalled = true; return { cursor: null }; };
  const r = await runLocateHighlightWith({
    intent: "Look at dashboard", verb: "view", framePath: "/x.jpg", language: "en",
    highlighter: yesHighlighter, cursorLocator: locator, cursorVerifier: cvFound,
  });
  assert.equal(r.decision.highlight, "no");
  assert.equal(r.decision.noHighlightReason, "view_action");
  assert.equal(cursorCalled, false);
});

test("bboxContainsPoint: point inside bbox is contained without tolerance", () => {
  assert.equal(bboxContainsPoint({ x: 0.2, y: 0.2, w: 0.4, h: 0.4 }, { x: 0.5, y: 0.5 }, 0), true);
});

test("bboxContainsPoint: point just outside bbox is contained within tolerance", () => {
  assert.equal(bboxContainsPoint({ x: 0.2, y: 0.2, w: 0.4, h: 0.4 }, { x: 0.61, y: 0.5 }, 0.02), true);
});

test("bboxContainsPoint: point beyond tolerance is NOT contained", () => {
  assert.equal(bboxContainsPoint({ x: 0.2, y: 0.2, w: 0.4, h: 0.4 }, { x: 0.65, y: 0.5 }, 0.02), false);
});

test("bboxContainsPoint: bbox with x+w > 1 is clamped before containment check", () => {
  // bbox overshoots right edge: x=0.8, w=0.5 → clamped to x=0.8, w=0.2 (right edge at 1.0)
  // point at x=0.95 is inside [0.8, 1.0] without tolerance
  assert.equal(bboxContainsPoint({ x: 0.8, y: 0.2, w: 0.5, h: 0.2 }, { x: 0.95, y: 0.3 }, 0), true);
});

test("click + VLM returned highlight=no → cursor check skipped, no LLM call", async () => {
  let cursorCalled = false;
  const locator: CursorLocatorFn = async () => { cursorCalled = true; return { cursor: null }; };
  const noHl: HighlighterFn = async () => ({
    highlight: "no", bbox: null, elementCaption: null, noHighlightReason: "non_ui_frame",
  });
  const r = await runLocateHighlightWith({
    intent: "Click X", verb: "click", framePath: "/x.jpg", language: "en",
    highlighter: noHl, cursorLocator: locator, cursorVerifier: cvFound,
  });
  assert.equal(r.decision.highlight, "no");
  assert.equal(cursorCalled, false);
});
```

- [ ] **Step 2: Run test to verify fail**

Run: `npx tsx --test src/trigger/stages/locateHighlight.test.ts`
Expected: FAIL — types `CursorLocatorFn`, `CursorVerifierFn`, return shape `{ decision, trace }` not yet implemented.

- [ ] **Step 3: Rewrite `locateHighlight.ts` with cursor gate**

Replace `src/trigger/stages/locateHighlight.ts` with:

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import type { z } from "zod";
import { logger } from "@trigger.dev/sdk/v3";
import { llmJsonVision } from "@/lib/openrouter";
import { HighlightDecision, FocusedCursorOutput, SubStepPlan } from "@/lib/schemas";
import { config } from "@/config";
import { verifyCursorInWindow, type CursorDetection } from "@/trigger/lib/cursorDetect";
import type { CursorCheckTrace } from "@/lib/pipelineTrace";

type SubStep = z.infer<typeof SubStepPlan>;
type Decision = z.infer<typeof HighlightDecision>;
type CursorOut = z.infer<typeof FocusedCursorOutput>;

export type HighlighterFn = (args: {
  intent: string;
  verb: SubStep["verb"];
  framePath: string;
  language: string;
}) => Promise<Decision>;

export type CursorLocatorFn = (args: { framePath: string }) => Promise<CursorOut>;
export type CursorVerifierFn = (
  imagePath: string,
  cx: number,
  cy: number,
  opts?: { windowFrac?: number; threshold?: number },
) => Promise<CursorDetection | null>;

export type LocateHighlightResult = {
  decision: Decision;
  trace: { cursorCheck: CursorCheckTrace };  // snap added in Task 6
};

export function coerceForViewVerb(verb: SubStep["verb"], d: Decision): Decision {
  if (verb !== "view") return d;
  return { highlight: "no", bbox: null, elementCaption: null, noHighlightReason: "view_action" };
}

export function bboxContainsPoint(
  bbox: { x: number; y: number; w: number; h: number },
  point: { x: number; y: number },
  tolerance: number,
): boolean {
  const x = Math.max(0, Math.min(1, bbox.x));
  const y = Math.max(0, Math.min(1, bbox.y));
  const w = Math.max(0, Math.min(1 - x, bbox.w));
  const h = Math.max(0, Math.min(1 - y, bbox.h));
  return (
    point.x >= x - tolerance &&
    point.x <= x + w + tolerance &&
    point.y >= y - tolerance &&
    point.y <= y + h + tolerance
  );
}

async function downscaledCopy(srcPath: string, outDir: string): Promise<string> {
  const outPath = path.join(outDir, "frame.jpg");
  await sharp(srcPath)
    .resize({
      width: config.screenshots.locateHighlight.downscaleMaxEdgePx,
      height: config.screenshots.locateHighlight.downscaleMaxEdgePx,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toFile(outPath);
  return outPath;
}

async function defaultHighlighter(args: {
  intent: string;
  verb: SubStep["verb"];
  framePath: string;
  language: string;
}): Promise<Decision> {
  const userText = [`Intent: ${args.intent}`, `Verb: ${args.verb}`].join("\n");
  return llmJsonVision({
    model: config.ai.visionModel,
    system: config.ai.prompts.locateHighlightSystem(args.language),
    userText,
    imagePaths: [args.framePath],
    schema: HighlightDecision,
    schemaName: "highlight_decision",
    temperature: 0.0,
  });
}

async function defaultCursorLocator(args: { framePath: string }): Promise<CursorOut> {
  return llmJsonVision({
    model: config.ai.visionModel,
    system: config.ai.prompts.focusedCursorSystem(),
    userText: "Locate the cursor in the image.",
    imagePaths: [args.framePath],
    schema: FocusedCursorOutput,
    schemaName: "focused_cursor",
    temperature: 0.0,
  });
}

function skippedCursorTrace(): CursorCheckTrace {
  return { applied: false, llmCursor: null, cvCursor: null, bboxContained: null, outcome: "skipped" };
}

function dropDecision(reason: "cursor_not_found" | "cursor_outside_bbox"): Decision {
  return { highlight: "no", bbox: null, elementCaption: null, noHighlightReason: reason };
}

export async function runLocateHighlightWith(args: {
  intent: string;
  verb: SubStep["verb"];
  framePath: string;
  language: string;
  highlighter?: HighlighterFn;
  cursorLocator?: CursorLocatorFn;
  cursorVerifier?: CursorVerifierFn;
}): Promise<LocateHighlightResult> {
  const highlighter = args.highlighter ?? defaultHighlighter;
  const cursorLocator = args.cursorLocator ?? defaultCursorLocator;
  const cursorVerifier = args.cursorVerifier ?? verifyCursorInWindow;

  const raw = await highlighter({
    intent: args.intent, verb: args.verb, framePath: args.framePath, language: args.language,
  });
  const coerced = coerceForViewVerb(args.verb, raw);

  // Cursor gate runs only for click verb on a non-null bbox.
  if (args.verb !== "click" || coerced.highlight !== "yes" || coerced.bbox === null) {
    return { decision: coerced, trace: { cursorCheck: skippedCursorTrace() } };
  }

  const cfg = config.screenshots.locateHighlight.cursor;

  try {
    const llmOut = await cursorLocator({ framePath: args.framePath });
    if (llmOut.cursor === null) {
      return {
        decision: dropDecision("cursor_not_found"),
        trace: { cursorCheck: { applied: true, llmCursor: null, cvCursor: null, bboxContained: null, outcome: "dropped_no_cursor_llm" } },
      };
    }
    const cv = await cursorVerifier(args.framePath, llmOut.cursor.x, llmOut.cursor.y, {
      windowFrac: cfg.windowFrac,
      threshold: cfg.nccThreshold,
    });
    if (cv === null) {
      return {
        decision: dropDecision("cursor_not_found"),
        trace: { cursorCheck: { applied: true, llmCursor: llmOut.cursor, cvCursor: null, bboxContained: null, outcome: "dropped_no_cv" } },
      };
    }
    const contained = bboxContainsPoint(coerced.bbox, cv, cfg.bboxToleranceFrac);
    if (!contained) {
      return {
        decision: dropDecision("cursor_outside_bbox"),
        trace: { cursorCheck: { applied: true, llmCursor: llmOut.cursor, cvCursor: cv, bboxContained: false, outcome: "dropped_outside_bbox" } },
      };
    }
    return {
      decision: coerced,
      trace: { cursorCheck: { applied: true, llmCursor: llmOut.cursor, cvCursor: cv, bboxContained: true, outcome: "passed" } },
    };
  } catch (e) {
    logger.warn("pipeline.highlight.cursor_check_errored", { intent: args.intent, error: String(e) });
    return {
      decision: coerced,
      trace: { cursorCheck: { applied: true, llmCursor: null, cvCursor: null, bboxContained: null, outcome: "errored" } },
    };
  }
}

export async function runLocateHighlight(args: {
  intent: string;
  verb: SubStep["verb"];
  framePath: string;
  language: string;
}): Promise<LocateHighlightResult> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "highlight-"));
  try {
    const ds = await downscaledCopy(args.framePath, tmpDir);
    return runLocateHighlightWith({ ...args, framePath: ds });
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}
```

- [ ] **Step 4: Adapt the `processSopScreenshots` call site to the new return shape**

The return type just changed from `Decision` to `LocateHighlightResult`. The consumer at `src/trigger/processSopScreenshots.ts:277-309` must be updated in the SAME commit or `tsc --noEmit` fails project-wide. Replace lines 277-309 with:

```ts
              const result = await runLocateHighlight({
                intent: subStep.intent,
                verb: subStep.verb,
                framePath: finalFramePath,
                language: outputLanguage,
              });
              const highlight = result.decision;

              if (traceEnabled()) {
                await persistTrace(makeTrace({
                  sopId: _id.toHexString(),
                  stepIndex: step.stepIndex,
                  intent: subStep.intent,
                  pickedLetter: pick.picked,
                  runnerUpLetter: pick.runnerUp,
                  pickerReasoning: pick.reasoning,
                  verifyMatch: verify.match,
                  verifyReasoning: verify.reasoning,
                  highlightOutcome: highlight.highlight,
                  finalActionRecorded: true,
                  droppedAt: "none",
                  cursorCheck: result.trace.cursorCheck,
                }));
              }

              actions.push(buildAction({
                stepIndex: step.stepIndex,
                order: actions.length,
                subStep,
                verify,
                highlight,
                framePath: finalFramePath,
                frameTime: finalFrameTime,
                pickedClusterLetter: pick.picked,
              }));
```

(The `snap` field will be added in Task 6.)

- [ ] **Step 5: Run full project tests**

Run: `npx tsc --noEmit && npm test`
Expected: clean typecheck, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/trigger/stages/locateHighlight.ts src/trigger/stages/locateHighlight.test.ts src/trigger/processSopScreenshots.ts
git commit -m "feat(highlight): cursor validation gate for click verb"
```

---

## Task 6: Wire snap + input min-height into `runLocateHighlight`

**Files:**
- Modify: `src/trigger/stages/locateHighlight.ts`
- Modify: `src/trigger/stages/locateHighlight.test.ts`

- [ ] **Step 1: Write failing tests for snap + input floor integration**

First, add the snap/floor type imports at the **top** of `src/trigger/stages/locateHighlight.test.ts` (alongside the existing imports):

```ts
import type { SnapResult, FloorResult } from "@/trigger/lib/snapBbox";
```

Then append to the bottom of the file:

```ts
const snapNoOp = async (_p: string, b: { x: number; y: number; w: number; h: number }): Promise<SnapResult> =>
  ({ bbox: b, edgesMovedPx: { top: 0, right: 0, bottom: 0, left: 0 }, borderFound: false });
const snapMoved = async (_p: string, _b: { x: number; y: number; w: number; h: number }): Promise<SnapResult> =>
  ({ bbox: { x: 0.1, y: 0.1, w: 0.3, h: 0.3 }, edgesMovedPx: { top: 4, right: 4, bottom: 4, left: 4 }, borderFound: true });
const floorNoOp = (b: { x: number; y: number; w: number; h: number }): FloorResult => ({ bbox: b, applied: false });
const floorApplied = (b: { x: number; y: number; w: number; h: number }): FloorResult => ({ bbox: { ...b, h: 0.025 }, applied: true });

test("snap result is reflected in trace and decision bbox", async () => {
  const r = await runLocateHighlightWith({
    intent: "Click verify", verb: "click", framePath: "/x.jpg", language: "en",
    highlighter: yesHighlighter, cursorLocator: cursorInside, cursorVerifier: cvFound,
    snapper: snapMoved, floorer: floorNoOp,
  });
  assert.equal(r.decision.highlight, "yes");
  assert.deepEqual(r.decision.bbox, { x: 0.1, y: 0.1, w: 0.3, h: 0.3 });
  assert.equal(r.trace.snap.borderFound, true);
  assert.equal(r.trace.snap.ran, true);
  assert.equal(r.trace.snap.edgesMovedPx.top, 4);
});

test("input floor applies when verb=input, snap.borderFound=false, bbox.h thin", async () => {
  const thinInputHighlighter: HighlighterFn = async () => ({
    highlight: "yes", bbox: { x: 0.2, y: 0.5, w: 0.4, h: 0.005 }, elementCaption: "name input", noHighlightReason: null,
  });
  const r = await runLocateHighlightWith({
    intent: "Enter first name", verb: "input", framePath: "/x.jpg", language: "en",
    highlighter: thinInputHighlighter, cursorLocator: cursorNull, cursorVerifier: cvNull,
    snapper: snapNoOp, floorer: floorApplied,
  });
  assert.equal(r.decision.bbox?.h, 0.025);
  assert.equal(r.trace.snap.inputMinHeightApplied, true);
});

test("snap and floor do NOT run when highlight=no", async () => {
  let snapCalled = false, floorCalled = false;
  const snapSpy = async (p: string, b: any) => { snapCalled = true; return snapNoOp(p, b); };
  const floorSpy = (b: any) => { floorCalled = true; return floorNoOp(b); };
  const noHl: HighlighterFn = async () => ({ highlight: "no", bbox: null, elementCaption: null, noHighlightReason: "no_specific_target" });
  const r = await runLocateHighlightWith({
    intent: "x", verb: "click", framePath: "/x.jpg", language: "en",
    highlighter: noHl, cursorLocator: cursorNull, cursorVerifier: cvFound,
    snapper: snapSpy, floorer: floorSpy,
  });
  assert.equal(r.decision.highlight, "no");
  assert.equal(snapCalled, false);
  assert.equal(floorCalled, false);
  assert.equal(r.trace.snap.ran, false);
});
```

- [ ] **Step 2: Run test to verify fail**

Run: `npx tsx --test src/trigger/stages/locateHighlight.test.ts`
Expected: FAIL — `snapper`/`floorer` params not accepted, `trace.snap` not present.

- [ ] **Step 3: Wire snap + floor into `runLocateHighlightWith`**

In `src/trigger/stages/locateHighlight.ts`, add imports near the top:

```ts
import {
  snapBboxToEdges,
  applyInputMinHeight,
  type SnapResult,
  type FloorResult,
} from "@/trigger/lib/snapBbox";
import type { SnapTrace } from "@/lib/pipelineTrace";
```

Extend `LocateHighlightResult`:

```ts
export type LocateHighlightResult = {
  decision: Decision;
  trace: { cursorCheck: CursorCheckTrace; snap: SnapTrace };
};

export type SnapperFn = (
  imagePath: string,
  bbox: { x: number; y: number; w: number; h: number },
) => Promise<SnapResult>;
export type FloorerFn = (
  bbox: { x: number; y: number; w: number; h: number },
  verb: SubStep["verb"],
  borderFound: boolean,
  minHeightFrac: number,
) => FloorResult;
```

Add a default snap wrapper:

```ts
const defaultSnapper: SnapperFn = (p, b) => snapBboxToEdges(p, b, config.screenshots.locateHighlight.snap);
const defaultFloorer: FloorerFn = (b, v, found, frac) => applyInputMinHeight(b, v, found, frac);
function emptySnapTrace(): SnapTrace {
  return { ran: false, edgesMovedPx: { top: 0, right: 0, bottom: 0, left: 0 }, borderFound: false, inputMinHeightApplied: false };
}
```

Add `snapper` and `floorer` to `runLocateHighlightWith` args (optional, default to the wrappers above). After the cursor-gate decision is finalised, before returning, post-process:

Replace the four return statements inside `runLocateHighlightWith` (skip-cursor return, cursor-llm-null return, cv-null return, outside-bbox return, passed return, errored return) so that each one passes through `finalizeWithSnapAndFloor`. Add this helper at the bottom of the file:

```ts
async function finalizeWithSnapAndFloor(args: {
  decision: Decision;
  verb: SubStep["verb"];
  framePath: string;
  snapper: SnapperFn;
  floorer: FloorerFn;
}): Promise<{ decision: Decision; snap: SnapTrace }> {
  const { decision, verb, framePath, snapper, floorer } = args;
  if (decision.highlight !== "yes" || decision.bbox === null) {
    return { decision, snap: emptySnapTrace() };
  }
  const snapped = await snapper(framePath, decision.bbox);
  const floor = floorer(snapped.bbox, verb, snapped.borderFound, config.screenshots.locateHighlight.inputMinHeightFrac);
  return {
    decision: { ...decision, bbox: floor.bbox },
    snap: {
      ran: true,
      edgesMovedPx: snapped.edgesMovedPx,
      borderFound: snapped.borderFound,
      inputMinHeightApplied: floor.applied,
    },
  };
}
```

Replace the final-return paths in `runLocateHighlightWith`. The full updated function becomes:

```ts
export async function runLocateHighlightWith(args: {
  intent: string;
  verb: SubStep["verb"];
  framePath: string;
  language: string;
  highlighter?: HighlighterFn;
  cursorLocator?: CursorLocatorFn;
  cursorVerifier?: CursorVerifierFn;
  snapper?: SnapperFn;
  floorer?: FloorerFn;
}): Promise<LocateHighlightResult> {
  const highlighter = args.highlighter ?? defaultHighlighter;
  const cursorLocator = args.cursorLocator ?? defaultCursorLocator;
  const cursorVerifier = args.cursorVerifier ?? verifyCursorInWindow;
  const snapper = args.snapper ?? defaultSnapper;
  const floorer = args.floorer ?? defaultFloorer;

  const raw = await highlighter({
    intent: args.intent, verb: args.verb, framePath: args.framePath, language: args.language,
  });
  const coerced = coerceForViewVerb(args.verb, raw);

  const finalize = (decision: Decision, cursorCheck: CursorCheckTrace): Promise<LocateHighlightResult> =>
    finalizeWithSnapAndFloor({ decision, verb: args.verb, framePath: args.framePath, snapper, floorer })
      .then(({ decision: d2, snap }) => ({ decision: d2, trace: { cursorCheck, snap } }));

  if (args.verb !== "click" || coerced.highlight !== "yes" || coerced.bbox === null) {
    return finalize(coerced, skippedCursorTrace());
  }

  const cfg = config.screenshots.locateHighlight.cursor;

  try {
    const llmOut = await cursorLocator({ framePath: args.framePath });
    if (llmOut.cursor === null) {
      return finalize(dropDecision("cursor_not_found"),
        { applied: true, llmCursor: null, cvCursor: null, bboxContained: null, outcome: "dropped_no_cursor_llm" });
    }
    const cv = await cursorVerifier(args.framePath, llmOut.cursor.x, llmOut.cursor.y, {
      windowFrac: cfg.windowFrac,
      threshold: cfg.nccThreshold,
    });
    if (cv === null) {
      return finalize(dropDecision("cursor_not_found"),
        { applied: true, llmCursor: llmOut.cursor, cvCursor: null, bboxContained: null, outcome: "dropped_no_cv" });
    }
    const contained = bboxContainsPoint(coerced.bbox, cv, cfg.bboxToleranceFrac);
    if (!contained) {
      return finalize(dropDecision("cursor_outside_bbox"),
        { applied: true, llmCursor: llmOut.cursor, cvCursor: cv, bboxContained: false, outcome: "dropped_outside_bbox" });
    }
    return finalize(coerced,
      { applied: true, llmCursor: llmOut.cursor, cvCursor: cv, bboxContained: true, outcome: "passed" });
  } catch (e) {
    logger.warn("pipeline.highlight.cursor_check_errored", { intent: args.intent, error: String(e) });
    return finalize(coerced,
      { applied: true, llmCursor: null, cvCursor: null, bboxContained: null, outcome: "errored" });
  }
}
```

- [ ] **Step 4: Add `snap` persistence to the call site**

`LocateHighlightResult.trace.snap` is new this task. In `src/trigger/processSopScreenshots.ts`, locate the `persistTrace(makeTrace({ ... cursorCheck: result.trace.cursorCheck }))` block and add one line:

```ts
                  cursorCheck: result.trace.cursorCheck,
                  snap: result.trace.snap,
```

- [ ] **Step 5: Run full project tests**

Run: `npx tsc --noEmit && npm test`
Expected: clean typecheck, all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/trigger/stages/locateHighlight.ts src/trigger/stages/locateHighlight.test.ts src/trigger/processSopScreenshots.ts
git commit -m "feat(highlight): wire snap + input min-height into locateHighlight"
```

---

## Task 7: Surface new trace fields in `inspect-trace.mjs`

**Files:**
- Modify: `scripts/inspect-trace.mjs`

- [ ] **Step 1: Open the script**

Run: `sed -n '58,70p' scripts/inspect-trace.mjs`

The substep loop currently logs `verify`, `highlight`, `finalActionRecorded`, `droppedAt`.

- [ ] **Step 2: Add new field dumps**

In `scripts/inspect-trace.mjs`, after the existing line:

```js
  console.log(`  highlight=${t.highlightOutcome} finalRecorded=${t.finalActionRecorded} droppedAt=${t.droppedAt}`);
```

Add:

```js
  if (t.cursorCheck) {
    const cc = t.cursorCheck;
    const llm = cc.llmCursor ? `(${cc.llmCursor.x.toFixed(3)},${cc.llmCursor.y.toFixed(3)})` : "null";
    const cv = cc.cvCursor ? `(${cc.cvCursor.x.toFixed(3)},${cc.cvCursor.y.toFixed(3)},s=${cc.cvCursor.score.toFixed(2)})` : "null";
    console.log(`  cursor: outcome=${cc.outcome} contained=${cc.bboxContained} llm=${llm} cv=${cv}`);
  }
  if (t.snap) {
    const s = t.snap;
    const em = s.edgesMovedPx;
    console.log(`  snap: ran=${s.ran} borderFound=${s.borderFound} edgesPx={t=${em.top},r=${em.right},b=${em.bottom},l=${em.left}} inputFloorApplied=${s.inputMinHeightApplied}`);
  }
```

- [ ] **Step 3: Smoke-run the script against an existing trace**

Run: `SOP_ID=6a06bc710d0fe9177b246c62 STEP=0 node scripts/inspect-trace.mjs 2>&1 | tail -20`

Expected: existing fields still print. New fields will print as `undefined` on rows captured before this change (acceptable — no new run yet).

- [ ] **Step 4: Commit**

```bash
git add scripts/inspect-trace.mjs
git commit -m "chore(inspect-trace): dump cursorCheck and snap fields when present"
```

---

## Task 8: Manual smoke + sign-off

Not committable — manual verification gate.

- [ ] **Step 1: Trigger a new SOP run**

Use the Playwright flow OR the existing test endpoint to upload `samples/trimmed-hubspot_crm.mp4` with `SOP_PIPELINE_DEBUG=1` in the trigger worker env.

- [ ] **Step 2: Poll until ready**

Run: `SOP_ID=<new sop id> node scripts/poll-sop-status.mjs`
Expected: terminates at `status=ready`.

- [ ] **Step 3: Inspect step 0**

Run: `SOP_ID=<new sop id> STEP=0 node scripts/inspect-trace.mjs`

Check the 5 spec acceptance criteria (§5 of the spec):
- Cases 1, 3 (button-text-only): snap moved at least one side; borderFound=true.
- Case 2 (underline input): `inputFloorApplied=true` AND `bbox.h ≈ 0.025`.
- Case 4 (Next vs Skip): cursorCheck outcome = `dropped_outside_bbox`.
- Case 5 (logo vs Contacts): cursorCheck outcome = `dropped_outside_bbox`.
- ≤ 1 false-positive drop across the SOP.

- [ ] **Step 4: Visual review**

Open the rendered SOP in the viewer. Visually confirm bbox alignment for each step's screenshots.

- [ ] **Step 5: Report results to the user**

Summarize: which acceptance criteria passed, which didn't, what the trace shows. Do NOT commit unless the user signs off.
