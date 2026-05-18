# Sub-Step Automation Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Attach a structured, DOM-agnostic `automation` descriptor to every actionable sub-step of a generated SOP, so a future automation agent can reproduce the workflow.

**Architecture:** The classifier VLM call (already one call per sub-step candidate) additionally emits an `automation` object — `{ target, inputValue?, expectedOutcome? }`. It rides the existing `ClassifiedCandidate` → `ClassifiedActionRecord` → `Action` → `Screenshot` rails. `buildActionsForStep` assembles the final `automation` (adding a derived `action` field). It is persisted on `Screenshot` and exposed by the share API. Store-only — no UI, no runner.

**Tech Stack:** TypeScript, Zod, Next.js (App Router), trigger.dev v4, Node.js test runner (`node:test`), MongoDB.

**Spec:** `docs/superpowers/specs/2026-05-18-substep-automation-metadata-design.md`

---

## File Structure

- `src/lib/schemas.ts` — add `AutomationAction` type, `AutomationFields` Zod schema, `AutomationMeta` type, `verbToAutomationAction` helper; add `automation` to `ClassifiedCandidate`; add `automation?` to `Action`.
- `src/lib/schemas.test.ts` — tests for the new schema/helper.
- `src/config/index.ts` — extend the `classifyStepSystem` prompt with an automation-metadata block.
- `src/trigger/stages/classifyStepWithLLM.test.ts` — regression test: `automation` flows through.
- `src/trigger/stages/buildActionsForStep.ts` — assemble `Action.automation` from records.
- `src/trigger/stages/buildActionsForStep.test.ts` — tests for the assembly.
- `src/trigger/stages/canonicalizeActions.test.ts` — regression test: `automation` preserved.
- `src/lib/mongo.ts` — add `automation?` to `Screenshot`.
- `src/trigger/stages/uploadScreenshots.ts` — copy `automation` from `Action` to `Screenshot` via a small pure helper.
- `src/trigger/stages/uploadScreenshots.test.ts` — test the helper.
- `src/app/api/share/[token]/route.ts` — include `automation` in the screenshot response object.

`classifyStepWithLLM.ts` and `canonicalizeActions.ts` need **no production change** — both propagate `automation` automatically through existing object spreads (`{ ...cc }` and `{ ...c }` respectively). Tasks 2 and 3 add regression tests confirming that.

---

## Task 1: Schema, type, and helper

**Files:**
- Modify: `src/lib/schemas.ts`
- Test: `src/lib/schemas.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/schemas.test.ts`. Update the existing import line `import { HighlightDecision } from "./schemas";` to:

```ts
import {
  HighlightDecision,
  AutomationFields,
  ClassifiedCandidate,
  verbToAutomationAction,
} from "./schemas";
```

Append these tests:

```ts
test("AutomationFields parses a full object", () => {
  const parsed = AutomationFields.parse({
    target: { text: "Save", role: "button", location: "top-right toolbar" },
    inputValue: { field: "email", valueType: "email", example: "j***@***.com" },
    expectedOutcome: "the contact form opens",
  });
  assert.equal(parsed.target.role, "button");
  assert.equal(parsed.inputValue?.valueType, "email");
});

test("AutomationFields allows inputValue and expectedOutcome to be omitted", () => {
  const parsed = AutomationFields.parse({
    target: { text: "Companies", role: "link", location: "left sidebar" },
  });
  assert.equal(parsed.inputValue ?? null, null);
  assert.equal(parsed.expectedOutcome ?? null, null);
});

test("verbToAutomationAction maps each actionable verb", () => {
  assert.equal(verbToAutomationAction("click"), "click");
  assert.equal(verbToAutomationAction("input"), "type");
  assert.equal(verbToAutomationAction("select"), "select");
  assert.equal(verbToAutomationAction("link"), "navigate");
});

test("ClassifiedCandidate accepts automation and allows it to be absent", () => {
  const withAuto = ClassifiedCandidate.parse({
    index: 0, decision: "action", verb: "click",
    screenName: "x", elementCaption: "Save button", displayFrameIndex: 0,
    discardReason: null,
    automation: { target: { text: "Save", role: "button", location: "toolbar" } },
  });
  assert.ok(withAuto.automation);
  const without = ClassifiedCandidate.parse({
    index: 1, decision: "discard", verb: null,
    screenName: null, elementCaption: null, displayFrameIndex: null,
    discardReason: "hover",
  });
  assert.equal(without.automation ?? null, null);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx tsx --test src/lib/schemas.test.ts`
Expected: FAIL — `AutomationFields`, `verbToAutomationAction` not exported; `ClassifiedCandidate` rejects unknown `automation` key is not the failure (Zod strips unknown keys by default) but the import will fail to compile.

- [ ] **Step 3: Add the schema, types, and helper**

In `src/lib/schemas.ts`, immediately after the `Highlight` schema block (after the closing `});` of `export const Highlight = z.object({...})`) and before `export const ClassifiedCandidate`, insert:

```ts
export type AutomationAction = "click" | "type" | "select" | "navigate";

/**
 * Maps a sub-step's `verb` to its automation `action`. `view` is never passed —
 * `view` sub-steps are non-actionable and carry no automation metadata.
 */
export function verbToAutomationAction(
  verb: "click" | "input" | "select" | "link",
): AutomationAction {
  switch (verb) {
    case "click": return "click";
    case "input": return "type";
    case "select": return "select";
    case "link": return "navigate";
  }
}

/**
 * VLM-emitted portion of the automation descriptor (no `action` — that is
 * derived in code by `buildActionsForStep`). `inputValue` is present only for
 * `input`/`select` candidates; the schema cannot express that, so it is
 * `.nullish()` and the invariant is enforced by the classifier prompt and by
 * `buildActionsForStep`.
 */
export const AutomationFields = z.object({
  target: z.object({
    text: z.string(),
    role: z.string(),
    location: z.string(),
  }),
  inputValue: z.object({
    field: z.string(),
    valueType: z.enum(["text", "email", "password", "number", "date", "url", "selection", "other"]),
    example: z.string().nullish(),
  }).nullish(),
  expectedOutcome: z.string().nullish(),
});

/** Full automation descriptor stored on `Action` / `Screenshot` (includes `action`). */
export type AutomationMeta = {
  action: AutomationAction;
  target: { text: string; role: string; location: string };
  inputValue?: {
    field: string;
    valueType: "text" | "email" | "password" | "number" | "date" | "url" | "selection" | "other";
    example?: string;
  };
  expectedOutcome?: string;
};
```

Then add `automation` to the `ClassifiedCandidate` schema — change it to:

```ts
export const ClassifiedCandidate = z.object({
  index: z.number(),
  decision: z.enum(["action", "discard"]),
  verb: z.enum(["click", "input", "select", "link"]).nullable(),
  screenName: z.string().nullable(),
  elementCaption: z.string().nullable(),
  displayFrameIndex: z.number().int().nullable(),
  discardReason: z.enum(["transition", "hover", "press_flicker", "animation", "not_a_ui", "other"]).nullable(),
  automation: AutomationFields.nullish(),
});
```

Then add `automation?` to the `Action` type — change it to:

```ts
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
  automation?: AutomationMeta;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx tsx --test src/lib/schemas.test.ts`
Expected: PASS — all tests including the 4 new ones.

- [ ] **Step 5: Verify the type checker is clean**

Run: `npx tsc --noEmit`
Expected: no errors. (Adding optional fields does not break existing call sites.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/schemas.ts src/lib/schemas.test.ts
git commit -m "feat(automation): add automation schema, type, and verb helper"
```

---

## Task 2: Classifier prompt + propagation regression test

**Files:**
- Modify: `src/config/index.ts:65` (the `classifyStepSystem` prompt)
- Test: `src/trigger/stages/classifyStepWithLLM.test.ts`

`classifyStepWithLLM.ts` needs no code change: it builds records via `records.push({ ...cc, displayFramePath })`, so once `automation` is on `ClassifiedCandidate` it rides through automatically. This task adds the prompt instruction that makes the VLM emit `automation`, plus a regression test.

- [ ] **Step 1: Write the failing regression test**

Append to `src/trigger/stages/classifyStepWithLLM.test.ts`:

```ts
test("classifyStepWithLLM carries automation from the classifier onto each record", async () => {
  const { classifyStepWithLLM } = await import("./classifyStepWithLLM");
  const out = await classifyStepWithLLM({
    stepTitle: "t",
    language: "en",
    candidates: [c(0, 1)],
    maxCandidatesPerCall: 2,
    classifier: async ({ candidates }) => ({
      candidates: candidates.map(cand => ({
        index: cand.index,
        decision: "action" as const,
        verb: "click" as const,
        screenName: "x",
        elementCaption: "Save button",
        displayFrameIndex: 0,
        discardReason: null,
        automation: {
          target: { text: "Save", role: "button", location: "toolbar" },
        },
      })),
    }),
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].automation?.target.role, "button");
});
```

- [ ] **Step 2: Run the test to verify it passes already**

Run: `npx tsx --test src/trigger/stages/classifyStepWithLLM.test.ts`
Expected: PASS — `automation` propagates through the `{ ...cc }` spread with no production change. (This is a regression guard; it passes immediately because Task 1 added the schema field.)

- [ ] **Step 3: Extend the classifier prompt**

In `src/config/index.ts`, find `classifyStepSystem`. Inside the `2) If "action":` block, after the `displayFrameIndex:` bullet line (the line beginning `   - displayFrameIndex:`), insert this bullet:

```
   - automation: a structured descriptor for a future automation agent — an object with:
       - target: { text, role, location }. text = the element's visible label/text, copied VERBATIM in the app's UI language exactly as shown on screen (do NOT translate it; "" if the element has no visible text). role = the control type ("button", "textbox", "dropdown", "link", "tab", "checkbox", "radio", "menuitem", ...). location = a short on-screen region hint (e.g. "top-right nav bar", "left sidebar", "inside the contact form"), written in ${lang}.
       - inputValue: include ONLY when verb is "input" or "select"; otherwise set it to null. When included: { field, valueType, example }. field = a semantic name for what is being entered (e.g. "email", "company name"). valueType = one of "text", "email", "password", "number", "date", "url", "selection", "other". example = a MASKED sample of the entered value (e.g. "j***@***.com", "Acme C***"). NEVER output the literal typed text — always mask emails, names, and numbers. For passwords, set valueType "password" and OMIT example entirely.
       - expectedOutcome: a one-line description of the result of the action, written in ${lang} — include it ONLY when a window frame actually shows that result; otherwise set it to null.
```

Then, in the `3) If "discard":` block, change the final line `   - All "action" fields must be null.` to:

```
   - All "action" fields, including automation, must be null.
```

- [ ] **Step 4: Verify the build and full test suite**

Run: `npx tsc --noEmit && npx tsx --test src/trigger/stages/classifyStepWithLLM.test.ts`
Expected: no type errors; all classifier tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config/index.ts src/trigger/stages/classifyStepWithLLM.test.ts
git commit -m "feat(automation): emit automation metadata from the classifier prompt"
```

---

## Task 3: Assemble Action.automation in buildActionsForStep

**Files:**
- Modify: `src/trigger/stages/buildActionsForStep.ts`
- Test: `src/trigger/stages/buildActionsForStep.test.ts`
- Test: `src/trigger/stages/canonicalizeActions.test.ts`

`canonicalizeActions.ts` needs no production change — its final `classified.map(c => ({ ...c, ... }))` spreads `...c`, preserving `automation`. A regression test guards that.

- [ ] **Step 1: Write the failing tests**

In `src/trigger/stages/buildActionsForStep.test.ts`, the `action(over)` helper already builds a `ClassifiedActionRecord` and spreads `...over`, so `automation` can be passed via `over` with no helper change. Append these tests:

```ts
test("buildActionsForStep attaches automation with action derived from verb", () => {
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: [action({
      index: 0, verb: "click",
      automation: { target: { text: "Save", role: "button", location: "toolbar" } },
    })],
    screenClusters: [],
    eventTimes: [5],
    viewMinDurationSec: 3,
    language: "en",
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].automation?.action, "click");
  assert.equal(out[0].automation?.target.text, "Save");
});

test("buildActionsForStep sources automation from the input record when a group is promoted to input", () => {
  // Same (screen, element) key → one group. The earlier click record anchors,
  // the input record follows; the group's effective verb becomes "input".
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: [
      action({
        index: 0, verb: "click", screenName: "form", elementCaption: "Email field",
        automation: { target: { text: "Email", role: "textbox", location: "form" } },
      }),
      action({
        index: 1, verb: "input", screenName: "form", elementCaption: "Email field",
        automation: {
          target: { text: "Email", role: "textbox", location: "form" },
          inputValue: { field: "email", valueType: "email", example: "j***@***.com" },
        },
      }),
    ],
    screenClusters: [],
    eventTimes: [1, 2],
    viewMinDurationSec: 3,
    language: "en",
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].verb, "input");
  assert.equal(out[0].automation?.action, "type");
  assert.equal(out[0].automation?.inputValue?.example, "j***@***.com");
});

test("buildActionsForStep view actions have no automation", () => {
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: [],
    screenClusters: [cluster("A", 0, 10)],
    eventTimes: [],
    viewMinDurationSec: 3,
    language: "en",
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].verb, "view");
  assert.equal(out[0].automation ?? null, null);
});

test("buildActionsForStep omits automation when the record has none", () => {
  const out = buildActionsForStep({
    stepIndex: 0,
    classified: [action({ index: 0, verb: "click" })],
    screenClusters: [],
    eventTimes: [5],
    viewMinDurationSec: 3,
    language: "en",
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].automation ?? null, null);
});
```

In `src/trigger/stages/canonicalizeActions.test.ts`, append:

```ts
test("canonicalizeActions preserves automation on records", async () => {
  const { fn } = fakeLlm({
    actions: [{ index: 0, screenName: "contacts", elementCaption: "Save button" }],
  });
  const out = await canonicalizeActions({
    classified: [rec({
      index: 0,
      automation: { target: { text: "Save", role: "button", location: "toolbar" } },
    })],
    language: "en",
    llmFn: fn,
  });
  assert.equal(out[0].automation?.target.role, "button");
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx tsx --test src/trigger/stages/buildActionsForStep.test.ts src/trigger/stages/canonicalizeActions.test.ts`
Expected: the `canonicalizeActions` test PASSES already (spread preserves it). The `buildActionsForStep` automation tests FAIL — `out[0].automation` is `undefined` because the stage does not yet assemble it.

- [ ] **Step 3: Implement automation assembly in buildActionsForStep**

In `src/trigger/stages/buildActionsForStep.ts`:

(a) Extend the import from `@/lib/schemas` (currently `import type { Action } from "@/lib/schemas";`) to:

```ts
import type { Action, AutomationMeta } from "@/lib/schemas";
import { verbToAutomationAction } from "@/lib/schemas";
import type { ClassifiedActionRecord } from "./classifyStepWithLLM";
```

(Keep the existing `ClassifiedActionRecord` / `ScreenCluster` imports; only add the `AutomationMeta` type and the `verbToAutomationAction` value import.)

(b) Add this helper just above `export function buildActionsForStep`:

```ts
/**
 * Build the full `AutomationMeta` for an assembled action: derive `action` from
 * the group's effective verb, copy the VLM `target`, and attach `inputValue`
 * only for type/select actions. Returns undefined when the source record had no
 * automation.
 */
function buildAutomation(
  verb: "click" | "input" | "select" | "link",
  fields: ClassifiedActionRecord["automation"],
): AutomationMeta | undefined {
  if (!fields) return undefined;
  const action = verbToAutomationAction(verb);
  const meta: AutomationMeta = { action, target: fields.target };
  if ((action === "type" || action === "select") && fields.inputValue) {
    meta.inputValue = {
      field: fields.inputValue.field,
      valueType: fields.inputValue.valueType,
    };
    if (fields.inputValue.example) meta.inputValue.example = fields.inputValue.example;
  }
  if (fields.expectedOutcome) meta.expectedOutcome = fields.expectedOutcome;
  return meta;
}
```

(c) Add `automation?: AutomationMeta;` to the `ElementGroup` type:

```ts
type ElementGroup = {
  verb: "click" | "input" | "select" | "link";
  caption: string;
  screenName: string;
  elementCaption: string;
  displayFramePath: string;
  time: number;
  automation?: AutomationMeta;
};
```

(d) In the `for (const [elementId, group] of byElement.entries())` loop, after the line `const verb = hasInput ? ("input" as const) : anchor.verb!;`, add:

```ts
    const automationSource = sortedByTime.find(g => g.verb === verb) ?? anchor;
    const automation = buildAutomation(verb, automationSource.automation);
```

(e) In the `elementGroups.push({ ... })` call in that same loop, add `automation,` to the object literal (alongside `verb`, `caption`, etc.).

(f) Add `automation?: AutomationMeta;` to the `Pending` type:

```ts
  type Pending = { verb: Action["verb"]; description: string; screenName: string; elementCaption: string; displayFramePath: string; time: number; automation?: AutomationMeta };
```

(g) In the `pending` array construction, add `automation: e.automation` to the `elementGroups.map(...)` object literal. Leave the `viewGroups.map(...)` object literal unchanged (view actions get no automation).

(h) In the final `return pending.map((p, order) => ({ ... }))`, add this line inside the object literal, after `time: p.time,`:

```ts
    ...(p.automation ? { automation: p.automation } : {}),
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx tsx --test src/trigger/stages/buildActionsForStep.test.ts src/trigger/stages/canonicalizeActions.test.ts`
Expected: PASS — all tests, including the 4 new `buildActionsForStep` tests and the canonicalize regression test.

- [ ] **Step 5: Verify the type checker is clean**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/trigger/stages/buildActionsForStep.ts src/trigger/stages/buildActionsForStep.test.ts src/trigger/stages/canonicalizeActions.test.ts
git commit -m "feat(automation): assemble Action.automation in buildActionsForStep"
```

---

## Task 4: Persist automation on Screenshot

**Files:**
- Modify: `src/lib/mongo.ts` (the `Screenshot` interface)
- Modify: `src/trigger/stages/uploadScreenshots.ts`
- Test: `src/trigger/stages/uploadScreenshots.test.ts`

`runUploadScreenshots` does R2 and image IO, so the `Action`→`Screenshot` field copy is extracted into a small pure helper that can be unit-tested.

- [ ] **Step 1: Write the failing test**

Update the import line in `src/trigger/stages/uploadScreenshots.test.ts` (currently `import { rectSvg, circleSvg } from "./uploadScreenshots";`) to:

```ts
import { rectSvg, circleSvg, screenshotMetaFromAction } from "./uploadScreenshots";
import type { Action } from "@/lib/schemas";
```

Append these tests:

```ts
function baseAction(over: Partial<Action>): Action {
  return {
    stepIndex: 0, order: 0, verb: "click", description: "Click Save",
    screenName: "contacts", elementCaption: "Save button",
    displayFramePath: "/f.jpg", time: 5, ...over,
  };
}

test("screenshotMetaFromAction copies automation when present", () => {
  const meta = screenshotMetaFromAction(baseAction({
    automation: {
      action: "click",
      target: { text: "Save", role: "button", location: "toolbar" },
    },
  }));
  assert.equal(meta.automation?.action, "click");
  assert.equal(meta.automation?.target.role, "button");
});

test("screenshotMetaFromAction omits the automation key when the action has none", () => {
  const meta = screenshotMetaFromAction(baseAction({}));
  assert.ok(!("automation" in meta), "automation key should be absent");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/trigger/stages/uploadScreenshots.test.ts`
Expected: FAIL — `screenshotMetaFromAction` is not exported.

- [ ] **Step 3: Add `automation` to the `Screenshot` interface**

In `src/lib/mongo.ts`, in the `Screenshot` interface, after the `highlightError?: string;` line and before the closing `}`, add:

```ts
  // Automation metadata: a DOM-agnostic descriptor for a future automation
  // agent. Present only on actionable sub-steps generated after 2026-05-18.
  automation?: {
    action: "click" | "type" | "select" | "navigate";
    target: { text: string; role: string; location: string };
    inputValue?: {
      field: string;
      valueType: "text" | "email" | "password" | "number" | "date" | "url" | "selection" | "other";
      example?: string;
    };
    expectedOutcome?: string;
  };
```

- [ ] **Step 4: Add the helper and use it in `uploadScreenshots.ts`**

In `src/trigger/stages/uploadScreenshots.ts`:

(a) Ensure `Action` is imported from `@/lib/schemas`. It is already used as `Map<number, Action[]>`, so the import exists — confirm `import type { Action } from "@/lib/schemas";` (or that `Action` is in an existing import from that module).

(b) Add this exported helper just above `export async function runUploadScreenshots`:

```ts
/**
 * The non-IO metadata fields copied verbatim from an `Action` onto its
 * `Screenshot` record. `automation` is included only when the action has it,
 * so the persisted document has no `automation: undefined` key.
 */
export function screenshotMetaFromAction(
  action: Action,
): Pick<Screenshot, "description" | "verb" | "screenName" | "elementCaption" | "automation"> {
  return {
    description: action.description,
    verb: action.verb,
    screenName: action.screenName,
    elementCaption: action.elementCaption,
    ...(action.automation ? { automation: action.automation } : {}),
  };
}
```

(c) Replace the `const rec: Screenshot = { ... }` literal (the block with `frameId, r2Key, t, order, description, verb, screenName, elementCaption`) with:

```ts
      const rec: Screenshot = {
        frameId,
        r2Key,
        t: action.time,
        order,
        ...screenshotMetaFromAction(action),
      };
```

(Leave the subsequent `if (action.highlight && !error) { rec.highlight = ... }` block unchanged.)

- [ ] **Step 5: Run the test and type checker**

Run: `npx tsc --noEmit && npx tsx --test src/trigger/stages/uploadScreenshots.test.ts`
Expected: no type errors; all tests PASS including the 2 new ones.

- [ ] **Step 6: Commit**

```bash
git add src/lib/mongo.ts src/trigger/stages/uploadScreenshots.ts src/trigger/stages/uploadScreenshots.test.ts
git commit -m "feat(automation): persist automation metadata on Screenshot"
```

---

## Task 5: Expose automation in the share API

**Files:**
- Modify: `src/app/api/share/[token]/route.ts:26-33` (the per-screenshot response object)

- [ ] **Step 1: Add `automation` to the screenshot response object**

In `src/app/api/share/[token]/route.ts`, in the `screenshots: (s.screenshots ?? []).map(ss => ({ ... }))` object literal, add `automation: ss.automation,` after the `highlight: ss.highlight,` line:

```ts
      screenshots: (s.screenshots ?? []).map(ss => ({
        frameId: ss.frameId,
        url: `/api/screenshots/${sopId}/${ss.frameId}.jpg`,
        t: ss.t,
        order: ss.order,
        description: ss.description,
        highlight: ss.highlight,
        automation: ss.automation,
      })),
```

- [ ] **Step 2: Verify the type checker and build**

Run: `npx tsc --noEmit && npx next build`
Expected: no type errors; the build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/share/[token]/route.ts
git commit -m "feat(automation): expose automation metadata in the share API"
```

---

## Task 6: Full verification

**Files:** none modified — verification only.

- [ ] **Step 1: Run the full test suite**

Run: `npx tsx --test 'src/**/*.test.ts'`
Expected: all tests pass (the prior baseline was 176 pass / 1 skip / 0 fail; this plan adds new tests and changes none of the existing assertions, so the pass count increases and failures stay 0).

- [ ] **Step 2: Type-check and build**

Run: `npx tsc --noEmit && npx next build`
Expected: no errors; build succeeds.

- [ ] **Step 3: E2E sanity check on a real video**

With the trigger.dev dev server running, trigger `process-sop-screenshots` on `samples/hubspot_crm.mp4` (use the existing `scripts/upload-full.mjs samples/hubspot_crm.mp4 vi` flow, then trigger the task). When the run reaches `done`, inspect the resulting SOP document's `steps[].screenshots[].automation`:
- actionable screenshots carry an `automation` object with a plausible `target.role` (e.g. `button`, `textbox`, `link`);
- `type` actions carry `inputValue` whose `example` is masked — spot-check that no recorder email/name appears verbatim;
- `view` screenshots have no `automation`.

This is a sanity check, not a hard gate — masking quality is a VLM-prompt property, not a deterministic assertion.

- [ ] **Step 4: Commit any notes (only if changes were made)**

No commit if nothing changed. If the E2E surfaced a prompt issue, fix it in `src/config/index.ts`, re-verify, and commit with `fix(automation): ...`.

---

## Notes for the implementer

- **Test runner:** the project runs tests with `npx tsx --test <glob>` (Node's built-in `node:test`). There is no `jest`/`vitest`.
- **No `--no-verify`, no empty commits.** Commit messages must end with the `Co-Authored-By` trailer the repo uses.
- **AGENTS.md:** this Next.js version has breaking changes — if you touch anything Next.js-specific beyond the one-line route change in Task 5, read `node_modules/next/dist/docs/` first.
- **Two verb vocabularies coexist on purpose:** `Action.verb` / `Screenshot.verb` keep `"input"`/`"link"`; `automation.action` uses `"type"`/`"navigate"`. `verbToAutomationAction` is the only bridge — never hand-map elsewhere.
- **`automation` is optional everywhere.** Old SOPs and discard/view sub-steps have none. Never assume it is present.
