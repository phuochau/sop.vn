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

- Delete `CATEGORIES` constant, `Category` type, `DOMAIN_TERMINOLOGY` map.
- Update existing prompts to drop `domainHint`:
  - `prompts.contextSystem(lang)` — unchanged shape; the system prompt already only references `lang`.
  - `prompts.visualContextSystem(lang)` — same.
  - `prompts.sopSystem(lang)` (was `sopSystem(domainHint, lang)`) — now takes only `lang`. The user prompt that calls it will pass `category` + `domainSummary` as part of its body.
  - `prompts.visualSopSystem(lang)` — same shape change as `sopSystem`.
- Add two new prompts:
  - `prompts.pdfVisualOverviewSystem(lang)` — instructs the model to derive `purpose`, `audience`, `prerequisites` (3–5), `toolsMaterials` (3–8), and `estimatedDuration` from the *frames it sees* and the supplied `category` + `domainSummary` + step list. Same `LANGUAGE:` and "keep technical terms" rules as the existing PDF overview prompt.
  - `prompts.pdfVisualStepSystem(lang)` — instructs the model to write 1–3 short paragraphs of prose, an ordered list of imperative sub-bullets, and any warnings/tips/notes as callouts, based on the *step keyframes* + the step's title + description + the document's `category` + `domainSummary`. Forbid inventing actions not visible in the keyframes.
- The `domainTerminology` field on the `ai` config block is removed.

#### `src/lib/schemas.ts`

- `ContextOutput.category`: `z.enum([...])` → `z.string()`. Other fields untouched.
- All other schemas unchanged.

#### `src/lib/mongo.ts`

- No change. `SopDoc.category: string` was already a plain string.

#### `src/trigger/stages/context.ts`

- Drop the `Category` import; the return value is now `{ category: string; domainSummary: string }`. The fallback behavior on LLM failure (currently returns `category: "Other"`) becomes `category: ""` — empty string indicates "model didn't produce one"; downstream prompts handle `""` the same way they handle a real value, the model just gets one less piece of context.

#### `src/trigger/stages/visualContext.ts`

- Same change. Errors still propagate (per the prior spec); only the success-path return type loses the `Category` annotation.

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

- Speech branch: pass `domainSummary` (from `runContext`) into `runExtract`.
- Silent branch: pass `domainSummary` (from `runVisualContext`) into `runVisualExtract`.
- Drop `Category` import.

#### `src/trigger/generateSopPdf.ts`

- Add two new helpers next to the existing safe-loaders:
  - `loadVisualOverviewSafely(doc)` — wraps `runVisualOverview` in try/catch, returns `Overview | null`.
  - `loadVisualStepRewriteSafely(doc, stepIndex)` — wraps `runVisualStep` in try/catch, returns `StepRewrite` (with the same `{ prose: step.description, subBullets: [], callouts: [] }` fallback shape used today when the rewrite call fails).
- Branch on `doc.inputMode === "silent"` in the existing `Promise.all` block (lines 96–100): pick the visual loaders for silent docs, the existing loaders otherwise.
- Source video must be available for `runVisualOverview`. To avoid two downloads, the silent branch fetches the source once before the parallel block and passes the local path into `runVisualOverview`. (`runVisualStep` does not need the source video — it uses already-uploaded keyframes.) The fetched source is disposed in a `finally`.

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
    keyframeR2Keys: string[];
    posterR2Key: string | null;   // fallback when keyframes missing
    prevTitle: string | null;
    category: string;
    domainSummary: string;
    language: string;
  }): Promise<StepRewrite>;
  ```
- Implementation:
  1. If `keyframeR2Keys.length > 0`, download each via R2 presigned GET into a fresh tmp dir.
  2. Else if `posterR2Key`, download just the poster.
  3. Else (no images at all), short-circuit: return `{ prose: step.description, subBullets: [], callouts: [] }` without an LLM call.
  4. Send local image paths to `llmJsonVision` with `StepRewriteOutput` schema and the new `pdfVisualStepSystem` prompt. The user prompt includes the step title, original description, prev step title (for continuity), category, and domainSummary.
  5. Dispose the tmp dir in a `finally`.

#### Tests

- `src/trigger/stages/visualOverview.test.ts`
- `src/trigger/stages/visualStep.test.ts`

(Details under "Testing" below.)

## Schema changes

- `ContextOutput.category`: enum → `z.string()`.
- No new fields on `SopDoc`.
- No new `ErrorCode` entries.
- No Mongo migration.

## Error handling

The PDF synth path is best-effort by design. The new stages plug into that contract:

- `runVisualOverview` throws on any failure (frame sampling, LLM, schema-invalid). `loadVisualOverviewSafely` catches and returns `null`. PDF renders without overview, same as today.
- `runVisualStep` throws on LLM/schema failure; the wrapper returns `{ prose: step.description, subBullets: [], callouts: [] }`. The fallback path inside `runVisualStep` (no keyframes / no poster) is a normal return, not a throw — it's expected for legacy or edge cases.
- All retries live inside `llmJsonVision` (`maxRetries: config.ai.maxRetries`). Stages do not wrap with extra retry logic.
- Resource cleanup: every tmp dir / source video disposed in a `finally` on the owning function.

## Testing

- `src/trigger/stages/visualOverview.test.ts`
  - Stubs `fetch` with a valid `OverviewOutput` payload. Asserts: parsed shape returned; user-prompt body contains `category`, `domainSummary`, and at least one step title; system prompt contains the language tag.
  - Frame extraction is exercised indirectly — the test pre-creates a tmp `srcPath` (a small fixture or a stub) so `sampleFrames` runs end-to-end. If a fixture is unavailable, mocks `sampleFrames` via dependency injection (the function takes `srcPath` already; test passes a tiny generated mp4 from `samples/`).
- `src/trigger/stages/visualStep.test.ts`
  - Stubs `fetch` for both R2 keyframe GETs and the OpenRouter call. Asserts: parsed `StepRewrite` returned; prompt contains step title, prev title, category, domainSummary; fallback shape returned (no LLM call) when both `keyframeR2Keys` is empty and `posterR2Key` is null.
- Existing tests need a small refresh for Part A:
  - `src/trigger/stages/visualContext.test.ts` already uses `"Coffee & Drinks"` as the category — fine, still a valid string.
  - `src/trigger/stages/visualExtract.test.ts` uses `"Other"` and `"Coffee & Drinks"` as category strings — fine; just remove any `as Category` casts if present and add a `domainSummary` argument when calling `runVisualExtract`.
  - Same for any other test that constructs the extract args.
- No new e2e tests required; the existing silent-path manual smoke (real video upload) plus the new unit tests cover the change.

## Open questions

None blocking. Future enhancements out of scope:

- Speech-path PDF synth could also accept `category` / `domainSummary` for tone consistency. Skipped for YAGNI.
- Per-category prompt tuning (e.g., specialized callouts for Spa/Beauty) — possible later if model output is uneven across domains.
- Re-running enrichment on already-generated SOPs without regenerating PDFs.
