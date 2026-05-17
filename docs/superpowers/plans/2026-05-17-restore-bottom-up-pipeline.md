# Restore Bottom-Up Screenshot Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the over-dropping top-down screenshot-pipeline middle (plan -> pick -> verify) with the restored bottom-up middle (CV event detection -> classify/merge -> LLM keep/discard -> assemble), keeping the yellow-circle point-highlight stage unchanged.

**Architecture:** Stages 1-5 (transcribe -> buildFramePool) and `uploadScreenshots` are unchanged. The new middle is `runExtractClickEvents` (frame-diff splitter) -> `runClassifyAndMergeEvents` (click vs input, merge typing) -> `classifyAndRemap` (per-event LLM keep/discard + caption + element intent) -> `buildActionsForStep` (dedup + assemble `Action[]`) -> a new highlight pass that calls `runLocateHighlight` per non-view action and writes the resulting point into `action.highlight`.

**Tech Stack:** TypeScript, node:test (`npx tsx --test <file>`), sharp, Zod, trigger.dev. `@/` alias maps to `src/`. Typecheck: `npx tsc --noEmit -p tsconfig.json`.

**Spec:** docs/superpowers/specs/2026-05-17-restore-bottom-up-pipeline-design.md

---

## File Structure

**Restored from git (`6a3da48~1`), then drift-reconciled:**
- `src/trigger/lib/clickEventDetect.ts` — CV frame-diff event detection (restored as-is, no drift).
- `src/trigger/lib/clickEventDetect.test.ts` — restored as-is.
- `src/trigger/stages/extractClickEvents.ts` — restored as-is (imports `DenseFrame`, still compatible).
- `src/trigger/stages/classifyAndMergeEvents.ts` — restored as-is.
- `src/trigger/stages/classifyAndMergeEvents.test.ts` — restored as-is.
- `src/trigger/stages/classifyStepWithLLM.ts` — restored, with one drift fix (`nearestCluster`).
- `src/trigger/stages/classifyStepWithLLM.test.ts` — restored as-is.

**Created new:**
- `src/trigger/stages/extractClickEvents.test.ts` — fresh test (no test at `6a3da48~1`).
- `src/trigger/stages/highlightActions.ts` — new highlight-pass glue.
- `src/trigger/stages/highlightActions.test.ts` — new test with injected fake highlighter.

**Rewritten (NOT a git restore):**
- `src/trigger/stages/buildActionsForStep.ts` — restored logic, emits the reconciled flat `Action`.
- `src/trigger/stages/buildActionsForStep.test.ts` — rewritten for the reconciled `Action`.

**Modified:**
- `src/lib/schemas.ts` — add `ClassifiedCandidate` + `StepClassification`; reconcile `Action` (drop `verifyMatch`, `pickedClusterLetter`).
- `src/trigger/processSopScreenshots.ts` — rewire stages 6+, error codes, remove trace plumbing.
- `src/lib/mongo.ts` — remove `ErrorCode` members `plan_failed`, `frame_pick_failed`.
- `src/config/index.ts` — remove `screenshots.selectFrame` and `screenshots.pickFrame`.
- `src/trigger/lib/screenId.ts` — remove `frameSharpness`, `selectInClusterFrame`, `clusterFor`.
- `src/trigger/lib/screenId.test.ts` — remove tests for the three deleted functions.

**Deleted:**
- `src/trigger/stages/planStep.ts` + `planStep.test.ts`
- `src/trigger/stages/pickFrame.ts` + `pickFrame.test.ts`
- `src/trigger/stages/verifyFrame.ts` + `verifyFrame.test.ts`
- `src/trigger/stages/buildAction.ts` + `buildAction.test.ts`
- `src/lib/pipelineTrace.ts` + `pipelineTrace.test.ts`

Note: `buildAction.ts`/`buildAction.test.ts` are top-down-only (`buildAction` is called only by the top-down orchestrator and consumes `FrameVerification`/`HighlightDecision`); they are deleted alongside the rest of the top-down middle.

---

## Task 1: Reconcile `Action` type and restore classifier schemas in `schemas.ts`

**Files:**
- `src/lib/schemas.ts` (modify)

- [ ] In `src/lib/schemas.ts`, locate the `Action` type (currently lines ~108-122). Remove the two top-down fields `verifyMatch` and `pickedClusterLetter` so it reads exactly:
```ts
export type Action = {
  stepIndex: number;
  order: number;
  verb: "click" | "input" | "select" | "link" | "view";
  description: string;
  displayFramePath: string;
  time: number;
  highlight?: {
    kind: "click" | "input";
    bbox?: { x: number; y: number; w: number; h: number };
    point?: { x: number; y: number };
  };
};
```
Leave every other schema (`BBox`, `Point`, `Highlight`, `HighlightDecision`, `SubStepPlan`, `StepPlan`, `FramePick`, `FrameVerification`) untouched. `HighlightDecision`/`SubStepPlan` are still imported by `locateHighlight.ts` and `StepPlan` by `narration.ts`; `FramePick`/`FrameVerification` may end up unused after the top-down stage deletions, but removing unused schema *exports* is out of scope for this plan.

- [ ] Immediately after the `Highlight` const (after line ~64) add the restored classifier schemas (these were deleted by `6a3da48`):
```ts
export const ClassifiedCandidate = z.object({
  index: z.number(),
  decision: z.enum(["action", "discard"]),
  verb: z.enum(["click", "input", "select", "link"]).nullable(),
  screenName: z.string().nullable(),
  screenCluster: z.string().nullable(),
  elementCaption: z.string().nullable(),
  bbox: BBox.nullable(),
  displayFrame: z.enum(["before", "after"]).nullable(),
  discardReason: z.enum(["transition", "hover", "press_flicker", "animation", "not_a_ui", "other"]).nullable(),
});

export const StepClassification = z.object({
  candidates: z.array(ClassifiedCandidate),
});
```
`BBox` is already defined above this point (line ~49), so the reference resolves.

- [ ] Typecheck — it WILL still report errors in `processSopScreenshots.ts`, `buildAction.ts`, `pickFrame.ts`, etc. (they read `verifyMatch`/`pickedClusterLetter`). That is expected; those files are deleted/rewritten in later tasks. Confirm there are NO new errors inside `schemas.ts` itself:
```
npx tsc --noEmit -p tsconfig.json 2>&1 | grep "src/lib/schemas.ts" || echo "schemas.ts clean"
```

- [ ] Commit:
```
git add src/lib/schemas.ts
printf '%s\n\n%s\n' "feat: reconcile Action type, restore classifier schemas" "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>" | git commit -F -
```

> **Mid-plan typecheck note (applies to Tasks 1–11):** this repo has **no
> pre-commit hook** (verified: empty `.husky/`, no `lint-staged`), so the
> commit succeeds even though the project typecheck is red. A pipeline swap
> of this size cannot keep `tsc` green between the first type change and the
> final rewire — the **project-wide typecheck only goes green at Task 12**.
> That is expected and by design. Until then, each task is verified by its
> own scoped typecheck grep + its own unit tests, as written in the steps.
> Never use `--no-verify` (there is no hook to bypass anyway).

---

## Task 2: Restore `clickEventDetect.ts` + its test

**Files:**
- `src/trigger/lib/clickEventDetect.ts` (restore)
- `src/trigger/lib/clickEventDetect.test.ts` (restore)

- [ ] Restore the module and its test from git:
```
git show 6a3da48~1:src/trigger/lib/clickEventDetect.ts > src/trigger/lib/clickEventDetect.ts
git show 6a3da48~1:src/trigger/lib/clickEventDetect.test.ts > src/trigger/lib/clickEventDetect.test.ts
```

- [ ] Drift reconciliation: this module has ZERO project imports — it imports only `sharp`. Confirm:
  - `import sharp from "sharp"` resolves (sharp is in `package.json`).
  - `detectClickEvents` accepts `{ t: number; localPath: string }[]` — this matches `DenseFrame` (`{ t, localPath }`) used by the caller in Task 3. No change needed.
  - It exports `ClickEvent`, `ClickDetectOptions`, `detectClickEvents`, `mergeEvents`, `bboxIou`. No type drift — `ClickEvent.bbox` is a plain `{x,y,w,h}`.

- [ ] Run the restored test:
```
npx tsx --test src/trigger/lib/clickEventDetect.test.ts
```
Expect all tests passing (4 `mergeEvents` unit tests + 2 `detectClickEvents` end-to-end tests).

- [ ] Commit:
```
git add src/trigger/lib/clickEventDetect.ts src/trigger/lib/clickEventDetect.test.ts
printf '%s\n\n%s\n' "feat: restore clickEventDetect CV frame-diff module" "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>" | git commit -F -
```

---

## Task 3: Restore `extractClickEvents.ts` + write a fresh test

**Files:**
- `src/trigger/stages/extractClickEvents.ts` (restore)
- `src/trigger/stages/extractClickEvents.test.ts` (create — no test exists at `6a3da48~1`)

- [ ] Restore the module:
```
git show 6a3da48~1:src/trigger/stages/extractClickEvents.ts > src/trigger/stages/extractClickEvents.ts
```

- [ ] Drift reconciliation:
  - It imports `type { DenseFrame } from "./buildFramePool"` — `DenseFrame` still exists in `src/trigger/stages/buildFramePool.ts` as `interface DenseFrame { t: number; localPath: string }`. Compatible.
  - It imports `detectClickEvents`, `ClickEvent`, `ClickDetectOptions` from `@/trigger/lib/clickEventDetect` (restored in Task 2). Compatible.
  - It imports `logger` from `@trigger.dev/sdk/v3`. Present.
  - `runExtractClickEvents` reads `args.opts` (a `ClickDetectOptions`) and a separate `args.maxCandidatesPerStep`. The `config.screenshots.clickDetect` block carries `maxCandidatesPerStep` as a sibling key alongside the `ClickDetectOptions` fields. The Task 8 call site therefore passes `opts: config.screenshots.clickDetect` and `maxCandidatesPerStep: config.screenshots.clickDetect.maxCandidatesPerStep` as two separate arguments — clearer, and it keeps the `maxCandidatesPerStep` value explicit. No change to this module.
  - No other drift. Module is pure step-assignment-by-time + per-step cap.

- [ ] Create `src/trigger/stages/extractClickEvents.test.ts`. `detectClickEvents` reads real image files, so the test mocks it via the module loader is not viable; instead test the pure step-assignment + cap logic by exercising `runExtractClickEvents` with a `denseFrames` array of two identical solid frames (yields zero detected events) AND by directly testing the assignment math. Since the assignment/cap logic is internal, expose it by testing through `runExtractClickEvents` with a stubbed detector. Use Node's module mocking via a thin re-export is overkill — instead the test covers the cap + assignment by calling `runExtractClickEvents` with frames that produce known events. Simplest reliable approach: generate real frames with planted changes at known times. Write:
```ts
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { runExtractClickEvents } from "./extractClickEvents";

async function frame(tmp: string, name: string, rects: { x: number; y: number; w: number; h: number }[]): Promise<string> {
  const p = path.join(tmp, name);
  const svgRects = rects.map(r => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="#000"/>`).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720"><rect width="1280" height="720" fill="#f5f5f5"/>${svgRects}</svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile(p);
  return p;
}

test("assigns a detected event to the step whose time range contains it", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "extract-"));
  try {
    // Frame at t=0 is blank; t=1 plants a block (event detected at t=0, assigned by t=0).
    const f0 = await frame(tmp, "f0.jpg", []);
    const f1 = await frame(tmp, "f1.jpg", [{ x: 400, y: 300, w: 200, h: 60 }]);
    const f2 = await frame(tmp, "f2.jpg", [{ x: 400, y: 300, w: 200, h: 60 }]);
    const byStep = await runExtractClickEvents({
      steps: [
        { stepIndex: 0, tStart: 0, tEnd: 0.5 },
        { stepIndex: 1, tStart: 0.5, tEnd: 2.0 },
      ],
      denseFrames: [
        { t: 0, localPath: f0 },
        { t: 1.0, localPath: f1 },
        { t: 1.5, localPath: f2 },
      ],
    });
    // Event time is the BEFORE-frame time = 0 -> step 0 (non-last, [tStart, tEnd)).
    assert.equal(byStep.get(0)!.length, 1);
    assert.equal(byStep.get(1)!.length, 0);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("last step uses an inclusive end so an event exactly at tEnd is kept", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "extract-"));
  try {
    const f0 = await frame(tmp, "f0.jpg", []);
    const f1 = await frame(tmp, "f1.jpg", [{ x: 400, y: 300, w: 200, h: 60 }]);
    // Event detected at the BEFORE frame time t=2.0, which equals the last step's tEnd.
    const byStep = await runExtractClickEvents({
      steps: [
        { stepIndex: 0, tStart: 0, tEnd: 2.0 },
        { stepIndex: 1, tStart: 2.0, tEnd: 2.0 },
      ],
      denseFrames: [
        { t: 2.0, localPath: f0 },
        { t: 2.5, localPath: f1 },
      ],
    });
    // Step 0 is non-last: range is [0, 2.0). Step 1 is last: range is [2.0, 2.0] inclusive.
    assert.equal(byStep.get(0)!.length, 0);
    assert.equal(byStep.get(1)!.length, 1);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("caps a step at maxCandidatesPerStep", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "extract-"));
  try {
    // f0 blank, then each frame adds one distinct block at a new location, so
    // consecutive diffs yield several separate events inside one step.
    const positions = [
      { x: 100, y: 100, w: 200, h: 60 },
      { x: 600, y: 100, w: 200, h: 60 },
      { x: 100, y: 400, w: 200, h: 60 },
      { x: 600, y: 400, w: 200, h: 60 },
      { x: 350, y: 250, w: 200, h: 60 },
    ];
    const frames: { t: number; localPath: string }[] = [
      { t: 0, localPath: await frame(tmp, "f0.jpg", []) },
    ];
    let accum: { x: number; y: number; w: number; h: number }[] = [];
    for (let i = 0; i < positions.length; i++) {
      accum = [...accum, positions[i]];
      frames.push({ t: i + 1, localPath: await frame(tmp, `f${i + 1}.jpg`, accum) });
    }
    const step = [{ stepIndex: 0, tStart: 0, tEnd: 100 }];

    // Uncapped first: the fixture MUST yield >= 2 events, otherwise the cap
    // assertion below would pass vacuously. Assert it so a too-weak fixture
    // fails loudly instead of silently.
    const uncapped = await runExtractClickEvents({ steps: step, denseFrames: frames });
    assert.ok(
      uncapped.get(0)!.length >= 2,
      `fixture must produce >=2 events for a meaningful cap test, got ${uncapped.get(0)!.length}`,
    );

    // Capped at 1: must trim to exactly 1.
    const capped = await runExtractClickEvents({
      steps: step, denseFrames: frames, maxCandidatesPerStep: 1,
    });
    assert.equal(capped.get(0)!.length, 1);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});
```
Note: the cap test first runs uncapped and asserts the fixture produced >=2
events — so if the planted sequence is too weak to exercise the cap, the test
**fails loudly** rather than passing vacuously. If that assertion fails during
implementation, add more distinct planted blocks until the fixture yields >=2
events; do not weaken the assertion.

- [ ] Run the test:
```
npx tsx --test src/trigger/stages/extractClickEvents.test.ts
```

- [ ] Commit:
```
git add src/trigger/stages/extractClickEvents.ts src/trigger/stages/extractClickEvents.test.ts
printf '%s\n\n%s\n' "feat: restore extractClickEvents stage with fresh test" "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>" | git commit -F -
```

---

## Task 4: Restore `classifyAndMergeEvents.ts` + its test

**Files:**
- `src/trigger/stages/classifyAndMergeEvents.ts` (restore)
- `src/trigger/stages/classifyAndMergeEvents.test.ts` (restore)

- [ ] Restore both files:
```
git show 6a3da48~1:src/trigger/stages/classifyAndMergeEvents.ts > src/trigger/stages/classifyAndMergeEvents.ts
git show 6a3da48~1:src/trigger/stages/classifyAndMergeEvents.test.ts > src/trigger/stages/classifyAndMergeEvents.test.ts
```

- [ ] Drift reconciliation:
  - It imports `type { ClickEvent }` and `bboxIou` from `@/trigger/lib/clickEventDetect` (restored in Task 2). Compatible.
  - It exports `RawEvent = ClickEvent & { kindHint: "click" | "input" }`. Pure logic, no config/type dependency. No drift.

- [ ] Run the restored test:
```
npx tsx --test src/trigger/stages/classifyAndMergeEvents.test.ts
```
Expect 5 tests passing.

- [ ] Commit:
```
git add src/trigger/stages/classifyAndMergeEvents.ts src/trigger/stages/classifyAndMergeEvents.test.ts
printf '%s\n\n%s\n' "feat: restore classifyAndMergeEvents stage" "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>" | git commit -F -
```

---

## Task 5: Restore `classifyStepWithLLM.ts` + its test, with one drift fix

**Files:**
- `src/trigger/stages/classifyStepWithLLM.ts` (restore + fix)
- `src/trigger/stages/classifyStepWithLLM.test.ts` (restore)

- [ ] Restore both files:
```
git show 6a3da48~1:src/trigger/stages/classifyStepWithLLM.ts > src/trigger/stages/classifyStepWithLLM.ts
git show 6a3da48~1:src/trigger/stages/classifyStepWithLLM.test.ts > src/trigger/stages/classifyStepWithLLM.test.ts
```

- [ ] Drift reconciliation — verify each import against the CURRENT codebase:
  - `import { llmJsonVision } from "@/lib/openrouter"` — present (`src/lib/openrouter.ts`, generic `llmJsonVision<T>`). Compatible.
  - `import { StepClassification, ClassifiedCandidate as ClassifiedCandidateSchema } from "@/lib/schemas"` — restored in Task 1. Compatible.
  - `import { config } from "@/config"` — reads `config.ai.visionModel`, `config.ai.prompts.classifyStepSystem(language)`, `config.screenshots.classify.maxCandidatesPerCall`, `config.screenshots.ground.{cropMultiplier,cropMinPx,cropMaxFrac,bboxPadPx}`, `config.screenshots.screenId.{maxMontageClusters,hammingThreshold}`. All present (verified in `src/config/index.ts`). Compatible.
  - `import { computeCropWindow, diffBboxInCrop, cropBboxToFullFrame, padBbox, type Bbox } from "@/trigger/lib/cropEvent"` — all five exports present in `src/trigger/lib/cropEvent.ts`. Compatible.
  - `import { maskedDHash, type ScreenCluster } from "@/trigger/lib/screenId"` — both present. Compatible. (Note: `selectInClusterFrame`/`clusterFor`/`frameSharpness` are NOT imported here, so Task 9's removals do not affect this module.)
  - `import { hammingDistance } from "@/trigger/lib/perceptualHash"` — present, signature `(a: string, b: string): number`. Compatible.
  - `import type { RawEvent } from "./classifyAndMergeEvents"` — restored in Task 4. Compatible.

- [ ] DRIFT FIX in `nearestCluster` (bottom of the file): the restored code iterates `cluster.members` and reads `mm.t`, but the CURRENT `ClusterMember` type is `{ frame: DensePoolFrame; dHash: string }` — there is no `.t` directly on a member; the time is `mm.frame.t`. Change the inner loop body so it reads `mm.frame.t`:
```ts
function nearestCluster(clusters: ScreenCluster[], t: number): ScreenCluster | null {
  if (clusters.length === 0) return null;
  let best = clusters[0];
  let bestDelta = Math.abs(clusters[0].representative.t - t);
  for (let i = 1; i < clusters.length; i++) {
    const m = clusters[i].members;
    for (const mm of m) {
      const d = Math.abs(mm.frame.t - t);
      if (d < bestDelta) { bestDelta = d; best = clusters[i]; }
    }
  }
  return best;
}
```
(`representative` is a `DensePoolFrame`, so `representative.t` is correct as-is. `representative.localPath` used in `buildMontage` is also correct.)

- [ ] Typecheck this file in isolation:
```
npx tsc --noEmit -p tsconfig.json 2>&1 | grep "classifyStepWithLLM.ts" || echo "classifyStepWithLLM.ts clean"
```

- [ ] Run the restored test:
```
npx tsx --test src/trigger/stages/classifyStepWithLLM.test.ts
```
Expect 4 tests passing (3 `chunkCandidatesBySort` + 1 `classifyStepWithLLM` with injected classifier).

- [ ] Commit:
```
git add src/trigger/stages/classifyStepWithLLM.ts src/trigger/stages/classifyStepWithLLM.test.ts
printf '%s\n\n%s\n' "feat: restore classifyStepWithLLM stage, fix nearestCluster member drift" "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>" | git commit -F -
```

---

## Task 6: Rewrite `buildActionsForStep.ts` to emit the reconciled `Action`

**Files:**
- `src/trigger/stages/buildActionsForStep.ts` (rewrite — NOT a git restore)
- `src/trigger/stages/buildActionsForStep.test.ts` (rewrite)

The restored `6a3da48~1` version emits the deleted `ElementAction`/`ViewAction` union. The dedup/grouping logic (group by screen, then by element, keep latest event per element, View actions for long unvisited clusters, chronological sort) is kept; the output mapping changes to the reconciled flat `Action`.

- [ ] Write `src/trigger/stages/buildActionsForStep.ts` in full:
```ts
import { logger } from "@trigger.dev/sdk/v3";
import type { Action } from "@/lib/schemas";
import type { ClassifiedActionRecord } from "./classifyStepWithLLM";
import type { ScreenCluster } from "@/trigger/lib/screenId";

const SUFFIX_SET = new Set(["button", "link", "field", "input", "icon", "tab", "menu", "item"]);

const VIEW_CAPTION: Record<string, string> = {
  en: "Review this screen before continuing.",
  vi: "Hãy xem màn hình này trước khi tiếp tục.",
};

function viewCaption(lang: string): string {
  return VIEW_CAPTION[lang] ?? VIEW_CAPTION.en;
}

export function normalizeElementId(s: string): string {
  let n = s.toLowerCase().trim().replace(/\s+/g, " ");
  n = n.replace(/[.,;:!?'"()\[\]]/g, "");
  const tokens = n.split(" ");
  if (tokens.length > 1 && SUFFIX_SET.has(tokens[tokens.length - 1])) {
    tokens.pop();
  }
  return tokens.join(" ");
}

function normalizeScreenName(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ").replace(/[.:!?]$/, "");
}

export type BuildActionsArgs = {
  stepIndex: number;
  classified: ClassifiedActionRecord[];
  screenClusters: ScreenCluster[];
  eventTimes: number[];
  viewMinDurationSec: number;
  language: string;
};

type ElementGroup = {
  verb: "click" | "input" | "select" | "link";
  caption: string;
  displayFramePath: string;
  time: number;
};

export function buildActionsForStep(args: BuildActionsArgs): Action[] {
  const surviving: ClassifiedActionRecord[] = [];
  for (const c of args.classified) {
    if (c.decision === "discard") {
      const reason = c.discardReason ?? "other";
      logger.info("pipeline.candidate.discarded", { stepIndex: args.stepIndex, index: c.index, reason });
      continue;
    }
    if (!c.verb || !c.screenName || !c.elementCaption || !c.fullFrameBbox || !c.displayFrame) {
      logger.warn("pipeline.classifier.incomplete_action", { stepIndex: args.stepIndex, index: c.index });
      continue;
    }
    surviving.push(c);
  }

  const screenGroups = new Map<string, ClassifiedActionRecord[]>();
  for (const c of surviving) {
    const key = normalizeScreenName(c.screenName!);
    const list = screenGroups.get(key) ?? [];
    list.push(c);
    screenGroups.set(key, list);
  }

  const orderedScreens = [...screenGroups.entries()].sort((a, b) => {
    const at = Math.min(...a[1].map(r => args.eventTimes[r.index]));
    const bt = Math.min(...b[1].map(r => args.eventTimes[r.index]));
    return at - bt;
  });

  const elementGroups: ElementGroup[] = [];
  orderedScreens.forEach(([screenKey, records], seq) => {
    const screenId = `${args.stepIndex}-${seq + 1}`;

    const byElement = new Map<string, ClassifiedActionRecord[]>();
    for (const r of records) {
      const id = normalizeElementId(r.elementCaption!);
      const list = byElement.get(id) ?? [];
      list.push(r);
      byElement.set(id, list);
    }

    for (const [elementId, group] of byElement.entries()) {
      const sortedByTime = [...group].sort((x, y) => args.eventTimes[x.index] - args.eventTimes[y.index]);
      const latest = sortedByTime[sortedByTime.length - 1];
      const hasInput = group.some(g => g.verb === "input");
      const verb = hasInput ? ("input" as const) : latest.verb!;
      if (sortedByTime.length > 1) {
        logger.info("pipeline.action.deduped", {
          stepIndex: args.stepIndex,
          screenId,
          elementId,
          keptTime: args.eventTimes[latest.index],
          droppedTimes: sortedByTime.slice(0, -1).map(r => args.eventTimes[r.index]),
        });
      }
      const displayFrame = latest.displayFrame!;
      elementGroups.push({
        verb,
        caption: latest.elementCaption!,
        displayFramePath: displayFrame === "after" ? latest.afterFramePath : latest.beforeFramePath,
        time: args.eventTimes[latest.index],
      });
    }
    void screenKey;
  });

  const elementTimes = elementGroups.map(a => a.time);
  const viewGroups: { caption: string; displayFramePath: string; time: number }[] = [];
  for (const cluster of args.screenClusters) {
    const span = cluster.timeSpan.end - cluster.timeSpan.start;
    if (span < args.viewMinDurationSec) continue;
    const overlaps = elementTimes.some(t => t >= cluster.timeSpan.start && t <= cluster.timeSpan.end);
    if (overlaps) continue;
    viewGroups.push({
      caption: viewCaption(args.language),
      displayFramePath: cluster.representative.localPath,
      time: (cluster.timeSpan.start + cluster.timeSpan.end) / 2,
    });
  }

  type Pending = { verb: Action["verb"]; description: string; displayFramePath: string; time: number };
  const pending: Pending[] = [
    ...elementGroups.map(e => ({ verb: e.verb, description: e.caption, displayFramePath: e.displayFramePath, time: e.time })),
    ...viewGroups.map(v => ({ verb: "view" as const, description: v.caption, displayFramePath: v.displayFramePath, time: v.time })),
  ];
  pending.sort((a, b) => a.time - b.time);

  return pending.map((p, order) => ({
    stepIndex: args.stepIndex,
    order,
    verb: p.verb,
    description: p.description,
    displayFramePath: p.displayFramePath,
    time: p.time,
  }));
}
```
Key mapping changes from the restored version: `description` <- `elementCaption` / view `caption`; `order` <- post-sort index; `stepIndex` <- arg; no `highlight` field (the highlight pass fills it in Task 7); the internal `screenId` / `screenName` / `bbox` / `durationSec` / `displayFrame` fields are dropped — they are not consumed downstream (`uploadScreenshots` reads only `displayFramePath`, `time`, `description`, `verb`, `highlight`).

- [ ] Write `src/trigger/stages/buildActionsForStep.test.ts` in full (rewritten for the reconciled `Action`; the old test asserted on `screenId`/`elementCaption`/`screenName` which no longer exist):
```ts
import { test } from "node:test";
import assert from "node:assert";
import { buildActionsForStep, normalizeElementId } from "./buildActionsForStep";
import type { ClassifiedActionRecord } from "./classifyStepWithLLM";
import type { ScreenCluster } from "@/trigger/lib/screenId";

function action(over: Partial<ClassifiedActionRecord>): ClassifiedActionRecord {
  return {
    index: 0,
    decision: "action",
    verb: "click",
    screenName: "Login page",
    screenCluster: "A",
    elementCaption: "Sign in button",
    bbox: { x: 0.1, y: 0.1, w: 0.1, h: 0.1 },
    displayFrame: "before",
    discardReason: null,
    fullFrameBbox: { x: 0.1, y: 0.1, w: 0.1, h: 0.1 },
    beforeFramePath: "/b.jpg",
    afterFramePath: "/a.jpg",
    ...over,
  };
}

function cluster(letter: string, start: number, end: number, repPath = "/rep.jpg"): ScreenCluster {
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

test("normalizeElementId lowercases, trims, collapses whitespace, strips closed-class suffixes", () => {
  assert.equal(normalizeElementId("Verify email button"), "verify email");
  assert.equal(normalizeElementId("Verify email"), "verify email");
  assert.equal(normalizeElementId("  Search field  "), "search");
  assert.equal(normalizeElementId("Companies LINK"), "companies");
  assert.equal(normalizeElementId("Marketing menu item"), "marketing menu");
});

test("drops discards including those with null discardReason", () => {
  const cls = [
    action({ index: 0 }),
    action({ index: 1, decision: "discard", verb: null, screenName: null, screenCluster: null, elementCaption: null, bbox: null, displayFrame: null, discardReason: "hover", fullFrameBbox: null }),
    action({ index: 2, decision: "discard", verb: null, screenName: null, screenCluster: null, elementCaption: null, bbox: null, displayFrame: null, discardReason: null, fullFrameBbox: null }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0, classified: cls, screenClusters: [cluster("A", 0, 3)],
    eventTimes: [1.0, 1.5, 2.0], viewMinDurationSec: 4.0, language: "en",
  });
  assert.equal(out.filter(a => a.verb !== "view").length, 1);
});

test("dedupes same (screenName, elementId) keeping the latest event", () => {
  const cls = [
    action({ index: 0, elementCaption: "Get started free button" }),
    action({ index: 1, elementCaption: "Get started free" }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0, classified: cls, screenClusters: [cluster("A", 0, 3)],
    eventTimes: [46.0, 47.5], viewMinDurationSec: 4.0, language: "en",
  });
  const elements = out.filter(a => a.verb !== "view");
  assert.equal(elements.length, 1);
  assert.equal(elements[0].time, 47.5);
});

test("verb-collapse rule: input wins over click", () => {
  const cls = [
    action({ index: 0, verb: "click", elementCaption: "Email field" }),
    action({ index: 1, verb: "input", elementCaption: "Email field" }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0, classified: cls, screenClusters: [cluster("A", 0, 3)],
    eventTimes: [1.0, 2.0], viewMinDurationSec: 4.0, language: "en",
  });
  const elements = out.filter(a => a.verb !== "view");
  assert.equal(elements.length, 1);
  assert.equal(elements[0].verb, "input");
});

test("emits a View action when a cluster persists >= threshold with zero overlapping actions", () => {
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: [action({ index: 0, screenName: "Page A" })],
    screenClusters: [cluster("A", 0, 1), cluster("B", 10, 20, "/rep-b.jpg")],
    eventTimes: [0.5], viewMinDurationSec: 4.0, language: "en",
  });
  const views = out.filter(a => a.verb === "view");
  assert.equal(views.length, 1);
  assert.equal(views[0].time, 15);
  assert.equal(views[0].displayFramePath, "/rep-b.jpg");
});

test("does NOT emit a View action when an action time overlaps the cluster span", () => {
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: [action({ index: 0, screenName: "Page B" })],
    screenClusters: [cluster("B", 10, 20)],
    eventTimes: [15], viewMinDurationSec: 4.0, language: "en",
  });
  assert.equal(out.filter(a => a.verb === "view").length, 0);
});

test("orders actions chronologically and assigns sequential order", () => {
  const cls = [
    action({ index: 0, elementCaption: "E1" }),
    action({ index: 1, elementCaption: "E2" }),
    action({ index: 2, elementCaption: "E3" }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0, classified: cls, screenClusters: [cluster("A", 0, 10)],
    eventTimes: [5.0, 1.0, 3.0], viewMinDurationSec: 100.0, language: "en",
  });
  const elements = out.filter(a => a.verb !== "view");
  assert.deepEqual(elements.map(e => e.description), ["E2", "E3", "E1"]);
  assert.deepEqual(elements.map(e => e.order), [0, 1, 2]);
});

test("uses the English caption for en and the Vietnamese caption for vi", () => {
  const baseArgs = {
    stepIndex: 0,
    classified: [] as ClassifiedActionRecord[],
    screenClusters: [cluster("X", 0, 10)],
    eventTimes: [] as number[],
    viewMinDurationSec: 4.0,
  };
  const en = buildActionsForStep({ ...baseArgs, language: "en" });
  const vi = buildActionsForStep({ ...baseArgs, language: "vi" });
  assert.equal(en[0].verb === "view" && en[0].description.includes("Review"), true);
  assert.equal(vi[0].verb === "view" && vi[0].description.includes("màn hình"), true);
});

test("emitted actions carry no highlight field (the highlight pass fills it later)", () => {
  const out = buildActionsForStep({
    stepIndex: 0, classified: [action({ index: 0 })], screenClusters: [cluster("A", 0, 3)],
    eventTimes: [1.0], viewMinDurationSec: 4.0, language: "en",
  });
  assert.equal(out[0].highlight, undefined);
});
```

- [ ] Run the test:
```
npx tsx --test src/trigger/stages/buildActionsForStep.test.ts
```

- [ ] Commit:
```
git add src/trigger/stages/buildActionsForStep.ts src/trigger/stages/buildActionsForStep.test.ts
printf '%s\n\n%s\n' "feat: rewrite buildActionsForStep to emit reconciled Action" "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>" | git commit -F -
```

---

## Task 7: New highlight-pass stage (`highlightActions.ts`) + test

**Files:**
- `src/trigger/stages/highlightActions.ts` (create)
- `src/trigger/stages/highlightActions.test.ts` (create)

The highlight pass runs AFTER `buildActionsForStep`, on the deduplicated `Action[]`. For each non-`view` action it calls `runLocateHighlight({ intent: action.description, verb: action.verb, framePath: action.displayFramePath })` and writes the returned `point` into `action.highlight`. `view` actions are left untouched. `runLocateHighlight` returns a `Decision` (`HighlightDecision`): `{ highlight: "yes"|"no", point?, bbox, noHighlightReason }`.

- [ ] TDD — write `src/trigger/stages/highlightActions.test.ts` first:
```ts
import { test } from "node:test";
import assert from "node:assert";
import { highlightActions } from "./highlightActions";
import type { Action } from "@/lib/schemas";

function act(over: Partial<Action>): Action {
  return {
    stepIndex: 0,
    order: 0,
    verb: "click",
    description: "Click the Sign in button",
    displayFramePath: "/frame.jpg",
    time: 1.0,
    ...over,
  };
}

test("writes a point highlight onto a non-view action when the highlighter returns a point", async () => {
  const actions = [act({ verb: "click" })];
  const out = await highlightActions({
    actions,
    highlighter: async () => ({ highlight: "yes", point: { x: 0.5, y: 0.4 }, bbox: null, noHighlightReason: null }),
  });
  assert.deepEqual(out[0].highlight, { kind: "click", point: { x: 0.5, y: 0.4 } });
});

test("maps verb 'input' to highlight kind 'input', everything else to 'click'", async () => {
  const out = await highlightActions({
    actions: [act({ verb: "input" }), act({ verb: "select", order: 1 }), act({ verb: "link", order: 2 })],
    highlighter: async () => ({ highlight: "yes", point: { x: 0.1, y: 0.2 }, bbox: null, noHighlightReason: null }),
  });
  assert.equal(out[0].highlight!.kind, "input");
  assert.equal(out[1].highlight!.kind, "click");
  assert.equal(out[2].highlight!.kind, "click");
});

test("leaves a view action untouched and never calls the highlighter for it", async () => {
  let calls = 0;
  const out = await highlightActions({
    actions: [act({ verb: "view", description: "Review this screen" })],
    highlighter: async () => { calls++; return { highlight: "yes", point: { x: 0, y: 0 }, bbox: null, noHighlightReason: null }; },
  });
  assert.equal(calls, 0);
  assert.equal(out[0].highlight, undefined);
});

test("leaves highlight unset when the highlighter returns no point", async () => {
  const out = await highlightActions({
    actions: [act({ verb: "click" })],
    highlighter: async () => ({ highlight: "no", point: null, bbox: null, noHighlightReason: "no_specific_target" }),
  });
  assert.equal(out[0].highlight, undefined);
});

test("grounds each call on the action's own displayFramePath and description", async () => {
  const seen: { intent: string; framePath: string }[] = [];
  await highlightActions({
    actions: [
      act({ verb: "click", description: "Click A", displayFramePath: "/a.jpg" }),
      act({ verb: "click", description: "Click B", displayFramePath: "/b.jpg", order: 1 }),
    ],
    highlighter: async (a) => { seen.push({ intent: a.intent, framePath: a.framePath }); return { highlight: "no", point: null, bbox: null, noHighlightReason: "no_specific_target" }; },
  });
  assert.deepEqual(seen, [
    { intent: "Click A", framePath: "/a.jpg" },
    { intent: "Click B", framePath: "/b.jpg" },
  ]);
});
```

- [ ] Write `src/trigger/stages/highlightActions.ts`:
```ts
import type { z } from "zod";
import type { Action, HighlightDecision } from "@/lib/schemas";
import { runLocateHighlight } from "./locateHighlight";

type Decision = z.infer<typeof HighlightDecision>;

export type HighlightFn = (args: {
  intent: string;
  verb: Action["verb"];
  framePath: string;
}) => Promise<Decision>;

function highlightKind(verb: Action["verb"]): "click" | "input" {
  return verb === "input" ? "input" : "click";
}

/**
 * Highlight pass: for each non-view action, ground a yellow-circle "click here"
 * point via runLocateHighlight and write it into action.highlight. Runs on the
 * deduplicated Action[] so the UI-TARS call count is bounded by final actions.
 */
export async function highlightActions(args: {
  actions: Action[];
  highlighter?: HighlightFn;
}): Promise<Action[]> {
  const highlighter: HighlightFn = args.highlighter ?? runLocateHighlight;
  for (const action of args.actions) {
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
      };
    }
  }
  return args.actions;
}
```
Note: `runLocateHighlight`'s parameter type is `{ intent; verb: SubStep["verb"]; framePath; highlighter? }` where `SubStep["verb"]` is `"click"|"input"|"select"|"link"|"view"` — identical to `Action["verb"]`, so passing `runLocateHighlight` as the default `HighlightFn` typechecks (the extra optional `highlighter?` arg is allowed by structural compatibility for a function with fewer required params).

- [ ] Run the test:
```
npx tsx --test src/trigger/stages/highlightActions.test.ts
```

- [ ] Typecheck this file:
```
npx tsc --noEmit -p tsconfig.json 2>&1 | grep "highlightActions.ts" || echo "highlightActions.ts clean"
```

- [ ] Commit:
```
git add src/trigger/stages/highlightActions.ts src/trigger/stages/highlightActions.test.ts
printf '%s\n\n%s\n' "feat: highlight pass — per-action yellow-circle point grounding" "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>" | git commit -F -
```

---

## Task 8: Rewire `processSopScreenshots.ts` stages 6+ (must precede all deletions)

**Files:**
- `src/trigger/processSopScreenshots.ts` (modify)

This task replaces the top-down middle (the `runWithConcurrency` block with `planStep`/`pickFrame`/`verifyFrame`/`buildAction`/trace plumbing, current lines ~125-322 — from `await setStatus(_id, "assigning");` through the close of the `try/catch` around `runWithConcurrency`) with the bottom-up middle. It MUST run before Tasks 9-12 so that the deleted files are no longer imported when their deletions land.

- [ ] Replace the import block at the top of the file. Remove these imports:
```ts
import { buildScreenClusters, clusterFor, selectInClusterFrame } from "@/trigger/lib/screenId";
import { assembleStepNarration, silentStepFallback, hasLocalizedViewCaption } from "@/trigger/lib/narration";
import { runPlanStep } from "./stages/planStep";
import { runPickFrame, computeSearchWindow, computeActionTime } from "./stages/pickFrame";
import { runVerifyFrame } from "./stages/verifyFrame";
import { runLocateHighlight } from "./stages/locateHighlight";
import { buildAction } from "./stages/buildAction";
import { runWithConcurrency } from "@/lib/concurrency";
import { traceEnabled, persistTrace, makeTrace, persistStepPlanTrace, makeStepPlanTrace, type ClusterSnapshot, type RawSubStepSnapshot } from "@/lib/pipelineTrace";
```
And add these:
```ts
import { buildScreenClusters } from "@/trigger/lib/screenId";
import { runExtractClickEvents } from "./stages/extractClickEvents";
import { runClassifyAndMergeEvents } from "./stages/classifyAndMergeEvents";
import { classifyAndRemap } from "./stages/classifyStepWithLLM";
import { buildActionsForStep } from "./stages/buildActionsForStep";
import { highlightActions } from "./stages/highlightActions";
```
Keep `import type { Action } from "@/lib/schemas";` and all stage 1-5 imports unchanged.

- [ ] Replace the entire top-down middle. The current block runs from the `await setStatus(_id, "assigning");` line (~line 125) through the closing of the `try { await runWithConcurrency(...) } catch { ... }` block (~line 322), i.e. everything from `await setStatus(_id, "assigning");` up to and NOT including `await setStatus(_id, "uploading-screenshots");`. Replace it with:
```ts
        // Stage 6: detect click events, classify click-vs-input, merge typing.
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
            denseFrames: pool!.denseFrames,
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

        // Stage 7: per-step LLM classification, dedup + assemble, highlight pass.
        const actionsByStep = new Map<number, Action[]>();
        try {
          for (const step of stepInputs) {
            const stepEvents = merged.get(step.stepIndex) ?? [];
            const clusters = await buildScreenClusters({
              denseFrames: pool!.denseFrames,
              stepStart: step.tStart,
              stepEnd: step.tEnd,
              samplingSec: config.screenshots.screenId.samplingSec,
              hammingThreshold: config.screenshots.screenId.hammingThreshold,
            });
            const classified = await classifyAndRemap({
              stepTitle: step.title,
              language: outputLanguage,
              events: stepEvents,
              screenClusters: clusters,
            });
            const actions = buildActionsForStep({
              stepIndex: step.stepIndex,
              classified,
              screenClusters: clusters,
              eventTimes: stepEvents.map(e => e.time),
              viewMinDurationSec: config.screenshots.screenId.viewMinDurationSec,
              language: outputLanguage,
            });
            await highlightActions({ actions });
            actionsByStep.set(step.stepIndex, actions);
          }
        } catch (e) {
          logger.error("screenshot classification failed", {
            e: String(e),
            stack: e instanceof Error ? e.stack : undefined,
          });
          return fail(_id, "generation_failed");
        }
```
Notes on this block:
  - `buildScreenClusters` second-arg shape (`denseFrames`, `stepStart`, `stepEnd`, `samplingSec`, `hammingThreshold`) is taken verbatim from the existing call in the current file — unchanged.
  - `eventTimes` MUST be `stepEvents.map(e => e.time)` — `buildActionsForStep` indexes `eventTimes[record.index]`, and `record.index` is the position in the `events` array passed to `classifyAndRemap`. The same `stepEvents` array is passed to both, so indices align.
  - Error codes: classification/click-detect failure -> `generation_failed`; frame-pool failure stays `screenshot_pool_failed` (unchanged, in the existing stage-5 block); the outer catch-all stays `unknown`. The top-down `plan_failed` / `frame_pick_failed` codes are no longer referenced anywhere after this edit.
  - All `traceEnabled()` / `persistTrace` / `makeTrace` / `persistStepPlanTrace` / `makeStepPlanTrace` / `ClusterSnapshot` / `RawSubStepSnapshot` usages are gone — they lived only in the deleted block.
  - `runWithConcurrency` is gone (the per-step loop is now sequential, matching the restored bottom-up orchestration at `3dd71ca~1`).
  - `narration` helpers (`assembleStepNarration`, `silentStepFallback`, `hasLocalizedViewCaption`) are gone — the bottom-up middle does not use narration; step ranges come straight from `resolved` (the `resolveTimes` output).

- [ ] Leave the `await setStatus(_id, "uploading-screenshots");` block and everything after it (the `runUploadScreenshots` call, step-doc composition, final `updateOne`, `events().insertOne`, `finally` dispose) exactly as-is. Confirm `runUploadScreenshots` is still called as `runUploadScreenshots({ sopId: _id.toHexString(), byStep: actionsByStep })` — its current signature takes only `{ sopId, byStep }` (no `language`).

- [ ] Typecheck the whole project. `processSopScreenshots.ts` itself must now be clean; the only remaining errors should be in files scheduled for deletion (`planStep.ts`, `pickFrame.ts`, `verifyFrame.ts`, `buildAction.ts`, `pipelineTrace.ts`, their tests, `screenId.test.ts`) which still reference `verifyMatch`/`pickedClusterLetter` or the soon-removed `ErrorCode` members:
```
npx tsc --noEmit -p tsconfig.json 2>&1 | grep "processSopScreenshots.ts" || echo "processSopScreenshots.ts clean"
```

- [ ] Commit:
```
git add src/trigger/processSopScreenshots.ts
printf '%s\n\n%s\n' "feat: rewire processSopScreenshots to the bottom-up middle" "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>" | git commit -F -
```

---

## Task 9: Delete the top-down middle stages

**Files:**
- `src/trigger/stages/planStep.ts` + `planStep.test.ts` (delete)
- `src/trigger/stages/pickFrame.ts` + `pickFrame.test.ts` (delete)
- `src/trigger/stages/verifyFrame.ts` + `verifyFrame.test.ts` (delete)
- `src/trigger/stages/buildAction.ts` + `buildAction.test.ts` (delete)

`processSopScreenshots.ts` no longer imports any of these (Task 8). `computeActionTime` and `computeSearchWindow` lived inside `pickFrame.ts` and are removed with it.

- [ ] Confirm nothing outside these files still imports them:
```
grep -rln "stages/planStep\|stages/pickFrame\|stages/verifyFrame\|stages/buildAction" src/ | grep -v -e "planStep" -e "pickFrame" -e "verifyFrame" -e "buildAction"
```
Expect no output.

- [ ] Delete the eight files:
```
git rm src/trigger/stages/planStep.ts src/trigger/stages/planStep.test.ts \
       src/trigger/stages/pickFrame.ts src/trigger/stages/pickFrame.test.ts \
       src/trigger/stages/verifyFrame.ts src/trigger/stages/verifyFrame.test.ts \
       src/trigger/stages/buildAction.ts src/trigger/stages/buildAction.test.ts
```

- [ ] Typecheck — remaining expected errors only in `pipelineTrace.ts`/`pipelineTrace.test.ts` and `screenId.test.ts`:
```
npx tsc --noEmit -p tsconfig.json 2>&1 | grep -E "planStep|pickFrame|verifyFrame|buildAction" || echo "no top-down-stage references remain"
```

- [ ] Commit:
```
printf '%s\n\n%s\n' "chore: delete top-down middle stages (plan/pick/verify/buildAction)" "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>" | git commit -F -
```

---

## Task 10: Remove top-down-only functions from `screenId.ts` and their tests

**Files:**
- `src/trigger/lib/screenId.ts` (modify)
- `src/trigger/lib/screenId.test.ts` (modify)

Remove `frameSharpness`, `selectInClusterFrame`, and `clusterFor`. Keep `DensePoolFrame`, `ClusterMember`, `ScreenCluster`, `maskedDHash`, `buildScreenClusters`, `chooseCentroid` — those are used by `classifyStepWithLLM.ts`.

- [ ] Confirm no surviving file imports the three functions:
```
grep -rln "frameSharpness\|selectInClusterFrame\|clusterFor" src/ | grep -v "screenId"
```
Expect no output (the only former caller, `processSopScreenshots.ts`, was rewired in Task 8).

- [ ] In `src/trigger/lib/screenId.ts` delete the `frameSharpness` function (the `export async function frameSharpness(localPath: string)` block plus its preceding doc comment), the `clusterFor` function (`export function clusterFor(...)`), and the `selectInClusterFrame` function (`export async function selectInClusterFrame(...)` through its closing brace). `selectInClusterFrame` is the only reader of `config.screenshots.selectFrame.actionNeighborhood`, so removing it removes the last consumer of that config (deleted in Task 11).

- [ ] In `src/trigger/lib/screenId.test.ts`:
  - Change the import block to drop `clusterFor`, `frameSharpness`, `selectInClusterFrame`:
```ts
import {
  buildScreenClusters,
  type DensePoolFrame,
  type ScreenCluster,
} from "./screenId";
```
  - Delete every test that exercises a removed function: `"clusterFor finds a cluster by letter"`, `"selectInClusterFrame prefers the in-window member nearest the action time"`, `"selectInClusterFrame falls back to representative when no member is in window"`, `"frameSharpness scores a blurred frame lower than the sharp original"`, `"selectInClusterFrame picks the sharpest frame in the action-time neighborhood"`, `"selectInClusterFrame returns distinct frames for distinct action times"`, `"selectInClusterFrame handles fewer than K frames in the window"`, `"selectInClusterFrame breaks a sharpness tie by nearest action time"`. Keep the three `buildScreenClusters` tests.
  - If `DensePoolFrame` or `ScreenCluster` become unused after the deletions, drop them from the import too (verify with a typecheck of the test file).

- [ ] Typecheck and run the trimmed test:
```
npx tsc --noEmit -p tsconfig.json 2>&1 | grep "screenId" || echo "screenId clean"
npx tsx --test src/trigger/lib/screenId.test.ts
```

- [ ] Commit:
```
git add src/trigger/lib/screenId.ts src/trigger/lib/screenId.test.ts
printf '%s\n\n%s\n' "chore: drop top-down-only frame-selection from screenId" "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>" | git commit -F -
```

---

## Task 11: Remove dead `selectFrame` / `pickFrame` config blocks

**Files:**
- `src/config/index.ts` (modify)

Both blocks are top-down-only and now have zero readers (`pickFrame.searchWindow*` was read by `computeSearchWindow` in the deleted `pickFrame.ts`; `selectFrame.actionNeighborhood` by the removed `selectInClusterFrame`).

- [ ] Confirm zero readers:
```
grep -rn "selectFrame\|screenshots.pickFrame" src/ | grep -v "src/config/index.ts"
```
Expect no output.

- [ ] In `src/config/index.ts`, inside the `screenshots` object, delete the `pickFrame: { ... }` block (the `searchWindowPrePadSec` / `searchWindowPostPadSec` object plus its comment) and the `selectFrame: { ... }` block (the `actionNeighborhood` object plus its comment). Leave `clickDetect`, `ground`, `screenId`, and `classify` intact.

- [ ] Typecheck:
```
npx tsc --noEmit -p tsconfig.json 2>&1 | grep "config/index.ts" || echo "config clean"
```

- [ ] Commit:
```
git add src/config/index.ts
printf '%s\n\n%s\n' "chore: remove dead selectFrame/pickFrame config blocks" "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>" | git commit -F -
```

---

## Task 12: Delete `pipelineTrace.ts` and remove dead `ErrorCode` members

**Files:**
- `src/lib/pipelineTrace.ts` + `src/lib/pipelineTrace.test.ts` (delete)
- `src/lib/mongo.ts` (modify)

After Task 8 the only importers of `pipelineTrace.ts` are `processSopScreenshots.ts` (now no longer importing it) and `pipelineTrace.test.ts`. The test imports the module under test, so deleting the module means deleting the test too.

- [ ] Confirm `processSopScreenshots.ts` no longer imports `pipelineTrace`:
```
grep -rln "pipelineTrace" src/ | grep -v "pipelineTrace.ts\|pipelineTrace.test.ts"
```
Expect no output.

- [ ] Delete both files:
```
git rm src/lib/pipelineTrace.ts src/lib/pipelineTrace.test.ts
```

- [ ] In `src/lib/mongo.ts`, in the `ErrorCode` union, delete the two lines:
```ts
  | "plan_failed"          // top-down pipeline: planStep retries exhausted
  | "frame_pick_failed"    // top-down pipeline: pickFrame retries exhausted (rare; per-sub-step retries-exhausted normally just drop the sub-step)
```
Leave `click_detect_failed`, `classify_failed`, `verify_failed`, `highlight_failed`, `screenshot_pool_failed`, `generation_failed`, and the rest of the union unchanged. (`click_detect_failed`/`classify_failed` stay even though the rewired orchestrator now uses `generation_failed` — they are not in the spec's deletion list, and removing them is out of scope.)

- [ ] Confirm no surviving code references the removed members:
```
grep -rn "plan_failed\|frame_pick_failed" src/ || echo "no references remain"
```

- [ ] Full typecheck — the project must now be fully clean:
```
npx tsc --noEmit -p tsconfig.json && echo "FULL TYPECHECK CLEAN"
```

- [ ] Commit:
```
git add src/lib/mongo.ts
printf '%s\n\n%s\n' "chore: delete pipelineTrace, drop dead ErrorCode members" "Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>" | git commit -F -
```

---

## Task 13: Full verification

**Files:** none (verification only)

- [ ] Run the full bottom-up test suite and confirm every file passes:
```
npx tsx --test \
  src/trigger/lib/clickEventDetect.test.ts \
  src/trigger/stages/extractClickEvents.test.ts \
  src/trigger/stages/classifyAndMergeEvents.test.ts \
  src/trigger/stages/classifyStepWithLLM.test.ts \
  src/trigger/stages/buildActionsForStep.test.ts \
  src/trigger/stages/highlightActions.test.ts \
  src/trigger/lib/screenId.test.ts
```

- [ ] Run the whole repo test suite (catch any collateral breakage):
```
npx tsx --test $(find src -name '*.test.ts')
```

- [ ] Full typecheck:
```
npx tsc --noEmit -p tsconfig.json && echo "FULL TYPECHECK CLEAN"
```

- [ ] Manual end-to-end (per spec "Verification"): re-run the screenshots pipeline on `samples/trimmed-hubspot_crm.mp4` and confirm — (1) roughly 10-15 screenshots per step (comparable to the May-13 SOPs, not the over-dropped `[4,1,1,4,5,7]`); (2) every non-view screenshot carries a yellow-circle point highlight; (3) the SOP finishes with status `done`. This step is operational and is not gated by a command in this plan.

- [ ] No commit — the previous tasks already committed every code change.

---
