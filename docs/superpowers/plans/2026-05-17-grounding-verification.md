# Grounding Verification Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reflection (generator → verifier → retry) loop to the highlight grounder so mis-placed circles are caught and re-grounded.

**Architecture:** A new `verifyGroundedPoint` renders the yellow circle on the frame and asks a cheap VLM "is the circle on the right element?". `pointFallbackHighlight` becomes a verify-and-retry loop: UI-TARS → verify → Qwen → verify → best-effort fallback. The verifier is an injectable third field of `GroundDeps`.

**Tech Stack:** TypeScript, trigger.dev v4, Zod, OpenRouter (`llmJsonVision`), `sharp`, `node:test` via `npx tsx --test`.

**Reference:** spec at `docs/superpowers/specs/2026-05-17-grounding-verification-design.md`.

**Conventions:** Commit directly to `master`. Never use `--no-verify` (repo has no pre-commit hook — verified). Commit-message trailer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`. Typecheck: `npx tsc --noEmit -p tsconfig.json`. Tests: `npx tsx --test <file>`.

---

## File Structure

- **Modify:** `src/lib/schemas.ts` — add `GroundingCheck` schema.
- **Modify:** `src/config/index.ts` — add `ai.verifyModel`; add `ai.prompts.verifyHighlightSystem` (plain string).
- **Create:** `src/trigger/stages/verifyHighlight.ts` — `verifyGroundedPoint`.
- **Create:** `src/trigger/stages/verifyHighlight.test.ts` — its tests.
- **Modify:** `src/trigger/stages/locateHighlight.ts` — `GroundDeps` gains `verify`; `defaultGroundDeps` closure; `pointFallbackHighlight` verify-and-retry loop.
- **Modify:** `src/trigger/stages/locateHighlight.test.ts` — fix the 5 existing `pointFallbackHighlight` tests (add `verify` to injected deps); add 4 verify-loop tests.

---

### Task 1: Schema + config

**Files:**
- Modify: `src/lib/schemas.ts`
- Modify: `src/config/index.ts`

- [ ] **Step 1: Add the `GroundingCheck` schema**

In `src/lib/schemas.ts`, after `CanonicalizationOutput`:

```typescript
export const GroundingCheck = z.object({
  onElement: z.enum(["yes", "no"]),
});
```

(Uses only `ZodObject` + `ZodEnum` — both supported by `zodToJsonSchemaLike`.)

- [ ] **Step 2: Add `verifyModel` to config**

In `src/config/index.ts`, in `config.ai`, after `canonicalizeModel`:

```typescript
    verifyModel: "google/gemini-2.5-flash",
```

- [ ] **Step 3: Add the `verifyHighlightSystem` prompt**

In `src/config/index.ts`, inside `config.ai.prompts`, after `canonicalizeSystem`, add — note this one is a **plain string constant**, not a `(lang) => string` function (the verifier task is language-agnostic):

```typescript
      verifyHighlightSystem:
        `You are shown an app screenshot with a yellow circle drawn on it. Judge whether the CENTRE of that circle lands on the specific UI element named in the user message — the element the circle is meant to mark.

Answer "yes" only if the circle's centre is clearly on, or within, that element. If the centre is on a different element, on empty space, or you cannot tell, answer "no".

Return strict JSON: { "onElement": "yes" | "no" }.`,
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: clean (additive changes only).

- [ ] **Step 5: Commit**

```bash
git add src/lib/schemas.ts src/config/index.ts
git commit -m "feat(verify): add GroundingCheck schema + verifyModel/verifyHighlightSystem config

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: `verifyGroundedPoint` module

**Files:**
- Create: `src/trigger/stages/verifyHighlight.ts`
- Create: `src/trigger/stages/verifyHighlight.test.ts`

The tests reuse the existing fixture frame `src/trigger/stages/__fixtures__/sample-1080p.jpg` (already used by `locateHighlight.test.ts`).

- [ ] **Step 1: Write the failing test**

Create `src/trigger/stages/verifyHighlight.test.ts`:

```typescript
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import { verifyGroundedPoint } from "./verifyHighlight";

const okFrame = "src/trigger/stages/__fixtures__/sample-1080p.jpg";

function tmpVerifyDirs(): string[] {
  return fs.readdirSync(os.tmpdir()).filter(n => n.startsWith("highlight-verify-"));
}

test("returns true when the verifier answers yes", async () => {
  const out = await verifyGroundedPoint({
    framePath: okFrame, point: { x: 0.5, y: 0.5 }, caption: "Save button",
    model: "fake", visionFn: async () => ({ onElement: "yes" }),
  });
  assert.equal(out, true);
});

test("returns false when the verifier answers no", async () => {
  const out = await verifyGroundedPoint({
    framePath: okFrame, point: { x: 0.5, y: 0.5 }, caption: "Save button",
    model: "fake", visionFn: async () => ({ onElement: "no" }),
  });
  assert.equal(out, false);
});

test("fails open (returns true) when the verifier throws", async () => {
  const out = await verifyGroundedPoint({
    framePath: okFrame, point: { x: 0.5, y: 0.5 }, caption: "Save button",
    model: "fake", visionFn: async () => { throw new Error("verifier down"); },
  });
  assert.equal(out, true);
});

test("leaves no temp dir behind", async () => {
  const before = tmpVerifyDirs().length;
  await verifyGroundedPoint({
    framePath: okFrame, point: { x: 0.5, y: 0.5 }, caption: "Save button",
    model: "fake", visionFn: async () => ({ onElement: "yes" }),
  });
  assert.equal(tmpVerifyDirs().length, before);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx tsx --test src/trigger/stages/verifyHighlight.test.ts`
Expected: FAIL — `verifyHighlight` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/trigger/stages/verifyHighlight.ts`:

```typescript
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { llmJsonVision } from "@/lib/openrouter";
import { GroundingCheck } from "@/lib/schemas";
import { config } from "@/config";
import { buildBufferWithOptionalHighlight } from "./uploadScreenshots";
import type { Point } from "@/lib/grounding";

/**
 * Grounding verifier (the "critic" of the reflection loop).
 *
 * Renders the yellow circle at `point` onto the frame and asks a cheap VLM
 * whether the circle's centre is on the named element. Returns true = on the
 * element (accept the point), false = mis-placed (caller should retry).
 *
 * Fail-open: any failure — the circle could not be composited, or the verifier
 * call threw/failed to parse — returns true. The critic must never cost the
 * pipeline a highlight; a missing verification just degrades to the old
 * no-verification behaviour.
 */
export type VerifyVisionFn = (opts: {
  model: string;
  system: string;
  userText: string;
  imagePaths: string[];
  schema: typeof GroundingCheck;
  schemaName: string;
  maxRetries: number;
}) => Promise<{ onElement: "yes" | "no" }>;

export async function verifyGroundedPoint(args: {
  framePath: string;
  point: Point;
  caption: string;
  model: string;
  /** Injectable for tests; defaults to the real `llmJsonVision`. */
  visionFn?: VerifyVisionFn;
}): Promise<boolean> {
  const { framePath, point, caption, model } = args;
  const visionFn = args.visionFn ?? (llmJsonVision as unknown as VerifyVisionFn);

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "highlight-verify-"));
  try {
    const { buf, error } = await buildBufferWithOptionalHighlight(framePath, { point });
    // error !== null ⇒ buf is the un-annotated original (no circle drawn) —
    // do not ask the critic to judge a circle-less image; fail open.
    if (error !== null) return true;

    const imgPath = path.join(tmpDir, "verify.jpg");
    await fs.promises.writeFile(imgPath, buf);

    const out = await visionFn({
      model,
      system: config.ai.prompts.verifyHighlightSystem,
      userText:
        `Target element: "${caption}". A yellow circle has been drawn on the screenshot.\n` +
        `Is the centre of that circle on the target element? Answer strict JSON.`,
      imagePaths: [imgPath],
      schema: GroundingCheck,
      schemaName: "grounding_check",
      maxRetries: config.ai.maxRetries,
    });
    return out.onElement === "yes";
  } catch {
    return true; // fail-open on any failure
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx tsx --test src/trigger/stages/verifyHighlight.test.ts`
Expected: PASS — all 4 tests.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/trigger/stages/verifyHighlight.ts src/trigger/stages/verifyHighlight.test.ts
git commit -m "feat(verify): add verifyGroundedPoint grounding critic

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Verify-and-retry loop in `pointFallbackHighlight`

**Files:**
- Modify: `src/trigger/stages/locateHighlight.ts`
- Modify: `src/trigger/stages/locateHighlight.test.ts`

- [ ] **Step 1: Update the existing tests + add the new ones**

In `src/trigger/stages/locateHighlight.test.ts`:

(a) The 5 existing `pointFallbackHighlight` tests inject `deps` as `{ uiTars, qwen }`. `GroundDeps` is gaining a required `verify` field, so each must add it. Add `verify: async () => true` to the injected deps object of **all 5** existing `pointFallbackHighlight` tests (`uses the UI-TARS point...`, `falls back to Qwen when UI-TARS finds nothing`, `falls back to Qwen when UI-TARS throws`, `reports no_specific_target...`, `reports grounding_unavailable...`). With `verify` always-true their outcomes are unchanged.

(b) Append these 4 new tests:

```typescript
test("pointFallbackHighlight accepts the UI-TARS point when verification passes", async () => {
  const out = await pointFallbackHighlight(
    { intent: "Click Save", verb: "click", framePath: okFrame },
    {
      uiTars: async () => ({ point: { x: 0.4, y: 0.6 }, raw: "(x,y)" }),
      qwen: async () => { throw new Error("should not be called"); },
      verify: async () => true,
    },
  );
  assert.equal(out.highlight, "yes");
  assert.deepEqual(out.point, { x: 0.4, y: 0.6 });
});

test("pointFallbackHighlight retries to Qwen when the UI-TARS point fails verification", async () => {
  const out = await pointFallbackHighlight(
    { intent: "Click Save", verb: "click", framePath: okFrame },
    {
      uiTars: async () => ({ point: { x: 0.4, y: 0.6 }, raw: "(x,y)" }),
      qwen: async () => ({ point: { x: 0.7, y: 0.2 } }),
      verify: async (point) => point.x === 0.7, // UI-TARS point fails, Qwen point passes
    },
  );
  assert.equal(out.highlight, "yes");
  assert.deepEqual(out.point, { x: 0.7, y: 0.2 });
});

test("pointFallbackHighlight keeps the UI-TARS point as best-effort when neither verifies", async () => {
  const out = await pointFallbackHighlight(
    { intent: "Click Save", verb: "click", framePath: okFrame },
    {
      uiTars: async () => ({ point: { x: 0.4, y: 0.6 }, raw: "(x,y)" }),
      qwen: async () => ({ point: { x: 0.7, y: 0.2 } }),
      verify: async () => false, // both fail verification
    },
  );
  assert.equal(out.highlight, "yes");
  assert.deepEqual(out.point, { x: 0.4, y: 0.6 }); // UI-TARS preferred
});

test("pointFallbackHighlight uses a verified Qwen point when UI-TARS throws", async () => {
  const out = await pointFallbackHighlight(
    { intent: "Click Save", verb: "click", framePath: okFrame },
    {
      uiTars: async () => { throw new Error("provider down"); },
      qwen: async () => ({ point: { x: 0.3, y: 0.3 } }),
      verify: async () => true,
    },
  );
  assert.equal(out.highlight, "yes");
  assert.deepEqual(out.point, { x: 0.3, y: 0.3 });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx tsx --test src/trigger/stages/locateHighlight.test.ts`
Expected: FAIL — compile errors (`verify` not on `GroundDeps`) and/or the new tests fail.

- [ ] **Step 3: Add the `Point` import**

In `src/trigger/stages/locateHighlight.ts`, extend the existing grounding import:

```typescript
import { uiTarsPoint, qwenPoint, type Point } from "@/lib/grounding";
```

And add, near the other stage imports:

```typescript
import { verifyGroundedPoint } from "./verifyHighlight";
```

- [ ] **Step 4: Extend `GroundDeps` and `defaultGroundDeps`**

Replace the current `GroundDeps` type and `defaultGroundDeps` const:

```typescript
type GroundDeps = {
  uiTars: typeof uiTarsPoint;
  qwen: typeof qwenPoint;
  verify: (point: Point, framePath: string, caption: string) => Promise<boolean>;
};
const defaultGroundDeps: GroundDeps = {
  uiTars: uiTarsPoint,
  qwen: qwenPoint,
  verify: (point, framePath, caption) =>
    verifyGroundedPoint({ point, framePath, caption, model: config.ai.verifyModel }),
};
```

- [ ] **Step 5: Rewrite `pointFallbackHighlight` as the verify-and-retry loop**

Replace the body of `pointFallbackHighlight` (keep its signature and the leading
`frameW`/`frameH` computation) with:

```typescript
export async function pointFallbackHighlight(
  args: { intent: string; verb: SubStep["verb"]; framePath: string },
  deps: GroundDeps = defaultGroundDeps,
): Promise<Decision> {
  const meta = await sharp(args.framePath).metadata();
  const frameW = meta.width ?? 0;
  const frameH = meta.height ?? 0;

  // Each grounder, tried in order. A grounder yields a point (or null), and may
  // throw. A point that passes verification wins immediately. If no point
  // verifies, the earliest grounder that *returned* a point wins as best-effort.
  const grounders: Array<() => Promise<{ point: Point | null }>> = [
    () => deps.uiTars({
      framePath: args.framePath, intent: args.intent, verb: args.verb,
      frameW, frameH, model: config.ai.pointPrimaryModel,
    }),
    () => deps.qwen({
      framePath: args.framePath, intent: args.intent, verb: args.verb,
      model: config.ai.pointFallbackModel,
    }),
  ];

  const results: Array<{ errored: boolean; point: Point | null }> = [];
  for (const ground of grounders) {
    let errored = false;
    let point: Point | null = null;
    try {
      point = (await ground()).point;
    } catch {
      errored = true;
    }
    if (point && (await deps.verify(point, args.framePath, args.intent))) {
      return yesDecision(point);
    }
    results.push({ errored, point });
  }

  const firstPoint = results.find(r => r.point !== null)?.point ?? null;
  if (firstPoint) return yesDecision(firstPoint);

  return {
    highlight: "no",
    point: null,
    bbox: null,
    noHighlightReason:
      results.every(r => r.errored) ? "grounding_unavailable" : "no_specific_target",
  };
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx tsx --test src/trigger/stages/locateHighlight.test.ts`
Expected: PASS — all tests (5 updated + 4 new + the unchanged `coerceForViewVerb` / `runLocateHighlightWith` / tmpdir-race tests).

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add src/trigger/stages/locateHighlight.ts src/trigger/stages/locateHighlight.test.ts
git commit -m "feat(verify): verify-and-retry loop in pointFallbackHighlight

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: End-to-end verification

**Files:** none (verification only)

- [ ] **Step 1: Full typecheck + targeted tests**

Run: `npx tsc --noEmit -p tsconfig.json` → zero errors.
Run: `npx tsx --test src/trigger/stages/verifyHighlight.test.ts src/trigger/stages/locateHighlight.test.ts` → all PASS.

- [ ] **Step 2: Re-run the full untrimmed HubSpot video**

Upload `samples/hubspot_crm.mp4` via `scripts/upload-full.mjs`, trigger `process-sop-screenshots` via the trigger MCP, wait for completion.

- [ ] **Step 3: Compare against the baseline**

Baseline `stable-2026-05-17-caption-canonicalization`: 84 screenshots, ~96% sampled, $0.2229.

Confirm in the new run:
- `aiCost` total ≈ $0.25–0.27 (verification adds ~$0.035–0.05). Verified: the
  verify calls land inside the `highlight` stage — `processSopScreenshots.ts`
  wraps `highlightActions` in `withStage("highlight")`, and `withStage` uses
  `AsyncLocalStorage` (`als.run`), so the nested `verifyGroundedPoint` →
  `llmJsonVision` → `recordCost` is tagged `stage: "highlight"`. Expect the
  `highlight` stage line in `aiCost.byStage` to rise substantially (from
  ~$0.009) and `callCount` there to roughly double;
- sample screenshots across all 5 steps (download from R2 as in prior runs) and
  score image↔caption↔circle — expect sampled accuracy **≥ ~96%**, with the
  dense-list grounding misses (e.g. the Import-button case) reduced;
- no new `highlightError` / missing-highlight regressions.

Report cost, screenshot count, and sampled accuracy to the user. Do NOT tune
further without user direction.

---

## Self-Review

**Spec coverage:** `verifyGroundedPoint` (render + critic + fail-open + temp-dir) → Task 2. `GroundingCheck` schema → Task 1. `verifyModel` + `verifyHighlightSystem` → Task 1. `GroundDeps.verify` third field + `defaultGroundDeps` closure → Task 3. verify-and-retry loop + full decision table → Task 3 Step 5. Injectable verifier for tests → Task 3 tests. Cost auto-attribution to `highlight` stage → no code needed (verified in spec). E2E → Task 4. Frame-selection verification is explicitly out of scope — no task, correct.

**Placeholder scan:** none — all code given in full.

**Type consistency:** `Point` (`{x,y}`, from `@/lib/grounding`) is used in `GroundDeps.verify`, `verifyGroundedPoint`, and the loop — imported in Task 3 Step 3. `verifyGroundedPoint`'s object-arg signature vs the positional `verify` dep: the `defaultGroundDeps.verify` closure adapts object→positional and supplies `model` (Task 3 Step 4) — consistent with the spec. `VerifyVisionFn` matches the subset of `llmJsonVision`'s signature used; the `as unknown as` cast mirrors the existing `canonicalizeActions` pattern. `GroundingCheck` defined in Task 1, consumed in Task 2. The 5 existing `pointFallbackHighlight` tests are fixed in Task 3 Step 1(a) so the required new `verify` field does not break compilation.
