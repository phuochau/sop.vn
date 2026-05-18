# Industry Field & Physical appType — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an LLM-detected `industry` enum field to every SOP and extend Stage 0's `appType` enum with a `"physical"` value, without changing rejection behavior.

**Architecture:** The Stage 0 VLM call (`runAnalyzeVideo`) already returns a `VideoAnalysisOutput` object validated by a Zod schema. Adding fields to that schema makes them flow automatically through `runAnalyzeVideo` and into `processSopScreenshots.ts`. We extend the schema, the `SopDoc` interface, the analysis prompt, and the post-gate persistence write. The `decideAppGate` gate is deliberately untouched, so physical-process video keeps rejecting via the existing `not_an_app` path.

**Tech Stack:** TypeScript, Zod, Next.js (App Router), trigger.dev v4, MongoDB. Tests run with Node's built-in test runner via `npx tsx --test <file>`. Type-check with `npx tsc --noEmit`.

**Spec:** `docs/superpowers/specs/2026-05-18-industry-field-and-physical-apptype-design.md`

---

## File Structure

- `src/lib/schemas.ts` — add `INDUSTRY_VALUES` const + extend `VideoAnalysisOutput` (`appType` enum gains `"physical"`, new required `industry` enum field).
- `src/lib/schemas.test.ts` — tests for the extended schema.
- `src/lib/mongo.ts` — `SopDoc.appType` union gains `"physical"`; new optional `SopDoc.industry?: string`.
- `src/config/index.ts` — `analyzeVideoSystem` prompt: define `physical` appType, request `industry`.
- `src/trigger/processSopScreenshots.ts` — add `industry` to the post-gate destructure + `$set`.
- `src/trigger/stages/analyzeVideo.test.ts` — test that `physical` + `industry` flow through and a physical-shaped result still fails the gate.

---

## Task 1: Extend `VideoAnalysisOutput` schema

**Files:**
- Modify: `src/lib/schemas.ts:126-132`
- Test: `src/lib/schemas.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these tests to `src/lib/schemas.test.ts`. Add `VideoAnalysisOutput` to the existing import block from `./schemas`:

```ts
test("VideoAnalysisOutput parses appType physical with a valid industry", () => {
  const parsed = VideoAnalysisOutput.parse({
    appUIFrameCount: 0,
    totalFrames: 12,
    appType: "physical",
    industry: "manufacturing",
    category: "Assembly line",
    domainSummary: "A worker assembles a part.",
  });
  assert.equal(parsed.appType, "physical");
  assert.equal(parsed.industry, "manufacturing");
});

test("VideoAnalysisOutput rejects an industry outside the enum", () => {
  assert.throws(() =>
    VideoAnalysisOutput.parse({
      appUIFrameCount: 5,
      totalFrames: 10,
      appType: "web",
      industry: "banking",
      category: "x",
      domainSummary: "y",
    }),
  );
});

test("VideoAnalysisOutput rejects an appType outside the 5-value enum", () => {
  assert.throws(() =>
    VideoAnalysisOutput.parse({
      appUIFrameCount: 5,
      totalFrames: 10,
      appType: "game",
      industry: "retail",
      category: "x",
      domainSummary: "y",
    }),
  );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx tsx --test src/lib/schemas.test.ts`
Expected: FAIL — `VideoAnalysisOutput` is not exported / `industry` is not a known key (the `physical` and `industry` tests fail; the import may also error).

- [ ] **Step 3: Extend the schema**

In `src/lib/schemas.ts`, replace the current `VideoAnalysisOutput` definition:

```ts
export const VideoAnalysisOutput = z.object({
  appUIFrameCount: z.number().int().nonnegative(),
  totalFrames: z.number().int().nonnegative(),
  appType: z.enum(["web", "mobile", "desktop", "none"]),
  category: z.string(),
  domainSummary: z.string(),
});
```

with:

```ts
/** Curated, product-pragmatic industry list. `other` is the escape hatch.
 *  All values are lowercase-hyphenated — no internal capitalization. */
export const INDUSTRY_VALUES = [
  "manufacturing",
  "healthcare",
  "food-and-beverage",
  "hospitality",
  "logistics-and-warehousing",
  "retail",
  "field-service-and-maintenance",
  "construction",
  "laboratory-and-pharma",
  "agriculture",
  "software-and-it",
  "office-and-admin",
  "other",
] as const;

export const VideoAnalysisOutput = z.object({
  appUIFrameCount: z.number().int().nonnegative(),
  totalFrames: z.number().int().nonnegative(),
  appType: z.enum(["web", "mobile", "desktop", "physical", "none"]),
  industry: z.enum(INDUSTRY_VALUES),
  category: z.string(),
  domainSummary: z.string(),
});
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx tsx --test src/lib/schemas.test.ts`
Expected: PASS — all tests, including the three new ones.

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS — note this may surface a type error in `analyzeVideo.test.ts` (its stub `visionFn` returns an object lacking `industry`). That is expected and is fixed in Task 3. If `tsc` reports errors *only* in `analyzeVideo.test.ts`, proceed; any other file erroring is a real problem.

- [ ] **Step 6: Commit**

```bash
git add src/lib/schemas.ts src/lib/schemas.test.ts
git commit -m "feat(schema): add industry enum + physical appType to VideoAnalysisOutput"
```

---

## Task 2: Extend the `SopDoc` interface

**Files:**
- Modify: `src/lib/mongo.ts:85-110`

This task is a pure TypeScript type change — no runtime test. Verification is `tsc`.

- [ ] **Step 1: Update the `appType` field**

In `src/lib/mongo.ts`, in the `SopDoc` interface, replace:

```ts
  appType?: "web" | "mobile" | "desktop" | "none"; // detected by Stage 0
```

with:

```ts
  appType?: "web" | "mobile" | "desktop" | "physical" | "none"; // detected by Stage 0
```

- [ ] **Step 2: Add the `industry` field**

Immediately below the `appType` line, add:

```ts
  industry?: string;                // curated industry enum, detected by Stage 0 (legacy rows lack it)
```

(Typed `string`, not the literal union — mirrors the loosely-typed sibling `category` field and tolerates future enum drift in already-stored data.)

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: PASS — same caveat as Task 1 Step 5: an error confined to `analyzeVideo.test.ts` is expected and fixed in Task 3. Any other file erroring is a real problem.

- [ ] **Step 4: Commit**

```bash
git add src/lib/mongo.ts
git commit -m "feat(schema): add physical appType + industry to SopDoc"
```

---

## Task 3: Update the Stage 0 prompt, persistence, and analyzeVideo test

**Files:**
- Modify: `src/config/index.ts:126-132` (`analyzeVideoSystem`)
- Modify: `src/trigger/processSopScreenshots.ts:112-116`
- Test: `src/trigger/stages/analyzeVideo.test.ts`

- [ ] **Step 1: Write the failing test**

In `src/trigger/stages/analyzeVideo.test.ts`, add this test after the existing `runAnalyzeVideo propagates a vision fn error` test:

```ts
test("runAnalyzeVideo carries appType physical + industry, and the gate still rejects it", async () => {
  const { srcPath, cleanup } = await tmpVideo();
  try {
    const out = await runAnalyzeVideo({
      srcPath,
      durationSec: TEST_DURATION_SEC,
      language: "en",
      visionFn: async (opts) => ({
        appUIFrameCount: 0,
        totalFrames: opts.imagePaths.length,
        appType: "physical",
        industry: "manufacturing",
        category: "Assembly",
        domainSummary: "A worker assembles a part.",
      }),
    });
    assert.equal(out.appType, "physical");
    assert.equal(out.industry, "manufacturing");
    // A physical recording has no app-UI frames, so the gate rejects it.
    assert.equal(decideAppGate(out.appUIFrameCount, out.totalFrames), false);
  } finally {
    await cleanup();
  }
});
```

- [ ] **Step 2: Fix the existing stub and run the tests to verify the new one fails**

The pre-existing `runAnalyzeVideo returns the vision fn output` test has a stub `visionFn` returning an object with no `industry` — after Task 1 that no longer satisfies `VideoAnalysisOutput`. Add `industry: "software-and-it",` to that stub's returned object (the one returning `appType: "web"`, `category: "CRM"`).

Run: `npx tsx --test src/trigger/stages/analyzeVideo.test.ts`
Expected: the existing tests PASS; the new `physical` test PASSES already too (no production code blocks it — the schema from Task 1 accepts `physical`/`industry`). This step confirms the schema and stub line up. If the new test fails, the schema change from Task 1 is incomplete — fix that before continuing.

- [ ] **Step 3: Update the `analyzeVideoSystem` prompt**

In `src/config/index.ts`, replace the `analyzeVideoSystem` prompt body (currently lines ~126-132):

```ts
      analyzeVideoSystem: (lang: string) =>
        `You analyze frames sampled evenly across a how-to video to decide whether it is a screen recording of a software application.
An "app UI" frame shows a web app, mobile app, or desktop app — windows, toolbars, forms, menus, buttons, lists. NOT an app UI: a person talking to camera, a slideshow/presentation, real-world footage, a static title card, or gameplay.
Count how many of the given frames show an app UI. Pick the single best overall appType: "web", "mobile", "desktop", or "none" (use "none" if it is not an app recording).
Also return a short freeform "category" naming the domain/industry and a one-sentence "domainSummary".
${config.ai.prompts.languageRule(lang)}
Return JSON: { "appUIFrameCount": int, "totalFrames": int, "appType": "web"|"mobile"|"desktop"|"none", "category": string, "domainSummary": string }. "totalFrames" MUST equal the number of frames provided.`,
```

with:

```ts
      analyzeVideoSystem: (lang: string) =>
        `You analyze frames sampled evenly across a how-to video.
An "app UI" frame shows a web app, mobile app, or desktop app — windows, toolbars, forms, menus, buttons, lists.
Count how many of the given frames show an app UI ("appUIFrameCount").
Pick the single best overall "appType":
- "web", "mobile", "desktop": a screen recording of that kind of software application.
- "physical": real-world footage of a hands-on process — assembly, cooking, machine operation, maintenance, lab work, inspection. Includes fixed-camera and un-narrated footage.
- "none": none of the above — a person talking to camera, a slideshow/presentation, a static title card, or gameplay.
Pick the best "industry" from EXACTLY this list: "manufacturing", "healthcare", "food-and-beverage", "hospitality", "logistics-and-warehousing", "retail", "field-service-and-maintenance", "construction", "laboratory-and-pharma", "agriculture", "software-and-it", "office-and-admin", "other". Choose from what the video shows (screen content and/or narration). Use "other" when no industry clearly fits. "software-and-it" is valid for any appType — use it for a screen recording of a generic SaaS tool with no clear vertical.
Also return a short freeform "category" naming the domain and a one-sentence "domainSummary".
${config.ai.prompts.languageRule(lang)}
Return JSON: { "appUIFrameCount": int, "totalFrames": int, "appType": "web"|"mobile"|"desktop"|"physical"|"none", "industry": <one of the list above>, "category": string, "domainSummary": string }. "totalFrames" MUST equal the number of frames provided.`,
```

- [ ] **Step 4: Update the persistence write**

In `src/trigger/processSopScreenshots.ts`, replace the post-gate block (currently lines ~112-116):

```ts
      const { category, domainSummary, appType } = analysis;
      await (await sops()).updateOne(
        { _id },
        { $set: { category, domainSummary, appType, updatedAt: new Date() } },
      );
```

with:

```ts
      const { category, domainSummary, appType, industry } = analysis;
      await (await sops()).updateOne(
        { _id },
        { $set: { category, domainSummary, appType, industry, updatedAt: new Date() } },
      );
```

- [ ] **Step 5: Run the full test files and type-check**

Run: `npx tsx --test src/trigger/stages/analyzeVideo.test.ts src/lib/schemas.test.ts`
Expected: PASS — all tests.

Run: `npx tsc --noEmit`
Expected: PASS — clean, no errors in any file (the Task 1/2 caveat is now resolved).

- [ ] **Step 6: Commit**

```bash
git add src/config/index.ts src/trigger/processSopScreenshots.ts src/trigger/stages/analyzeVideo.test.ts
git commit -m "feat(stage0): detect industry + physical appType; persist industry"
```

---

## Verification (after all tasks)

- [ ] Run `npx tsc --noEmit` — clean.
- [ ] Run `npx tsx --test src/lib/schemas.test.ts src/trigger/stages/analyzeVideo.test.ts` — all pass.
- [ ] Confirm spec coverage: `industry` enum added (Task 1), `appType` gains `physical` (Task 1), `SopDoc` updated (Task 2), prompt requests both (Task 3), `industry` persisted post-gate (Task 3), `decideAppGate` untouched (verified by the Task 3 test).
