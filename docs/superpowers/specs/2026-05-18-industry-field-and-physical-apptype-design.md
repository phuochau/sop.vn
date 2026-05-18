# Industry Field & Physical appType — Design

**Date:** 2026-05-18
**Status:** Approved (brainstorming)

## Context

The pipeline currently only accepts screen recordings of software applications.
Stage 0 (`runAnalyzeVideo`) samples frames, asks a VLM to classify them, and
`decideAppGate` rejects the SOP with `not_an_app` if fewer than half the sampled
frames show an app UI. The analysis VLM call already returns
`{ appUIFrameCount, totalFrames, appType, category, domainSummary }`, and
`category`/`domainSummary`/`appType` are persisted on the `SopDoc`.

We want to broaden the product toward non-software ("physical") SOPs —
manufacturing, healthcare, food production, field service, etc. That is a large
effort and has been decomposed into two sub-projects, run sequentially:

- **Sub-project A (this spec):** add an LLM-detected `industry` field to every
  SOP, and extend Stage 0 to *recognize* physical-process video — without
  changing rejection behavior yet.
- **Sub-project B (future):** the physical / clip pipeline. Visual-first,
  narration-augmented; produces clips instead of screenshots; no highlight, no
  element metadata, no automation metadata. Designed from scratch later.

A is a prerequisite for B: B will flip Stage 0 from *rejecting* physical video
to *routing* it. This spec covers **only A**.

## Goal

1. Every SOP carries an LLM-detected `industry` (a curated enum).
2. Stage 0 can label a recording as `physical`, distinct from `none`.
3. No change to rejection behavior: physical video still rejects with
   `not_an_app`, exactly as today.

## Non-goals

- Building the physical pipeline (sub-project B).
- Routing physical video anywhere — it still rejects.
- A new error code or rejection message for physical video.
- Any UI work to display `industry`.
- Persisting `industry` for rejected videos.
- PDF / document input.

## Design

### 1. Schema changes

**`src/lib/schemas.ts` — `VideoAnalysisOutput`:**

- `appType` enum extended from `["web", "mobile", "desktop", "none"]` to
  `["web", "mobile", "desktop", "physical", "none"]`.
- New field `industry`: a `z.enum` over the 13 values below.

**Industry enum (13 values):**

```
manufacturing
healthcare
food-and-beverage
hospitality
logistics-and-warehousing
retail
field-service-and-maintenance
construction
laboratory-and-pharma
agriculture
software-and-it
office-and-admin
other
```

`other` is the escape hatch. The list is intentionally coarse and
product-pragmatic (not NAICS/GICS granularity); it will be revisited once real
upload data shows what clusters into `other`. All 13 values are
lowercase-hyphenated — no internal capitalization.

**`src/lib/mongo.ts` — `SopDoc`:**

- `appType` stays **optional** (`appType?:`); its union gains `"physical"`:
  `appType?: "web" | "mobile" | "desktop" | "physical" | "none"`.
- New optional field `industry?: string` — optional because legacy SopDocs
  predate it. Typed as `string` (not the enum literal union) to tolerate future
  enum drift in already-stored data; this mirrors how the sibling `category`
  field is typed `string` rather than a fixed union.

### 2. Stage 0 prompt — `analyzeVideoSystem` (`src/config/index.ts`)

The prompt is updated so the VLM:

- Picks `appType` from the **5** values. New definition:
  - **`physical`** — real-world footage of a hands-on process: assembly,
    cooking, machine operation, maintenance, lab work, inspection. Includes
    fixed-camera and un-narrated footage.
  - **`none`** — genuine non-process video: a person talking to camera, a
    slideshow/presentation, a static title card, or gameplay.
  - The existing screen types (`web`/`mobile`/`desktop`) are unchanged.
- Returns a new `industry` field — one of the 13 enum values. The prompt must
  instruct the VLM to: pick the industry from what the video shows (screen
  content and/or narration); default to `other` when no industry clearly fits;
  and treat `software-and-it` as valid for any `appType` (a screen recording of
  a generic SaaS tool with no clear vertical is `software-and-it`).

The returned JSON shape becomes:
`{ "appUIFrameCount": int, "totalFrames": int,
   "appType": "web"|"mobile"|"desktop"|"physical"|"none",
   "industry": <one of 13>, "category": string, "domainSummary": string }`.

### 3. Behavior — unchanged

`decideAppGate(appUIFrameCount, totalFrames)` is **not modified**. A physical
recording shows no app UI, so `appUIFrameCount / totalFrames` is below 0.5 and
the gate rejects it. The caller still returns `fail(_id, "not_an_app")`. No new
error code, no new message. `appType: "physical"` is simply carried on the
analysis result and (when a SOP is *not* rejected — i.e. screen recordings)
persisted; physical recordings reject before the write, so in practice
`"physical"` is observable in logs/traces but not yet stored on a `SopDoc`.

### 4. Persistence — `src/trigger/processSopScreenshots.ts`

`industry` is added to the existing post-gate destructure + `$set`
(`processSopScreenshots.ts:112-116`):

```ts
const { category, domainSummary, appType, industry } = analysis;
await (await sops()).updateOne(
  { _id },
  { $set: { category, domainSummary, appType, industry, updatedAt: new Date() } },
);
```

Rejected videos (physical or `none`) reject before this write, so they do not
persist `industry` — consistent with how `category`/`appType` already behave.

## Data flow

```
sampleFrames → llmJsonVision (analyzeVideoSystem prompt)
  → VideoAnalysisOutput { ..., appType ∈ 5, industry ∈ 13 }
  → decideAppGate (UNCHANGED)
      ├─ fail  → fail(_id, "not_an_app")        [physical lands here]
      └─ pass  → $set { category, domainSummary, appType, industry }
```

## Error handling

No new failure modes. A VLM call failure still maps to `analysis_failed` (the
existing `try/catch` around `runAnalyzeVideo`). A malformed VLM response — e.g.
an `industry` value outside the enum — fails `VideoAnalysisOutput` parsing,
which `llmJsonVision` already retries up to `config.ai.maxRetries`; exhausting
retries throws and maps to `analysis_failed`, same as today.

## Testing

**`src/trigger/stages/analyzeVideo.test.ts`:**

- A stubbed `visionFn` returning `appType: "physical"` + an `industry` value:
  assert the values flow through `runAnalyzeVideo` unchanged.
- Assert `decideAppGate` still returns `false` for a physical-shaped result
  (low `appUIFrameCount`) — i.e. behavior is unchanged.

**`src/lib/schemas.test.ts`:**

- `VideoAnalysisOutput` parses a full object with `appType: "physical"` and a
  valid `industry`.
- `VideoAnalysisOutput` rejects an `industry` value outside the enum.
- `VideoAnalysisOutput` rejects an `appType` outside the 5-value enum.

## Files touched

- `src/lib/schemas.ts` — `VideoAnalysisOutput` (appType enum + `industry`).
- `src/lib/mongo.ts` — `SopDoc` (`appType` union + `industry?`).
- `src/config/index.ts` — `analyzeVideoSystem` prompt.
- `src/trigger/processSopScreenshots.ts` — `$set` gains `industry`.
- `src/lib/schemas.test.ts`, `src/trigger/stages/analyzeVideo.test.ts` — tests.
