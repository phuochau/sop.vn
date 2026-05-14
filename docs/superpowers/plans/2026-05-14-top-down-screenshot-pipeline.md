# Top-Down Screenshot Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bottom-up screenshot pipeline (pixel-diff → classify → caption) with a top-down four-stage pipeline (plan → pickFrame → verifyFrame → locateHighlight) so each sub-step's description is guaranteed to match its picked screenshot.

**Architecture:** For each step, the planner derives sub-steps from narration (with visual cross-check). For each sub-step, a frame picker selects the best dense-pool frame from a pHash-clustered shortlist; a verifier confirms the match; a highlight stage decides whether/where to draw a bbox. Each gate can drop a sub-step independently. Old pipeline (`detectClickEvents`, `classifyStepWithLLM`, `buildActionsForStep`, etc.) is deleted.

**Tech Stack:** TypeScript, Node 22, Next.js 16, trigger.dev v3, sharp, MongoDB driver, Cloudflare R2, OpenRouter (Gemini 2.5 Flash for vision), zod, node:test + node:assert, tsx for running tests.

**Spec:** `docs/superpowers/specs/2026-05-14-top-down-screenshot-pipeline-design.md`

---

## File map

**Created:**
- `src/lib/concurrency.ts` — generic `runWithConcurrency` helper, lifted from `classifyStepWithLLM.ts`.
- `src/lib/concurrency.test.ts`.
- `src/trigger/lib/narration.ts` — `assembleStepNarration` (joins `segments[]` + `segmentsClean[]` with null-safety) and `silentStepFallback` (emits one View sub-step per long cluster when narration is empty).
- `src/trigger/lib/narration.test.ts`.
- `src/trigger/stages/planStep.ts` — Phase 1: per-step planner.
- `src/trigger/stages/planStep.test.ts`.
- `src/trigger/stages/pickFrame.ts` — Phase 2a: shortlist + frame picker.
- `src/trigger/stages/pickFrame.test.ts`.
- `src/trigger/stages/verifyFrame.ts` — Phase 2b: independent verification.
- `src/trigger/stages/verifyFrame.test.ts`.
- `src/trigger/stages/locateHighlight.ts` — Phase 3: bbox decision.
- `src/trigger/stages/locateHighlight.test.ts`.
- `src/trigger/stages/buildAction.ts` — pure assembler combining all four gates into one `Action`.
- `src/trigger/stages/buildAction.test.ts`.

**Modified:**
- `src/lib/schemas.ts` — add `SubStepPlan`, `StepPlan`, `FramePick`, `FrameVerification`, `HighlightDecision`, new `Action` type. Old union types removed in the deletion task.
- `src/lib/mongo.ts` — add `ErrorCode` values: `"plan_failed"`, `"frame_pick_failed"`, `"verify_failed"`, `"highlight_failed"`.
- `src/config/index.ts` — add `planStepSystem`, `pickFrameSystem`, `verifyFrameSystem`, `locateHighlightSystem` prompts.
- `src/trigger/lib/screenId.ts` — `ScreenCluster.members` shape change `{ frame, dHash }[]`, centroid representative, new `clusterFor` and `selectInClusterFrame` exports.
- `src/trigger/lib/screenId.test.ts` — extend for centroid + selectInClusterFrame.
- `src/trigger/processSopScreenshots.ts` — rewrite the screenshot stages with the new chain.
- `src/trigger/stages/uploadScreenshots.ts` — consume the new `Action` shape (description verbatim from sub-step intent).

**Deleted (after wiring):**
- `src/trigger/lib/clickEventDetect.ts` + test.
- `src/trigger/stages/extractClickEvents.ts`.
- `src/trigger/stages/classifyAndMergeEvents.ts`.
- `src/trigger/stages/classifyStepWithLLM.ts` + test.
- `src/trigger/stages/buildActionsForStep.ts` + test.

---

## How to run tests

```bash
# Single file
npx tsx --test src/path/to/file.test.ts

# All pipeline tests
npx tsx --test src/trigger/**/*.test.ts src/lib/**/*.test.ts

# Typecheck
npx tsc --noEmit
```

---

## Task 1: Add new schema types (additive)

**Files:**
- Modify: `src/lib/schemas.ts`

- [ ] **Step 1.1: Append the new schemas to `src/lib/schemas.ts`**

Append at the end of the file (the existing additive section already labeled "// New action-pipeline types"):

```ts
// Top-down pipeline schemas (replaces ClassifiedCandidate/StepClassification/ElementAction/ViewAction)

export const SubStepPlan = z.object({
  intent: z.string(),
  verb: z.enum(["click", "input", "select", "link", "view"]),
  narrationSegmentIds: z.array(z.number().int()).min(0),
  timeWindow: z.object({ start: z.number(), end: z.number() }).nullable(),
  visualConfidence: z.enum(["high", "low"]),
});

export const StepPlan = z.object({
  subSteps: z.array(SubStepPlan),
});

export const FramePick = z.object({
  picked: z.string().nullable(),
  runnerUp: z.string().nullable(),
  reasoning: z.string(),
});

export const FrameVerification = z.object({
  match: z.enum(["yes", "partially", "no"]),
  reasoning: z.string(),
});

export const HighlightDecision = z.object({
  highlight: z.enum(["yes", "no"]),
  bbox: BBox.nullable(),
  elementCaption: z.string().nullable(),
  noHighlightReason: z.enum(["view_action", "no_specific_target", "non_ui_frame"]).nullable(),
});

export type TopDownAction = {
  stepIndex: number;
  order: number;
  verb: "click" | "input" | "select" | "link" | "view";
  description: string;
  displayFramePath: string;
  time: number;
  highlight?: {
    kind: "click" | "input";
    bbox: { x: number; y: number; w: number; h: number };
  };
  verifyMatch: "yes" | "partially";
  pickedClusterLetter: string;
};
```

Note: `TopDownAction` is named distinct from the existing `Action` union to allow additive landing. The deletion task later renames `TopDownAction` → `Action` after removing the old union.

- [ ] **Step 1.2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 1.3: Commit**

```bash
git add src/lib/schemas.ts
git commit -m "feat: additive schemas for top-down pipeline (SubStepPlan, FramePick, etc.)"
```

---

## Task 2: Add ErrorCode values

**Files:**
- Modify: `src/lib/mongo.ts`

- [ ] **Step 2.1: Extend the ErrorCode union**

In `src/lib/mongo.ts`, find:

```ts
  | "click_detect_failed"
  | "classify_failed"
  | "loom_ingest_failed"
```

Replace with:

```ts
  | "click_detect_failed"
  | "classify_failed"
  | "plan_failed"          // top-down pipeline: planStep retries exhausted
  | "frame_pick_failed"    // top-down pipeline: pickFrame retries exhausted (rare; per-sub-step retries-exhausted normally just drop the sub-step)
  | "verify_failed"        // reserved; current policy drops sub-step on no-match rather than failing SOP
  | "highlight_failed"     // reserved; same policy as verify_failed
  | "loom_ingest_failed"
```

- [ ] **Step 2.2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 2.3: Commit**

```bash
git add src/lib/mongo.ts
git commit -m "feat: add ErrorCode values for top-down pipeline stages"
```

---

## Task 3: Add four LLM prompts

**Files:**
- Modify: `src/config/index.ts`

- [ ] **Step 3.1: Add `planStepSystem` prompt**

In `src/config/index.ts`, inside the `prompts:` block, add after the existing `classifyStepSystem` (or anywhere alphabetically reasonable):

```ts
      planStepSystem: (lang: string) =>
        `You convert a single training-video step into a list of sub-steps the reader will follow. You receive:
- The step's title and brief description.
- The step's narration: cleaned transcript segments with timestamps, in the trainer's voice.
- A screen montage: up to 6 representative frames from this step, labeled A/B/C/... showing the distinct application screens the user encountered.

Sub-steps come from what the trainer ASKS THE READER TO DO. One sub-step per discrete action (one click, one input, one selection, one view).

For each sub-step:
- intent: a short imperative sentence in ${lang}, ≤ 20 words. Use the screen name visible in the montage. Examples: "On the Check your email screen, enter the verification code.", "Click the Verify email button.", "Review the dashboard."
- verb: "click" | "input" | "select" | "link" | "view". Use "view" only when the trainer points to a screen without directing an action.
- narrationSegmentIds: the segment IDs from the input narration that describe this sub-step. Must reference real IDs from the input. May be empty if the action is silent.
- timeWindow: { start, end } seconds within the step's time range, OR null if narrationSegmentIds is non-empty. Required only when narrationSegmentIds is empty.
- visualConfidence: "high" when the montage shows clear evidence that the action happens on one of the labeled screens. "low" when the narration describes something but no montage frame plausibly matches (e.g., trainer mentions a screen never shown). Low-confidence sub-steps will be dropped.

Rules:
- Do NOT invent actions the trainer doesn't mention.
- Combine micro-actions only if the trainer treats them as one ("fill out the form" = one input sub-step over a single field; "fill out first name, last name, then click Next" = three sub-steps).
- Sub-steps appear in chronological order.

Return strict JSON only.`,

      pickFrameSystem: (lang: string) =>
        `You pick the single frame that best illustrates a given sub-step from a candidate shortlist.

You receive:
- The sub-step's intent (one sentence) and verb.
- A montage image: up to 6 candidate frames labeled A/B/C/..., each a representative full-screen image from a distinct application screen the user visited during the relevant time window.

Choose the letter whose frame best illustrates the intent. "Best" means: a reader given the intent text alone would clearly recognize where to perform the action (or what to observe, for verb="view"), and the frame shows the screen in a stable state — NOT a transition, NOT a partial render, NOT a non-UI frame.

Set picked to NULL if no candidate matches:
- The action target is not visible in any candidate frame.
- Every candidate is a non-UI frame (presenter/webcam, slide, intro animation).
- The intent describes an element that simply does not appear in this shortlist.

Set runnerUp to the second-best letter if at least one other candidate also plausibly matches. Otherwise null. runnerUp must NOT equal picked.

reasoning: one short sentence explaining the choice (or the null), in ${lang} when convenient.

Return strict JSON only.`,

      verifyFrameSystem: (lang: string) =>
        `You verify whether a single frame matches a sub-step description. Answer ONLY based on what is visible in the frame — no outside knowledge.

You receive:
- The sub-step's intent and verb.
- The picker's rationale (one sentence) explaining why this frame was chosen.
- The frame itself (a single full image).

Decide:
- "yes" — the screen, element, and state described in the intent are clearly visible in the frame.
- "partially" — the screen is right but the specific element or state is unclear; OR the element is visible but the surrounding screen context is ambiguous.
- "no" — the frame contradicts the intent: a different screen entirely, non-UI content (webcam, slide, intro animation), blank, or mid-transition.

For verb="view": "yes" requires that the frame shows the screen the trainer is pointing to.

reasoning: one short sentence, in ${lang} when convenient.

Return strict JSON only.`,

      locateHighlightSystem: (lang: string) =>
        `You decide whether to draw a highlight bbox on a sub-step's screenshot, and where.

You receive:
- The sub-step's intent and verb.
- The picked frame (a single full image).

Decision rules:
- If verb is "view": return highlight: "no" with noHighlightReason: "view_action". bbox null, elementCaption null.
- If verb is click/input/select/link:
  - If the frame shows an application UI AND the intent's target element is clearly visible: highlight: "yes" with a tight bbox wrapping the WHOLE interactive element (background + border + padding — NOT just the text inside), normalized 0..1 against the supplied image. elementCaption is a short reusable element name in ${lang} (e.g., "Verify email button", "verification code input").
  - If the frame shows an application UI but you cannot locate the target element: highlight: "no" with noHighlightReason: "no_specific_target". bbox null, elementCaption null.
  - If the frame is NOT an application UI (a webcam, slide, intro graphic, transition mid-flight): highlight: "no" with noHighlightReason: "non_ui_frame". bbox null, elementCaption null.

Coordinates are normalized 0..1 (top-left origin) against the SUPPLIED IMAGE.

Return strict JSON only.`,
```

- [ ] **Step 3.2: Typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3.3: Commit**

```bash
git add src/config/index.ts
git commit -m "feat: prompts for top-down pipeline (planStep, pickFrame, verifyFrame, locateHighlight)"
```

---

## Task 4: Generic `runWithConcurrency` helper

**Files:**
- Create: `src/lib/concurrency.ts`
- Create: `src/lib/concurrency.test.ts`

- [ ] **Step 4.1: Write the failing test**

Create `src/lib/concurrency.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { runWithConcurrency } from "./concurrency";

test("runWithConcurrency returns results in input order", async () => {
  const items = [10, 20, 30, 40, 50];
  const out = await runWithConcurrency(items, 2, async (n) => n * 2);
  assert.deepEqual(out, [20, 40, 60, 80, 100]);
});

test("runWithConcurrency respects the concurrency limit", async () => {
  let inFlight = 0;
  let peak = 0;
  const items = Array.from({ length: 12 }, (_, i) => i);
  await runWithConcurrency(items, 3, async (n) => {
    inFlight++;
    if (inFlight > peak) peak = inFlight;
    await new Promise(r => setTimeout(r, 10));
    inFlight--;
    return n;
  });
  assert.ok(peak <= 3, `peak ${peak} should be <= 3`);
});

test("runWithConcurrency propagates the first error", async () => {
  const items = [1, 2, 3];
  await assert.rejects(
    () => runWithConcurrency(items, 2, async (n) => {
      if (n === 2) throw new Error("boom");
      return n;
    }),
    /boom/,
  );
});

test("runWithConcurrency handles empty input", async () => {
  const out = await runWithConcurrency<number, string>([], 5, async () => "x");
  assert.deepEqual(out, []);
});

test("runWithConcurrency with limit >= items uses min(limit, items.length) workers", async () => {
  const items = [1, 2];
  const out = await runWithConcurrency(items, 100, async (n) => n + 1);
  assert.deepEqual(out, [2, 3]);
});
```

- [ ] **Step 4.2: Run test to verify it fails**

```bash
npx tsx --test src/lib/concurrency.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 4.3: Create the implementation**

Create `src/lib/concurrency.ts`:

```ts
/**
 * Run `fn` over `items` with at most `limit` calls in flight. Results returned
 * in input order. First rejection propagates; subsequent completions are awaited
 * but their results discarded.
 */
export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) return [];
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (true) {
        const i = next++;
        if (i >= items.length) return;
        out[i] = await fn(items[i], i);
      }
    },
  );
  await Promise.all(workers);
  return out;
}
```

- [ ] **Step 4.4: Run tests + typecheck**

```bash
npx tsx --test src/lib/concurrency.test.ts
npx tsc --noEmit
```

Expected: 5/5 tests PASS. Typecheck clean.

- [ ] **Step 4.5: Commit**

```bash
git add src/lib/concurrency.ts src/lib/concurrency.test.ts
git commit -m "feat: generic runWithConcurrency helper"
```

---

## Task 5: ScreenCluster shape change + centroid + new exports

**Files:**
- Modify: `src/trigger/lib/screenId.ts`
- Modify: `src/trigger/lib/screenId.test.ts`

- [ ] **Step 5.1: Update the test file first (TDD)**

Replace the existing tests in `src/trigger/lib/screenId.test.ts` while keeping the existing fixture generator. Replace its full content with:

```ts
import { test } from "node:test";
import assert from "node:assert";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import sharp from "sharp";
import {
  buildScreenClusters,
  clusterFor,
  selectInClusterFrame,
  type DensePoolFrame,
  type ScreenCluster,
} from "./screenId";

async function makeFrame(tmp: string, name: string, blockX: 0 | 1 | 2): Promise<string> {
  const p = path.join(tmp, name);
  const W = 320, H = 200, blockW = 80, blockH = 80;
  const positions = [20, W - blockW - 20, (W - blockW) / 2];
  const left = positions[blockX];
  const top = (H - blockH) / 2;
  const blockSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${blockW}" height="${blockH}">
    <rect width="${blockW}" height="${blockH}" fill="#fff"/>
  </svg>`;
  await sharp({
    create: { width: W, height: H, channels: 3, background: { r: 20, g: 20, b: 20 } },
  })
    .composite([{ input: Buffer.from(blockSvg), top, left }])
    .jpeg()
    .toFile(p);
  return p;
}

test("buildScreenClusters returns members with per-member dHash", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sid-"));
  try {
    const f1 = await makeFrame(tmp, "f1.jpg", 0);
    const f2 = await makeFrame(tmp, "f2.jpg", 0);
    const dense: DensePoolFrame[] = [
      { t: 0.0, localPath: f1 },
      { t: 1.5, localPath: f2 },
    ];
    const clusters = await buildScreenClusters({
      denseFrames: dense, stepStart: 0, stepEnd: 5,
      samplingSec: 1.5, hammingThreshold: 10,
    });
    assert.equal(clusters.length, 1);
    assert.equal(clusters[0].members.length, 2);
    assert.ok(typeof clusters[0].members[0].dHash === "string");
    assert.ok(clusters[0].members[0].frame.localPath === f1);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("buildScreenClusters representative is the centroid (min sum-Hamming)", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sid-"));
  try {
    // Three near-identical frames; centroid rule should pick the most central one.
    const f0 = await makeFrame(tmp, "f0.jpg", 0);
    const f1 = await makeFrame(tmp, "f1.jpg", 0);
    const f2 = await makeFrame(tmp, "f2.jpg", 0);
    const dense: DensePoolFrame[] = [
      { t: 0.0, localPath: f0 },
      { t: 1.5, localPath: f1 },
      { t: 3.0, localPath: f2 },
    ];
    const clusters = await buildScreenClusters({
      denseFrames: dense, stepStart: 0, stepEnd: 5,
      samplingSec: 1.5, hammingThreshold: 10,
    });
    assert.equal(clusters.length, 1);
    // representative.localPath should match one of the input paths (the centroid).
    const memberPaths = clusters[0].members.map(m => m.frame.localPath);
    assert.ok(memberPaths.includes(clusters[0].representative.localPath));
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("buildScreenClusters returns empty when no dense frames in range", async () => {
  const clusters = await buildScreenClusters({
    denseFrames: [], stepStart: 0, stepEnd: 5,
    samplingSec: 1.5, hammingThreshold: 10,
  });
  assert.equal(clusters.length, 0);
});

function fakeCluster(letter: string, members: Array<{ t: number; localPath: string; dHash: string }>): ScreenCluster {
  const times = members.map(m => m.t);
  return {
    letter,
    representative: { t: members[0].t, localPath: members[0].localPath },
    members: members.map(m => ({ frame: { t: m.t, localPath: m.localPath }, dHash: m.dHash })),
    timeSpan: { start: Math.min(...times), end: Math.max(...times) },
    dHash: members[0].dHash,
  };
}

test("clusterFor finds a cluster by letter", () => {
  const clusters: ScreenCluster[] = [
    fakeCluster("A", [{ t: 0, localPath: "/a.jpg", dHash: "aaaa" }]),
    fakeCluster("B", [{ t: 5, localPath: "/b.jpg", dHash: "bbbb" }]),
  ];
  assert.equal(clusterFor("A", clusters)?.letter, "A");
  assert.equal(clusterFor("B", clusters)?.letter, "B");
  assert.equal(clusterFor("Z", clusters), null);
});

test("selectInClusterFrame prefers in-window member, falls back to representative", () => {
  const c = fakeCluster("A", [
    { t: 1, localPath: "/m1.jpg", dHash: "aaaa" },
    { t: 5, localPath: "/m2.jpg", dHash: "aaab" },
    { t: 9, localPath: "/m3.jpg", dHash: "aaac" },
  ]);
  // Window covers m2 only.
  const picked = selectInClusterFrame(c, { start: 4, end: 6 });
  assert.equal(picked.localPath, "/m2.jpg");
});

test("selectInClusterFrame falls back to representative when no member is in window", () => {
  const c = fakeCluster("A", [
    { t: 1, localPath: "/m1.jpg", dHash: "aaaa" },
    { t: 5, localPath: "/m2.jpg", dHash: "aaab" },
  ]);
  // Window is far outside any member.
  const picked = selectInClusterFrame(c, { start: 100, end: 200 });
  // Representative is members[0].localPath (per fakeCluster).
  assert.equal(picked.localPath, c.representative.localPath);
});
```

- [ ] **Step 5.2: Run test to verify it fails**

```bash
npx tsx --test src/trigger/lib/screenId.test.ts
```

Expected: FAIL — `clusterFor`, `selectInClusterFrame` not exported; `members[0].dHash` undefined.

- [ ] **Step 5.3: Update `src/trigger/lib/screenId.ts`**

Replace the entire file content with:

```ts
import sharp from "sharp";
import { hammingDistance } from "./perceptualHash";

export type DensePoolFrame = { t: number; localPath: string };

export type ClusterMember = { frame: DensePoolFrame; dHash: string };

export type ScreenCluster = {
  letter: string;
  representative: DensePoolFrame;   // centroid frame (min sum-Hamming to other members); ties broken by earliest t
  members: ClusterMember[];
  timeSpan: { start: number; end: number };
  dHash: string;                    // the cluster's seed hash (kept for backward compat / debugging)
};

const TOP_MASK_FRAC = 0.06;
const BOTTOM_MASK_FRAC = 0.08;

export async function maskedDHash(imagePath: string): Promise<string> {
  const W = 9;
  const H = 8;
  const { data } = await sharp(imagePath)
    .grayscale()
    .resize(W, H, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const topRowsMasked = Math.round(H * TOP_MASK_FRAC);
  const bottomRowsMasked = Math.round(H * BOTTOM_MASK_FRAC);

  const buf = Buffer.from(data);
  for (let row = 0; row < topRowsMasked; row++) {
    for (let col = 0; col < W; col++) buf[row * W + col] = 128;
  }
  for (let row = H - bottomRowsMasked; row < H; row++) {
    for (let col = 0; col < W; col++) buf[row * W + col] = 128;
  }

  const bits: number[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = buf[row * W + col];
      const right = buf[row * W + col + 1];
      bits.push(left < right ? 1 : 0);
    }
  }
  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    const nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
    hex += nibble.toString(16);
  }
  return hex;
}

function sampleFramesInRange(denseFrames: DensePoolFrame[], start: number, end: number, samplingSec: number): DensePoolFrame[] {
  if (denseFrames.length === 0) return [];
  const sorted = [...denseFrames].sort((a, b) => a.t - b.t);
  const sampled: DensePoolFrame[] = [];
  let nextAnchor = start;
  for (const f of sorted) {
    if (f.t < start || f.t > end) continue;
    if (f.t + 1e-6 >= nextAnchor) {
      sampled.push(f);
      nextAnchor = f.t + samplingSec;
    }
  }
  return sampled;
}

/**
 * Centroid: the member whose dHash has the smallest sum-Hamming distance to all
 * other members. Ties broken by earliest `t`. For a singleton cluster, the lone
 * member is returned.
 */
function chooseCentroid(members: ClusterMember[]): ClusterMember {
  if (members.length === 1) return members[0];
  let bestIdx = 0;
  let bestSum = Infinity;
  for (let i = 0; i < members.length; i++) {
    let sum = 0;
    for (let j = 0; j < members.length; j++) {
      if (i === j) continue;
      sum += hammingDistance(members[i].dHash, members[j].dHash);
    }
    if (sum < bestSum || (sum === bestSum && members[i].frame.t < members[bestIdx].frame.t)) {
      bestSum = sum;
      bestIdx = i;
    }
  }
  return members[bestIdx];
}

export async function buildScreenClusters(args: {
  denseFrames: DensePoolFrame[];
  stepStart: number;
  stepEnd: number;
  samplingSec: number;
  hammingThreshold: number;
}): Promise<ScreenCluster[]> {
  const sampled = sampleFramesInRange(args.denseFrames, args.stepStart, args.stepEnd, args.samplingSec);
  if (sampled.length === 0) return [];

  const hashes: { frame: DensePoolFrame; hash: string }[] = [];
  for (const f of sampled) {
    hashes.push({ frame: f, hash: await maskedDHash(f.localPath) });
  }

  const clusters: { seedHash: string; members: typeof hashes }[] = [];
  for (const h of hashes) {
    let placed = false;
    for (const c of clusters) {
      const close = c.members.some(m => hammingDistance(m.hash, h.hash) <= args.hammingThreshold);
      if (close) {
        c.members.push(h);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push({ seedHash: h.hash, members: [h] });
  }

  // Stable letter assignment by earliest member time.
  clusters.sort((a, b) => a.members[0].frame.t - b.members[0].frame.t);

  return clusters.map((c, i) => {
    const members: ClusterMember[] = c.members.map(m => ({ frame: m.frame, dHash: m.hash }));
    const times = members.map(m => m.frame.t);
    const centroid = chooseCentroid(members);
    return {
      letter: String.fromCharCode("A".charCodeAt(0) + i),
      representative: centroid.frame,
      members,
      timeSpan: { start: Math.min(...times), end: Math.max(...times) },
      dHash: c.seedHash,
    };
  });
}

export function clusterFor(letter: string | null, clusters: ScreenCluster[]): ScreenCluster | null {
  if (!letter) return null;
  return clusters.find(c => c.letter === letter) ?? null;
}

/**
 * Pick a specific member from a cluster for a given search window.
 * Rule: among members whose t falls inside [window.start, window.end], return
 * the one whose dHash is closest (smallest Hamming) to the cluster's
 * representative dHash. If no member is in-window, fall back to the cluster's
 * representative.
 */
export function selectInClusterFrame(
  cluster: ScreenCluster,
  window: { start: number; end: number },
): DensePoolFrame {
  const inWindow = cluster.members.filter(m => m.frame.t >= window.start && m.frame.t <= window.end);
  if (inWindow.length === 0) return cluster.representative;
  // Find the rep dHash from cluster.members.
  const repMember = cluster.members.find(m => m.frame.localPath === cluster.representative.localPath) ?? cluster.members[0];
  let best = inWindow[0];
  let bestDist = hammingDistance(best.dHash, repMember.dHash);
  for (let i = 1; i < inWindow.length; i++) {
    const d = hammingDistance(inWindow[i].dHash, repMember.dHash);
    if (d < bestDist) { best = inWindow[i]; bestDist = d; }
  }
  return best.frame;
}
```

- [ ] **Step 5.4: Run tests + typecheck**

```bash
npx tsx --test src/trigger/lib/screenId.test.ts
npx tsc --noEmit
```

Expected: 7/7 tests PASS. Typecheck **may fail** if old consumers reference `cluster.members[0]` expecting `DensePoolFrame` shape. Fix any failures in deletion-target files by passing the shape through — but since those files are being deleted in Task 14, accept temporary breakage by making the typecheck a soft check here. Run:

```bash
npx tsc --noEmit 2>&1 | grep -v "classifyStepWithLLM\|buildActionsForStep\|extractClickEvents\|classifyAndMergeEvents\|clickEventDetect" | tail -10
```

Expected: no errors outside the to-be-deleted files. If errors exist outside that set, fix them (the only likely caller is `processSopScreenshots.ts`, which is rewritten in Task 13).

- [ ] **Step 5.5: Commit**

```bash
git add src/trigger/lib/screenId.ts src/trigger/lib/screenId.test.ts
git commit -m "feat: ScreenCluster.members carries per-member dHash; centroid representative; clusterFor/selectInClusterFrame"
```

---

## Task 6: `assembleStepNarration` + `silentStepFallback`

**Files:**
- Create: `src/trigger/lib/narration.ts`
- Create: `src/trigger/lib/narration.test.ts`

- [ ] **Step 6.1: Write the failing test**

Create `src/trigger/lib/narration.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { assembleStepNarration, silentStepFallback } from "./narration";
import type { Segment, CleanSegment } from "@/lib/mongo";
import type { ScreenCluster } from "@/trigger/lib/screenId";

const segments: Segment[] = [
  { id: 0, start: 0.0, end: 2.0, text: "hello uh raw" },
  { id: 1, start: 2.0, end: 4.5, text: "raw two" },
  { id: 2, start: 4.5, end: 7.0, text: "raw three" },
];

const segmentsClean: CleanSegment[] = [
  { id: 0, text: "Hello" },
  { id: 1, text: "Cleaned two" },
  { id: 2, text: "Cleaned three" },
];

test("assembleStepNarration joins segments and segmentsClean by id within step range", () => {
  const step = { startSegmentId: 0, endSegmentId: 1 };
  const out = assembleStepNarration(step, segments, segmentsClean);
  assert.equal(out.length, 2);
  assert.equal(out[0].id, 0);
  assert.equal(out[0].text, "Hello");
  assert.equal(out[0].start, 0.0);
  assert.equal(out[0].end, 2.0);
  assert.equal(out[1].text, "Cleaned two");
});

test("assembleStepNarration falls back to segments[].text when segmentsClean is null", () => {
  const step = { startSegmentId: 0, endSegmentId: 0 };
  const out = assembleStepNarration(step, segments, null);
  assert.equal(out.length, 1);
  assert.equal(out[0].text, "hello uh raw");
});

test("assembleStepNarration returns empty when no segments match", () => {
  const step = { startSegmentId: 99, endSegmentId: 100 };
  const out = assembleStepNarration(step, segments, segmentsClean);
  assert.deepEqual(out, []);
});

test("assembleStepNarration falls back per-segment when segmentsClean is missing one id", () => {
  const step = { startSegmentId: 0, endSegmentId: 2 };
  const partial = [{ id: 0, text: "Hello" }, { id: 2, text: "Cleaned three" }];
  const out = assembleStepNarration(step, segments, partial);
  assert.equal(out.length, 3);
  assert.equal(out[0].text, "Hello");
  assert.equal(out[1].text, "raw two");      // raw fallback
  assert.equal(out[2].text, "Cleaned three");
});

function fakeCluster(letter: string, start: number, end: number, repPath = "/rep.jpg"): ScreenCluster {
  return {
    letter,
    representative: { t: (start + end) / 2, localPath: repPath },
    members: [
      { frame: { t: start, localPath: repPath }, dHash: "0".repeat(16) },
      { frame: { t: end, localPath: repPath }, dHash: "0".repeat(16) },
    ],
    timeSpan: { start, end },
    dHash: "0".repeat(16),
  };
}

test("silentStepFallback emits one view sub-step per long-enough cluster", () => {
  const clusters: ScreenCluster[] = [
    fakeCluster("A", 0, 2),    // span 2s — too short
    fakeCluster("B", 5, 12),   // span 7s — long enough
    fakeCluster("C", 20, 28),  // span 8s — long enough
  ];
  const plan = silentStepFallback(clusters, { stepIndex: 3 }, 4.0, "en");
  assert.equal(plan.subSteps.length, 2);
  assert.equal(plan.subSteps[0].verb, "view");
  assert.equal(plan.subSteps[0].timeWindow?.start, 5);
  assert.equal(plan.subSteps[1].timeWindow?.start, 20);
});

test("silentStepFallback uses Vietnamese caption for vi", () => {
  const clusters = [fakeCluster("A", 0, 10)];
  const plan = silentStepFallback(clusters, { stepIndex: 0 }, 4.0, "vi");
  assert.ok(plan.subSteps[0].intent.includes("màn hình"));
});

test("silentStepFallback emits no sub-steps when no cluster exceeds threshold", () => {
  const clusters = [fakeCluster("A", 0, 2)];
  const plan = silentStepFallback(clusters, { stepIndex: 0 }, 4.0, "en");
  assert.equal(plan.subSteps.length, 0);
});
```

- [ ] **Step 6.2: Run test to verify it fails**

```bash
npx tsx --test src/trigger/lib/narration.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 6.3: Create `src/trigger/lib/narration.ts`**

```ts
import type { Segment, CleanSegment } from "@/lib/mongo";
import type { ScreenCluster } from "@/trigger/lib/screenId";
import type { z } from "zod";
import type { StepPlan } from "@/lib/schemas";

export type NarrationSegment = { id: number; start: number; end: number; text: string };

const VIEW_CAPTION: Record<string, string> = {
  en: "Review this screen before continuing.",
  vi: "Hãy xem màn hình này trước khi tiếp tục.",
};

function viewCaption(lang: string): string {
  const c = VIEW_CAPTION[lang];
  if (c) return c;
  // Unknown language — fall back to English. Caller may want to log this; we
  // don't pull logger in here to keep the module pure.
  return VIEW_CAPTION.en;
}

export function hasLocalizedViewCaption(lang: string): boolean {
  return VIEW_CAPTION[lang] !== undefined;
}

/**
 * Join `segments[]` (source of start/end and raw text) with `segmentsClean[]` (source of
 * cleaned text) by `id`, filtered to [step.startSegmentId, step.endSegmentId]. When
 * `segmentsClean` is null, OR a particular id is missing from segmentsClean, fall back
 * to `segments[].text`.
 */
export function assembleStepNarration(
  step: { startSegmentId: number; endSegmentId: number },
  segments: Segment[],
  segmentsClean: CleanSegment[] | null,
): NarrationSegment[] {
  const cleanById = new Map<number, string>();
  if (segmentsClean) {
    for (const c of segmentsClean) cleanById.set(c.id, c.text);
  }
  const out: NarrationSegment[] = [];
  for (const s of segments) {
    if (s.id < step.startSegmentId || s.id > step.endSegmentId) continue;
    out.push({
      id: s.id,
      start: s.start,
      end: s.end,
      text: cleanById.get(s.id) ?? s.text,
    });
  }
  return out;
}

/**
 * Emit one `verb: "view"` sub-step per pHash cluster whose timeSpan exceeds the
 * threshold. Used when a step has zero narration segments — we still want to
 * show the reader the screens visible in that step.
 */
export function silentStepFallback(
  clusters: ScreenCluster[],
  _step: { stepIndex: number },
  viewMinDurationSec: number,
  language: string,
): z.infer<typeof StepPlan> {
  const caption = viewCaption(language);
  const subSteps = clusters
    .filter(c => (c.timeSpan.end - c.timeSpan.start) >= viewMinDurationSec)
    .map(c => ({
      intent: caption,
      verb: "view" as const,
      narrationSegmentIds: [],
      timeWindow: { start: c.timeSpan.start, end: c.timeSpan.end },
      visualConfidence: "high" as const,
    }));
  return { subSteps };
}
```

- [ ] **Step 6.4: Run tests + typecheck**

```bash
npx tsx --test src/trigger/lib/narration.test.ts
npx tsc --noEmit
```

Expected: 7/7 tests PASS. Typecheck clean (modulo to-be-deleted files; filter as in Task 5).

- [ ] **Step 6.5: Commit**

```bash
git add src/trigger/lib/narration.ts src/trigger/lib/narration.test.ts
git commit -m "feat: assembleStepNarration + silentStepFallback utilities"
```

---

## Task 7: `planStep` — Phase 1

**Files:**
- Create: `src/trigger/stages/planStep.ts`
- Create: `src/trigger/stages/planStep.test.ts`

- [ ] **Step 7.1: Write the failing test**

Create `src/trigger/stages/planStep.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { runPlanStep, validateAndFilter, type PlannerFn } from "./planStep";
import type { NarrationSegment } from "@/trigger/lib/narration";
import type { ScreenCluster } from "@/trigger/lib/screenId";

const narration: NarrationSegment[] = [
  { id: 0, start: 0, end: 2, text: "Click sign up." },
  { id: 1, start: 2, end: 4, text: "Enter your email." },
];

function fakeCluster(letter: string): ScreenCluster {
  return {
    letter,
    representative: { t: 1, localPath: "/x.jpg" },
    members: [{ frame: { t: 1, localPath: "/x.jpg" }, dHash: "0".repeat(16) }],
    timeSpan: { start: 0, end: 4 },
    dHash: "0".repeat(16),
  };
}

test("runPlanStep returns subSteps from the injected planner", async () => {
  const planner: PlannerFn = async () => ({
    subSteps: [
      { intent: "Click sign up.", verb: "click", narrationSegmentIds: [0], timeWindow: null, visualConfidence: "high" },
      { intent: "Enter your email.", verb: "input", narrationSegmentIds: [1], timeWindow: null, visualConfidence: "high" },
    ],
  });
  const out = await runPlanStep({
    stepIndex: 0,
    stepTitle: "Sign up",
    stepDescription: "User signs up",
    narration,
    clusters: [fakeCluster("A")],
    language: "en",
    planner,
  });
  assert.equal(out.subSteps.length, 2);
});

test("validateAndFilter drops sub-steps with visualConfidence: low", () => {
  const out = validateAndFilter(
    {
      subSteps: [
        { intent: "ok", verb: "click", narrationSegmentIds: [0], timeWindow: null, visualConfidence: "high" },
        { intent: "skip", verb: "click", narrationSegmentIds: [1], timeWindow: null, visualConfidence: "low" },
      ],
    },
    new Set([0, 1]),
  );
  assert.equal(out.subSteps.length, 1);
  assert.equal(out.subSteps[0].intent, "ok");
});

test("validateAndFilter filters out-of-range narrationSegmentIds but keeps the sub-step", () => {
  const out = validateAndFilter(
    {
      subSteps: [
        { intent: "ok", verb: "click", narrationSegmentIds: [0, 99, 1], timeWindow: null, visualConfidence: "high" },
      ],
    },
    new Set([0, 1]),
  );
  assert.equal(out.subSteps.length, 1);
  assert.deepEqual(out.subSteps[0].narrationSegmentIds, [0, 1]);
});

test("validateAndFilter drops sub-step when filtered ids are empty AND timeWindow is null", () => {
  const out = validateAndFilter(
    {
      subSteps: [
        { intent: "bad", verb: "click", narrationSegmentIds: [99], timeWindow: null, visualConfidence: "high" },
      ],
    },
    new Set([0, 1]),
  );
  assert.equal(out.subSteps.length, 0);
});

test("validateAndFilter keeps sub-step when ids become empty but timeWindow is set", () => {
  const out = validateAndFilter(
    {
      subSteps: [
        { intent: "anchor by time", verb: "view", narrationSegmentIds: [99], timeWindow: { start: 1, end: 5 }, visualConfidence: "high" },
      ],
    },
    new Set([0, 1]),
  );
  assert.equal(out.subSteps.length, 1);
  assert.deepEqual(out.subSteps[0].narrationSegmentIds, []);
});

test("runPlanStep retries once when planner returns 0 sub-steps and narration is non-empty", async () => {
  let calls = 0;
  const planner: PlannerFn = async () => {
    calls++;
    if (calls === 1) return { subSteps: [] };
    return {
      subSteps: [
        { intent: "Click sign up.", verb: "click", narrationSegmentIds: [0], timeWindow: null, visualConfidence: "high" },
      ],
    };
  };
  const out = await runPlanStep({
    stepIndex: 0,
    stepTitle: "Sign up",
    stepDescription: "",
    narration,
    clusters: [fakeCluster("A")],
    language: "en",
    planner,
  });
  assert.equal(calls, 2);
  assert.equal(out.subSteps.length, 1);
});
```

- [ ] **Step 7.2: Run test to verify it fails**

```bash
npx tsx --test src/trigger/stages/planStep.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 7.3: Create `src/trigger/stages/planStep.ts`**

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { logger } from "@trigger.dev/sdk/v3";
import type { z } from "zod";
import { llmJsonVision } from "@/lib/openrouter";
import { StepPlan } from "@/lib/schemas";
import { config } from "@/config";
import type { NarrationSegment } from "@/trigger/lib/narration";
import type { ScreenCluster } from "@/trigger/lib/screenId";

export type PlannerFn = (args: {
  stepIndex: number;
  stepTitle: string;
  stepDescription: string;
  narration: NarrationSegment[];
  montagePath: string | null;
  language: string;
  isRepair: boolean;
}) => Promise<z.infer<typeof StepPlan>>;

export type PlanStepArgs = {
  stepIndex: number;
  stepTitle: string;
  stepDescription: string;
  narration: NarrationSegment[];
  clusters: ScreenCluster[];
  language: string;
  planner?: PlannerFn;
};

const TILE_W = 640;
const TILE_H = 360;
const LABEL_H = 36;

async function buildMontage(clusters: ScreenCluster[], outDir: string): Promise<string | null> {
  if (clusters.length === 0) return null;
  const tiles: Buffer[] = [];
  for (const c of clusters) {
    const labelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_W}" height="${LABEL_H}">
      <rect width="${TILE_W}" height="${LABEL_H}" fill="#222"/>
      <text x="12" y="26" fill="#fff" font-family="sans-serif" font-size="22" font-weight="700">${c.letter}</text>
    </svg>`;
    const imgBuf = await sharp(c.representative.localPath)
      .resize({ width: TILE_W, height: TILE_H - LABEL_H, fit: "inside", withoutEnlargement: true })
      .toBuffer();
    const tile = await sharp({
      create: { width: TILE_W, height: TILE_H, channels: 3, background: "#000" },
    })
      .composite([
        { input: Buffer.from(labelSvg), top: 0, left: 0 },
        { input: imgBuf, top: LABEL_H, left: 0 },
      ])
      .jpeg({ quality: 85 })
      .toBuffer();
    tiles.push(tile);
  }
  const outPath = path.join(outDir, "montage.jpg");
  const composites = tiles.map((buf, i) => ({ input: buf, top: 0, left: i * TILE_W }));
  await sharp({
    create: { width: TILE_W * tiles.length, height: TILE_H, channels: 3, background: "#000" },
  })
    .composite(composites)
    .jpeg({ quality: 85 })
    .toFile(outPath);
  return outPath;
}

async function defaultPlanner(args: {
  stepIndex: number;
  stepTitle: string;
  stepDescription: string;
  narration: NarrationSegment[];
  montagePath: string | null;
  language: string;
  isRepair: boolean;
}): Promise<z.infer<typeof StepPlan>> {
  const userLines = [
    `Step title: ${args.stepTitle}`,
    `Step description: ${args.stepDescription}`,
    `Narration segments (id | start-end | text):`,
    ...args.narration.map(s => `- ${s.id} | ${s.start.toFixed(2)}-${s.end.toFixed(2)} | ${s.text}`),
    args.montagePath ? `\nMontage attached; letters in left-to-right order.` : `\nNo screen montage available.`,
    args.isRepair ? `\nYour previous attempt returned 0 sub-steps. Re-segment using the narration above; aim for one sub-step per discrete action the trainer asks the reader to take.` : ``,
  ];
  const userText = userLines.join("\n");
  const imagePaths: string[] = args.montagePath ? [args.montagePath] : [];

  return llmJsonVision({
    model: config.ai.visionModel,
    system: config.ai.prompts.planStepSystem(args.language),
    userText,
    imagePaths,
    schema: StepPlan,
    schemaName: "step_plan",
    temperature: 0.0,
  });
}

export function validateAndFilter(
  plan: z.infer<typeof StepPlan>,
  validIds: Set<number>,
  ctx: { stepIndex?: number; log?: (event: string, attrs: Record<string, unknown>) => void } = {},
): z.infer<typeof StepPlan> {
  const log = ctx.log ?? ((_event, _attrs) => {});
  const stepIndex = ctx.stepIndex;
  const out: z.infer<typeof StepPlan>["subSteps"] = [];
  for (const s of plan.subSteps) {
    if (s.visualConfidence === "low") {
      log("pipeline.plan.low_confidence_dropped", { stepIndex, intent: s.intent });
      continue;
    }
    const filteredIds = s.narrationSegmentIds.filter(id => validIds.has(id));
    if (filteredIds.length !== s.narrationSegmentIds.length) {
      log("pipeline.plan.filtered_invalid_ids", {
        stepIndex,
        intent: s.intent,
        droppedIds: s.narrationSegmentIds.filter(id => !validIds.has(id)),
      });
    }
    const next = { ...s, narrationSegmentIds: filteredIds };
    if (next.narrationSegmentIds.length === 0 && next.timeWindow === null) {
      log("pipeline.plan.no_temporal_anchor", { stepIndex, intent: next.intent });
      continue;
    }
    out.push(next);
  }
  return { subSteps: out };
}

export async function runPlanStep(args: PlanStepArgs): Promise<z.infer<typeof StepPlan>> {
  const planner = args.planner ?? defaultPlanner;
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "plan-"));
  try {
    const montagePath = await buildMontage(args.clusters, tmpDir);
    const validIds = new Set(args.narration.map(n => n.id));

    let raw = await planner({
      stepIndex: args.stepIndex,
      stepTitle: args.stepTitle,
      stepDescription: args.stepDescription,
      narration: args.narration,
      montagePath,
      language: args.language,
      isRepair: false,
    });
    const log = (event: string, attrs: Record<string, unknown>) => logger.info(event, attrs);
    let plan = validateAndFilter(raw, validIds, { stepIndex: args.stepIndex, log });

    if (plan.subSteps.length === 0 && args.narration.length > 0) {
      logger.warn("pipeline.plan.empty", { stepIndex: args.stepIndex });
      raw = await planner({
        stepIndex: args.stepIndex,
        stepTitle: args.stepTitle,
        stepDescription: args.stepDescription,
        narration: args.narration,
        montagePath,
        language: args.language,
        isRepair: true,
      });
      plan = validateAndFilter(raw, validIds);
      if (plan.subSteps.length === 0) {
        logger.error("pipeline.plan.empty_after_repair", { stepIndex: args.stepIndex });
      }
    }

    logger.info("pipeline.plan.done", {
      stepIndex: args.stepIndex,
      subStepCount: plan.subSteps.length,
    });
    return plan;
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}
```

- [ ] **Step 7.4: Run tests + typecheck**

```bash
npx tsx --test src/trigger/stages/planStep.test.ts
npx tsc --noEmit 2>&1 | grep -v "classifyStepWithLLM\|buildActionsForStep\|extractClickEvents\|classifyAndMergeEvents\|clickEventDetect" | tail -10
```

Expected: 6/6 tests PASS. No new typecheck errors outside the to-be-deleted files.

- [ ] **Step 7.5: Commit**

```bash
git add src/trigger/stages/planStep.ts src/trigger/stages/planStep.test.ts
git commit -m "feat: planStep — Phase 1 of top-down pipeline"
```

---

## Task 8: `pickFrame` — Phase 2a

**Files:**
- Create: `src/trigger/stages/pickFrame.ts`
- Create: `src/trigger/stages/pickFrame.test.ts`

- [ ] **Step 8.1: Write the failing test**

Create `src/trigger/stages/pickFrame.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { computeSearchWindow, shortlistClusters, sanitizePick } from "./pickFrame";
import type { ScreenCluster } from "@/trigger/lib/screenId";

function fakeCluster(letter: string, start: number, end: number): ScreenCluster {
  return {
    letter,
    representative: { t: (start + end) / 2, localPath: `/${letter}.jpg` },
    members: [
      { frame: { t: start, localPath: `/${letter}.jpg` }, dHash: "0".repeat(16) },
      { frame: { t: end, localPath: `/${letter}.jpg` }, dHash: "0".repeat(16) },
    ],
    timeSpan: { start, end },
    dHash: "0".repeat(16),
  };
}

const narration = [
  { id: 0, start: 10, end: 12, text: "a" },
  { id: 1, start: 12, end: 15, text: "b" },
];

test("computeSearchWindow uses narration segment IDs when present", () => {
  const w = computeSearchWindow(
    { narrationSegmentIds: [0, 1], timeWindow: null },
    narration,
    { tStart: 0, tEnd: 100 },
  );
  assert.equal(w.start, 9);  // min start (10) - 1
  assert.equal(w.end, 18);   // max end (15) + 3
});

test("computeSearchWindow falls back to timeWindow when ids are empty", () => {
  const w = computeSearchWindow(
    { narrationSegmentIds: [], timeWindow: { start: 20, end: 30 } },
    narration,
    { tStart: 0, tEnd: 100 },
  );
  assert.equal(w.start, 20);
  assert.equal(w.end, 33);  // +3s buffer
});

test("shortlistClusters keeps clusters overlapping the window, up to cap, by longest in-window dwell", () => {
  const clusters: ScreenCluster[] = [
    fakeCluster("A", 0, 5),    // outside (0-5 vs 10-18)
    fakeCluster("B", 8, 12),   // overlap 10-12 = 2s
    fakeCluster("C", 14, 17),  // overlap 14-17 = 3s
    fakeCluster("D", 11, 16),  // overlap 11-16 = 5s
  ];
  const out = shortlistClusters(clusters, { start: 10, end: 18 }, 3);
  assert.equal(out.length, 3);
  // Sorted by in-window dwell descending: D (5), C (3), B (2). But function may
  // return in cluster order; just assert membership.
  const letters = new Set(out.map(c => c.letter));
  assert.ok(letters.has("D"));
  assert.ok(letters.has("C"));
  assert.ok(letters.has("B"));
  assert.ok(!letters.has("A"));
});

test("shortlistClusters honors cap", () => {
  const clusters: ScreenCluster[] = [
    fakeCluster("A", 0, 100),
    fakeCluster("B", 0, 100),
    fakeCluster("C", 0, 100),
    fakeCluster("D", 0, 100),
    fakeCluster("E", 0, 100),
    fakeCluster("F", 0, 100),
    fakeCluster("G", 0, 100),
  ];
  const out = shortlistClusters(clusters, { start: 0, end: 100 }, 6);
  assert.equal(out.length, 6);
});

test("sanitizePick coerces invalid letter to null", () => {
  const validLetters = new Set(["A", "B"]);
  const out = sanitizePick({ picked: "Z", runnerUp: "A", reasoning: "x" }, validLetters);
  assert.equal(out.picked, null);
  // runnerUp also coerced when picked is null
  assert.equal(out.runnerUp, null);
});

test("sanitizePick coerces runnerUp to null when equal to picked", () => {
  const validLetters = new Set(["A", "B"]);
  const out = sanitizePick({ picked: "A", runnerUp: "A", reasoning: "x" }, validLetters);
  assert.equal(out.picked, "A");
  assert.equal(out.runnerUp, null);
});

test("sanitizePick keeps valid distinct letters", () => {
  const validLetters = new Set(["A", "B"]);
  const out = sanitizePick({ picked: "A", runnerUp: "B", reasoning: "x" }, validLetters);
  assert.equal(out.picked, "A");
  assert.equal(out.runnerUp, "B");
});
```

- [ ] **Step 8.2: Run test to verify it fails**

```bash
npx tsx --test src/trigger/stages/pickFrame.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 8.3: Create `src/trigger/stages/pickFrame.ts`**

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { logger } from "@trigger.dev/sdk/v3";
import type { z } from "zod";
import { llmJsonVision } from "@/lib/openrouter";
import { FramePick, SubStepPlan } from "@/lib/schemas";
import { config } from "@/config";
import type { NarrationSegment } from "@/trigger/lib/narration";
import type { ScreenCluster } from "@/trigger/lib/screenId";

type SubStep = z.infer<typeof SubStepPlan>;

export type PickerFn = (args: {
  intent: string;
  verb: SubStep["verb"];
  montagePath: string;
  validLetters: string[];
  language: string;
}) => Promise<z.infer<typeof FramePick>>;

const TILE_W = 640;
const TILE_H = 360;
const LABEL_H = 36;

export function computeSearchWindow(
  subStep: { narrationSegmentIds: number[]; timeWindow: { start: number; end: number } | null },
  narration: NarrationSegment[],
  step: { tStart: number; tEnd: number },
): { start: number; end: number } {
  if (subStep.narrationSegmentIds.length > 0) {
    const refs = narration.filter(n => subStep.narrationSegmentIds.includes(n.id));
    if (refs.length > 0) {
      const start = Math.min(...refs.map(n => n.start)) - 1;
      const end = Math.max(...refs.map(n => n.end)) + 3;
      return { start, end };
    }
  }
  if (subStep.timeWindow) {
    return { start: subStep.timeWindow.start, end: subStep.timeWindow.end + 3 };
  }
  return { start: step.tStart, end: step.tEnd };
}

function inWindowDwell(cluster: ScreenCluster, window: { start: number; end: number }): number {
  return Math.max(
    0,
    Math.min(cluster.timeSpan.end, window.end) - Math.max(cluster.timeSpan.start, window.start),
  );
}

export function shortlistClusters(
  clusters: ScreenCluster[],
  window: { start: number; end: number },
  cap: number,
): ScreenCluster[] {
  const overlapping = clusters
    .map(c => ({ c, dwell: inWindowDwell(c, window) }))
    .filter(x => x.dwell > 0)
    .sort((a, b) => b.dwell - a.dwell);
  return overlapping.slice(0, cap).map(x => x.c);
}

async function buildMontage(clusters: ScreenCluster[], outDir: string): Promise<string> {
  const tiles: Buffer[] = [];
  for (const c of clusters) {
    const labelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_W}" height="${LABEL_H}">
      <rect width="${TILE_W}" height="${LABEL_H}" fill="#222"/>
      <text x="12" y="26" fill="#fff" font-family="sans-serif" font-size="22" font-weight="700">${c.letter}</text>
    </svg>`;
    const imgBuf = await sharp(c.representative.localPath)
      .resize({ width: TILE_W, height: TILE_H - LABEL_H, fit: "inside", withoutEnlargement: true })
      .toBuffer();
    const tile = await sharp({
      create: { width: TILE_W, height: TILE_H, channels: 3, background: "#000" },
    })
      .composite([
        { input: Buffer.from(labelSvg), top: 0, left: 0 },
        { input: imgBuf, top: LABEL_H, left: 0 },
      ])
      .jpeg({ quality: 85 })
      .toBuffer();
    tiles.push(tile);
  }
  const outPath = path.join(outDir, "shortlist.jpg");
  const composites = tiles.map((buf, i) => ({ input: buf, top: 0, left: i * TILE_W }));
  await sharp({
    create: { width: TILE_W * tiles.length, height: TILE_H, channels: 3, background: "#000" },
  })
    .composite(composites)
    .jpeg({ quality: 85 })
    .toFile(outPath);
  return outPath;
}

export function sanitizePick(
  pick: z.infer<typeof FramePick>,
  validLetters: Set<string>,
): z.infer<typeof FramePick> {
  let picked: string | null = pick.picked;
  let runnerUp: string | null = pick.runnerUp;
  if (picked && !validLetters.has(picked)) picked = null;
  if (runnerUp && !validLetters.has(runnerUp)) runnerUp = null;
  if (picked === null) runnerUp = null;
  if (runnerUp && runnerUp === picked) runnerUp = null;
  return { picked, runnerUp, reasoning: pick.reasoning };
}

async function defaultPicker(args: {
  intent: string;
  verb: SubStep["verb"];
  montagePath: string;
  validLetters: string[];
  language: string;
}): Promise<z.infer<typeof FramePick>> {
  const userText = [
    `Intent: ${args.intent}`,
    `Verb: ${args.verb}`,
    `Candidate letters: ${args.validLetters.join(", ")}`,
  ].join("\n");
  return llmJsonVision({
    model: config.ai.visionModel,
    system: config.ai.prompts.pickFrameSystem(args.language),
    userText,
    imagePaths: [args.montagePath],
    schema: FramePick,
    schemaName: "frame_pick",
    temperature: 0.0,
  });
}

export async function runPickFrame(args: {
  subStep: SubStep;
  narration: NarrationSegment[];
  step: { stepIndex: number; tStart: number; tEnd: number };
  clusters: ScreenCluster[];
  language: string;
  picker?: PickerFn;
}): Promise<{ pick: z.infer<typeof FramePick>; shortlist: ScreenCluster[] }> {
  const picker = args.picker ?? defaultPicker;
  const cap = config.screenshots.screenId.maxMontageClusters;
  const window = computeSearchWindow(args.subStep, args.narration, args.step);
  const shortlist = shortlistClusters(args.clusters, window, cap);
  if (shortlist.length === 0) {
    logger.info("pipeline.pick.empty_shortlist", { stepIndex: args.step.stepIndex, intent: args.subStep.intent });
    return { pick: { picked: null, runnerUp: null, reasoning: "no candidate clusters overlap the search window" }, shortlist: [] };
  }

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pick-"));
  try {
    const montagePath = await buildMontage(shortlist, tmpDir);
    const raw = await picker({
      intent: args.subStep.intent,
      verb: args.subStep.verb,
      montagePath,
      validLetters: shortlist.map(c => c.letter),
      language: args.language,
    });
    const validLetters = new Set(shortlist.map(c => c.letter));
    const pick = sanitizePick(raw, validLetters);
    if (raw.picked && pick.picked === null) {
      logger.warn("pipeline.pick.invalid_letter", {
        stepIndex: args.step.stepIndex,
        intent: args.subStep.intent,
        rawPicked: raw.picked,
        valid: [...validLetters],
      });
    }
    if (pick.picked === null) {
      logger.info("pipeline.pick.no_match", {
        stepIndex: args.step.stepIndex,
        intent: args.subStep.intent,
        reasoning: pick.reasoning,
      });
    }
    return { pick, shortlist };
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}
```

- [ ] **Step 8.4: Run tests + typecheck**

```bash
npx tsx --test src/trigger/stages/pickFrame.test.ts
npx tsc --noEmit 2>&1 | grep -v "classifyStepWithLLM\|buildActionsForStep\|extractClickEvents\|classifyAndMergeEvents\|clickEventDetect" | tail -10
```

Expected: 7/7 tests PASS.

- [ ] **Step 8.5: Commit**

```bash
git add src/trigger/stages/pickFrame.ts src/trigger/stages/pickFrame.test.ts
git commit -m "feat: pickFrame — Phase 2a frame selection with sanitization"
```

---

## Task 9: `verifyFrame` — Phase 2b

**Files:**
- Create: `src/trigger/stages/verifyFrame.ts`
- Create: `src/trigger/stages/verifyFrame.test.ts`

- [ ] **Step 9.1: Write the failing test**

Create `src/trigger/stages/verifyFrame.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { runVerifyWithFallback, type VerifierFn } from "./verifyFrame";

const intent = "Click the Sign up button.";
const reasoning = "frame B shows a Sign up button";

test("runVerifyWithFallback returns yes on first call", async () => {
  let calls = 0;
  const verifier: VerifierFn = async () => {
    calls++;
    return { match: "yes", reasoning: "matches" };
  };
  const out = await runVerifyWithFallback({
    intent,
    verb: "click",
    pickedFramePath: "/picked.jpg",
    runnerUpFramePath: "/runner.jpg",
    pickerReasoning: reasoning,
    language: "en",
    verifier,
  });
  assert.equal(out.verify.match, "yes");
  assert.equal(out.finalFramePath, "/picked.jpg");
  assert.equal(calls, 1);
});

test("runVerifyWithFallback returns partially without retry", async () => {
  let calls = 0;
  const verifier: VerifierFn = async () => {
    calls++;
    return { match: "partially", reasoning: "screen right, element unclear" };
  };
  const out = await runVerifyWithFallback({
    intent,
    verb: "click",
    pickedFramePath: "/picked.jpg",
    runnerUpFramePath: "/runner.jpg",
    pickerReasoning: reasoning,
    language: "en",
    verifier,
  });
  assert.equal(out.verify.match, "partially");
  assert.equal(out.finalFramePath, "/picked.jpg");
  assert.equal(calls, 1);
});

test("runVerifyWithFallback retries runner-up on no", async () => {
  let calls = 0;
  const calledWith: string[] = [];
  const verifier: VerifierFn = async ({ framePath }) => {
    calls++;
    calledWith.push(framePath);
    if (framePath === "/picked.jpg") return { match: "no", reasoning: "wrong screen" };
    return { match: "yes", reasoning: "runner-up matches" };
  };
  const out = await runVerifyWithFallback({
    intent,
    verb: "click",
    pickedFramePath: "/picked.jpg",
    runnerUpFramePath: "/runner.jpg",
    pickerReasoning: reasoning,
    language: "en",
    verifier,
  });
  assert.equal(out.verify.match, "yes");
  assert.equal(out.finalFramePath, "/runner.jpg");
  assert.equal(calls, 2);
  assert.deepEqual(calledWith, ["/picked.jpg", "/runner.jpg"]);
});

test("runVerifyWithFallback returns no with null finalFramePath when no runner-up and verify says no", async () => {
  const verifier: VerifierFn = async () => ({ match: "no", reasoning: "wrong" });
  const out = await runVerifyWithFallback({
    intent,
    verb: "click",
    pickedFramePath: "/picked.jpg",
    runnerUpFramePath: null,
    pickerReasoning: reasoning,
    language: "en",
    verifier,
  });
  assert.equal(out.verify.match, "no");
  assert.equal(out.finalFramePath, null);
});

test("runVerifyWithFallback returns no when runner-up also fails", async () => {
  const verifier: VerifierFn = async () => ({ match: "no", reasoning: "wrong" });
  const out = await runVerifyWithFallback({
    intent,
    verb: "click",
    pickedFramePath: "/picked.jpg",
    runnerUpFramePath: "/runner.jpg",
    pickerReasoning: reasoning,
    language: "en",
    verifier,
  });
  assert.equal(out.verify.match, "no");
  assert.equal(out.finalFramePath, null);
});

test("verifier receives pickerReasoning in arguments", async () => {
  let captured: string | undefined;
  const verifier: VerifierFn = async (args) => {
    captured = args.pickerReasoning;
    return { match: "yes", reasoning: "ok" };
  };
  await runVerifyWithFallback({
    intent,
    verb: "click",
    pickedFramePath: "/picked.jpg",
    runnerUpFramePath: null,
    pickerReasoning: "the rationale",
    language: "en",
    verifier,
  });
  assert.equal(captured, "the rationale");
});
```

- [ ] **Step 9.2: Run test to verify it fails**

```bash
npx tsx --test src/trigger/stages/verifyFrame.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 9.3: Create `src/trigger/stages/verifyFrame.ts`**

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { logger } from "@trigger.dev/sdk/v3";
import type { z } from "zod";
import { llmJsonVision } from "@/lib/openrouter";
import { FrameVerification, SubStepPlan } from "@/lib/schemas";
import { config } from "@/config";

type SubStep = z.infer<typeof SubStepPlan>;

export type VerifierFn = (args: {
  intent: string;
  verb: SubStep["verb"];
  framePath: string;
  pickerReasoning: string;
  language: string;
}) => Promise<z.infer<typeof FrameVerification>>;

const DOWNSCALE_MAX_EDGE = 1280;

async function downscaledCopy(srcPath: string, outDir: string, name: string): Promise<string> {
  const outPath = path.join(outDir, name);
  await sharp(srcPath)
    .resize({ width: DOWNSCALE_MAX_EDGE, height: DOWNSCALE_MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(outPath);
  return outPath;
}

async function defaultVerifier(args: {
  intent: string;
  verb: SubStep["verb"];
  framePath: string;
  pickerReasoning: string;
  language: string;
}): Promise<z.infer<typeof FrameVerification>> {
  const userText = [
    `Intent: ${args.intent}`,
    `Verb: ${args.verb}`,
    `Picker's rationale: ${args.pickerReasoning}`,
  ].join("\n");
  return llmJsonVision({
    model: config.ai.visionModel,
    system: config.ai.prompts.verifyFrameSystem(args.language),
    userText,
    imagePaths: [args.framePath],
    schema: FrameVerification,
    schemaName: "frame_verification",
    temperature: 0.0,
  });
}

export async function runVerifyWithFallback(args: {
  intent: string;
  verb: SubStep["verb"];
  pickedFramePath: string;
  runnerUpFramePath: string | null;
  pickerReasoning: string;
  language: string;
  verifier?: VerifierFn;
  stepIndex?: number;
}): Promise<{ verify: z.infer<typeof FrameVerification>; finalFramePath: string | null }> {
  const verifier = args.verifier ?? defaultVerifier;
  const first = await verifier({
    intent: args.intent,
    verb: args.verb,
    framePath: args.pickedFramePath,
    pickerReasoning: args.pickerReasoning,
    language: args.language,
  });

  if (first.match === "yes" || first.match === "partially") {
    if (first.match === "partially") {
      logger.warn("pipeline.verify.partial", {
        stepIndex: args.stepIndex,
        intent: args.intent,
        reasoning: first.reasoning,
      });
    }
    return { verify: first, finalFramePath: args.pickedFramePath };
  }

  // first.match === "no"
  if (!args.runnerUpFramePath) {
    logger.info("pipeline.verify.no", {
      stepIndex: args.stepIndex,
      intent: args.intent,
      reasoning: first.reasoning,
      hadRunnerUp: false,
    });
    return { verify: first, finalFramePath: null };
  }

  const second = await verifier({
    intent: args.intent,
    verb: args.verb,
    framePath: args.runnerUpFramePath,
    pickerReasoning: args.pickerReasoning,
    language: args.language,
  });
  if (second.match === "yes" || second.match === "partially") {
    logger.info("pipeline.verify.runnerup_accepted", {
      stepIndex: args.stepIndex,
      intent: args.intent,
      match: second.match,
    });
    return { verify: second, finalFramePath: args.runnerUpFramePath };
  }
  logger.info("pipeline.verify.no", {
    stepIndex: args.stepIndex,
    intent: args.intent,
    reasoning: second.reasoning,
    hadRunnerUp: true,
  });
  return { verify: second, finalFramePath: null };
}

/**
 * Entry point that handles downscaling the supplied frame paths before passing to the verifier.
 * Tests inject the verifier and skip the downscale step; production wires through this.
 */
export async function runVerifyFrame(args: {
  intent: string;
  verb: SubStep["verb"];
  pickedFramePath: string;
  runnerUpFramePath: string | null;
  pickerReasoning: string;
  language: string;
  stepIndex: number;
}): Promise<{ verify: z.infer<typeof FrameVerification>; finalFramePath: string | null }> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "verify-"));
  try {
    const pickedDs = await downscaledCopy(args.pickedFramePath, tmpDir, "picked.jpg");
    const runnerDs = args.runnerUpFramePath
      ? await downscaledCopy(args.runnerUpFramePath, tmpDir, "runner.jpg")
      : null;
    const result = await runVerifyWithFallback({
      ...args,
      pickedFramePath: pickedDs,
      runnerUpFramePath: runnerDs,
    });
    // Map result.finalFramePath back to the ORIGINAL (non-downscaled) path so the
    // upload stage reads from the full-resolution source.
    let originalFinal: string | null = null;
    if (result.finalFramePath === pickedDs) originalFinal = args.pickedFramePath;
    else if (result.finalFramePath === runnerDs) originalFinal = args.runnerUpFramePath;
    return { verify: result.verify, finalFramePath: originalFinal };
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}
```

- [ ] **Step 9.4: Run tests + typecheck**

```bash
npx tsx --test src/trigger/stages/verifyFrame.test.ts
npx tsc --noEmit 2>&1 | grep -v "classifyStepWithLLM\|buildActionsForStep\|extractClickEvents\|classifyAndMergeEvents\|clickEventDetect" | tail -10
```

Expected: 6/6 tests PASS.

- [ ] **Step 9.5: Commit**

```bash
git add src/trigger/stages/verifyFrame.ts src/trigger/stages/verifyFrame.test.ts
git commit -m "feat: verifyFrame — Phase 2b with runner-up fallback"
```

---

## Task 10: `locateHighlight` — Phase 3

**Files:**
- Create: `src/trigger/stages/locateHighlight.ts`
- Create: `src/trigger/stages/locateHighlight.test.ts`

- [ ] **Step 10.1: Write the failing test**

Create `src/trigger/stages/locateHighlight.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { coerceForViewVerb, type HighlighterFn, runLocateHighlightWith } from "./locateHighlight";

test("coerceForViewVerb forces no-highlight regardless of LLM output", () => {
  const out = coerceForViewVerb("view", {
    highlight: "yes",
    bbox: { x: 0, y: 0, w: 0.1, h: 0.1 },
    elementCaption: "should be ignored",
    noHighlightReason: null,
  });
  assert.equal(out.highlight, "no");
  assert.equal(out.bbox, null);
  assert.equal(out.elementCaption, null);
  assert.equal(out.noHighlightReason, "view_action");
});

test("coerceForViewVerb leaves non-view verbs untouched", () => {
  const input = {
    highlight: "yes" as const,
    bbox: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
    elementCaption: "Sign up button",
    noHighlightReason: null,
  };
  const out = coerceForViewVerb("click", input);
  assert.deepEqual(out, input);
});

test("runLocateHighlightWith returns highlighter output for non-view verb", async () => {
  const highlighter: HighlighterFn = async () => ({
    highlight: "yes",
    bbox: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
    elementCaption: "Verify email button",
    noHighlightReason: null,
  });
  const out = await runLocateHighlightWith({
    intent: "Click Verify email.",
    verb: "click",
    framePath: "/x.jpg",
    language: "en",
    highlighter,
  });
  assert.equal(out.highlight, "yes");
  assert.equal(out.elementCaption, "Verify email button");
});

test("runLocateHighlightWith coerces view-verb regardless of LLM output", async () => {
  const highlighter: HighlighterFn = async () => ({
    highlight: "yes",
    bbox: { x: 0, y: 0, w: 0.1, h: 0.1 },
    elementCaption: "ignored",
    noHighlightReason: null,
  });
  const out = await runLocateHighlightWith({
    intent: "View the dashboard.",
    verb: "view",
    framePath: "/x.jpg",
    language: "en",
    highlighter,
  });
  assert.equal(out.highlight, "no");
  assert.equal(out.bbox, null);
});
```

- [ ] **Step 10.2: Run test to verify it fails**

```bash
npx tsx --test src/trigger/stages/locateHighlight.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 10.3: Create `src/trigger/stages/locateHighlight.ts`**

```ts
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import type { z } from "zod";
import { llmJsonVision } from "@/lib/openrouter";
import { HighlightDecision, SubStepPlan } from "@/lib/schemas";
import { config } from "@/config";

type SubStep = z.infer<typeof SubStepPlan>;
type Decision = z.infer<typeof HighlightDecision>;

export type HighlighterFn = (args: {
  intent: string;
  verb: SubStep["verb"];
  framePath: string;
  language: string;
}) => Promise<Decision>;

const DOWNSCALE_MAX_EDGE = 1280;

export function coerceForViewVerb(verb: SubStep["verb"], d: Decision): Decision {
  if (verb !== "view") return d;
  return {
    highlight: "no",
    bbox: null,
    elementCaption: null,
    noHighlightReason: "view_action",
  };
}

async function downscaledCopy(srcPath: string, outDir: string): Promise<string> {
  const outPath = path.join(outDir, "frame.jpg");
  await sharp(srcPath)
    .resize({ width: DOWNSCALE_MAX_EDGE, height: DOWNSCALE_MAX_EDGE, fit: "inside", withoutEnlargement: true })
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
  const userText = [
    `Intent: ${args.intent}`,
    `Verb: ${args.verb}`,
  ].join("\n");
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

export async function runLocateHighlightWith(args: {
  intent: string;
  verb: SubStep["verb"];
  framePath: string;
  language: string;
  highlighter?: HighlighterFn;
}): Promise<Decision> {
  const highlighter = args.highlighter ?? defaultHighlighter;
  const raw = await highlighter({
    intent: args.intent,
    verb: args.verb,
    framePath: args.framePath,
    language: args.language,
  });
  return coerceForViewVerb(args.verb, raw);
}

export async function runLocateHighlight(args: {
  intent: string;
  verb: SubStep["verb"];
  framePath: string;
  language: string;
}): Promise<Decision> {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "highlight-"));
  try {
    const ds = await downscaledCopy(args.framePath, tmpDir);
    return runLocateHighlightWith({ ...args, framePath: ds });
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}
```

- [ ] **Step 10.4: Run tests + typecheck**

```bash
npx tsx --test src/trigger/stages/locateHighlight.test.ts
npx tsc --noEmit 2>&1 | grep -v "classifyStepWithLLM\|buildActionsForStep\|extractClickEvents\|classifyAndMergeEvents\|clickEventDetect" | tail -10
```

Expected: 4/4 tests PASS.

- [ ] **Step 10.5: Commit**

```bash
git add src/trigger/stages/locateHighlight.ts src/trigger/stages/locateHighlight.test.ts
git commit -m "feat: locateHighlight — Phase 3 bbox decision with view-verb coercion"
```

---

## Task 11: `buildAction` — pure assembler

**Files:**
- Create: `src/trigger/stages/buildAction.ts`
- Create: `src/trigger/stages/buildAction.test.ts`

- [ ] **Step 11.1: Write the failing test**

Create `src/trigger/stages/buildAction.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { buildAction } from "./buildAction";

const subStep = {
  intent: "Click the Sign up button.",
  verb: "click" as const,
  narrationSegmentIds: [0],
  timeWindow: null,
  visualConfidence: "high" as const,
};

test("buildAction composes a click action with highlight", () => {
  const a = buildAction({
    stepIndex: 1,
    order: 2,
    subStep,
    verify: { match: "yes", reasoning: "ok" },
    highlight: {
      highlight: "yes",
      bbox: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
      elementCaption: "Sign up button",
      noHighlightReason: null,
    },
    framePath: "/frame.jpg",
    frameTime: 12.5,
    pickedClusterLetter: "A",
  });
  assert.equal(a.stepIndex, 1);
  assert.equal(a.order, 2);
  assert.equal(a.verb, "click");
  assert.equal(a.description, "Click the Sign up button.");
  assert.equal(a.displayFramePath, "/frame.jpg");
  assert.equal(a.time, 12.5);
  assert.deepEqual(a.highlight, { kind: "click", bbox: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 } });
  assert.equal(a.verifyMatch, "yes");
  assert.equal(a.pickedClusterLetter, "A");
});

test("buildAction omits highlight when highlight.highlight === no", () => {
  const a = buildAction({
    stepIndex: 0,
    order: 0,
    subStep,
    verify: { match: "yes", reasoning: "ok" },
    highlight: { highlight: "no", bbox: null, elementCaption: null, noHighlightReason: "no_specific_target" },
    framePath: "/x.jpg",
    frameTime: 0,
    pickedClusterLetter: "A",
  });
  assert.equal(a.highlight, undefined);
});

test("buildAction coerces select/link verbs to highlight.kind: click", () => {
  const a = buildAction({
    stepIndex: 0,
    order: 0,
    subStep: { ...subStep, verb: "select" },
    verify: { match: "yes", reasoning: "ok" },
    highlight: {
      highlight: "yes",
      bbox: { x: 0, y: 0, w: 0.1, h: 0.1 },
      elementCaption: "option",
      noHighlightReason: null,
    },
    framePath: "/x.jpg",
    frameTime: 5,
    pickedClusterLetter: "A",
  });
  assert.equal(a.highlight?.kind, "click");
});

test("buildAction keeps highlight.kind: input for input verb", () => {
  const a = buildAction({
    stepIndex: 0,
    order: 0,
    subStep: { ...subStep, verb: "input" },
    verify: { match: "yes", reasoning: "ok" },
    highlight: {
      highlight: "yes",
      bbox: { x: 0, y: 0, w: 0.1, h: 0.1 },
      elementCaption: "Email field",
      noHighlightReason: null,
    },
    framePath: "/x.jpg",
    frameTime: 5,
    pickedClusterLetter: "A",
  });
  assert.equal(a.highlight?.kind, "input");
});

test("buildAction supports view verb with no highlight", () => {
  const a = buildAction({
    stepIndex: 0,
    order: 0,
    subStep: { ...subStep, verb: "view", intent: "View the dashboard." },
    verify: { match: "yes", reasoning: "ok" },
    highlight: { highlight: "no", bbox: null, elementCaption: null, noHighlightReason: "view_action" },
    framePath: "/x.jpg",
    frameTime: 5,
    pickedClusterLetter: "A",
  });
  assert.equal(a.verb, "view");
  assert.equal(a.highlight, undefined);
  assert.equal(a.description, "View the dashboard.");
});
```

- [ ] **Step 11.2: Run test to verify it fails**

```bash
npx tsx --test src/trigger/stages/buildAction.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 11.3: Create `src/trigger/stages/buildAction.ts`**

```ts
import type { z } from "zod";
import type {
  SubStepPlan,
  FrameVerification,
  HighlightDecision,
  TopDownAction,
} from "@/lib/schemas";

type SubStep = z.infer<typeof SubStepPlan>;

function coerceHighlightKind(verb: SubStep["verb"]): "click" | "input" {
  return verb === "input" ? "input" : "click";
}

export function buildAction(args: {
  stepIndex: number;
  order: number;
  subStep: SubStep;
  verify: z.infer<typeof FrameVerification>;
  highlight: z.infer<typeof HighlightDecision>;
  framePath: string;
  frameTime: number;
  pickedClusterLetter: string;
}): TopDownAction {
  const base: TopDownAction = {
    stepIndex: args.stepIndex,
    order: args.order,
    verb: args.subStep.verb,
    description: args.subStep.intent,
    displayFramePath: args.framePath,
    time: args.frameTime,
    verifyMatch: args.verify.match === "yes" ? "yes" : "partially",
    pickedClusterLetter: args.pickedClusterLetter,
  };
  if (args.highlight.highlight === "yes" && args.highlight.bbox && args.subStep.verb !== "view") {
    base.highlight = {
      kind: coerceHighlightKind(args.subStep.verb),
      bbox: args.highlight.bbox,
    };
  }
  return base;
}
```

- [ ] **Step 11.4: Run tests + typecheck**

```bash
npx tsx --test src/trigger/stages/buildAction.test.ts
npx tsc --noEmit 2>&1 | grep -v "classifyStepWithLLM\|buildActionsForStep\|extractClickEvents\|classifyAndMergeEvents\|clickEventDetect" | tail -10
```

Expected: 5/5 tests PASS.

- [ ] **Step 11.5: Commit**

```bash
git add src/trigger/stages/buildAction.ts src/trigger/stages/buildAction.test.ts
git commit -m "feat: buildAction — pure assembler combining all four gates"
```

---

## Task 11.5: Debug-mode pipeline trace artifact

**Spec ref:** §7 — when `SOP_PIPELINE_DEBUG === "1"`, persist a per-sub-step trace doc to a new `sop_pipeline_traces` Mongo collection capturing the four-gate decision chain.

**Files:**
- Create: `src/lib/pipelineTrace.ts`
- Create: `src/lib/pipelineTrace.test.ts`

- [ ] **Step 11.5.1: Write the failing test**

Create `src/lib/pipelineTrace.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { traceEnabled, makeTrace } from "./pipelineTrace";

test("traceEnabled is false when SOP_PIPELINE_DEBUG is unset", () => {
  delete process.env.SOP_PIPELINE_DEBUG;
  assert.equal(traceEnabled(), false);
});

test("traceEnabled is true when SOP_PIPELINE_DEBUG === '1'", () => {
  process.env.SOP_PIPELINE_DEBUG = "1";
  try {
    assert.equal(traceEnabled(), true);
  } finally {
    delete process.env.SOP_PIPELINE_DEBUG;
  }
});

test("traceEnabled is false when SOP_PIPELINE_DEBUG === 'false' or other strings", () => {
  for (const v of ["false", "0", "yes", "no", ""]) {
    process.env.SOP_PIPELINE_DEBUG = v;
    try {
      assert.equal(traceEnabled(), false, `value ${JSON.stringify(v)} should be false`);
    } finally {
      delete process.env.SOP_PIPELINE_DEBUG;
    }
  }
});

test("makeTrace returns a well-formed doc shape", () => {
  const doc = makeTrace({
    sopId: "abc",
    stepIndex: 2,
    intent: "Click Sign up.",
    pickedLetter: "B",
    runnerUpLetter: "A",
    pickerReasoning: "B clearly shows the Sign up button",
    verifyMatch: "yes",
    verifyReasoning: "matches",
    highlightOutcome: "yes",
    finalActionRecorded: true,
  });
  assert.equal(doc.sopId, "abc");
  assert.equal(doc.stepIndex, 2);
  assert.equal(doc.pickedLetter, "B");
  assert.ok(doc.createdAt instanceof Date);
});
```

- [ ] **Step 11.5.2: Run test to verify it fails**

```bash
npx tsx --test src/lib/pipelineTrace.test.ts
```

Expected: FAIL — module does not exist.

- [ ] **Step 11.5.3: Create `src/lib/pipelineTrace.ts`**

```ts
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";
import { logger } from "@trigger.dev/sdk/v3";

export type PipelineTraceDoc = {
  _id: ObjectId;
  sopId: string;
  stepIndex: number;
  intent: string;
  pickedLetter: string | null;
  runnerUpLetter: string | null;
  pickerReasoning: string;
  verifyMatch: "yes" | "partially" | "no";
  verifyReasoning: string;
  highlightOutcome: "yes" | "no";
  finalActionRecorded: boolean;
  createdAt: Date;
};

export function traceEnabled(): boolean {
  return process.env.SOP_PIPELINE_DEBUG === "1";
}

export function makeTrace(args: Omit<PipelineTraceDoc, "_id" | "createdAt">): PipelineTraceDoc {
  return {
    _id: new ObjectId(),
    createdAt: new Date(),
    ...args,
  };
}

export async function persistTrace(doc: PipelineTraceDoc): Promise<void> {
  if (!traceEnabled()) return;
  try {
    const db = await getDb();
    await db.collection<PipelineTraceDoc>("sop_pipeline_traces").insertOne(doc);
  } catch (e) {
    // Trace persistence is best-effort. Never fail the pipeline on trace error.
    logger.warn("pipeline.trace.persist_failed", { sopId: doc.sopId, stepIndex: doc.stepIndex, error: String(e) });
  }
}
```

- [ ] **Step 11.5.4: Run tests + typecheck**

```bash
npx tsx --test src/lib/pipelineTrace.test.ts
npx tsc --noEmit 2>&1 | grep -v "classifyStepWithLLM\|buildActionsForStep\|extractClickEvents\|classifyAndMergeEvents\|clickEventDetect" | tail -5
```

Expected: 4/4 tests PASS.

- [ ] **Step 11.5.5: Wire into Task 13 orchestration**

This step ADDS to Task 13's wiring (executed as part of Task 13, not separately). In `processSopScreenshots.ts`, inside the per-sub-step loop **right before the `actions.push(...)`** call (and right after the `runLocateHighlight` call), insert:

```ts
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
              }));
            }
```

Also persist drops: insert one near each `continue` (after pick null, after verify no) with `finalActionRecorded: false` and appropriate placeholder fields. To keep Task 13 wiring tractable, structure it as a single accumulator that emits at every gate.

Add the import to Task 13's import block (alongside the others):

```ts
import { traceEnabled, persistTrace, makeTrace } from "@/lib/pipelineTrace";
```

- [ ] **Step 11.5.6: Commit**

```bash
git add src/lib/pipelineTrace.ts src/lib/pipelineTrace.test.ts
git commit -m "feat: debug-mode pipeline trace artifact (SOP_PIPELINE_DEBUG=1)"
```

---

## Task 12: UI render audit

**Files:**
- Read-only audit; no commits unless a code path is found that needs updating.

- [ ] **Step 12.1: Grep for any composition of description from screenName/elementCaption**

```bash
grep -rn 'screenName\|elementCaption' src/components src/app 2>&1 | grep -v test
```

- [ ] **Step 12.2: Verify the renderer reads `Screenshot.description` directly**

The likely renderer is `src/components/StepCardScreenshots.tsx` (flat under `src/components/`, NOT under `src/components/sop/`). Read it and confirm it reads `screenshot.description` directly. If it composes from `screenName + elementCaption + verb`, replace that with a direct `description` read. The new `screenName`/`elementCaption` fields stop being written in Task 13, so old SOPs continue to render via `description` and new SOPs render via `description` as the planner's intent verbatim.

- [ ] **Step 12.3: If no changes required**

No commit. Move to Task 13.

- [ ] **Step 12.4: If changes required**

Apply minimal changes to make the renderer read `description` directly. Verify with:

```bash
npx tsc --noEmit
npm run build 2>&1 | tail -20
```

Expected: typecheck clean; Next.js build succeeds.

Commit:

```bash
git add <changed-files>
git commit -m "fix: UI renders Screenshot.description directly (no recomposition)"
```

---

## Task 13: Rewrite `processSopScreenshots.ts` + `uploadScreenshots.ts`

**Files:**
- Modify: `src/trigger/processSopScreenshots.ts`
- Modify: `src/trigger/stages/uploadScreenshots.ts`

**Important:** Single commit — both files must land together. Old `uploadScreenshots.runUploadScreenshots` signature and consumer changes simultaneously.

- [ ] **Step 13.1: Replace `src/trigger/stages/uploadScreenshots.ts`**

Replace the entire file with:

```ts
import fs from "node:fs";
import sharp from "sharp";
import { customAlphabet } from "nanoid";
import { logger } from "@trigger.dev/sdk/v3";
import { putObject } from "@/lib/r2";
import { screenshotKey } from "@/lib/utils";
import type { Screenshot } from "@/lib/mongo";
import type { TopDownAction } from "@/lib/schemas";

export function rectSvg(
  W: number,
  H: number,
  bbox: { x: number; y: number; w: number; h: number },
): string | null {
  if (bbox.w < 0.005 || bbox.h < 0.005) return null;
  if (bbox.x + bbox.w > 1.05 || bbox.y + bbox.h > 1.05) return null;
  if (bbox.x < -0.05 || bbox.y < -0.05) return null;
  const x = clamp01(bbox.x);
  const y = clamp01(bbox.y);
  const w = Math.min(1 - x, Math.max(0, bbox.w));
  const h = Math.min(1 - y, Math.max(0, bbox.h));
  const stroke = Math.max(4, Math.round(H * 0.005));
  const px = Math.round(x * W) + Math.round(stroke / 2);
  const py = Math.round(y * H) + Math.round(stroke / 2);
  const pw = Math.max(1, Math.round(w * W) - stroke);
  const ph = Math.max(1, Math.round(h * H) - stroke);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="none" stroke="#F5C518" stroke-width="${stroke}" rx="6" ry="6"/></svg>`;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

async function buildBufferWithOptionalHighlight(
  localPath: string,
  bbox: { x: number; y: number; w: number; h: number } | null,
): Promise<{ buf: Buffer; error: string | null }> {
  if (!bbox) {
    return { buf: await fs.promises.readFile(localPath), error: null };
  }
  try {
    const meta = await sharp(localPath).metadata();
    const W = meta.width ?? 0;
    const H = meta.height ?? 0;
    if (!W || !H) return { buf: await fs.promises.readFile(localPath), error: "missing image metadata" };
    const svg = rectSvg(W, H, bbox);
    if (!svg) return { buf: await fs.promises.readFile(localPath), error: "bbox out of range" };
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

const newFrameId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);

export async function runUploadScreenshots(args: {
  sopId: string;
  byStep: Map<number, TopDownAction[]>;
}): Promise<Map<number, Screenshot[]>> {
  const out = new Map<number, Screenshot[]>();

  for (const [stepIndex, actions] of args.byStep.entries()) {
    const records: Screenshot[] = [];
    for (let order = 0; order < actions.length; order++) {
      const action = actions[order];
      const frameId = newFrameId();
      const r2Key = screenshotKey(args.sopId, stepIndex, frameId);
      const bboxForOverlay = action.highlight?.bbox ?? null;
      const { buf, error } = await buildBufferWithOptionalHighlight(action.displayFramePath, bboxForOverlay);
      if (error) {
        logger.warn("uploadScreenshots: highlight draw failed; uploaded un-annotated frame", {
          stepIndex,
          t: action.time,
          error,
        });
      }
      await putObject(r2Key, buf, "image/jpeg");
      const rec: Screenshot = {
        frameId,
        r2Key,
        t: action.time,
        order,
        description: action.description,
        verb: action.verb,
      };
      if (action.highlight && !error) {
        rec.highlight = action.highlight;
      } else if (action.highlight && error) {
        rec.highlightError = error;
      }
      records.push(rec);
    }
    out.set(stepIndex, records);
  }
  return out;
}
```

- [ ] **Step 13.2: Rewrite `src/trigger/processSopScreenshots.ts`**

The file currently calls the old pipeline. Replace the screenshot stages with the new chain. Read the current file first to understand the existing structure:

```bash
sed -n '1,30p' src/trigger/processSopScreenshots.ts
sed -n '120,200p' src/trigger/processSopScreenshots.ts
```

The existing file already imports `config` (from `@/config`) and `logger` (from `@trigger.dev/sdk/v3`) at the top. **DO NOT remove those imports** when editing the imports block. Add the new imports alongside the old ones (or insert near other `@/trigger/...` imports).

Identify the block starting around the call to `runExtractClickEvents` and ending after `runUploadScreenshots`. Replace it with the new pipeline. Concretely:

**Remove** these imports:

```ts
import { runExtractClickEvents } from "./stages/extractClickEvents";
import { runClassifyAndMergeEvents } from "./stages/classifyAndMergeEvents";
import { runUploadScreenshots } from "./stages/uploadScreenshots";
import { classifyAndRemap } from "./stages/classifyStepWithLLM";
import { buildActionsForStep } from "./stages/buildActionsForStep";
import { buildScreenClusters } from "@/trigger/lib/screenId";
import type { Action } from "@/lib/schemas";
```

**Add** these imports (preserving any existing `config` and `logger` imports):

```ts
import { runUploadScreenshots } from "./stages/uploadScreenshots";
import { buildScreenClusters, clusterFor, selectInClusterFrame } from "@/trigger/lib/screenId";
import { assembleStepNarration, silentStepFallback, hasLocalizedViewCaption } from "@/trigger/lib/narration";
import { runPlanStep } from "./stages/planStep";
import { runPickFrame, computeSearchWindow } from "./stages/pickFrame";
import { runVerifyFrame } from "./stages/verifyFrame";
import { runLocateHighlight } from "./stages/locateHighlight";
import { buildAction } from "./stages/buildAction";
import { runWithConcurrency } from "@/lib/concurrency";
import type { TopDownAction } from "@/lib/schemas";
```

Locate the block that runs detect → classify → ground (everything after `runBuildFramePool` and before `runUploadScreenshots`). It currently looks roughly like:

```ts
        await setStatus(_id, "assigning");
        const stepInputs: StepInput[] = resolved.map(...);
        let eventsByStep;
        try {
          eventsByStep = await runExtractClickEvents({ ... });
        } catch (e) { ... }
        // ... pipeline.click_events logs ...
        const merged = runClassifyAndMergeEvents({ byStep: eventsByStep });
        // ... pipeline.classify_merge log ...

        // Stage 7: per-step classification, dedup, View emission.
        const actionsByStep = new Map<number, Action[]>();
        for (const step of stepInputs) {
          const events = merged.get(step.stepIndex) ?? [];
          const clusters = await buildScreenClusters({ ... });
          let classified;
          try {
            classified = await classifyAndRemap({ ... });
          } catch (e) {
            return fail(_id, "classify_failed");
          }
          // ... buildActionsForStep ...
        }

        // Stage 8: upload screenshots.
        await setStatus(_id, "uploading-screenshots");
        const screenshotsByStep = await runUploadScreenshots({
          sopId: _id.toHexString(),
          byStep: actionsByStep,
          language: outputLanguage,
        });
```

Replace that entire block (from `await setStatus(_id, "assigning")` through the existing `runUploadScreenshots` call) with:

```ts
        await setStatus(_id, "assigning");
        // `resolved` (from resolveTimes) only carries times. The original segment IDs
        // are on `extracted.steps[i]`. Pair them by index.
        const stepInputs = resolved.map((rs, i) => {
          const src = extracted.steps[i];
          const narration = assembleStepNarration(
            { startSegmentId: src.startSegmentId, endSegmentId: src.endSegmentId },
            segments,
            segmentsClean,
          );
          const tStart = narration.length > 0 ? Math.min(...narration.map(n => n.start)) : rs.startTime;
          const tEnd = narration.length > 0 ? Math.max(...narration.map(n => n.end)) : rs.endTime;
          return {
            stepIndex: i,
            title: rs.title,
            description: rs.description,
            tStart,
            tEnd,
            narration,
          };
        });

        const actionsByStep = new Map<number, TopDownAction[]>();
        const perStepConcurrency = config.screenshots.classify.perStepConcurrency;

        await runWithConcurrency(stepInputs, perStepConcurrency, async (step) => {
          const clusters = await buildScreenClusters({
            denseFrames: pool.denseFrames,
            stepStart: step.tStart,
            stepEnd: step.tEnd,
            samplingSec: config.screenshots.screenId.samplingSec,
            hammingThreshold: config.screenshots.screenId.hammingThreshold,
          });

          let plan;
          if (step.narration.length === 0) {
            if (!hasLocalizedViewCaption(outputLanguage)) {
              logger.warn("pipeline.silent_step.unlocalized_caption", { stepIndex: step.stepIndex, language: outputLanguage });
            }
            plan = silentStepFallback(clusters, { stepIndex: step.stepIndex }, config.screenshots.screenId.viewMinDurationSec, outputLanguage);
          } else {
            try {
              plan = await runPlanStep({
                stepIndex: step.stepIndex,
                stepTitle: step.title,
                stepDescription: step.description,
                narration: step.narration,
                clusters,
                language: outputLanguage,
              });
            } catch (e) {
              logger.error("plan failed", { stepIndex: step.stepIndex, e: String(e) });
              throw new Error("plan_failed");
            }
          }

          const actions: TopDownAction[] = [];
          for (const subStep of plan.subSteps) {
            const { pick, shortlist } = await runPickFrame({
              subStep,
              narration: step.narration,
              step: { stepIndex: step.stepIndex, tStart: step.tStart, tEnd: step.tEnd },
              clusters,
              language: outputLanguage,
            });
            if (pick.picked === null) continue;

            const pickedCluster = clusterFor(pick.picked, shortlist);
            const runnerCluster = clusterFor(pick.runnerUp, shortlist);
            if (!pickedCluster) continue;

            const window = computeSearchWindow(subStep, step.narration, step);
            const pickedFrame = selectInClusterFrame(pickedCluster, window);
            const runnerFrame = runnerCluster ? selectInClusterFrame(runnerCluster, window) : null;

            const { verify, finalFramePath } = await runVerifyFrame({
              intent: subStep.intent,
              verb: subStep.verb,
              pickedFramePath: pickedFrame.localPath,
              runnerUpFramePath: runnerFrame?.localPath ?? null,
              pickerReasoning: pick.reasoning,
              language: outputLanguage,
              stepIndex: step.stepIndex,
            });
            if (finalFramePath === null) continue;

            const finalFrameTime = finalFramePath === runnerFrame?.localPath ? runnerFrame.t : pickedFrame.t;

            const highlight = await runLocateHighlight({
              intent: subStep.intent,
              verb: subStep.verb,
              framePath: finalFramePath,
              language: outputLanguage,
            });

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
          }
          actionsByStep.set(step.stepIndex, actions);
        });

        await setStatus(_id, "uploading-screenshots");
        const screenshotsByStep = await runUploadScreenshots({
          sopId: _id.toHexString(),
          byStep: actionsByStep,
        });
```

Wrap the `runWithConcurrency` call with a `try/catch` that maps `Error("plan_failed")` to `fail(_id, "plan_failed")`:

```ts
        try {
          await runWithConcurrency(stepInputs, perStepConcurrency, async (step) => { /* body above */ });
        } catch (e) {
          if (e instanceof Error && e.message === "plan_failed") return fail(_id, "plan_failed");
          logger.error("screenshot pipeline failed", { e: String(e) });
          return fail(_id, "unknown");
        }
```

(Adjust the `try/catch` to wrap the appropriate block — keep the outer existing structure of the task.)

- [ ] **Step 13.3: Typecheck**

```bash
npx tsc --noEmit 2>&1 | grep -v "classifyStepWithLLM\|buildActionsForStep\|extractClickEvents\|classifyAndMergeEvents\|clickEventDetect" | tail -20
```

Expected: no errors outside the to-be-deleted files. If you see errors about `runExtract` not providing `startSegmentId/endSegmentId` on the resolved steps, check `src/trigger/stages/clip.ts` (`resolveTimes`) to confirm the resolved type still carries those fields; if not, the deriving code above should consult `extracted.steps[i].startSegmentId` directly.

- [ ] **Step 13.4: Run all tests**

```bash
npx tsx --test src/lib/**/*.test.ts src/trigger/**/*.test.ts 2>&1 | tail -25
```

Expected: All NEW tests pass. The old `classifyStepWithLLM.test.ts` and `buildActionsForStep.test.ts` may still pass too (they test stages still present); that's fine — they're being deleted in Task 14.

- [ ] **Step 13.5: Commit**

```bash
git add src/trigger/processSopScreenshots.ts src/trigger/stages/uploadScreenshots.ts
git commit -m "feat: wire top-down pipeline into processSopScreenshots"
```

---

## Task 14: Delete obsolete stages and schemas

**Files:**
- Delete: `src/trigger/lib/clickEventDetect.ts`, `.test.ts`
- Delete: `src/trigger/stages/extractClickEvents.ts`
- Delete: `src/trigger/stages/classifyAndMergeEvents.ts`
- Delete: `src/trigger/stages/classifyStepWithLLM.ts`, `.test.ts`
- Delete: `src/trigger/stages/buildActionsForStep.ts`, `.test.ts`
- Modify: `src/lib/schemas.ts` (remove old union, rename `TopDownAction` → `Action`)
- Modify: `src/lib/mongo.ts` (drop unused fields from `Screenshot`, or keep for backward compat)

- [ ] **Step 14.1: Audit callers of deleted files**

```bash
git grep -nE "classifyStepWithLLM|buildActionsForStep|extractClickEvents|classifyAndMergeEvents|clickEventDetect|ElementAction|ViewAction|ClassifiedCandidate|StepClassification|GroundedEventOutput" src/
```

Expected: zero matches outside the files being deleted. If any caller exists in `src/trigger/processSopScreenshots.ts`, the wiring in Task 13 should have already removed it; otherwise, fix before proceeding.

- [ ] **Step 14.2: Delete the files**

```bash
rm src/trigger/lib/clickEventDetect.ts
rm src/trigger/lib/clickEventDetect.test.ts
rm src/trigger/stages/extractClickEvents.ts
rm src/trigger/stages/classifyAndMergeEvents.ts
rm src/trigger/stages/classifyStepWithLLM.ts
rm src/trigger/stages/classifyStepWithLLM.test.ts
rm src/trigger/stages/buildActionsForStep.ts
rm src/trigger/stages/buildActionsForStep.test.ts
```

- [ ] **Step 14.3: Remove old schemas from `src/lib/schemas.ts` and rename `TopDownAction` → `Action`**

In `src/lib/schemas.ts`:

1. Delete the entire `ClassifiedCandidate`, `StepClassification`, `ElementAction`, `ViewAction`, and old `Action` declarations.
2. Rename `TopDownAction` → `Action` in the schemas file.
3. Replace any imports / uses of `TopDownAction` across the new pipeline files with `Action`. Use sed:

```bash
git grep -l "TopDownAction" src/ | xargs sed -i '' 's/TopDownAction/Action/g'
```

(On Linux, drop the `''`.)

- [ ] **Step 14.4: Typecheck**

```bash
npx tsc --noEmit
```

Expected: PASS (clean — no surviving references to deleted symbols).

- [ ] **Step 14.5: Run all tests**

```bash
npx tsx --test src/lib/**/*.test.ts src/trigger/**/*.test.ts 2>&1 | tail -10
```

Expected: All tests PASS.

- [ ] **Step 14.6: Commit**

```bash
git add -A
git commit -m "chore: delete obsolete bottom-up pipeline stages and schemas"
```

---

## Task 15: Final smoke test against the live SOP

**Files:** none. Operational task.

- [ ] **Step 15.1: Start the Trigger.dev dev server**

In a separate terminal from the repo root:

```bash
npx trigger.dev@latest dev
```

Wait until `Local worker ready` appears in the output.

- [ ] **Step 15.2: Re-trigger the existing SOP**

Use the Trigger.dev dashboard (https://cloud.trigger.dev) or MCP tool to invoke `process-sop-screenshots` with:

```json
{ "sopId": "6a059ab32cb9c564126a36ad" }
```

Wait for the run to reach `status: completed` (~3–5 minutes for this 5-min video; longer if the video is bigger).

- [ ] **Step 15.3: Inspect the result**

```bash
SOP_ID=6a059ab32cb9c564126a36ad node --experimental-vm-modules ./scripts/inspect-sop.mjs 2>&1 | head -50
```

Verify the spec §6 acceptance criteria:

1. **Description ↔ screenshot match.** Open `http://localhost:3000/sop/6a059ab32cb9c564126a36ad` in Playwright. For each visible sub-step, eyeball whether the description's element is visible in the screenshot. There should be zero hallucinated element names. Quick check:

   ```bash
   SOP_ID=6a059ab32cb9c564126a36ad node --experimental-vm-modules ./scripts/inspect-sop.mjs 2>&1 | grep -E 'verb=click|verb=input|verb=view'
   ```

2. **No actionable sub-steps in the presenter intro.** Step 0 should contain at most one `verb=view` card (or be empty for the intro segment).

3. **View ⇒ no bbox; non-view ⇒ bbox or dropped.** Confirm:

   ```bash
   SOP_ID=6a059ab32cb9c564126a36ad node --experimental-vm-modules ./scripts/inspect-sop.mjs 2>&1 | grep 'verb=view' | grep -v 'bbox=undefined'
   ```

   Expected: no lines (all view cards have undefined bbox).

4. **Verification code → Next sequence.** Look for two distinct sub-steps on the *Check your email* screen — one for entering the code, one for clicking Next.

5. **Sub-step stability.** Trigger the task a second time, then compare per-step sub-step counts. They should be within ±1.

   ```bash
   # After both runs:
   SOP_ID=6a059ab32cb9c564126a36ad node --experimental-vm-modules ./scripts/inspect-sop.mjs 2>&1 | grep -E '^Step' | awk -F: '{print $1}'
   ```

- [ ] **Step 15.4: If acceptance criteria pass**

No commit needed unless config knobs were tuned during smoke. If knob tuning was needed (e.g., `viewMinDurationSec`, `samplingSec`, downscale resolution), commit those:

```bash
git add src/config/index.ts
git commit -m "chore: tune pipeline knobs after smoke test"
```

- [ ] **Step 15.5: If acceptance criteria fail**

Common failure modes and remedies:

- *Sub-steps missing across the board* → check `pipeline.plan.empty_after_repair` logs. The planner may be returning 0 sub-steps; verify the narration is reaching it (assembled correctly) and the prompt isn't too restrictive.
- *Description / screenshot mismatch still present* → check `pipeline.verify.partial` logs; consider tightening the verifier prompt to fail more aggressively on "partially" matches.
- *Presenter section still produces clicks* → expected to be handled by `planStep`'s `visualConfidence: "low"` drop. If it isn't, the planner is being too generous; tighten the prompt or add an explicit "discard webcam segments" instruction.

After applying fixes, return to step 15.2.
