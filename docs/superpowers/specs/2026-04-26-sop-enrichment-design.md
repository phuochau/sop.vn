# SOP enrichment + free-form categories

Date: 2026-04-26
Status: Draft

## Problem

The silent-video pipeline (shipped 2026-04-25) produces a working SOP, but the output reads thin compared to the speech path:

- The web SOP detail page renders only `step.description` — currently 2–4 sentences.
- The PDF generator (`generateSopPdf`) calls `runSynthesizeOverview` / `runSynthesizeStep` to enrich each step into prose + sub-bullets + callouts and to produce a document-level overview (purpose / audience / prerequisites / tools / duration). Both stages key off the *transcript*, which is empty for silent SOPs, so they short-circuit and the PDF ends up with no overview and bare-bones steps.

Independently, the codebase hardcodes a tight `CATEGORIES` enum and a `DOMAIN_TERMINOLOGY` map. The LLM already produces a freeform `domainSummary` per video and the vision model can identify the domain on its own; the hardcoded enum is restrictive and the per-category vocabulary table is config bloat that drifts from reality.

## Goals

- Silent SOPs get the same kind of overview + per-step prose / sub-bullets / callouts the speech path enjoys, using sampled frames + per-step keyframes (already extracted) + `category` + `domainSummary` as input.
- The web SOP page also reads richer per-step text — bumped at extract time so the existing `step.description` field is fuller.
- `category` becomes an LLM-named freeform string. `CATEGORIES` and `DOMAIN_TERMINOLOGY` are removed.
- Speech path remains untouched (its transcript-driven prompts already work well).
- PDF render layout (`renderPdf.tsx`) is unchanged.

## Non-goals

- Overhauling the speech-path PDF synth to also use vision input. (YAGNI — speech transcripts carry the context.)
- Adding cron-style or background re-enrichment for already-generated PDFs.
- Localizing the new prompts beyond the existing `lang` parameter.
- Reverse-translating technical terms — the existing rule (keep technical / industry / brand terms in their original form) is preserved.

## High-level architecture

Two coordinated changes shipped in one spec:

### Part A — Free-form categories

`category` is freeform string everywhere. Pipeline becomes:

```
runContext  / runVisualContext  → { category: <freeform>, domainSummary }
runExtract  / runVisualExtract  → consume { category, domainSummary } as plain strings
                                     (no DOMAIN_TERMINOLOGY lookup)
```

`SopDoc.category: string` is already a string in Mongo, so persistence is unchanged. Only the in-process `Category` literal type and the `domainTerminology` lookup table go away.

### Part B — Silent-path PDF enrichment

```
generateSopPdf
   ├─ doc.inputMode === "speech"  → existing runSynthesizeOverview / runSynthesizeStep
   │
   └─ doc.inputMode === "silent"  → runVisualOverview  (new)
                                     runVisualStep     (new)
        ↓                                     ↓
   Overview shape                       StepRewrite shape
   (purpose / audience / prereqs        (prose / subBullets / callouts)
    / tools / duration)
        ↓                                     ↓
                       renderSopPdf (unchanged)
```

Both new stages return the existing `OverviewOutput` and `StepRewriteOutput` shapes, so `RenderInput` and `renderSopPdf` need no changes.

The web SOP page benefits separately: `runVisualExtract`'s prompt is upgraded to ask for a fuller paragraph per step (still a single `description` string field). The richer text is persisted on the doc and rendered as-is by the existing SOP page.

## Branch decision (PDF time)

Inside `generateSopPdf.ts`'s helpers:

```ts
const isSilent = doc.inputMode === "silent";
const overview = isSilent
  ? await loadVisualOverviewSafely(doc)
  : await loadOverviewSafely(doc);   // existing transcript-driven helper
```

The same branch is applied for per-step rewrites. Documents predating `inputMode` (i.e., `inputMode === undefined`) are treated as speech — they have a transcript by definition (no silent path existed before). The existing `loadOverviewSafely` already returns `null` if the transcript is missing, so legacy and edge cases degrade gracefully.

## Components

### Modified files

#### `src/config/index.ts`

- Delete `CATEGORIES` constant, `Category` type, `DOMAIN_TERMINOLOGY` map, `categories: CATEGORIES` exposure on the config object, and `domainTerminology` field on the `ai` config block.
- Update existing prompts to drop `domainHint` and the per-category vocabulary clause:
  - `prompts.contextSystem(lang)` — unchanged.
  - `prompts.visualContextSystem(lang)` — unchanged.
  - `prompts.sopSystem(lang)` (was `sopSystem(domainHint, lang)`) — now takes only `lang`. **Remove** the `${ domainHint ? "...Domain vocabulary to prefer when relevant: ..." : "" }` clause; the user prompt now weaves `category` + `domainSummary` into its body so the system prompt no longer references domain hints at all. The "≤8-word title", "2–4 sentence description" lines stay (transcript-driven path is still calibrated to that length).
  - `prompts.visualSopSystem(lang)` — same shape change. Also bump the sentence-count phrase from "a 2-4 sentence description" to "a 3-6 sentence paragraph description" to match the silent-extract upgrade. Remove the same domain-vocabulary clause.
- Add two new prompts:
  - `prompts.pdfVisualOverviewSystem(lang)` — instructs the model to derive `purpose`, `audience`, `prerequisites` (3–5), `toolsMaterials` (3–8), and `estimatedDuration` from the *frames it sees* and the supplied `category` + `domainSummary` + step list. Same `LANGUAGE:` and "keep technical terms" rules as the existing PDF overview prompt.
  - `prompts.pdfVisualStepSystem(lang)` — instructs the model to write 1–3 short paragraphs of prose, an ordered list of imperative sub-bullets, and any warnings/tips/notes as callouts, based on the *step keyframes* + the step's title + description + the document's `category` + `domainSummary`. Forbid inventing actions not visible in the keyframes.

No UI consumers reference `CATEGORIES` or `config.categories` — verified by grep against `src/`. So no UI work is required for this part.

#### `src/lib/schemas.ts`

- `ContextOutput.category`: `z.enum([...])` → `z.string()`. Other fields untouched.
- All other schemas unchanged.

#### `src/lib/mongo.ts`

- No change. `SopDoc.category: string` was already a plain string.

#### `src/trigger/stages/context.ts`

- Drop the `Category` import; the return type becomes `Promise<{ category: string; domainSummary: string }>`. The user prompt currently includes `"category": <enum>` — change to `"category": <freeform string>`.
- **The existing try/catch swallow stays** — speech-path callers still tolerate a category-detection failure by getting a graceful default. The default value changes from `category: "Other"` to `category: ""` — empty string means "model didn't produce one"; downstream prompts handle `""` the same way they handle a real value, the model just gets one less piece of context.

#### `src/trigger/stages/visualContext.ts`

- Drop the `Category` import; the return type becomes `Promise<{ category: string; domainSummary: string }>`. The user prompt currently includes `"category": <one of the enum values>` — change to `"category": <freeform string naming the domain/industry>`.
- **Error-bubbling behavior is unchanged** — `runVisualContext` does not swallow errors; failures continue to propagate so `processSop`'s silent branch can map them to `visual_context_failed`. (Asymmetric with speech-path `runContext` by design — silent path has no fallback "Other" interpretation; if vision can't classify it, treat as a hard failure.)

#### `src/trigger/stages/extract.ts`

- Drop `category: Category` parameter; replace with `category: string`.
- Drop the `domainTerminology[args.category]` lookup. Add a new required parameter `domainSummary: string`.
- Weave `category` and `domainSummary` into the user prompt body (concise prefix above the segments JSON).
- The system prompt no longer takes `domainHint`.

#### `src/trigger/stages/visualExtract.ts`

- Same parameter changes (`category: string`, new `domainSummary: string`).
- Tighten the user prompt: ask for a *fuller paragraph* per step `description` (3–6 sentences, present-tense imperative, instruction-style) instead of "2–4 sentences". Schema unchanged. Validation logic unchanged.
- The category + domainSummary string body is woven into the user prompt above the existing instructions.

#### `src/trigger/processSop.ts`

- Drop the `Category` import.
- Speech branch (existing `runExtract` call): pass `domainSummary` (already in scope from `runContext`) as a new argument.
- Silent branch (existing `runVisualExtract` call at the end of the silent path): pass `domainSummary` (already in scope from `runVisualContext`) as a new argument. Drop the `let category!: Category` definite-assignment annotation — replace with `let category!: string`.
- No other behavior changes.

#### Other `Category` import sites

`grep -rn "type Category" src/` shows the type is imported in: `processSop.ts`, `extract.ts`, `visualExtract.ts`, `context.ts`, `visualContext.ts`. All five files drop the import (or change `import { config, type Category }` to `import { config }`). No other consumer references the type. Verified by grep.

#### `src/trigger/generateSopPdf.ts`

- Add two new helpers next to the existing safe-loaders:
  - `loadVisualOverviewSafely(doc, srcPath, durationSec)` — wraps `runVisualOverview` in try/catch, returns `Overview | null`.
  - `loadVisualStepRewriteSafely(doc, stepIndex, keyframeBuffers)` — wraps `runVisualStep` in try/catch, returns `StepRewrite`. The "no LLM" fallback shape (`{ prose: step.description, subBullets: [], callouts: [] }`) lives inside `runVisualStep` for the no-images case; the wrapper still applies the same fallback on a thrown error. (Two paths returning the same shape — accepted for clarity over deduping.)

- Branch on `doc.inputMode === "silent"` inside the existing top-level `try` (around lines 94–100). Pseudo-code:

  ```ts
  if (doc.inputMode === "silent") {
    let src: Awaited<ReturnType<typeof fetchSourceVideo>> | null = null;
    try {
      src = await fetchSourceVideo(doc.videoR2Key);
      const durationSec = doc.steps.length > 0
        ? Math.max(...doc.steps.map(s => s.endTime))
        : 0;
      const [overview, stepRewrites, stepImagesArr] = await Promise.all([
        loadVisualOverviewSafely(doc, src.srcPath, durationSec),
        Promise.all(doc.steps.map((_, i) => loadStepImages(doc, i)
          .then(({ keyframes, posterImage }) =>
            loadVisualStepRewriteSafely(doc, i, keyframes.length > 0 ? keyframes : (posterImage ? [posterImage] : []))
          )
        )),
        Promise.all(doc.steps.map((_, i) => loadStepImages(doc, i))),
      ]);
      // continue with the existing "render → upload → finalize" code, unchanged
    } finally {
      if (src) await src.dispose();
    }
  } else {
    // existing speech path, unchanged (lines 96–100)
  }
  ```

- `durationSec` is **derived from `max(step.endTime)`** rather than re-probed. The silent path's `runVisualExtract` already validated `endTime <= durationSec`, so this is a safe upper bound and avoids an extra ffprobe. If `doc.steps` is empty (would only happen on a corrupt doc), default to `0` and let `runVisualOverview` fail gracefully via the safe wrapper.

- `loadStepImages` is called *twice* in the snippet above (once feeding into `loadVisualStepRewriteSafely`, once for the renderer). To avoid the double download, factor the call out: load images once into an array, then derive both `stepRewrites` and `stepImagesArr` from it. The implementer should write the parallel block as:

  ```ts
  const stepImagesArr = await Promise.all(doc.steps.map((_, i) => loadStepImages(doc, i)));
  const [overview, stepRewrites] = await Promise.all([
    loadVisualOverviewSafely(doc, src.srcPath, durationSec),
    Promise.all(doc.steps.map((_, i) => {
      const imgs = stepImagesArr[i];
      const buffers = imgs.keyframes.length > 0 ? imgs.keyframes : (imgs.posterImage ? [imgs.posterImage] : []);
      return loadVisualStepRewriteSafely(doc, i, buffers);
    })),
  ]);
  ```

  This serializes image fetch ahead of overview/rewrite, but image fetches are R2 GETs that are cheap relative to the LLM calls. Acceptable.

- The fetched source video is disposed in a `finally` whose error still flows into the existing top-level `catch` (lines 139–143), so a download failure or a render error still updates `pdf.status = error` as today.

### New files

#### `src/trigger/stages/visualOverview.ts`

- Signature:
  ```ts
  export async function runVisualOverview(args: {
    srcPath: string;          // caller-owned, pre-downloaded source video
    durationSec: number;
    title: string;
    category: string;
    domainSummary: string;
    stepTitles: string[];
    language: string;
  }): Promise<Overview>;
  ```
- Implementation: call `sampleFrames(srcPath, durationSec, { mode: "fixed" })` for 2–8 evenly-spaced frames. Send via `llmJsonVision` with the `OverviewOutput` schema and the new `pdfVisualOverviewSystem` prompt. Dispose the frame tmp dir in a `finally`.
- Vision model is `config.ai.visionModel`.
- The `srcPath` lifecycle is owned by the caller (`generateSopPdf.ts`).

#### `src/trigger/stages/visualStep.ts`

- Signature:
  ```ts
  export async function runVisualStep(args: {
    step: { title: string; description: string; startTime: number; endTime: number };
    imageBuffers: Buffer[];     // already-downloaded keyframes (or poster fallback)
    prevTitle: string | null;
    category: string;
    domainSummary: string;
    language: string;
  }): Promise<StepRewrite>;
  ```
- The caller (`generateSopPdf.ts`) is the single source of image-loading and reuses the same `loadStepImages` call that feeds the renderer — no duplicate R2 GETs.
- Implementation:
  1. If `imageBuffers.length === 0`, short-circuit: return `{ prose: step.description, subBullets: [], callouts: [] }` without an LLM call or any disk I/O.
  2. Otherwise: write each buffer to a fresh tmp `.jpg` file, hand the local paths to `llmJsonVision` with `StepRewriteOutput` schema and the new `pdfVisualStepSystem` prompt.
  3. The user prompt includes the step title, original description, prev step title (for continuity), category, and domainSummary.
  4. Dispose the tmp dir in a `finally`.

(Why pass `Buffer[]` rather than file paths or R2 keys: the renderer needs `Buffer[]` anyway to embed in the PDF. Sharing one fetch and one in-memory copy is cheaper and avoids two parallel keyframe-loading code paths. `llmJsonVision` reads from disk via `fs.promises.readFile`, so we still write to tmp briefly.)

#### Tests

- `src/trigger/stages/visualOverview.test.ts`
- `src/trigger/stages/visualStep.test.ts`

(Details under "Testing" below.)

## Schema changes

- `ContextOutput.category`: enum → `z.string()`.
- No new fields on `SopDoc`.
- No new `ErrorCode` entries.
- No Mongo migration.
- `zodToJsonSchemaLike` in `openrouter.ts` already supports every type used by the new code paths (`OverviewOutput` and `StepRewriteOutput` are reused as-is). No converter changes needed.

## Error handling

The PDF synth path is best-effort by design. The new stages plug into that contract:

- `runVisualOverview` throws on any failure (frame sampling, LLM, schema-invalid). `loadVisualOverviewSafely` catches and returns `null`. PDF renders without overview, same as today.
- `runVisualStep` throws on LLM/schema failure; the wrapper returns `{ prose: step.description, subBullets: [], callouts: [] }`. The fallback path inside `runVisualStep` (no keyframes / no poster) is a normal return, not a throw — it's expected for legacy or edge cases.
- All retries live inside `llmJsonVision` (`maxRetries: config.ai.maxRetries`). Stages do not wrap with extra retry logic.
- Resource cleanup: every tmp dir / source video disposed in a `finally` on the owning function.

## Testing

- `src/trigger/stages/visualOverview.test.ts`
  - Strategy: real fixture. The test gates on `fs.existsSync("samples/<short-fixture>.mp4")` and skips if absent (same pattern as `sampleFrames.test.ts`). The repo already ships `samples/4_no_speech.mp4`; the test can use that or a smaller fixture if added later. The fixture flows through real `sampleFrames`.
  - Stubs `global.fetch` with a valid `OverviewOutput` payload. Asserts: parsed shape returned; user-prompt body contains `category`, `domainSummary`, and at least one step title; system prompt contains the language tag.
- `src/trigger/stages/visualStep.test.ts`
  - Stubs `global.fetch` for the OpenRouter call only — the stage no longer downloads from R2; it receives `Buffer[]` from the caller. Test passes synthetic image buffers (a few JPEG-magic-byte chunks).
  - Asserts: parsed `StepRewrite` returned; prompt contains step title, prev title, category, domainSummary; fallback shape returned (no LLM call) when `imageBuffers` is empty.
- Existing tests need a small refresh for Part A:
  - `src/trigger/stages/visualContext.test.ts` already uses `"Coffee & Drinks"` as the category — fine, still a valid string.
  - `src/trigger/stages/visualExtract.test.ts` uses `"Other"` and `"Coffee & Drinks"` as category strings — fine; remove any `as Category` casts if present and add a `domainSummary` argument when calling `runVisualExtract`.
  - Same for any test that constructs `runExtract` args.
- Legacy speech docs (with `inputMode === undefined` and a non-empty transcript) take the existing speech path through `loadOverviewSafely` / `loadStepRewriteSafely` unchanged — confirmed by the branch on `doc.inputMode === "silent"`. No new tests for legacy rendering.
- No new e2e tests required; the existing silent-path manual smoke (real video upload) plus the new unit tests cover the change.

### Why the silent path bumps step description length but the speech path doesn't

The silent path's `runVisualExtract` sets the only step text the SOP web page ever shows; today it's 2–4 sentences and reads thin. Bumping it to a 3–6 sentence paragraph is a cheap, prompt-only upgrade that materially improves the web page.

The speech path's `runExtract` already produces step text that mirrors the trainer's narration — naturally varying with what was said in each step. Forcing 3–6 sentences would either pad terse steps or truncate verbose ones, neither of which improves user perception. So the speech-path prompt stays as-is.

## Open questions

None blocking. Future enhancements out of scope:

- Speech-path PDF synth could also accept `category` / `domainSummary` for tone consistency. Skipped for YAGNI.
- Per-category prompt tuning (e.g., specialized callouts for Spa/Beauty) — possible later if model output is uneven across domains.
- Re-running enrichment on already-generated SOPs without regenerating PDFs.
