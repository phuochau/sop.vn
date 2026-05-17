# Caption Canonicalization & Step-Wide Dedup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a text-only caption-reconciliation pass and step-wide dedup so the screenshots pipeline stops emitting redundant duplicate screenshots and inconsistent / wrong-language captions.

**Architecture:** A new `canonicalizeActions` stage runs inside the per-step loop, after classification, rewriting `screenName`/`elementCaption` on the classified records to consistent canonical forms (one LLM text call per step). `buildActionsForStep` then collapses *all* same-`(screen, element)` records in a step (the 4s time-window is removed). `screenName`/`elementCaption` are threaded onto the `Action` type and persisted to the `Screenshot` doc.

**Tech Stack:** TypeScript, trigger.dev v4, Zod, OpenRouter (`llmJson`), `node:test` via `npx tsx --test`.

**Reference:** spec at `docs/superpowers/specs/2026-05-17-caption-canonicalization-design.md`.

**Conventions:** Commit directly to `master`. Never use `--no-verify`. Commit-message trailer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`. Typecheck with `npx tsc --noEmit -p tsconfig.json`. Run tests with `npx tsx --test <file>`.

**Note on red-tree commits:** Tasks 1–2 deliberately commit a transient `tsc` error (resolved by Task 4). This repo has **no pre-commit hook** (verified — no `.husky/`, no `.git/hooks/pre-commit`), so these commits are not blocked. If you prefer a green tree throughout, do Tasks 1, 2, 4, 7 before the first commit — either is acceptable.

---

## File Structure

- **Create:** `src/trigger/stages/canonicalizeActions.ts` — the new stage.
- **Create:** `src/trigger/stages/canonicalizeActions.test.ts` — its unit tests.
- **Modify:** `src/lib/schemas.ts` — add `CanonicalizationOutput` schema; add `screenName`/`elementCaption` to the `Action` type.
- **Modify:** `src/config/index.ts` — add `ai.canonicalizeModel`; add `ai.prompts.canonicalizeSystem`; remove `screenshots.classify.dedupWindowSec`.
- **Modify:** `src/trigger/stages/buildActionsForStep.ts` — step-wide dedup; thread the two new fields.
- **Modify:** `src/trigger/stages/buildActionsForStep.test.ts` — update the dedup tests.
- **Modify:** `src/trigger/stages/collapseDuplicateActions.ts` — doc-comment update only (no logic change).
- **Modify:** `src/trigger/stages/uploadScreenshots.ts` — persist the two new fields.
- **Modify:** `src/lib/openrouter.ts` — fix the stale `zodToJsonSchemaLike` doc comment.
- **Modify:** `src/trigger/processSopScreenshots.ts` — wire `canonicalizeActions` into the per-step loop.
- **Modify:** test fixtures that construct `Action` literals (`collapseDuplicateActions.test.ts`, `highlightActions.test.ts`) — add the two new required fields. (These are the only two `Action`-literal test sites — verified by codebase search; `uploadScreenshots.test.ts` does NOT construct `Action` objects, it tests only the pure `rectSvg` / `circleSvg` / `buildBufferWithOptionalHighlight` helpers.)

---

### Task 1: Add `CanonicalizationOutput` schema and extend the `Action` type

**Files:**
- Modify: `src/lib/schemas.ts`

- [ ] **Step 1: Add the `CanonicalizationOutput` Zod schema**

Add near the other output schemas in `src/lib/schemas.ts` (after `ScreenshotPicksOutput`):

```typescript
export const CanonicalizationOutput = z.object({
  actions: z.array(z.object({
    index: z.number().int(),
    screenName: z.string(),
    elementCaption: z.string(),
  })),
});
```

This uses only `ZodObject` / `ZodArray` / `ZodNumber` / `ZodString`, all supported by `zodToJsonSchemaLike` in `openrouter.ts` — no converter change needed.

- [ ] **Step 2: Add `screenName` and `elementCaption` to the `Action` type**

Change the `Action` type (currently `schemas.ts:105`) to:

```typescript
export type Action = {
  stepIndex: number;
  order: number;
  verb: "click" | "input" | "select" | "link" | "view";
  description: string;
  screenName: string;
  elementCaption: string;
  displayFramePath: string;
  time: number;
  highlight?: {
    kind: "click" | "input";
    bbox?: { x: number; y: number; w: number; h: number };
    point?: { x: number; y: number };
  };
};
```

- [ ] **Step 3: Typecheck — expect failures, that is fine**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: errors in `buildActionsForStep.ts` and the `Action`-constructing test files (the new required fields are not yet supplied). These are fixed in Tasks 4 and 7. Do not commit yet.

- [ ] **Step 4: Commit**

```bash
git add src/lib/schemas.ts
git commit -m "feat(schemas): add CanonicalizationOutput + screenName/elementCaption on Action

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

(Committing a transient type error here is acceptable — it is resolved within this plan. If you prefer a green tree, do Task 1 + Task 4 + Task 7 before committing; either is fine.)

---

### Task 2: Add canonicalize config and prompt

**Files:**
- Modify: `src/config/index.ts`

- [ ] **Step 1: Add the `canonicalizeModel` key**

In `config.ai`, alongside `normalizeModel` / `contextModel`, add:

```typescript
    canonicalizeModel: "google/gemini-2.5-flash",
```

- [ ] **Step 2: Add the `canonicalizeSystem` prompt**

In `config.ai.prompts`, after `classifyStepSystem`, add:

```typescript
      canonicalizeSystem: (lang: string) =>
        `You reconcile a list of UI action labels extracted from ONE step of a screen recording.

Each action was labelled independently, so the same element can appear under different wording, casing, or language. Your job is to make the labels consistent.

You receive a JSON array of actions, each with: index, screenName, elementCaption, verb. (verb is context only — do not output it.)

For EACH input action, return: index, screenName, elementCaption.

Rules:
- Output every screenName and elementCaption in ${lang}. Keep brand, product, and technical terms (e.g. "HubSpot", "CRM", "CSV", "URL") in their original form.
- When two or more actions clearly refer to the SAME element, output an IDENTICAL screenName and elementCaption for all of them.
- Do NOT merge labels for elements that are genuinely different, even if their wording is similar.
- Keep elementCaption a SHORT reusable element name — not a sentence.
- Normalize casing and whitespace.
- Return exactly one entry per input index. Do not add, drop, or renumber indices.

Return strict JSON only.`,
```

- [ ] **Step 3: Remove the unused `dedupWindowSec` key**

In `config.screenshots.classify`, delete the line:

```typescript
      dedupWindowSec: 4.0,
```

Do NOT touch `screenshots.dedupWindowSeconds` or `screenshots.dedupHammingThreshold` — those are frame-pool filter keys, unrelated.

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: still the pre-existing failures from Task 1, PLUS a new error in `buildActionsForStep.ts:77` (`dedupWindowSec` no longer exists). That error is fixed in Task 4. No new unexpected errors.

- [ ] **Step 5: Commit**

```bash
git add src/config/index.ts
git commit -m "feat(config): add canonicalizeModel + canonicalizeSystem prompt, drop dedupWindowSec

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Create the `canonicalizeActions` stage

**Files:**
- Create: `src/trigger/stages/canonicalizeActions.ts`
- Create: `src/trigger/stages/canonicalizeActions.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/trigger/stages/canonicalizeActions.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert";
import { canonicalizeActions } from "./canonicalizeActions";
import type { ClassifiedActionRecord } from "./classifyStepWithLLM";

function rec(over: Partial<ClassifiedActionRecord>): ClassifiedActionRecord {
  return {
    index: 0,
    decision: "action",
    verb: "click",
    screenName: "contacts",
    elementCaption: "Companies link",
    displayFrameIndex: 0,
    discardReason: null,
    displayFramePath: "/f.jpg",
    ...over,
  };
}

// A fake llmFn that records calls and returns a scripted result.
function fakeLlm(result: { actions: { index: number; screenName: string; elementCaption: string }[] }) {
  const calls: unknown[] = [];
  const fn = async (opts: unknown) => { calls.push(opts); return result; };
  return { fn, calls };
}

test("rewrites screenName/elementCaption from the LLM result, keyed by index", async () => {
  const input = [
    rec({ index: 0, elementCaption: "Companies link" }),
    rec({ index: 1, elementCaption: "companies LINK" }),
  ];
  const { fn } = fakeLlm({ actions: [
    { index: 0, screenName: "Danh bạ", elementCaption: "Liên kết Companies" },
    { index: 1, screenName: "Danh bạ", elementCaption: "Liên kết Companies" },
  ]});
  const out = await canonicalizeActions({ classified: input, language: "vi", llmFn: fn });
  assert.equal(out.length, 2);
  assert.equal(out[0].elementCaption, "Liên kết Companies");
  assert.equal(out[1].elementCaption, "Liên kết Companies");
  assert.equal(out[0].screenName, "Danh bạ");
});

test("a record the LLM omits keeps its original values", async () => {
  const input = [rec({ index: 0 }), rec({ index: 1, elementCaption: "Import button" })];
  const { fn } = fakeLlm({ actions: [{ index: 0, screenName: "X", elementCaption: "Y" }] });
  const out = await canonicalizeActions({ classified: input, language: "vi", llmFn: fn });
  assert.equal(out[1].elementCaption, "Import button");
});

test("an unknown index in the LLM result is ignored", async () => {
  const input = [rec({ index: 0 })];
  const { fn } = fakeLlm({ actions: [
    { index: 0, screenName: "X", elementCaption: "Y" },
    { index: 99, screenName: "Z", elementCaption: "Z" },
  ]});
  const out = await canonicalizeActions({ classified: input, language: "vi", llmFn: fn });
  assert.equal(out.length, 1);
  assert.equal(out[0].elementCaption, "Y");
});

test("LLM throwing returns the input unchanged", async () => {
  const input = [rec({ index: 0, elementCaption: "Save button" })];
  const fn = async () => { throw new Error("boom"); };
  const out = await canonicalizeActions({ classified: input, language: "vi", llmFn: fn });
  assert.equal(out[0].elementCaption, "Save button");
});

test("discard records pass through untouched; length/order/index preserved", async () => {
  const input = [
    rec({ index: 0, elementCaption: "Next button" }),
    rec({ index: 1, decision: "discard", verb: null, screenName: null, elementCaption: null, displayFrameIndex: null, displayFramePath: "", discardReason: "hover" }),
    rec({ index: 2, elementCaption: "Back button" }),
  ];
  const { fn } = fakeLlm({ actions: [
    { index: 0, screenName: "S", elementCaption: "Tiếp" },
    { index: 2, screenName: "S", elementCaption: "Quay lại" },
  ]});
  const out = await canonicalizeActions({ classified: input, language: "vi", llmFn: fn });
  assert.deepEqual(out.map(r => r.index), [0, 1, 2]);
  assert.equal(out[1].decision, "discard");
  assert.equal(out[1].elementCaption, null);
});

test("empty / all-discard input returns input with NO LLM call", async () => {
  const allDiscard = [
    rec({ index: 0, decision: "discard", verb: null, screenName: null, elementCaption: null, displayFrameIndex: null, displayFramePath: "", discardReason: "hover" }),
  ];
  const { fn, calls } = fakeLlm({ actions: [] });
  const out1 = await canonicalizeActions({ classified: [], language: "vi", llmFn: fn });
  const out2 = await canonicalizeActions({ classified: allDiscard, language: "vi", llmFn: fn });
  assert.equal(out1.length, 0);
  assert.equal(out2.length, 1);
  assert.equal(calls.length, 0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/trigger/stages/canonicalizeActions.test.ts`
Expected: FAIL — `canonicalizeActions` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/trigger/stages/canonicalizeActions.ts`:

```typescript
import { logger } from "@trigger.dev/sdk/v3";
import { llmJson } from "@/lib/openrouter";
import { CanonicalizationOutput } from "@/lib/schemas";
import { config } from "@/config";
import type { ClassifiedActionRecord } from "./classifyStepWithLLM";

/**
 * Reconcile per-candidate captions within one step.
 *
 * Because the classifier runs one candidate per call (`maxCandidatesPerCall: 1`),
 * each candidate is labelled in isolation — the same element can come back with
 * different wording / casing / language across candidates. This stage sends the
 * step's action labels (text only, no images — cheap) to an LLM that rewrites
 * `screenName` / `elementCaption` into consistent canonical forms in the output
 * language, so the downstream `(screen, element)`-keyed dedup can collapse true
 * duplicates.
 *
 * Fail-safe: on any LLM failure, or for any record the LLM omits, the original
 * values are kept. The returned array always has the same length, order, and
 * `index` values as the input — `buildActionsForStep` relies on that.
 */
export type CanonicalizeLlmFn = (opts: {
  model: string;
  system: string;
  user: string;
  schema: typeof CanonicalizationOutput;
  schemaName: string;
  maxRetries: number;
}) => Promise<{ actions: { index: number; screenName: string; elementCaption: string }[] }>;

export async function canonicalizeActions(args: {
  classified: ClassifiedActionRecord[];
  language: string;
  /** Injectable for tests; defaults to the real `llmJson`. */
  llmFn?: CanonicalizeLlmFn;
}): Promise<ClassifiedActionRecord[]> {
  const { classified, language } = args;

  const canonicalizable = classified.filter(
    c => c.decision === "action" && c.screenName !== null && c.elementCaption !== null,
  );
  if (canonicalizable.length === 0) return classified;

  const input = canonicalizable.map(c => ({
    index: c.index,
    screenName: c.screenName,
    elementCaption: c.elementCaption,
    verb: c.verb,
  }));

  const llmFn = args.llmFn ?? (llmJson as unknown as CanonicalizeLlmFn);

  let result: { actions: { index: number; screenName: string; elementCaption: string }[] };
  try {
    result = await llmFn({
      model: config.ai.canonicalizeModel,
      system: config.ai.prompts.canonicalizeSystem(language),
      user: `Actions:\n${JSON.stringify(input, null, 2)}\n\nReturn { "actions": [{ "index": number, "screenName": string, "elementCaption": string }] }.`,
      schema: CanonicalizationOutput,
      schemaName: "canonicalization",
      maxRetries: config.ai.maxRetries,
    });
  } catch (e) {
    logger.warn("canonicalizeActions failed — using raw captions", { e: String(e) });
    return classified;
  }

  const byIndex = new Map<number, { screenName: string; elementCaption: string }>();
  for (const a of result.actions) {
    if (
      typeof a.screenName === "string" && a.screenName.trim() &&
      typeof a.elementCaption === "string" && a.elementCaption.trim()
    ) {
      byIndex.set(a.index, {
        screenName: a.screenName.trim(),
        elementCaption: a.elementCaption.trim(),
      });
    }
  }

  return classified.map(c => {
    if (c.decision !== "action") return c;
    const canon = byIndex.get(c.index);
    if (!canon) return c;
    return { ...c, screenName: canon.screenName, elementCaption: canon.elementCaption };
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test src/trigger/stages/canonicalizeActions.test.ts`
Expected: PASS — all 6 tests.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: same pre-existing failures from Tasks 1–2 (`buildActionsForStep.ts`, `Action`-constructing test files) — no new errors from `canonicalizeActions.ts`.

- [ ] **Step 6: Commit**

```bash
git add src/trigger/stages/canonicalizeActions.ts src/trigger/stages/canonicalizeActions.test.ts
git commit -m "feat(canonicalize): add canonicalizeActions step-level caption reconciliation

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Step-wide dedup + field threading in `buildActionsForStep`

**Files:**
- Modify: `src/trigger/stages/buildActionsForStep.ts`
- Modify: `src/trigger/stages/buildActionsForStep.test.ts`

- [ ] **Step 1: Update the tests first**

In `src/trigger/stages/buildActionsForStep.test.ts`:

(a) The test `"same-element events beyond dedupWindowSec stay separate actions"` (lines 69-79) is now WRONG — far-apart same-element events must collapse. Replace it with:

```typescript
test("same-element events collapse step-wide regardless of time gap", () => {
  const cls = [
    action({ index: 0, elementCaption: "Next button" }),
    action({ index: 1, elementCaption: "Next button" }),
  ];
  const out = buildActionsForStep({
    stepIndex: 0, classified: cls, screenClusters: [cluster("A", 0, 30)],
    eventTimes: [5.0, 20.0], viewMinDurationSec: 100.0, language: "en",
  });
  const elements = out.filter(a => a.verb !== "view");
  assert.equal(elements.length, 1);
  assert.equal(elements[0].time, 5.0);
});
```

(b) Add a test asserting the new fields are populated:

```typescript
test("element actions carry screenName and elementCaption; view actions carry empty strings", () => {
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: [action({ index: 0, screenName: "Login page", elementCaption: "Sign in button" })],
    screenClusters: [cluster("A", 0, 1), cluster("B", 10, 20, "/rep-b.jpg")],
    eventTimes: [0.5], viewMinDurationSec: 4.0, language: "en",
  });
  const element = out.find(a => a.verb !== "view")!;
  const view = out.find(a => a.verb === "view")!;
  assert.equal(element.screenName, "Login page");
  assert.equal(element.elementCaption, "Sign in button");
  assert.equal(view.screenName, "");
  assert.equal(view.elementCaption, "");
});
```

- [ ] **Step 2: Run the tests to verify the new ones fail**

Run: `npx tsx --test src/trigger/stages/buildActionsForStep.test.ts`
Expected: FAIL — the step-wide-collapse test fails (current code keeps them separate) and/or compile errors on the new-fields test.

- [ ] **Step 3: Implement step-wide dedup**

In `src/trigger/stages/buildActionsForStep.ts`, replace the time-window cluster/flush block (the `dedupWindowSec` lookup through the `for (const [elementId, group] of byElement.entries())` loop, currently lines 77-119) with:

```typescript
  const elementGroups: ElementGroup[] = [];
  for (const [elementId, group] of byElement.entries()) {
    const sortedByTime = [...group].sort(
      (x, y) => args.eventTimes[x.index] - args.eventTimes[y.index],
    );
    const anchor = sortedByTime[0];
    const hasInput = sortedByTime.some(g => g.verb === "input");
    const verb = hasInput ? ("input" as const) : anchor.verb!;
    if (sortedByTime.length > 1) {
      logger.info("pipeline.action.deduped", {
        stepIndex: args.stepIndex,
        elementId,
        keptTime: args.eventTimes[anchor.index],
        droppedTimes: sortedByTime.slice(1).map(r => args.eventTimes[r.index]),
      });
    }
    elementGroups.push({
      verb,
      caption: anchor.elementCaption!,
      screenName: anchor.screenName!,
      elementCaption: anchor.elementCaption!,
      displayFramePath: anchor.displayFramePath,
      time: args.eventTimes[anchor.index],
    });
  }
```

- [ ] **Step 4: Thread the new fields through the types**

Update the `ElementGroup` type (currently lines 41-46):

```typescript
type ElementGroup = {
  verb: "click" | "input" | "select" | "link";
  caption: string;
  screenName: string;
  elementCaption: string;
  displayFramePath: string;
  time: number;
};
```

Update the `Pending` type (currently line 135):

```typescript
  type Pending = { verb: Action["verb"]; description: string; screenName: string; elementCaption: string; displayFramePath: string; time: number };
```

Update the `pending` array construction (currently lines 136-139):

```typescript
  const pending: Pending[] = [
    ...elementGroups.map(e => ({ verb: e.verb, description: e.caption, screenName: e.screenName, elementCaption: e.elementCaption, displayFramePath: e.displayFramePath, time: e.time })),
    ...viewGroups.map(v => ({ verb: "view" as const, description: v.caption, screenName: "", elementCaption: "", displayFramePath: v.displayFramePath, time: v.time })),
  ];
```

Update the final `return pending.map(...)` (currently lines 142-149):

```typescript
  return pending.map((p, order) => ({
    stepIndex: args.stepIndex,
    order,
    verb: p.verb,
    description: p.description,
    screenName: p.screenName,
    elementCaption: p.elementCaption,
    displayFramePath: p.displayFramePath,
    time: p.time,
  }));
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx tsx --test src/trigger/stages/buildActionsForStep.test.ts`
Expected: PASS — all tests, including the rewritten step-wide-collapse test and the new-fields test. Note the existing test `"dedupes same-element events within the window, keeping the earliest"` still passes (collapse is now unconditional).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: `buildActionsForStep.ts` is now clean. Remaining failures: only the two `Action`-literal test fixtures `collapseDuplicateActions.test.ts` and `highlightActions.test.ts` — fixed in Task 7.

- [ ] **Step 7: Commit**

```bash
git add src/trigger/stages/buildActionsForStep.ts src/trigger/stages/buildActionsForStep.test.ts
git commit -m "feat(actions): step-wide caption dedup, thread screenName/elementCaption

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Update stale doc comments

**Files:**
- Modify: `src/trigger/stages/collapseDuplicateActions.ts`
- Modify: `src/lib/openrouter.ts`

- [ ] **Step 1: Update the `collapseDuplicateActions` doc comment**

In `src/trigger/stages/collapseDuplicateActions.ts`, the doc comment paragraph currently reads:

```
 * The click-event detector often fires several times across a single click
 * (the click highlight, then the transition). Those become separate actions
 * with the same displayed screen. With one-candidate-per-call classification
 * their screenName / elementCaption text varies, so the text-keyed dedup in
 * `buildActionsForStep` cannot catch them — but their *display frames* are
 * near-identical.
```

Replace that paragraph with:

```
 * The click-event detector often fires several times across a single click
 * (the click highlight, then the transition). Those become separate actions
 * with the same displayed screen. The `canonicalizeActions` pass unifies most
 * caption text so the text-keyed dedup in `buildActionsForStep` catches the
 * obvious repeats; this pass is the frame-keyed backstop for CV multi-fires
 * whose captions still differ but whose *display frames* are near-identical.
```

No logic change. `collapseDuplicateActions` still carries all `Action` fields through via `{ ...a, order }`.

- [ ] **Step 2: Update the stale schema-count comment in `openrouter.ts`**

In `src/lib/openrouter.ts`, the `zodToJsonSchemaLike` doc comment says `"sufficient for our 3 schemas"`. Replace that line with:

```
 * Minimal Zod → JSON Schema conversion sufficient for the pipeline's schemas.
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no new errors (comment-only changes).

- [ ] **Step 4: Commit**

```bash
git add src/trigger/stages/collapseDuplicateActions.ts src/lib/openrouter.ts
git commit -m "docs: refresh stale comments for canonicalize pass

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Persist `screenName` / `elementCaption` in `uploadScreenshots`

**Files:**
- Modify: `src/trigger/stages/uploadScreenshots.ts`

**Note — no unit test for this task.** `uploadScreenshots.test.ts` covers only the pure helpers (`rectSvg`, `circleSvg`, `buildBufferWithOptionalHighlight`) and is not touched. `runUploadScreenshots` does real I/O — it calls `putObject` (R2 upload) with no injection seam — so a unit test would require adding mocking infrastructure for a two-field literal copy. The change is fully covered by `tsc` (the fields must exist on `Action`) and by the Task 8 E2E run (the fields must appear on the persisted `Screenshot` docs in Mongo). This is a deliberate, scoped exception to TDD.

- [ ] **Step 1: Write the implementation**

In `src/trigger/stages/uploadScreenshots.ts`, in `runUploadScreenshots`, extend the `rec` object literal (currently lines 123-130) to include the two fields:

```typescript
      const rec: Screenshot = {
        frameId,
        r2Key,
        t: action.time,
        order,
        description: action.description,
        verb: action.verb,
        screenName: action.screenName,
        elementCaption: action.elementCaption,
      };
```

The `Screenshot` type (`src/lib/mongo.ts:40`) already declares `screenName?` and `elementCaption?` — no type change needed.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: `uploadScreenshots.ts` is clean (`action.screenName` / `action.elementCaption` resolve against the `Action` type from Task 1). Remaining failures: only the `Action`-literal test fixtures `collapseDuplicateActions.test.ts` / `highlightActions.test.ts` — fixed in Task 7.

- [ ] **Step 3: Confirm the existing helper tests still pass**

Run: `npx tsx --test src/trigger/stages/uploadScreenshots.test.ts`
Expected: PASS — unchanged (the file was not modified; this just confirms no regression).

- [ ] **Step 4: Commit**

```bash
git add src/trigger/stages/uploadScreenshots.ts
git commit -m "feat(upload): persist screenName/elementCaption onto Screenshot doc

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Wire `canonicalizeActions` into the pipeline + fix remaining fixtures

**Files:**
- Modify: `src/trigger/processSopScreenshots.ts`
- Modify: `src/trigger/stages/collapseDuplicateActions.test.ts`
- Modify: `src/trigger/stages/highlightActions.test.ts`

- [ ] **Step 1: Add the import**

In `src/trigger/processSopScreenshots.ts`, add to the stage imports (near the `classifyAndRemap` import):

```typescript
import { canonicalizeActions } from "./stages/canonicalizeActions";
```

- [ ] **Step 2: Wire the stage into the per-step loop**

In the per-step loop, the current code is:

```typescript
          const classified = await withStage("classify", () => classifyAndRemap({
            stepTitle: step.title,
            language: outputLanguage,
            events: stepEvents,
            denseFrames: pool!.denseFrames,
          }));
          const assembled = buildActionsForStep({
            stepIndex: step.stepIndex,
            classified,
            screenClusters: clusters,
```

Insert a `canonicalize` stage between them and pass its output to `buildActionsForStep`:

```typescript
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
```

(The rest of the `buildActionsForStep` call — `eventTimes`, `viewMinDurationSec`, `language` — is unchanged.)

- [ ] **Step 3: Fix the remaining `Action`-constructing test fixtures**

`collapseDuplicateActions.test.ts` and `highlightActions.test.ts` construct `Action` literals and will not compile against the new `Action` type. In each file, find the `Action`-building helper(s) and add `screenName` and `elementCaption` (any non-empty strings, e.g. `screenName: "S", elementCaption: "E"`) to the default object so all constructed actions satisfy the type.

- [ ] **Step 4: Typecheck — expect fully clean**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: PASS — zero errors. All `Action`-type consumers now supply the new fields.

- [ ] **Step 5: Run the affected test suites**

Run: `npx tsx --test src/trigger/stages/canonicalizeActions.test.ts src/trigger/stages/buildActionsForStep.test.ts src/trigger/stages/collapseDuplicateActions.test.ts src/trigger/stages/highlightActions.test.ts src/trigger/stages/uploadScreenshots.test.ts`
Expected: PASS. (Note: `runVisualExtract` tests elsewhere have 2 pre-existing unrelated failures on clean `master` — do not attempt to fix them.)

- [ ] **Step 6: Commit**

```bash
git add src/trigger/processSopScreenshots.ts src/trigger/stages/collapseDuplicateActions.test.ts src/trigger/stages/highlightActions.test.ts
git commit -m "feat(pipeline): wire canonicalizeActions into the screenshots step loop

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 8: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck + targeted test run**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: zero errors.

Run: `npx tsx --test src/trigger/stages/canonicalizeActions.test.ts src/trigger/stages/buildActionsForStep.test.ts src/trigger/stages/collapseDuplicateActions.test.ts src/trigger/stages/highlightActions.test.ts src/trigger/stages/uploadScreenshots.test.ts`
Expected: all PASS.

- [ ] **Step 2: Re-run the full untrimmed HubSpot video**

Upload + trigger the screenshots pipeline against `samples/hubspot_crm.mp4` (use `scripts/upload-full.mjs`, then trigger `process-sop-screenshots` via the trigger MCP). `STEPIKA_DEBUG_DIR` is set in `.env` — the per-step `decisions.json` + window frames will be dumped for inspection.

- [ ] **Step 3: Compare against the baseline**

Baseline tag `stable-2026-05-17-screenshots-90`: 85 screenshots, ~87% sampled accuracy, $0.2078, with duplicate clusters (`"Companies link"` ×4, etc.).

Confirm in the new run:
- screenshot count is **lower** (duplicates collapsed);
- `aiCost.byStage` now includes a `canonicalize` entry;
- sampled captions are consistent and in `vi` (no English leakage, no synonym drift);
- sampled image↔caption↔circle accuracy is **≥ baseline**.

Report the cost, screenshot count, and sampled accuracy to the user. Do NOT auto-tune further without user direction.

---

## Self-Review

**Spec coverage:** Stage A (`canonicalizeActions`) → Tasks 2, 3, 7. Stage B (step-wide dedup) → Tasks 2, 4. `Action`/`Screenshot` threading → Tasks 1, 4, 6. New Zod schema → Task 1. Config (`canonicalizeModel`, prompt, `dedupWindowSec` removal) → Task 2. Stale comments → Task 5. Empty-input short-circuit, fail-safe, identity contract → Task 3 tests + impl. E2E re-run → Task 8. Phase 2 (visual verification) is explicitly out of scope — no task, correct.

**Placeholder scan:** none — all code is given in full; the only "find the helper" instructions are in test-fixture tasks where the exact existing helper name is file-local and trivially located.

**Type consistency:** `Action` gains `screenName: string` + `elementCaption: string` (Task 1), supplied by `buildActionsForStep` (Task 4), preserved by `collapseDuplicateActions` via spread (verified — no change needed), consumed by `uploadScreenshots` (Task 6). `CanonicalizationOutput` defined in Task 1, imported in Task 3. `CanonicalizeLlmFn` is defined and exported in `canonicalizeActions.ts` and matches the subset of `llmJson`'s signature actually used. `canonicalizeModel` / `canonicalizeSystem` defined in Task 2, used in Task 3.
