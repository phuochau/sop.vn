# Gemini-Grounded Highlights Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace diff-bbox-only highlight drawing with per-event Gemini grounding on a tight crop, producing precise yellow rectangles around the actual clicked element or typed-in field.

**Architecture:** Frame-diff stays as the WHEN signal. A new `classifyAndMergeEvents` stage collapses typing sessions. A new `groundEventsWithGemini` stage sends per-event crops to Gemini 2.5 Flash and maps the returned bbox back to full-frame coords. `uploadScreenshots` is unchanged.

**Tech Stack:** TypeScript, Next.js 16.2.4, trigger.dev v3, sharp (crops), OpenRouter Gemini 2.5 Flash vision (grounding), Zod schemas, node:test + assert.

**Spec:** `docs/superpowers/specs/2026-05-13-gemini-grounded-highlights-design.md`

---

## File Structure

**Create:**
- `src/trigger/stages/classifyAndMergeEvents.ts` + `.test.ts` — typing-session detection and merging
- `src/trigger/stages/groundEventsWithGemini.ts` + `.test.ts` — per-event LLM grounding on crops
- `src/trigger/lib/cropEvent.ts` + `.test.ts` — pure crop-math helpers (sizing, coordinate mapping)

**Modify:**
- `src/lib/schemas.ts` — add `GroundedEventOutput`; remove `CursorSchema`, `FocusedCursorOutput`, `CaptionsOutput` (replaced by `GroundedEventOutput`)
- `src/config/index.ts` — add `screenshots.ground` block; add `prompts.groundEventSystem`; remove `clickCaptionSystem`, `focusedCursorSystem`
- `src/trigger/processSopScreenshots.ts` — wire the two new stages, drop anchor stage import
- `src/trigger/stages/uploadScreenshots.ts` — no logic change; this file is referenced for verification only

**Delete:**
- `src/trigger/stages/anchorClickEvents.ts` + `.test.ts`
- `src/trigger/lib/cursorDetect.ts` + `.test.ts`
- `src/trigger/stages/validateHighlights.ts` + `.test.ts`
- `src/trigger/stages/captionClickEvents.ts` (no test exists)

---

## Task 1: Crop math helpers

**Files:**
- Create: `src/trigger/lib/cropEvent.ts`
- Test: `src/trigger/lib/cropEvent.test.ts`

Pure functions, no I/O. Computes crop window from a diff bbox + frame dims, and maps a 0..1 bbox in crop coords back to 0..1 full-frame coords.

**Public API:**
```ts
export type Bbox = { x: number; y: number; w: number; h: number };
export type CropWindow = { cx: number; cy: number; cw: number; ch: number }; // pixels

export function computeCropWindow(
  diffBbox: Bbox,              // 0..1 normalized
  frameW: number,
  frameH: number,
  opts: { multiplier: number; minPx: number; maxFrac: number },
): CropWindow;

export function diffBboxInCrop(diffBbox: Bbox, crop: CropWindow, frameW: number, frameH: number): Bbox;

export function cropBboxToFullFrame(
  cropBbox: Bbox,              // 0..1 in crop
  crop: CropWindow,
  frameW: number,
  frameH: number,
): Bbox;                       // 0..1 in full frame
```

- [ ] **Step 1: Write failing tests**

```ts
import { test } from "node:test";
import assert from "node:assert";
import { computeCropWindow, diffBboxInCrop, cropBboxToFullFrame } from "./cropEvent";

test("computeCropWindow centers on diff with 3x multiplier", () => {
  const diff = { x: 0.5, y: 0.5, w: 0.1, h: 0.05 }; // 192x36 in 1920x720
  const crop = computeCropWindow(diff, 1920, 720, { multiplier: 3, minPx: 400, maxFrac: 0.5 });
  // diff size 192x36, 3x = 576x108, min 400 → crop 576x400
  // centered: cx ≈ 960 - 288 = 672
  assert.equal(crop.cw, 576);
  assert.equal(crop.ch, 400);
  assert.equal(crop.cx, 672);
  // center diff at y=378, ch=400 → cy = 178
  assert.equal(crop.cy, 178);
});

test("computeCropWindow respects min size floor", () => {
  const diff = { x: 0.5, y: 0.5, w: 0.01, h: 0.01 };
  const crop = computeCropWindow(diff, 1920, 1080, { multiplier: 3, minPx: 400, maxFrac: 0.5 });
  assert.equal(crop.cw, 400);
  assert.equal(crop.ch, 400);
});

test("computeCropWindow caps at maxFrac of frame", () => {
  const diff = { x: 0.1, y: 0.1, w: 0.4, h: 0.4 };
  const crop = computeCropWindow(diff, 1000, 1000, { multiplier: 3, minPx: 400, maxFrac: 0.5 });
  assert.equal(crop.cw, 500);
  assert.equal(crop.ch, 500);
});

test("computeCropWindow clamps to frame bounds at edges", () => {
  const diff = { x: 0.0, y: 0.0, w: 0.05, h: 0.05 };
  const crop = computeCropWindow(diff, 1920, 1080, { multiplier: 3, minPx: 400, maxFrac: 0.5 });
  assert.equal(crop.cx, 0);
  assert.equal(crop.cy, 0);
});

test("computeCropWindow clamps to frame bounds at far edge", () => {
  const diff = { x: 0.95, y: 0.95, w: 0.05, h: 0.05 };
  const crop = computeCropWindow(diff, 1920, 1080, { multiplier: 3, minPx: 400, maxFrac: 0.5 });
  assert.equal(crop.cx + crop.cw, 1920);
  assert.equal(crop.cy + crop.ch, 1080);
});

test("cropBboxToFullFrame inverts diffBboxInCrop", () => {
  const diff = { x: 0.5, y: 0.5, w: 0.1, h: 0.05 };
  const W = 1920, H = 720;
  const crop = computeCropWindow(diff, W, H, { multiplier: 3, minPx: 400, maxFrac: 0.5 });
  const inCrop = diffBboxInCrop(diff, crop, W, H);
  const roundTrip = cropBboxToFullFrame(inCrop, crop, W, H);
  assert.ok(Math.abs(roundTrip.x - diff.x) < 1e-9);
  assert.ok(Math.abs(roundTrip.y - diff.y) < 1e-9);
  assert.ok(Math.abs(roundTrip.w - diff.w) < 1e-9);
  assert.ok(Math.abs(roundTrip.h - diff.h) < 1e-9);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/trigger/lib/cropEvent.test.ts`
Expected: FAIL with "cannot find module ./cropEvent"

- [ ] **Step 3: Implement `cropEvent.ts`**

```ts
export type Bbox = { x: number; y: number; w: number; h: number };
export type CropWindow = { cx: number; cy: number; cw: number; ch: number };

export function computeCropWindow(
  diff: Bbox,
  frameW: number,
  frameH: number,
  opts: { multiplier: number; minPx: number; maxFrac: number },
): CropWindow {
  const diffW = diff.w * frameW;
  const diffH = diff.h * frameH;
  const targetW = Math.max(diffW * opts.multiplier, opts.minPx);
  const targetH = Math.max(diffH * opts.multiplier, opts.minPx);
  const maxW = frameW * opts.maxFrac;
  const maxH = frameH * opts.maxFrac;
  const cw = Math.round(Math.min(targetW, maxW));
  const ch = Math.round(Math.min(targetH, maxH));
  const centerX = (diff.x + diff.w / 2) * frameW;
  const centerY = (diff.y + diff.h / 2) * frameH;
  let cx = Math.round(centerX - cw / 2);
  let cy = Math.round(centerY - ch / 2);
  cx = Math.max(0, Math.min(frameW - cw, cx));
  cy = Math.max(0, Math.min(frameH - ch, cy));
  return { cx, cy, cw, ch };
}

export function diffBboxInCrop(diff: Bbox, crop: CropWindow, frameW: number, frameH: number): Bbox {
  const fxPx = diff.x * frameW;
  const fyPx = diff.y * frameH;
  const fwPx = diff.w * frameW;
  const fhPx = diff.h * frameH;
  return {
    x: (fxPx - crop.cx) / crop.cw,
    y: (fyPx - crop.cy) / crop.ch,
    w: fwPx / crop.cw,
    h: fhPx / crop.ch,
  };
}

export function cropBboxToFullFrame(cropBbox: Bbox, crop: CropWindow, frameW: number, frameH: number): Bbox {
  return {
    x: (crop.cx + cropBbox.x * crop.cw) / frameW,
    y: (crop.cy + cropBbox.y * crop.ch) / frameH,
    w: (cropBbox.w * crop.cw) / frameW,
    h: (cropBbox.h * crop.ch) / frameH,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/trigger/lib/cropEvent.test.ts`
Expected: PASS (6/6)

- [ ] **Step 5: Commit**

```bash
git add src/trigger/lib/cropEvent.ts src/trigger/lib/cropEvent.test.ts
git commit -m "feat: crop math helpers for per-event grounding"
```

---

## Task 2: Schema + config additions

**Files:**
- Modify: `src/lib/schemas.ts`
- Modify: `src/config/index.ts`

- [ ] **Step 1: Add `GroundedEventOutput` to `schemas.ts`**

After the `CaptionsOutput` definition, add:

```ts
export const GroundedEventOutput = z.object({
  bbox: BBox,
  caption: z.string().nullable(),
  kind: z.enum(["click", "input"]),
});
```

- [ ] **Step 2: Add config block**

In `src/config/index.ts`, add to `screenshots`:

```ts
ground: {
  cropMultiplier: 3,
  cropMinPx: 400,
  cropMaxFrac: 0.50,
  perStepConcurrency: 5,
},
```

- [ ] **Step 3: Add the system prompt**

In `src/config/index.ts` under `prompts`, add:

```ts
groundEventSystem: (lang: string) =>
  `You are a precise visual locator for a how-to screen recording. You receive a BEFORE crop and an AFTER crop of the same screen region around a moment where the user performed one action. A diff bounding box (normalized 0..1 in the crop) tells you roughly where pixels changed.

Return a tight bounding box around the SPECIFIC UI element the user interacted with:
- For a click (button, link, icon, tab, menu item, row, dropdown): bbox the SOURCE element the cursor was on, not any panel/menu/page that opened in response.
- For an input (text field, textarea, search box): bbox the INPUT FIELD receiving text, including its full visual extent (border, padding).

Write a short imperative caption in ${lang} describing what the user did (e.g., "Click the Sign in button.", "Enter your email address."). One sentence. If the change is not a meaningful UI action (background animation, video playback, ad swap), return caption: null.

Classify the kind: "input" if a text field is receiving text, "click" otherwise. The kind hint in the user message is a guess — override it if wrong.

Coordinates are normalized 0..1 against the CROP (top-left origin). Be precise.

LANGUAGE: Caption in ${lang}. Keep technical / industry / brand terms in their original form.

Return strict JSON only.`,
```

- [ ] **Step 4: Verify tsc passes**

Run: `npx tsc --noEmit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/schemas.ts src/config/index.ts
git commit -m "feat: GroundedEventOutput schema and ground config"
```

---

## Task 3: classifyAndMergeEvents stage

**Files:**
- Create: `src/trigger/stages/classifyAndMergeEvents.ts`
- Test: `src/trigger/stages/classifyAndMergeEvents.test.ts`

**Public API:**
```ts
import type { ClickEvent } from "@/trigger/lib/clickEventDetect";

export type RawEvent = ClickEvent & { kindHint: "click" | "input" };

export function runClassifyAndMergeEvents(args: {
  byStep: Map<number, ClickEvent[]>;
  opts?: { typingAspectMin?: number; typingMaxDensity?: number; sessionIouMin?: number; sessionWindowSec?: number };
}): Map<number, RawEvent[]>;
```

- [ ] **Step 1: Write failing tests**

```ts
import { test } from "node:test";
import assert from "node:assert";
import { runClassifyAndMergeEvents } from "./classifyAndMergeEvents";
import type { ClickEvent } from "@/trigger/lib/clickEventDetect";

function ev(o: Partial<ClickEvent>): ClickEvent {
  return {
    time: 0,
    bbox: { x: 0.4, y: 0.4, w: 0.05, h: 0.05 },
    beforeFramePath: "/b",
    afterFramePath: "/a",
    area: 100,
    density: 0.5,
    ...o,
  };
}

test("single click event stays a click", () => {
  const evs = [ev({ time: 1, bbox: { x: 0.4, y: 0.4, w: 0.05, h: 0.05 } })];
  const out = runClassifyAndMergeEvents({ byStep: new Map([[0, evs]]) });
  const list = out.get(0)!;
  assert.equal(list.length, 1);
  assert.equal(list[0].kindHint, "click");
});

test("three consecutive wide low-density diffs merge into one input", () => {
  const evs = [
    ev({ time: 1.0, bbox: { x: 0.3, y: 0.5, w: 0.20, h: 0.04 }, density: 0.3 }),
    ev({ time: 1.5, bbox: { x: 0.3, y: 0.5, w: 0.22, h: 0.04 }, density: 0.3 }),
    ev({ time: 2.0, bbox: { x: 0.3, y: 0.5, w: 0.25, h: 0.04 }, density: 0.3 }),
  ];
  const out = runClassifyAndMergeEvents({ byStep: new Map([[0, evs]]) });
  const list = out.get(0)!;
  assert.equal(list.length, 1);
  assert.equal(list[0].kindHint, "input");
  assert.equal(list[0].time, 1.0);
  assert.equal(list[0].beforeFramePath, "/b"); // first event's BEFORE
  assert.ok(list[0].bbox.w >= 0.25, `union width should be >= 0.25, got ${list[0].bbox.w}`);
});

test("typing session and separate click in same step → two events", () => {
  const evs = [
    ev({ time: 1.0, bbox: { x: 0.3, y: 0.5, w: 0.20, h: 0.04 }, density: 0.3 }),
    ev({ time: 1.5, bbox: { x: 0.3, y: 0.5, w: 0.22, h: 0.04 }, density: 0.3 }),
    ev({ time: 5.0, bbox: { x: 0.7, y: 0.8, w: 0.05, h: 0.05 }, density: 0.6 }),
  ];
  const out = runClassifyAndMergeEvents({ byStep: new Map([[0, evs]]) });
  const list = out.get(0)!;
  assert.equal(list.length, 2);
  assert.equal(list[0].kindHint, "input");
  assert.equal(list[1].kindHint, "click");
});

test("non-overlapping wide diffs do NOT merge", () => {
  const evs = [
    ev({ time: 1.0, bbox: { x: 0.1, y: 0.3, w: 0.15, h: 0.04 }, density: 0.3 }),
    ev({ time: 1.5, bbox: { x: 0.6, y: 0.3, w: 0.15, h: 0.04 }, density: 0.3 }),
  ];
  const out = runClassifyAndMergeEvents({ byStep: new Map([[0, evs]]) });
  const list = out.get(0)!;
  // Disjoint, no IoU → no merge; both kept as separate (each will appear as
  // "input" hint since aspect+density qualifies, but we expect 2 events not 1)
  assert.equal(list.length, 2);
});

test("typing session does not span across steps", () => {
  const a = ev({ time: 1.0, bbox: { x: 0.3, y: 0.5, w: 0.20, h: 0.04 }, density: 0.3 });
  const b = ev({ time: 1.5, bbox: { x: 0.3, y: 0.5, w: 0.22, h: 0.04 }, density: 0.3 });
  const out = runClassifyAndMergeEvents({ byStep: new Map([[0, [a]], [1, [b]]]) });
  assert.equal(out.get(0)!.length, 1);
  assert.equal(out.get(1)!.length, 1);
});
```

- [ ] **Step 2: Run tests, verify FAIL**

Run: `npx tsx --test src/trigger/stages/classifyAndMergeEvents.test.ts`
Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Implement stage**

```ts
import type { ClickEvent } from "@/trigger/lib/clickEventDetect";
import { bboxIou } from "@/trigger/lib/clickEventDetect";

export type RawEvent = ClickEvent & { kindHint: "click" | "input" };

type Opts = {
  typingAspectMin: number;
  typingMaxDensity: number;
  sessionIouMin: number;
  sessionWindowSec: number;
};

const DEFAULTS: Opts = {
  typingAspectMin: 2.5,
  typingMaxDensity: 0.4,
  sessionIouMin: 0.30,
  sessionWindowSec: 1.5,
};

function isTypingCandidate(e: ClickEvent, opts: Opts): boolean {
  const aspect = e.bbox.h > 0 ? e.bbox.w / e.bbox.h : 0;
  return aspect >= opts.typingAspectMin && e.density <= opts.typingMaxDensity;
}

function bboxUnion(a: ClickEvent["bbox"], b: ClickEvent["bbox"]): ClickEvent["bbox"] {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.w, b.x + b.w);
  const y2 = Math.max(a.y + a.h, b.y + b.h);
  return { x, y, w: x2 - x, h: y2 - y };
}

function classifyStep(events: ClickEvent[], opts: Opts): RawEvent[] {
  const out: RawEvent[] = [];
  let i = 0;
  while (i < events.length) {
    const e = events[i];
    if (!isTypingCandidate(e, opts)) {
      out.push({ ...e, kindHint: "click" });
      i++;
      continue;
    }
    // Greedily extend a typing session
    let session = e;
    let lastTime = e.time;
    let lastAfter = e.afterFramePath;
    let j = i + 1;
    let merged = false;
    while (j < events.length) {
      const cand = events[j];
      if (!isTypingCandidate(cand, opts)) break;
      if (cand.time - lastTime > opts.sessionWindowSec) break;
      if (bboxIou(session.bbox, cand.bbox) < opts.sessionIouMin) break;
      session = {
        ...session,
        bbox: bboxUnion(session.bbox, cand.bbox),
        afterFramePath: cand.afterFramePath,
      };
      lastTime = cand.time;
      lastAfter = cand.afterFramePath;
      merged = true;
      j++;
    }
    out.push({ ...session, kindHint: merged ? "input" : "click" });
    i = j;
  }
  return out;
}

export function runClassifyAndMergeEvents(args: {
  byStep: Map<number, ClickEvent[]>;
  opts?: Partial<Opts>;
}): Map<number, RawEvent[]> {
  const opts: Opts = { ...DEFAULTS, ...(args.opts ?? {}) };
  const out = new Map<number, RawEvent[]>();
  for (const [stepIndex, evs] of args.byStep.entries()) {
    out.set(stepIndex, classifyStep(evs, opts));
  }
  return out;
}
```

- [ ] **Step 4: Run tests, verify PASS**

Run: `npx tsx --test src/trigger/stages/classifyAndMergeEvents.test.ts`
Expected: PASS (5/5)

- [ ] **Step 5: Commit**

```bash
git add src/trigger/stages/classifyAndMergeEvents.ts src/trigger/stages/classifyAndMergeEvents.test.ts
git commit -m "feat: classify and merge typing sessions into input events"
```

---

## Task 4: groundEventsWithGemini stage

**Files:**
- Create: `src/trigger/stages/groundEventsWithGemini.ts`
- Test: `src/trigger/stages/groundEventsWithGemini.test.ts`

**Public API:**
```ts
export type GroundedEvent = {
  time: number;
  bbox: { x: number; y: number; w: number; h: number }; // full-frame 0..1
  displayFramePath: string;
  kind: "click" | "input";
  caption: string | null;
};

export async function runGroundEventsWithGemini(args: {
  byStep: Map<number, RawEvent[]>;
  steps: Array<{ stepIndex: number; title: string; narration: string }>;
  language: string;
  // Injection seams for testing:
  groundOne?: (e: RawEvent, step: StepInfo, language: string) => Promise<GroundedEvent | null>;
  concurrency?: number;
}): Promise<Map<number, GroundedEvent[]>>;
```

The exported `groundOneWithLLM` is the default implementation; injecting `groundOne` lets tests bypass sharp + LLM.

- [ ] **Step 1: Write failing tests**

```ts
import { test } from "node:test";
import assert from "node:assert";
import { runGroundEventsWithGemini } from "./groundEventsWithGemini";
import type { RawEvent } from "./classifyAndMergeEvents";

function rev(o: Partial<RawEvent> = {}): RawEvent {
  return {
    time: 1.0,
    bbox: { x: 0.4, y: 0.4, w: 0.1, h: 0.05 },
    beforeFramePath: "/before.jpg",
    afterFramePath: "/after.jpg",
    area: 100,
    density: 0.5,
    kindHint: "click",
    ...o,
  };
}

test("groundEvents calls injected groundOne per event and returns mapped output", async () => {
  let calls = 0;
  const out = await runGroundEventsWithGemini({
    byStep: new Map([[0, [rev({ time: 1 }), rev({ time: 2 })]]]),
    steps: [{ stepIndex: 0, title: "t", narration: "n" }],
    language: "en",
    groundOne: async (e) => {
      calls++;
      return {
        time: e.time,
        bbox: { x: 0.5, y: 0.5, w: 0.1, h: 0.05 },
        displayFramePath: e.beforeFramePath,
        kind: "click",
        caption: `c${e.time}`,
      };
    },
  });
  assert.equal(calls, 2);
  const list = out.get(0)!;
  assert.equal(list.length, 2);
  assert.equal(list[0].caption, "c1");
});

test("groundEvents falls back to raw diff bbox when groundOne returns null", async () => {
  const out = await runGroundEventsWithGemini({
    byStep: new Map([[0, [rev({ bbox: { x: 0.1, y: 0.1, w: 0.2, h: 0.1 }, kindHint: "input" })]]]),
    steps: [{ stepIndex: 0, title: "t", narration: "n" }],
    language: "en",
    groundOne: async () => null,
  });
  const e = out.get(0)![0];
  assert.deepEqual(e.bbox, { x: 0.1, y: 0.1, w: 0.2, h: 0.1 });
  assert.equal(e.caption, null);
  assert.equal(e.kind, "input");
});

test("groundEvents picks AFTER frame for input events on fallback", async () => {
  const out = await runGroundEventsWithGemini({
    byStep: new Map([[0, [rev({ kindHint: "input" })]]]),
    steps: [{ stepIndex: 0, title: "t", narration: "n" }],
    language: "en",
    groundOne: async () => null,
  });
  assert.equal(out.get(0)![0].displayFramePath, "/after.jpg");
});

test("groundEvents picks BEFORE frame for click events on fallback", async () => {
  const out = await runGroundEventsWithGemini({
    byStep: new Map([[0, [rev({ kindHint: "click" })]]]),
    steps: [{ stepIndex: 0, title: "t", narration: "n" }],
    language: "en",
    groundOne: async () => null,
  });
  assert.equal(out.get(0)![0].displayFramePath, "/before.jpg");
});

test("groundEvents respects concurrency limit", async () => {
  let inFlight = 0;
  let maxInFlight = 0;
  const events = Array.from({ length: 12 }, (_, i) => rev({ time: i }));
  await runGroundEventsWithGemini({
    byStep: new Map([[0, events]]),
    steps: [{ stepIndex: 0, title: "t", narration: "n" }],
    language: "en",
    concurrency: 3,
    groundOne: async (e) => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise(r => setTimeout(r, 10));
      inFlight--;
      return {
        time: e.time,
        bbox: e.bbox,
        displayFramePath: e.beforeFramePath,
        kind: "click",
        caption: null,
      };
    },
  });
  assert.ok(maxInFlight <= 3, `maxInFlight ${maxInFlight} exceeded 3`);
});

test("groundEvents preserves event order within a step", async () => {
  const events = [rev({ time: 1 }), rev({ time: 2 }), rev({ time: 3 })];
  const out = await runGroundEventsWithGemini({
    byStep: new Map([[0, events]]),
    steps: [{ stepIndex: 0, title: "t", narration: "n" }],
    language: "en",
    groundOne: async (e) => ({
      time: e.time,
      bbox: e.bbox,
      displayFramePath: e.beforeFramePath,
      kind: "click",
      caption: null,
    }),
  });
  const list = out.get(0)!;
  assert.equal(list[0].time, 1);
  assert.equal(list[1].time, 2);
  assert.equal(list[2].time, 3);
});
```

- [ ] **Step 2: Run tests, verify FAIL**

Run: `npx tsx --test src/trigger/stages/groundEventsWithGemini.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement stage**

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { logger } from "@trigger.dev/sdk/v3";
import { llmJsonVision } from "@/lib/openrouter";
import { GroundedEventOutput } from "@/lib/schemas";
import { config } from "@/config";
import {
  computeCropWindow,
  diffBboxInCrop,
  cropBboxToFullFrame,
  type Bbox,
} from "@/trigger/lib/cropEvent";
import type { RawEvent } from "./classifyAndMergeEvents";

export type GroundedEvent = {
  time: number;
  bbox: Bbox;
  displayFramePath: string;
  kind: "click" | "input";
  caption: string | null;
};

type StepInfo = { stepIndex: number; title: string; narration: string };

export async function groundOneWithLLM(e: RawEvent, step: StepInfo, language: string): Promise<GroundedEvent | null> {
  try {
    const beforeMeta = await sharp(e.beforeFramePath).metadata();
    const W = beforeMeta.width ?? 0;
    const H = beforeMeta.height ?? 0;
    if (!W || !H) throw new Error("missing image metadata");

    const crop = computeCropWindow(e.bbox, W, H, {
      multiplier: config.screenshots.ground.cropMultiplier,
      minPx: config.screenshots.ground.cropMinPx,
      maxFrac: config.screenshots.ground.cropMaxFrac,
    });

    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "ground-"));
    const cropBeforePath = path.join(tmpDir, "before.jpg");
    const cropAfterPath = path.join(tmpDir, "after.jpg");
    try {
      await sharp(e.beforeFramePath)
        .extract({ left: crop.cx, top: crop.cy, width: crop.cw, height: crop.ch })
        .jpeg({ quality: 90 })
        .toFile(cropBeforePath);
      await sharp(e.afterFramePath)
        .extract({ left: crop.cx, top: crop.cy, width: crop.cw, height: crop.ch })
        .jpeg({ quality: 90 })
        .toFile(cropAfterPath);

      const diffInCrop = diffBboxInCrop(e.bbox, crop, W, H);
      const userText = [
        `Step title: ${step.title}`,
        `Step narration: ${step.narration}`,
        `Event kind hint: ${e.kindHint}`,
        `Diff bbox in crop (x, y, w, h): ${diffInCrop.x.toFixed(3)}, ${diffInCrop.y.toFixed(3)}, ${diffInCrop.w.toFixed(3)}, ${diffInCrop.h.toFixed(3)}`,
      ].join("\n");

      const result = await llmJsonVision({
        model: config.ai.visionModel,
        system: config.ai.prompts.groundEventSystem(language),
        userText,
        imagePaths: [cropBeforePath, cropAfterPath],
        schema: GroundedEventOutput,
        schemaName: "grounded_event",
        maxRetries: config.ai.maxRetries,
      });

      const fullBbox = cropBboxToFullFrame(result.bbox, crop, W, H);
      const displayFramePath = result.kind === "input" ? e.afterFramePath : e.beforeFramePath;
      return {
        time: e.time,
        bbox: fullBbox,
        displayFramePath,
        kind: result.kind,
        caption: result.caption,
      };
    } finally {
      await fs.promises.rm(tmpDir, { recursive: true, force: true });
    }
  } catch (err) {
    logger.warn("groundOneWithLLM failed", {
      time: e.time,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

function fallbackEvent(e: RawEvent): GroundedEvent {
  return {
    time: e.time,
    bbox: e.bbox,
    displayFramePath: e.kindHint === "input" ? e.afterFramePath : e.beforeFramePath,
    kind: e.kindHint,
    caption: null,
  };
}

async function runWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function runGroundEventsWithGemini(args: {
  byStep: Map<number, RawEvent[]>;
  steps: Array<{ stepIndex: number; title: string; narration: string }>;
  language: string;
  groundOne?: (e: RawEvent, step: StepInfo, language: string) => Promise<GroundedEvent | null>;
  concurrency?: number;
}): Promise<Map<number, GroundedEvent[]>> {
  const groundOne = args.groundOne ?? groundOneWithLLM;
  const limit = args.concurrency ?? config.screenshots.ground.perStepConcurrency;
  const out = new Map<number, GroundedEvent[]>();

  for (const step of args.steps) {
    const events = args.byStep.get(step.stepIndex) ?? [];
    if (events.length === 0) {
      out.set(step.stepIndex, []);
      continue;
    }
    const results = await runWithConcurrency(events, limit, async (e) => {
      const grounded = await groundOne(e, step, args.language);
      return grounded ?? fallbackEvent(e);
    });
    out.set(step.stepIndex, results);
  }
  return out;
}
```

- [ ] **Step 4: Run tests, verify PASS**

Run: `npx tsx --test src/trigger/stages/groundEventsWithGemini.test.ts`
Expected: PASS (6/6)

- [ ] **Step 5: Commit**

```bash
git add src/trigger/stages/groundEventsWithGemini.ts src/trigger/stages/groundEventsWithGemini.test.ts
git commit -m "feat: per-event Gemini grounding stage with concurrency"
```

---

## Task 5: Wire new stages into pipeline, delete dead code

**Files:**
- Modify: `src/trigger/processSopScreenshots.ts`
- Delete: `src/trigger/stages/anchorClickEvents.ts` + test
- Delete: `src/trigger/lib/cursorDetect.ts` + test
- Delete: `src/trigger/stages/validateHighlights.ts` + test
- Delete: `src/trigger/stages/captionClickEvents.ts`
- Modify: `src/lib/schemas.ts` (remove dead schemas)
- Modify: `src/config/index.ts` (remove dead prompts)

- [ ] **Step 1: Replace stage block in `processSopScreenshots.ts`**

Replace the block starting at `// Cursor anchoring is implemented...` through `screenshotsByStep = await runUploadScreenshots(...)` with:

```ts
const merged = runClassifyAndMergeEvents({ byStep: eventsByStep });

const grounded = await runGroundEventsWithGemini({
  byStep: merged,
  steps: stepInputs,
  language: language!,
});

// Stage 7: upload click-event frames to R2.
await setStatus(_id, "uploading-screenshots");
const uploadByStep = new Map<number, UploadEvent[]>();
for (const [stepIndex, evs] of grounded.entries()) {
  uploadByStep.set(stepIndex, evs.map(e => ({
    displayFramePath: e.displayFramePath,
    t: e.time,
    bbox: e.bbox,
    kind: e.kind,
    caption: e.caption,
  })));
}
const screenshotsByStep = await runUploadScreenshots({
  sopId: _id.toHexString(),
  byStep: uploadByStep,
});
```

Replace the imports at top:
```ts
import { runClassifyAndMergeEvents } from "./stages/classifyAndMergeEvents";
import { runGroundEventsWithGemini } from "./stages/groundEventsWithGemini";
```

Remove imports of `anchorClickEventsByStep` and `runCaptionClickEvents`.

- [ ] **Step 2: Delete dead files**

```bash
rm src/trigger/stages/anchorClickEvents.ts src/trigger/stages/anchorClickEvents.test.ts
rm src/trigger/lib/cursorDetect.ts src/trigger/lib/cursorDetect.test.ts
rm src/trigger/stages/validateHighlights.ts src/trigger/stages/validateHighlights.test.ts
rm src/trigger/stages/captionClickEvents.ts
```

- [ ] **Step 3: Remove dead schemas**

In `src/lib/schemas.ts`, remove `CursorSchema`, `Cursor` type, `FocusedCursorOutput`, `CaptionsOutput`. Keep `GroundedEventOutput` from Task 2.

- [ ] **Step 4: Remove dead prompts**

In `src/config/index.ts`, remove the entries for `clickCaptionSystem` and `focusedCursorSystem`. Keep `groundEventSystem`.

- [ ] **Step 5: Verify tsc passes**

Run: `npx tsc --noEmit`
Expected: PASS

If a stale import or reference fails, fix it (likely a leftover import of `CaptionsOutput` or a dead schema).

- [ ] **Step 6: Run full test suite**

Run: `npx tsx --test src/**/*.test.ts`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: wire Gemini grounding, drop cursor/anchor/caption stages"
```

---

## Task 6: Smoke test on real video

**Files:** none modified; run the pipeline end-to-end.

- [ ] **Step 1: Confirm dev environment**

Run: `git status` to make sure tree is clean
Run: `npx tsc --noEmit` one more time
Expected: clean tree, tsc passes

- [ ] **Step 2: Trigger run on hubspot_crm.mp4**

(Operator action — instructions for the human running the smoke test.)

Trigger the `process-sop-screenshots` task with the existing test SOP for `hubspot_crm.mp4`. Wait for completion (typically 5-10 min).

- [ ] **Step 3: Spot-check 10 screenshots**

For each step, inspect:
- Yellow rectangle on the actual clicked element (not on the side-effect)
- Caption matches what the user did
- `kind` is correct (click vs input)

Acceptance criteria:
- ≥ 8/10 screenshots have a visually correct bbox
- 0 broken screenshots (missing image, error state)
- Captions read naturally in the source language

- [ ] **Step 4: Commit final pipeline if smoke passes**

If acceptance criteria pass, the work is done. If not, the spot-check findings inform a follow-up task (tune `cropMultiplier`, refine prompt, etc.).

---

## Done criteria

- [ ] All 6 tasks committed
- [ ] `npx tsc --noEmit` clean
- [ ] Full test suite green
- [ ] Smoke test on hubspot_crm.mp4 shows visible improvement over the diff-bbox baseline
- [ ] Dead code (anchor, cursorDetect, validateHighlights, captionClickEvents) fully removed
