# Sub-step descriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each curated screenshot gains an optional `description` written by the same vision LLM that picks the frame — turning each screenshot into a captioned "sub-step".

**Architecture:** Repurpose the existing `reason` field on the picker output as a real, user-facing `description` (string | null). Plumb it through `assignScreenshots → uploadScreenshots → Mongo → SOP API → viewer`. Empty / null / whitespace-only descriptions are normalized to field-absent so Mongo stays clean. No new LLM calls; we extend the existing per-step pick prompt.

**Tech Stack:** Same as the screenshots POC — Next.js 16, React 19, trigger.dev v3, MongoDB, Zod, OpenRouter (Gemini 2.5 Flash vision), node:test.

**Spec:** `docs/superpowers/specs/2026-05-13-substep-descriptions-design.md`.

**Note on commits:** This repository is not a git repo. Treat each "Commit" as a checkpoint — verify the change works, then move on.

---

## File structure

**Modified files (no new files):**
- `src/lib/schemas.ts` — `ScreenshotPicksOutput.picks[].reason` → `description: z.string().nullable()`
- `src/lib/mongo.ts` — `Screenshot` gains `description?: string`
- `src/config/index.ts` — replace `screenshotPickSystem` prompt
- `src/trigger/stages/assignScreenshots.ts` — add `Pick` type; thread descriptions through pick/dedup
- `src/trigger/stages/assignScreenshots.test.ts` — update test inputs to `Pick` shape
- `src/trigger/stages/uploadScreenshots.ts` — accept `Pick[]`; normalize empty descriptions to absent
- `src/app/api/sop/[id]/route.ts` — include `description` in response
- `src/components/StepCardScreenshots.tsx` — render description; extend `ScreenshotItem`

The orchestrator `src/trigger/processSopScreenshots.ts` needs no changes (types flow through structurally).

---

## Task 1: Schema, Mongo type, prompt update

**Files:**
- Modify: `src/lib/schemas.ts`
- Modify: `src/lib/mongo.ts`
- Modify: `src/config/index.ts`

Pure type / constant changes. No tests; verified by `tsc`.

- [ ] **Step 1: Update Zod schema**

In `src/lib/schemas.ts`, replace the existing `ScreenshotPicksOutput` (currently:

```ts
export const ScreenshotPicksOutput = z.object({
  picks: z.array(z.object({
    index: z.number().int().nonnegative(),
    reason: z.string(),
  })),
});
```

) with:

```ts
export const ScreenshotPicksOutput = z.object({
  picks: z.array(z.object({
    index: z.number().int().nonnegative(),
    description: z.string().nullable(),
  })),
});
```

- [ ] **Step 2: Extend Mongo `Screenshot` type**

In `src/lib/mongo.ts`, REPLACE the existing `Screenshot` interface with:

```ts
export interface Screenshot {
  frameId: string;
  r2Key: string;
  t: number;        // timestamp in source video, seconds
  order: number;    // display order within the step
  description?: string;  // NEW — optional LLM-written caption/instruction
}
```

- [ ] **Step 3: Replace the LLM prompt**

In `src/config/index.ts`, find `ai.prompts.screenshotPickSystem` and replace its entire body with:

```ts
      screenshotPickSystem: (lang: string) =>
        `You select screenshots from a training video to illustrate one specific step, AND write a short caption or instruction for each picked frame.

You receive: the step's title and the trainer's narration, plus a list of candidate frames each labeled with a bucket-local index and a timestamp.

Pick the frames a reader would need to actually perform this step — relevant UI before the action, during the action, and the resulting state after the action. Skip redundant frames showing the same UI state. Return an empty array if no frames are useful for this step.

For each picked frame, write a "description":
- If the frame shows an action moment, write a short imperative instruction ("Cut the bell pepper into thirds").
- If the frame shows a state/result, write a brief observation ("Sauce is well combined and uniformly red").
- If the image is self-explanatory and no caption would help the reader, return null.
- Keep descriptions concise. Match the length to the value added — one short line is usually right, but you may go longer when needed.

LANGUAGE: Write every description in ${lang}. Keep technical / industry / brand terms in their original form.

Return strict JSON only.`,
```

- [ ] **Step 4: Run tsc**

Run: `npx tsc --noEmit`
Expected: **clean** (no errors). The existing `assignScreenshots.ts` doesn't read `result.picks[N].reason` (it only mentions the field name inside a user-prompt template string, which is plain text), and existing `uploadScreenshots.ts` doesn't touch the new optional `Screenshot.description` field. Adding `description?: string` to `Screenshot` is purely additive.

If you DO see tsc errors, stop and report BLOCKED with the errors — they indicate something unexpected.

- [ ] **Step 5: Checkpoint**

```bash
git add src/lib/schemas.ts src/lib/mongo.ts src/config/index.ts
git commit -m "feat(substep): schema/type/prompt for screenshot descriptions"
```

---

## Task 2: `assignScreenshots` refactor — thread `Pick` through

**Files:**
- Modify: `src/trigger/stages/assignScreenshots.ts`
- Modify: `src/trigger/stages/assignScreenshots.test.ts`

Replace the `string[]` picks shape with `Pick[]` so descriptions ride along with `poolId` through bucketing/dedup. Test changes mirror the type changes. Follow strict TDD: write the updated test first, see it fail, then update implementation.

- [ ] **Step 1: Update test file**

Replace `src/trigger/stages/assignScreenshots.test.ts` ENTIRELY with:

```ts
import { test } from "node:test";
import assert from "node:assert";
import { bucketFramesByStep, resolveCrossStepDedup, type StepRange, type PoolFrame, type Pick } from "./assignScreenshots";

function pf(t: number, id: string): PoolFrame {
  return { t, poolId: id, localPath: `/tmp/${id}.jpg`, pHash: "0000000000000000" };
}

function pick(poolId: string, description: string | null = null): Pick {
  return { poolId, description };
}

test("bucketFramesByStep applies overlap buffer on both sides", () => {
  const steps: StepRange[] = [
    { stepIndex: 0, tStart: 0, tEnd: 10 },
    { stepIndex: 1, tStart: 10, tEnd: 20 },
  ];
  // Step 0 bucket: t ∈ [-2, 12]. Step 1 bucket: t ∈ [8, 22]. Overlap region: [8, 12].
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
  const picks = new Map<number, Pick[]>([[0, [pick("x", "first attempt")]], [1, [pick("x", "second attempt")]]]);
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
  const picks = new Map<number, Pick[]>([[0, [pick("x", "from step 0")]], [1, [pick("x", "from step 1")]]]);
  const pool: PoolFrame[] = [pf(10, "x")];
  const out = resolveCrossStepDedup(steps, picks, pool);
  assert.deepEqual(out.get(0), [pick("x", "from step 0")]);
  assert.deepEqual(out.get(1), []);
});

test("resolveCrossStepDedup preserves timestamp order within each step", () => {
  const steps: StepRange[] = [{ stepIndex: 0, tStart: 0, tEnd: 30 }];
  const picks = new Map<number, Pick[]>([[0, [pick("c", "third"), pick("a", "first"), pick("b", "second")]]]);
  const pool: PoolFrame[] = [pf(1, "a"), pf(2, "b"), pf(3, "c")];
  const out = resolveCrossStepDedup(steps, picks, pool);
  assert.deepEqual(out.get(0), [pick("a", "first"), pick("b", "second"), pick("c", "third")]);
});
```

- [ ] **Step 2: Run test, expect FAIL**

Run: `npx tsx --test src/trigger/stages/assignScreenshots.test.ts`
Expected: compile errors / type errors (no `Pick` export yet, `resolveCrossStepDedup` still takes `string[]`).

- [ ] **Step 3: Update implementation**

REPLACE `src/trigger/stages/assignScreenshots.ts` ENTIRELY with:

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

export type Pick = { poolId: string; description: string | null };

export type AssignmentResult = {
  byStep: Map<number, Pick[]>;
  errors: Map<number, string>;
};

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

export function resolveCrossStepDedup(
  steps: StepRange[],
  picksByStep: Map<number, Pick[]>,
  pool: PoolFrame[],
): Map<number, Pick[]> {
  const byId = new Map<string, PoolFrame>(pool.map(f => [f.poolId, f]));
  const stepCenter = (s: StepRange) => (s.tStart + s.tEnd) / 2;

  // Track each poolId's current owning step, and the description from that step's pick.
  const owner = new Map<string, { stepIndex: number; description: string | null }>();
  for (const step of steps) {
    const picks = picksByStep.get(step.stepIndex) ?? [];
    for (const p of picks) {
      const frame = byId.get(p.poolId);
      if (!frame) continue;
      const incumbent = owner.get(p.poolId);
      if (incumbent === undefined) {
        owner.set(p.poolId, { stepIndex: step.stepIndex, description: p.description });
        continue;
      }
      const incumbentStep = steps.find(s => s.stepIndex === incumbent.stepIndex)!;
      const incumbentDist = Math.abs(frame.t - stepCenter(incumbentStep));
      const challengerDist = Math.abs(frame.t - stepCenter(step));
      if (challengerDist < incumbentDist) {
        owner.set(p.poolId, { stepIndex: step.stepIndex, description: p.description });
      }
      // tie → keep incumbent
    }
  }

  const out = new Map<number, Pick[]>();
  for (const step of steps) out.set(step.stepIndex, []);
  for (const [poolId, info] of owner.entries()) {
    out.get(info.stepIndex)!.push({ poolId, description: info.description });
  }
  for (const [stepIndex, picks] of out.entries()) {
    picks.sort((a, b) => byId.get(a.poolId)!.t - byId.get(b.poolId)!.t);
    out.set(stepIndex, picks);
  }
  return out;
}

async function pickForStep(args: {
  step: StepInput;
  bucket: PoolFrame[];
  language: string;
}): Promise<Pick[]> {
  if (args.bucket.length === 0) return [];

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
      `Return JSON: { "picks": [{ "index": <bucket index>, "description": "<short caption or null>" }] }`,
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

    const validPicks = result.picks.filter(p => p.index >= 0 && p.index < args.bucket.length);
    if (validPicks.length !== result.picks.length) {
      logger.warn("vision LLM returned out-of-range indices", {
        stepIndex: args.step.stepIndex,
        returned: result.picks.length,
        valid: validPicks.length,
      });
    }
    return validPicks.map(p => ({
      poolId: args.bucket[p.index].poolId,
      description: p.description,
    }));
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

  const settled = await Promise.allSettled(
    args.steps.map(step =>
      pickForStep({ step, bucket: buckets.get(step.stepIndex) ?? [], language: args.language }),
    ),
  );

  const picksByStep = new Map<number, Pick[]>();
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

- [ ] **Step 4: Run test, expect PASS**

Run: `npx tsx --test src/trigger/stages/assignScreenshots.test.ts`
Expected: all 4 tests pass.

- [ ] **Step 5: Checkpoint**

```bash
git add src/trigger/stages/assignScreenshots.ts src/trigger/stages/assignScreenshots.test.ts
git commit -m "feat(substep): thread Pick (with description) through bucketing and dedup"
```

---

## Task 3: `uploadScreenshots` — accept `Pick[]`, normalize blank descriptions

**Files:**
- Modify: `src/trigger/stages/uploadScreenshots.ts`

Signature changes from `string[]` to `Pick[]`. Empty/null/whitespace-only descriptions are omitted from the Mongo record entirely (conditional spread).

- [ ] **Step 1: Replace the file**

REPLACE `src/trigger/stages/uploadScreenshots.ts` ENTIRELY with:

```ts
import fs from "node:fs";
import { customAlphabet } from "nanoid";
import { logger } from "@trigger.dev/sdk/v3";
import { putObject } from "@/lib/r2";
import { screenshotKey } from "@/lib/utils";
import type { Screenshot } from "@/lib/mongo";
import type { PoolFrame, Pick } from "./assignScreenshots";

const newFrameId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);

export async function runUploadScreenshots(args: {
  sopId: string;
  byStep: Map<number, Pick[]>;
  pool: PoolFrame[];
}): Promise<Map<number, Screenshot[]>> {
  const byId = new Map<string, PoolFrame>(args.pool.map(f => [f.poolId, f]));
  const out = new Map<number, Screenshot[]>();

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
      const buf = await fs.promises.readFile(frame.localPath);
      await putObject(r2Key, buf, "image/jpeg");
      const desc = pick.description?.trim();
      records.push({
        frameId,
        r2Key,
        t: frame.t,
        order,
        ...(desc ? { description: desc } : {}),
      });
    }
    out.set(stepIndex, records);
  }
  return out;
}
```

- [ ] **Step 2: Run tsc**

Run: `npx tsc --noEmit`
Expected: clean. The orchestrator `processSopScreenshots.ts` should compile unchanged because types flow structurally — `assignment.byStep` is now `Map<number, Pick[]>`, and `runUploadScreenshots`'s `byStep` parameter is the same.

- [ ] **Step 3: Checkpoint**

```bash
git add src/trigger/stages/uploadScreenshots.ts
git commit -m "feat(substep): persist description on Screenshot, omit blanks"
```

---

## Task 4: SOP API — surface `description`

**Files:**
- Modify: `src/app/api/sop/[id]/route.ts`

- [ ] **Step 1: Update the `screenshots` mapping**

Read `src/app/api/sop/[id]/route.ts`. Find the `screenshots: (s.screenshots ?? []).map(ss => ({ ... }))` block inside the `steps.map`. Update the mapped object to include `description`:

```ts
      screenshots: (s.screenshots ?? []).map(ss => ({
        frameId: ss.frameId,
        url: `/api/screenshots/${sopId}/${ss.frameId}.jpg`,
        t: ss.t,
        order: ss.order,
        description: ss.description,
      })),
```

(Add the `description: ss.description,` line. Leave the rest of the file untouched.)

- [ ] **Step 2: Run tsc**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Checkpoint**

```bash
git add src/app/api/sop/[id]/route.ts
git commit -m "feat(substep): include screenshot description in SOP API response"
```

---

## Task 5: Viewer — render description under each screenshot

**Files:**
- Modify: `src/components/StepCardScreenshots.tsx`

- [ ] **Step 1: Extend `ScreenshotItem` and the figure markup**

Read `src/components/StepCardScreenshots.tsx`. Make TWO edits:

A. Add `description?: string` to `ScreenshotItem`. Find:

```tsx
export type ScreenshotItem = {
  frameId: string;
  url: string;
  t: number;
  order: number;
};
```

Replace with:

```tsx
export type ScreenshotItem = {
  frameId: string;
  url: string;
  t: number;
  order: number;
  description?: string;
};
```

B. Update the `<figure>` markup inside the grid. Find the existing `<figure key={s.frameId} className="space-y-1.5">…</figure>` block and REPLACE it entirely with:

```tsx
            <figure key={s.frameId} className="space-y-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.url}
                alt={`${title} — ${fmt(s.t)}`}
                loading="lazy"
                className="w-full rounded-lg border border-gray-200 object-contain bg-[#FAFAFA]"
              />
              <figcaption className="space-y-1">
                {s.description && (
                  <p className="text-[13px] text-[#0A0A0A] leading-[1.5] whitespace-pre-line">
                    {s.description}
                  </p>
                )}
                <span className="inline-flex items-center gap-1.5 text-[11px] text-[#9CA3AF]">
                  <Camera className="w-3 h-3" strokeWidth={2} />
                  {fmt(s.t)}
                </span>
              </figcaption>
            </figure>
```

The two changes vs. existing markup: description renders above the timestamp when present; the timestamp's text color shrinks from `text-[#6B7280]` to a muted `text-[#9CA3AF]` and font size from `text-[12px]` to `text-[11px]` so the description owns the visual weight.

- [ ] **Step 2: Run tsc**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Checkpoint**

```bash
git add src/components/StepCardScreenshots.tsx
git commit -m "feat(substep): render description under each screenshot"
```

---

## Task 6: End-to-end manual smoke

**Files:** none (manual verification).

- [ ] **Step 1: Ensure servers are running**

If not already running:
- Trigger dev: `npx trigger.dev@4 dev`
- Next.js: `npm run dev`

- [ ] **Step 2: Upload a video in screenshot mode**

Open `http://localhost:3000/upload`. Select "Screenshots (POC)". Upload a short screen-recording or one of the samples (`samples/3.mp4` is a known-good 2.5min cooking video that should yield descriptions in Vietnamese).

- [ ] **Step 3: Verify descriptions in API response**

After processing finishes and the viewer loads, in browser DevTools console:

```js
fetch(window.location.pathname.replace("/sop/", "/api/sop/"))
  .then(r => r.json())
  .then(j => console.log(j.steps.flatMap(s => s.screenshots).map(ss => ({ t: ss.t, desc: ss.description }))));
```

Expected: an array of `{ t, desc }` objects. Most `desc` values should be non-empty strings in the source video's language (Vietnamese for sample 3). Some may be `undefined` for self-explanatory frames — that's intended.

- [ ] **Step 4: Verify viewer renders descriptions**

Scroll through the SOP page. Each screenshot with a description should show the caption text above the timestamp. Screenshots without a description should show only the timestamp.

- [ ] **Step 5: Verify Mongo doc**

Inspect the SOP doc in Mongo. Each step's `screenshots[]` entries should either contain a `description: "..."` field or omit it entirely. There should be no `description: null` or `description: ""` values stored — the conditional spread in Task 3 prevents that.

- [ ] **Step 6: Final checkpoint**

```bash
git add -A
git commit -m "feat(substep): end-to-end POC verified"
```

---

## Self-review notes

- **Spec §3.1 Mongo type:** Task 1 Step 2.
- **Spec §3.2 Zod schema (nullable description):** Task 1 Step 1.
- **Spec §4 prompt:** Task 1 Step 3 + Task 2 Step 3 (user-text reminder line).
- **Spec §5.1 `Pick` type + `resolveCrossStepDedup` change:** Task 2.
- **Spec §5.2 `uploadScreenshots` blank normalization:** Task 3.
- **Spec §5.3 orchestrator passthrough:** Covered by Task 3 tsc check (no edits needed).
- **Spec §5.4 SOP API:** Task 4.
- **Spec §6 viewer:** Task 5.
- **Spec §7.1 unit tests:** Task 2 Step 1.
- **Spec §7.2 end-to-end smoke:** Task 6.
- **Spec §8 out of scope:** No tasks for user-edit UI, PDF rendering, Loom, silent-path, migrations, or masonry layout — correctly omitted.
