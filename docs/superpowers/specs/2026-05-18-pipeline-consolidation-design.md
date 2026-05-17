# Pipeline Consolidation — Design

**Date:** 2026-05-18
**Status:** Approved for planning

## Goal

Collapse the project to a single, clean SOP pipeline before moving toward a real
product. One trigger task produces screenshot-based SOPs with yellow-circle
highlight points. It accepts only software-application recordings (web, mobile,
desktop) and supports both narrated and silent videos.

## Motivation

Four product decisions drive this:

1. **Ingest only app recordings.** We want strong results for highlight points
   first, so we only process videos that show a web/mobile/desktop application.
   Other video types (talking-head, slideshow, real-world footage) are rejected.
2. **Support silent (no people talking) videos.** Highlight points must work for
   videos with no narration — this serves the silent-founder use case.
3. **Screenshots only.** The screenshots pipeline is the base. The document/clip
   pipeline is removed; clips can be re-added later from git history if needed.
4. **Language rule.** Narrated videos use the language Whisper detects from the
   audio. Silent videos use the upload form's `defaultLanguage`.

## Architecture

One trigger task, `process-sop-screenshots`. One shared front analysis stage,
two thin path-specific heads (speech / silent), and one shared spine from
frame-pool building onward.

```
process-sop-screenshots
│
├─ probeDuration ──────────────────→ fail: video_too_short / video_too_long
│
├─ Stage 0  ANALYZE  (vision, runs for ALL videos)
│     sample ~1 frame/min, clamped [8,20]
│     one VLM call → per-frame app-UI classification + appType
│                   + category + domainSummary
│     < 50% app-UI frames ───────────→ fail: not_an_app   (permanent)
│     VLM call errors ───────────────→ fail: analysis_failed (retryable)
│
├─ Stage 1  transcribe (always run)
│
├─ branch: hasUsableSpeech(segments, transcript)?
│   │
│   ├─ SPEECH head                          ├─ SILENT head
│   │  outputLanguage = detected lang        │  outputLanguage = defaultLanguage
│   │  normalize (source lang)               │  visualExtract (frames)
│   │  extract (steps from transcript)        │   → step list w/ start/end times
│   │  resolveTimes (segmentIds → times)     │   uses category/domainSummary
│   │  uses category/domainSummary           │   from Stage 0
│   │  from Stage 0                          │
│   │
│   └─── both heads converge on: { title, steps:[{title,startTime,endTime}] } ───┘
│
├─ Stage 2  buildFramePool
├─ Stage 3  extractClickEvents → classifyAndMergeEvents
├─ Stage 4  per-step loop: classify → canonicalize → buildActions
│                          → collapse → highlight
├─ Stage 5  uploadScreenshots
│
└─ done · mode:"screenshots"
```

### Stage 0 — app gate + context (the consolidation)

A single vision stage runs first for every video, before transcription:

- Samples roughly one frame per minute of video, clamped to `[8, 20]` frames.
  Sampling by duration (not a fixed small count) means a long stretch of
  non-app content cannot hide between samples.
- One VLM call classifies **each** frame as app-UI or not-app, and returns an
  overall `appType` (`web` / `mobile` / `desktop` / `none`), plus `category`
  and `domainSummary` for downstream grounding.
- The caller computes the app-UI fraction. **< 50% → reject** as `not_an_app`.
  A fraction (not all-or-nothing) tolerates intro/outro/talking segments while
  rejecting videos that are not fundamentally a software walkthrough.

This stage replaces the former text-only `context` stage and the silent-path
`visualContext` stage. The text-only `context` could never see the screen, so
it could not gate on app content; a vision stage that already spans the whole
video can return `category`/`domainSummary` at no extra call. For narrated
videos, `domainSummary` is now frame-derived rather than transcript-derived —
acceptable, because the actual steps still come from the transcript via
`extract`.

### Speech vs. silent branch

Transcription always runs (Whisper handles a no-audio track gracefully — it
returns no segments). The branch keys on `hasUsableSpeech`, not on the presence
of an audio track: a no-people-talking video may still carry background music
or UI sounds, so "has audio" is not the signal — "has usable speech" is.

### Convergence

The speech `extract` emits steps keyed by `startSegmentId`/`endSegmentId`
(`SopExtractOutput`), so the speech head runs `resolveTimes` to convert those to
`startTime`/`endTime`. The silent `visualExtract` already emits
`startTime`/`endTime` directly (`VisualSopExtractOutput`) and skips
`resolveTimes`. `resolveTimes` therefore lives **inside the speech head**, before
convergence — it is not a spine stage.

Both heads converge on `{ title, steps: [{ title, startTime, endTime }] }`. From
`buildFramePool` (Stage 2) onward the code path is identical for both — the only
per-path branching lives in the two heads.

## File Inventory

**New:**
- `src/trigger/stages/analyzeVideo.ts` — Stage 0.

**Adapted:**
- `src/trigger/processSopScreenshots.ts` — control flow rewritten per the
  diagram. Explicitly: remove the `runContext` import + `withStage("context",
  …)` call (line ~129) — Stage 0's `analyzeVideo` replaces it; add the Stage 0
  call, the silent head, and the `not_an_app`/`analysis_failed` handling.
- `src/trigger/stages/clip.ts` — trim to **only `resolveTimes`** (delete
  `runClip` and the imports it alone needed: `clipKey`/`posterKey`/`putObject`/
  `grabFrame`/`ffmpeg`/`fs`/`path`/`os`) and rename the file to `resolveTimes.ts`.
  `resolveTimes` is used by the speech head and must survive;
  `processSopScreenshots.ts` already imports it.
- `src/trigger/stages/clip.test.ts` — rename to `resolveTimes.test.ts` and
  repoint its `import { resolveTimes } from "./clip"` to `./resolveTimes`
  (drop any `runClip` tests).
- `src/trigger/ingestLoom.ts` — change both `tasks.trigger("process-sop", …)`
  calls (lines 65, 106) and their idempotency keys to `process-sop-screenshots`.
  Loom ingest must keep working after the `process-sop` task is deleted.
- `src/app/api/upload/commit/route.ts` — remove the `mode` enum field, its
  `"clips"` default, and the `taskId` branch (line 34); always trigger
  `process-sop-screenshots`. Stop persisting `mode` from the request body.
- `src/trigger/cleanupVideos.ts` — remove the "Sweep stale PDFs" block (lines
  ~41-67) and the `PDF_TTL_MS` constant; the PDF pipeline no longer sets
  `pdf.status`. Update the final log line that counts `pdfs`.
- `src/lib/utils.ts` — remove the orphaned `pdfKey` helper (line ~28-30); its
  only consumer was the deleted `generateSopPdf.ts`.

**Deleted** (document/clip pipeline + superseded stages), each with its
`.test.ts` where one exists:
- Trigger task & stages: `processSop.ts`, `generateSopPdf.ts`, `keyframes.ts`,
  `synthesizeOverview.ts`, `synthesizeStep.ts`, `renderPdf.tsx`, `visualStep.ts`,
  `visualOverview.ts`, `context.ts`, `visualContext.ts`.
- PDF surface: `src/app/api/sop/[id]/pdf/route.ts` (triggers the deleted
  `generate-sop-pdf` task), `src/app/api/sop/[id]/pdf/file/route.ts` (serves the
  generated PDF), `src/components/ExportPdfButton.tsx`.
- Clip surface: `src/app/api/clips/[sopId]/[key]/route.ts` (serves clip/poster
  files), `src/components/HeroVideo.tsx` (clip player), `src/components/StepCard.tsx`
  (clip-based step card — `StepCardScreenshots.tsx` is the screenshots one and is
  kept).

**`visualExtract.ts` — kept, effectively untouched.** It already accepts
`category`/`domainSummary` as input and already emits the converged
`{title, steps:[{title,description,startTime,endTime}]}` shape. It never ran
context internally (`runVisualContext` was a separate function in the deleted
`visualContext.ts`). The only change is that its `category`/`domainSummary` now
come from Stage 0 instead of `runVisualContext`.

### Callers & Frontend Surface

Removing the clip/PDF pipeline and the `mode` field touches several
routes/components. All of these are in scope:

- `src/app/api/sop/[id]/route.ts` — **Adapt.** Drop the `pdf` block (lines
  21-24), drop per-step `clipUrl`/`posterUrl` (lines 31-32, clip pipeline gone),
  and drop `mode` (line 11, 20) — there is only one mode. The response keeps
  `title`, `category`, `steps[].screenshots`, etc.
- `src/app/api/screenshots/[sopId]/[key]/route.ts` — **Adapt.** Remove the
  `doc.mode !== "screenshots"` 404 gate (line 23) — one mode now; gate on
  `status === "done"` instead.
- `src/app/sop/[id]/page.tsx` — **Adapt.** Remove the `Sop` type's `mode`,
  `pdf`, and `clipUrl` fields; remove the `<ExportPdfButton>` and `<HeroVideo>`
  renders and the `<StepCard>` (clip) branch; always render the screenshots view
  (`StepCardScreenshots`). Drop the now-dead imports.
- `src/components/UploadZone.tsx` — **Adapt.** Remove the `mode` state (line 21),
  the `mode` field in the commit POST body (line 58), and the "Video clips /
  Screenshots" radio toggle (lines ~237-250).
- `src/app/api/share/[token]/route.ts` — **Adapt.** Drop the per-step
  `clipUrl`/`posterUrl` fields (lines 24-25) that point at the deleted
  `/api/clips` route. It has no `pdf`/`mode` references.
- `src/app/share/[token]/page.tsx` — **Adapt.** Remove `clipUrl`/`posterUrl`
  from the `Step` type (lines ~12-13), the `posterUrl` `<img>` renders (lines
  ~118, 130, 142), and the `<ClientVideo clipUrl/posterUrl>` usage (lines ~231,
  237-243) — render the screenshots view instead, mirroring `sop/[id]/page.tsx`.
- `src/app/api/sop/[id]/status/route.ts` — **Untouched.** Verified: no
  `pdf`/`mode`/`clip` references.

The cleanup above removes every read of `mode` for branching, and the `mode`
field itself is dropped from `SopDoc` (see Data & Schema). One pipeline, no
discriminator.

**Untouched:** `extract.ts` (already accepts `category`/`domainSummary`),
`buildFramePool`, `extractClickEvents`, `classifyAndMergeEvents`,
`classifyStepWithLLM`, `canonicalizeActions`, `buildActionsForStep`,
`collapseDuplicateActions`, `highlightActions`, `locateHighlight`,
`uploadScreenshots`, `transcribe`, `normalize`.

**Naming:** the task keeps id `process-sop-screenshots` and file
`processSopScreenshots.ts`. Renaming to `process-sop` would break deployed
trigger references for a cosmetic gain.

## Data & Schema

- New zod schema `VideoAnalysisOutput` (in `src/lib/schemas.ts`):
  `{ appUIFrameCount: number, totalFrames: number,
     appType: enum["web","mobile","desktop","none"],
     category: string, domainSummary: string }`.
- Remove now-orphaned schemas from `src/lib/schemas.ts`: `OverviewOutput` and
  `StepRewriteOutput` (their only consumers — `synthesizeOverview`/`visualOverview`
  and `synthesizeStep`/`visualStep` — are deleted), and `ContextOutput` (its
  consumers `context.ts`/`visualContext.ts` are deleted). `VisualSopExtractOutput`
  is **kept** — `visualExtract.ts` still uses it.
- `ErrorCode` (in `src/lib/mongo.ts`) gains:
  - `not_an_app` — permanent; Stage 0 ran fine, < 50% app frames.
  - `analysis_failed` — retryable; Stage 0 VLM call errored.
- `ErrorCode` cleanup — remove codes that become unreachable once the clip/PDF
  pipeline is gone: `clipping_failed`, `visual_context_failed`. Keep
  `visual_extract_failed` (reused for a silent-head failure) and
  `loom_ingest_failed` (`ingestLoom.ts` is kept).
- `SopStatus` already includes `"analyzing"` — Stage 0 uses it.

**`src/lib/mongo.ts` type pruning.** The clip/PDF removal orphans several DB
types — all are pruned (there is only one pipeline now, so legacy fields add
only confusion):
- `Step` interface — remove `clipR2Key`, `posterR2Key`, `keyframeR2Keys` (the
  deleted `clip.ts`/`keyframes.ts` populated them). Correspondingly, remove the
  `clipR2Key:""`/`posterR2Key:""`/`keyframeR2Keys:[]` writes in
  `processSopScreenshots.ts` (lines ~267-269). `screenshots`/`screenshotsError`
  stay. Update the now-stale clip/screenshot-mode comments.
- Remove `SopPdfState` interface, `PdfStatus` type, and the `SopDoc.pdf` field.
- Remove the `SopDoc.mode` field entirely. There is one pipeline, so a `mode`
  discriminator is meaningless; remove the `mode: "screenshots"` write in
  `processSopScreenshots.ts` (line ~277) and the stale `mode` comment.
- The sop doc persists `appType` (new) alongside the existing `category`,
  `domainSummary`, `inputMode`.

## Language

- Speech path: `outputLanguage` = Whisper-detected language. The upload form's
  `defaultLanguage` is ignored for narrated videos.
- Silent path: `outputLanguage` = `doc.defaultLanguage`, falling back to `"vi"`
  if unset.
- `normalize` still runs in the source (detected) language for speech videos.

## Error Handling & Edge Cases

- Stage 0 runs before transcribe — a non-app video is rejected after one cheap
  VLM call, with nothing spent on Whisper.
- Stage 0 VLM outage → `analysis_failed` (retryable), never a silent ingest of
  an unverified video.
- Stage 0 samples `[8,20]` frames for gating only. The silent `visualExtract`
  still samples its own, denser frame set for step extraction — different
  density need; the two sample sets are not shared.
- A silent video with `defaultLanguage` unset falls back to `"vi"`.
- Transcribe on a silent video returns no segments → `hasUsableSpeech` false →
  silent head. No special-casing.

## Testing

- `analyzeVideo.test.ts` — fake VLM fn: threshold boundary (8/20 frames →
  reject, 10/20 → accept), `appType` passthrough, VLM-error propagation (caller
  maps the throw to `analysis_failed`).
- `visualExtract.test.ts` — kept as-is (the stage is effectively untouched);
  confirm it still passes after the schema cleanup.
- Tests for deleted stages are removed with their stages.
- `tsc --noEmit` must pass after deletions — this is the regression check that
  catches a broken caller (no surviving file imports a deleted file or the
  deleted `process-sop` / `generate-sop-pdf` task).
- E2E: the HubSpot narrated video (`samples/hubspot_crm.mp4`, existing
  benchmark, ~96%) and a silent sample. **Open item:** `samples/` currently
  holds `1.mp4`, `hubspot_crm.mp4`, `trimmed-hubspot_crm.mp4`; none is confirmed
  silent. A silent app-recording sample must be supplied to E2E-verify the
  silent head.

## Out of Scope

- Re-adding clip/PDF output (recoverable from git history when wanted).
- Grounding-precision improvements beyond the current ~96% (separate effort;
  see prior grounding-verification spec).
- Per-frame appType (a video is classified with one overall `appType`).
