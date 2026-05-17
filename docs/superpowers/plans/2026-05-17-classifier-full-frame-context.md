# Classifier Full-Frame Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `classifyStepWithLLM` full-screen context — the whole before/after frame with the detected change region drawn as a magenta marker box — so it discards spurious events and captions accurately.

**Architecture:** A new `markRegion` helper draws a magenta stroked rect onto a full frame via a sharp SVG composite. `classifyAndRemap` drops all cropping/bbox-mapping logic and instead marks the full before/after frames per event. `ClassifiedCandidate` loses its dead `bbox` field, the classifier prompt is rewritten for full-frame input with strengthened discards, and the now-unused `cropEvent.ts` plus `screenshots.ground` config block are deleted.

**Tech Stack:** TypeScript, node:test (`npx tsx --test <file>`), sharp, Zod. `@/` alias maps to `src/`. Typecheck: `npx tsc --noEmit -p tsconfig.json`.

**Spec:** docs/superpowers/specs/2026-05-17-classifier-full-frame-context-design.md

---

## File Structure

```
src/trigger/lib/markRegion.ts            NEW — markRegion(srcFramePath, bbox, outPath)
src/trigger/lib/markRegion.test.ts       NEW — fixture-based test
src/trigger/lib/cropEvent.ts             DELETED
src/trigger/lib/cropEvent.test.ts        DELETED
src/trigger/stages/classifyStepWithLLM.ts        REWORKED — full-frame marking, no crop
src/trigger/stages/classifyStepWithLLM.test.ts   UPDATED — new CandidateForLLM shape, no bbox
src/trigger/stages/buildActionsForStep.test.ts   UPDATED — drop bbox/fullFrameBbox
src/lib/schemas.ts                       UPDATED — drop ClassifiedCandidate.bbox
src/config/index.ts                      UPDATED — rewrite prompt, delete ground block
```

---

### Task 1: Add `markRegion` helper (TDD)

**Files:**
- `src/trigger/lib/markRegion.ts` (new)
- `src/trigger/lib/markRegion.test.ts` (new)

- [ ] Write the failing test `src/trigger/lib/markRegion.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { markRegion } from "./markRegion";

const FIXTURE = path.join(__dirname, "../stages/__fixtures__/sample-1080p.jpg");

test("markRegion writes a valid JPEG with the same pixel dimensions as the input", async () => {
  const src = await sharp(FIXTURE).metadata();
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "markregion-"));
  try {
    const outPath = path.join(tmpDir, "marked.jpg");
    await markRegion(FIXTURE, { x: 0.3, y: 0.4, w: 0.2, h: 0.15 }, outPath);
    assert.ok(fs.existsSync(outPath), "output file exists");
    const out = await sharp(outPath).metadata();
    assert.equal(out.format, "jpeg");
    assert.equal(out.width, src.width);
    assert.equal(out.height, src.height);
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
});

test("markRegion handles a bbox touching the frame edge without throwing", async () => {
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "markregion-"));
  try {
    const outPath = path.join(tmpDir, "edge.jpg");
    await markRegion(FIXTURE, { x: 0.0, y: 0.0, w: 0.1, h: 0.1 }, outPath);
    assert.ok(fs.existsSync(outPath));
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
});
```

- [ ] Run the test, confirm it fails (module not found): `npx tsx --test src/trigger/lib/markRegion.test.ts`

- [ ] Create `src/trigger/lib/markRegion.ts` with the real implementation (sharp SVG composite, magenta `#FF00FF` stroke, no `.rotate()`, sized to the frame's pixel dimensions):

```ts
import sharp from "sharp";

export type MarkBbox = { x: number; y: number; w: number; h: number }; // normalized 0..1

/**
 * Draw a magenta (#FF00FF) stroked rectangle (no fill) at `bbox` onto the full
 * frame at `srcFramePath` and write the result to `outPath`. The marker is an
 * SVG composited at the frame's native pixel dimensions, so marker and base
 * frame share one coordinate space. Magenta is used deliberately so the marker
 * is never confused with the yellow-circle highlight. When `bbox` touches a
 * frame edge the outward half of the stroke is clipped — that is acceptable.
 */
export async function markRegion(
  srcFramePath: string,
  bbox: MarkBbox,
  outPath: string,
): Promise<void> {
  const meta = await sharp(srcFramePath).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  if (!W || !H) throw new Error(`missing image metadata for ${srcFramePath}`);

  const rx = bbox.x * W;
  const ry = bbox.y * H;
  const rw = bbox.w * W;
  const rh = bbox.h * H;
  const strokeW = 4;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="none" stroke="#FF00FF" stroke-width="${strokeW}"/>
  </svg>`;

  await sharp(srcFramePath)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toFile(outPath);
}
```

- [ ] Run the test, confirm it passes: `npx tsx --test src/trigger/lib/markRegion.test.ts`
- [ ] Scoped typecheck: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "markRegion" || echo "markRegion clean"`
- [ ] Commit:

```bash
git add src/trigger/lib/markRegion.ts src/trigger/lib/markRegion.test.ts
printf '%s\n' \
  'Add markRegion helper for full-frame change markers' \
  '' \
  'Draws a magenta stroked rect onto a full frame via a sharp SVG' \
  'composite sized to the frame pixel dimensions.' \
  '' \
  'Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>' \
  | git commit -F -
```

---

### Task 2: Drop `bbox` from `ClassifiedCandidate` schema

**Files:**
- `src/lib/schemas.ts`

- [ ] In `src/lib/schemas.ts`, remove the `bbox: BBox.nullable(),` line from the `ClassifiedCandidate` object so it becomes exactly:

```ts
export const ClassifiedCandidate = z.object({
  index: z.number(),
  decision: z.enum(["action", "discard"]),
  verb: z.enum(["click", "input", "select", "link"]).nullable(),
  screenName: z.string().nullable(),
  screenCluster: z.string().nullable(),
  elementCaption: z.string().nullable(),
  displayFrame: z.enum(["before", "after"]).nullable(),
  discardReason: z.enum(["transition", "hover", "press_flicker", "animation", "not_a_ui", "other"]).nullable(),
});
```

- [ ] Keep the `BBox` export unchanged — it is still used by `Highlight` and `HighlightDecision`.
- [ ] This intentionally breaks `classifyStepWithLLM.ts` and the two test files until later tasks. Do NOT run the full typecheck yet.
- [ ] Scoped check that `schemas.ts` itself is fine: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "src/lib/schemas.ts" || echo "schemas.ts clean"`
- [ ] Commit:

```bash
git add src/lib/schemas.ts
printf '%s\n' \
  'Drop dead bbox field from ClassifiedCandidate schema' \
  '' \
  'The classifier is point-based; nothing consumed the bbox. The BBox' \
  'export stays for Highlight/HighlightDecision.' \
  '' \
  'Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>' \
  | git commit -F -
```

---

### Task 3: Rework `classifyStepWithLLM.ts` to full-frame marking

**Files:**
- `src/trigger/stages/classifyStepWithLLM.ts`

- [ ] Replace the `cropEvent` import block. Remove the import of `computeCropWindow`, `diffBboxInCrop`, `cropBboxToFullFrame`, `padBbox`, `type Bbox`. Add the `markRegion` import. The import region (lines 7-19) becomes:

```ts
import { llmJsonVision } from "@/lib/openrouter";
import { StepClassification, ClassifiedCandidate as ClassifiedCandidateSchema } from "@/lib/schemas";
import { config } from "@/config";
import { markRegion } from "@/trigger/lib/markRegion";
import type { RawEvent } from "./classifyAndMergeEvents";
import { maskedDHash, type ScreenCluster } from "@/trigger/lib/screenId";
import { hammingDistance } from "@/trigger/lib/perceptualHash";
```

- [ ] Replace the `CandidateForLLM` type — swap `diffBboxInCrop` / `beforeCropPath` / `afterCropPath` for `beforeMarkedPath` / `afterMarkedPath`:

```ts
export type CandidateForLLM = {
  index: number;
  time: number;
  kindHint: "click" | "input";
  beforeMarkedPath: string;
  afterMarkedPath: string;
  screenCluster: string | null;
};
```

- [ ] Replace the `ClassifiedActionRecord` type — drop `fullFrameBbox`:

```ts
export type ClassifiedActionRecord = ClassifiedCandidate & {
  beforeFramePath: string;
  afterFramePath: string;
};
```

- [ ] In `defaultClassifier`, replace the per-candidate `lines.push(...)` loop body so it drops the `diffBboxInCrop=(…)` fragment (keep the rest of the line):

```ts
  for (const c of args.candidates) {
    lines.push(
      `- index=${c.index} time=${c.time.toFixed(2)} kindHint=${c.kindHint} screenCluster=${c.screenCluster ?? "null"}`,
    );
  }
```

- [ ] In `defaultClassifier`, replace the per-candidate image-path push so it sends the marked full frames:

```ts
  for (const c of args.candidates) {
    imagePaths.push(c.beforeMarkedPath, c.afterMarkedPath);
  }
```

- [ ] Replace the entire `classifyAndRemap` function (drop the unused `perStepConcurrency?` arg, remove `computeCropWindow`/`sharp.extract`/`diffBboxInCrop`, mark full frames, remove `cropBboxToFullFrame`/`padBbox`/`fullBbox`). New body:

```ts
export async function classifyAndRemap(args: {
  stepTitle: string;
  language: string;
  events: RawEvent[];
  screenClusters: ScreenCluster[];
}): Promise<ClassifiedActionRecord[]> {
  if (args.events.length === 0) return [];

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "classify-"));
  try {
    const candidates: (CandidateForLLM & { event: RawEvent })[] = [];
    for (let i = 0; i < args.events.length; i++) {
      const e = args.events[i];
      const beforeMarkedPath = path.join(tmpDir, `c${i}-before.jpg`);
      const afterMarkedPath = path.join(tmpDir, `c${i}-after.jpg`);
      await markRegion(e.beforeFramePath, e.bbox, beforeMarkedPath);
      await markRegion(e.afterFramePath, e.bbox, afterMarkedPath);

      // When clusters exceed the montage cap, the montage is omitted (see buildMontage).
      // In that case the LLM has no letter→frame mapping to interpret, so every candidate
      // passes screenCluster=null. Spec §3 montage-overflow edge case.
      const overCap = args.screenClusters.length > config.screenshots.screenId.maxMontageClusters;
      const cluster = overCap ? null : nearestCluster(args.screenClusters, e.time);
      candidates.push({
        index: i,
        time: e.time,
        kindHint: e.kindHint,
        beforeMarkedPath,
        afterMarkedPath,
        screenCluster: cluster?.letter ?? null,
        event: e,
      });
    }

    const montagePath = await buildMontage(args.screenClusters, tmpDir, config.screenshots.screenId.maxMontageClusters);

    const classified = await classifyStepWithLLM({
      stepTitle: args.stepTitle,
      language: args.language,
      candidates: candidates.map(c => ({
        index: c.index,
        time: c.time,
        kindHint: c.kindHint,
        beforeMarkedPath: c.beforeMarkedPath,
        afterMarkedPath: c.afterMarkedPath,
        screenCluster: c.screenCluster,
      })),
      montageImagePath: montagePath,
    });

    // Cross-screen guard: if displayFrame === "after" but AFTER is on a different
    // screen than BEFORE (action triggered a page navigation), the AFTER frame is
    // the destination page — useless for illustrating the action. Force BEFORE.
    const beforeHashCache = new Map<string, string>();
    const afterHashCache = new Map<string, string>();
    async function hashOf(p: string, cache: Map<string, string>): Promise<string> {
      const cached = cache.get(p);
      if (cached) return cached;
      const h = await maskedDHash(p);
      cache.set(p, h);
      return h;
    }

    const records: ClassifiedActionRecord[] = [];
    for (const cc of classified) {
      const cand = candidates.find(c => c.index === cc.index);
      if (!cand) {
        logger.warn("pipeline.classifier.unknown_index", { index: cc.index });
        continue;
      }
      let displayFrame = cc.displayFrame;
      if (cc.decision === "action" && displayFrame === "after") {
        const bh = await hashOf(cand.event.beforeFramePath, beforeHashCache);
        const ah = await hashOf(cand.event.afterFramePath, afterHashCache);
        const dist = hammingDistance(bh, ah);
        if (dist > config.screenshots.screenId.hammingThreshold) {
          logger.info("pipeline.classifier.displayframe_overridden", {
            index: cc.index,
            time: cand.time,
            verb: cc.verb,
            llmChoice: "after",
            override: "before",
            hammingDistance: dist,
            reason: "after frame is a different screen (navigation)",
          });
          displayFrame = "before";
        }
      }
      records.push({
        ...cc,
        displayFrame,
        beforeFramePath: cand.event.beforeFramePath,
        afterFramePath: cand.event.afterFramePath,
      });
    }
    return records;
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}
```

- [ ] Verify `import sharp from "sharp";` is still needed — it is, `buildMontage` uses it. Leave it.
- [ ] Scoped typecheck — only the source file (its test is updated in Task 4): `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "classifyStepWithLLM.ts" || echo "classifyStepWithLLM.ts clean"`
- [ ] Do NOT commit yet — commit together with Task 4 so the test file stays in sync.

---

### Task 4: Update `classifyStepWithLLM.test.ts`

**Files:**
- `src/trigger/stages/classifyStepWithLLM.test.ts`

- [ ] Replace the `c(...)` factory to build the new `CandidateForLLM` shape:

```ts
function c(index: number, time: number, cluster: string | null): CandidateForLLM {
  return {
    index,
    time,
    kindHint: "click",
    beforeMarkedPath: "/b.jpg",
    afterMarkedPath: "/a.jpg",
    screenCluster: cluster,
  };
}
```

- [ ] In the `"classifyStepWithLLM forwards each chunk..."` test, remove the `bbox` line from the injected classifier's returned candidate object so the mapped object becomes:

```ts
        candidates: candidates.map(cand => ({
          index: cand.index,
          decision: "action" as const,
          verb: "click" as const,
          screenName: cand.screenCluster ?? "x",
          screenCluster: cand.screenCluster,
          elementCaption: `el${cand.index}`,
          displayFrame: "before" as const,
          discardReason: null,
        })),
```

- [ ] Run the tests: `npx tsx --test src/trigger/stages/classifyStepWithLLM.test.ts`
- [ ] Scoped typecheck: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "classifyStepWithLLM" || echo "classifyStepWithLLM clean"`
- [ ] Commit Tasks 3 + 4 together:

```bash
git add src/trigger/stages/classifyStepWithLLM.ts src/trigger/stages/classifyStepWithLLM.test.ts
printf '%s\n' \
  'Rework classifyStepWithLLM to full-frame marked context' \
  '' \
  'Replace per-event crops with magenta-marked full before/after frames.' \
  'Drop crop/bbox-mapping logic, fullFrameBbox, and the unused' \
  'perStepConcurrency arg.' \
  '' \
  'Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>' \
  | git commit -F -
```

---

### Task 5: Update `buildActionsForStep.test.ts`

**Files:**
- `src/trigger/stages/buildActionsForStep.test.ts`

- [ ] In the `action(...)` factory, remove the `bbox:` and `fullFrameBbox:` lines so it becomes:

```ts
function action(over: Partial<ClassifiedActionRecord>): ClassifiedActionRecord {
  return {
    index: 0,
    decision: "action",
    verb: "click",
    screenName: "Login page",
    screenCluster: "A",
    elementCaption: "Sign in button",
    displayFrame: "before",
    discardReason: null,
    beforeFramePath: "/b.jpg",
    afterFramePath: "/a.jpg",
    ...over,
  };
}
```

- [ ] In the `"drops discards including those with null discardReason"` test, remove `bbox: null` and `fullFrameBbox: null` from both inline `over` partials so the array becomes:

```ts
  const cls = [
    action({ index: 0 }),
    action({ index: 1, decision: "discard", verb: null, screenName: null, screenCluster: null, elementCaption: null, displayFrame: null, discardReason: "hover" }),
    action({ index: 2, decision: "discard", verb: null, screenName: null, screenCluster: null, elementCaption: null, displayFrame: null, discardReason: null }),
  ];
```

- [ ] Run the tests: `npx tsx --test src/trigger/stages/buildActionsForStep.test.ts`
- [ ] Scoped typecheck: `npx tsc --noEmit -p tsconfig.json 2>&1 | grep "buildActionsForStep.test.ts" || echo "buildActionsForStep.test.ts clean"`
- [ ] Commit:

```bash
git add src/trigger/stages/buildActionsForStep.test.ts
printf '%s\n' \
  'Drop bbox/fullFrameBbox from buildActionsForStep test fixtures' \
  '' \
  'Both fields are removed from ClassifiedActionRecord/ClassifiedCandidate.' \
  '' \
  'Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>' \
  | git commit -F -
```

---

### Task 6: Delete `cropEvent.ts` and its test

**Files:**
- `src/trigger/lib/cropEvent.ts` (delete)
- `src/trigger/lib/cropEvent.test.ts` (delete)

- [ ] Confirm nothing imports it anymore: `grep -rln "cropEvent" src/ || echo "no importers"` — expect `no importers` (the only former importer, `classifyStepWithLLM.ts`, was reworked in Task 3).
- [ ] Delete both files via git:

```bash
git rm src/trigger/lib/cropEvent.ts src/trigger/lib/cropEvent.test.ts
```

- [ ] Commit:

```bash
printf '%s\n' \
  'Delete cropEvent helper — no longer used after full-frame rework' \
  '' \
  'Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>' \
  | git commit -F -
```

---

### Task 7: Rewrite the `classifyStepSystem` prompt and clean up config

**Files:**
- `src/config/index.ts`

- [ ] Replace the entire `classifyStepSystem` prompt (the function from `classifyStepSystem: (lang: string) =>` through its closing backtick) with the full-frame version:

```ts
      classifyStepSystem: (lang: string) =>
        `You classify candidate user actions from a screen recording into structured records, and discard candidates that are not real user actions.

You receive:
- The step's title.
- An optional SCREEN MONTAGE image: a row of up to 6 representative full BEFORE frames for this step, each labeled with a cluster letter (A, B, C, ...). When present, every candidate's BEFORE frame matches one of these clusters. When absent, treat each candidate independently.
- A series of candidates. Each candidate has: an index, an event time, a kind hint (click | input), a full BEFORE frame and a full AFTER frame. On both frames the detected change region is outlined with a MAGENTA rectangle — that outline marks the element this candidate is about; it is not part of the UI. The candidate also references its cluster letter (or null if no montage).

For each candidate, decide:

1) decision = "action" OR "discard".

2) If "action":
   - verb: "click" (button, link, tab, menu item, icon, row, card, checkbox, radio), "input" (typing into a text field, textarea, search), "select" (picking an option from an open dropdown / autocomplete), or "link" (clicking a hyperlink that navigates).
   - screenName: the visible page/screen identifier from the BEFORE frame or the matching montage frame — usually the page heading text or modal title. If no heading is visible, give a short functional name ("Signup form", "Contacts list"). Lower-case, trimmed, normalize whitespace.
   - screenCluster: the letter (A/B/C...) of the candidate's BEFORE frame in the montage, or null if no montage was provided.
   - elementCaption: a SHORT REUSABLE element name — NOT a sentence. Examples: "Verify email button", "verification code input", "Companies link", "Search field". Name the element inside the magenta outline. For two candidates targeting the same element, the elementCaption MUST be identical.
   - displayFrame: "after" for verb === "input" (typed text only appears in AFTER) and for click verbs whose action REVEALS new UI in the AFTER frame (flyout, dropdown, modal, autocomplete). "before" otherwise.

3) If "discard":
   - discardReason: "transition" (large-area pixel change, page navigation, OR a frame caught mid-transition / fade while the screen is animating between two states), "hover" (state-only change with no click target), "press_flicker" (second event in a tiny window after a click on the same element — animation by-product), "animation" (repeating motion in same region — spinner, loader, progress screen, or a loading / "setting up…" page with no user control), "not_a_ui" (the marked region is NOT a real interactive UI element the user deliberately operated — e.g., a person on camera / webcam talking-head, a presenter holding props or illustrative icons, a title slide, an intro/outro animation, a generic stock graphic, a logo bug, OR incidental product chrome such as a chat-widget bubble, a cookie / consent banner, or a notification toast), "other".
   - All "action" fields must be null.

You now see the WHOLE screen, so you can and must recognise context that a crop would hide. DISCARD aggressively when the marked region is:
- incidental product chrome — chat-widget bubbles, cookie / consent banners, notification toasts (discardReason: "not_a_ui");
- a loading / progress screen — spinners, progress bars, "setting up…" pages with no control the user can act on (discardReason: "animation");
- a mid-transition / fade frame — the screen is visibly animating between two states (discardReason: "transition").
Only emit verb: "click" / "input" / "select" / "link" when the BEFORE frame clearly shows an application interface and the marked region is an element the user deliberately interacted with.

IMPORTANT: Many training videos open with a presenter on camera or an animated intro before any real application screen is shown. Icons or graphics appearing in those segments are NOT clickable UI elements and MUST be discarded with discardReason: "not_a_ui".

Coordinates are normalized 0..1 (top-left origin).

LANGUAGE: Output every screenName and elementCaption in ${lang}. Keep technical / industry / brand terms in their original form.

Return strict JSON only.`,
```

- [ ] Delete the entire `screenshots.ground` block (the `ground: { ... }` property, lines 145-151).
- [ ] In `screenshots.classify`, remove the dead `perStepConcurrency: 5,` key. The block becomes:

```ts
    classify: {
      maxCandidatesPerCall: 12,
    },
```

- [ ] Confirm no remaining readers: `grep -rn "screenshots.ground\|\.perStepConcurrency" src/ || echo "no readers"` — expect `no readers`.
- [ ] Full typecheck — must be fully clean now: `npx tsc --noEmit -p tsconfig.json && echo "TYPECHECK CLEAN"`
- [ ] Run the full affected test set:
  - `npx tsx --test src/trigger/lib/markRegion.test.ts`
  - `npx tsx --test src/trigger/stages/classifyStepWithLLM.test.ts`
  - `npx tsx --test src/trigger/stages/buildActionsForStep.test.ts`
- [ ] Commit:

```bash
git add src/config/index.ts
printf '%s\n' \
  'Rewrite classifier prompt for full-frame input; drop dead config' \
  '' \
  'Prompt now describes magenta-marked full before/after frames and' \
  'strengthens discards (chat widgets, banners, toasts, loading screens,' \
  'transition frames). Delete the dead screenshots.ground block and the' \
  'unused classify.perStepConcurrency key.' \
  '' \
  'Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>' \
  | git commit -F -
```

---

### Task 8: Final verification

**Files:** none (verification only)

- [ ] Full typecheck clean: `npx tsc --noEmit -p tsconfig.json && echo "TYPECHECK CLEAN"`
- [ ] All touched tests green:
  - `npx tsx --test src/trigger/lib/markRegion.test.ts`
  - `npx tsx --test src/trigger/stages/classifyStepWithLLM.test.ts`
  - `npx tsx --test src/trigger/stages/buildActionsForStep.test.ts`
- [ ] Confirm `cropEvent` is gone and unreferenced: `git ls-files | grep cropEvent || echo "cropEvent removed"`
- [ ] Manual verification (per spec §Verification, optional, not blocking): re-run the pipeline on `samples/trimmed-hubspot_crm.mp4`, re-fetch the screenshots, and confirm the chat-widget bubble and loading screens are no longer emitted, captions match the screen shown, and the yellow circle lands on the named element. Compare against the 5/8-broken baseline.
