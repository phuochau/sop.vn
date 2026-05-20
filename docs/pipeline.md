# SOP Processing Pipeline

How a video becomes a screenshot-based SOP (standard operating procedure).

## Overview

The orchestrator task is `process-sop-screenshots` (name is historical; it now
handles both output formats). It takes an uploaded video and produces a
step-by-step SOP where each step is illustrated either by **screenshots** with
a yellow-circle highlight point, or by a **video clip** trimmed to the step
boundary. The user picks the format at upload (`auto` / `screenshots` /
`clips`); the resolver decides the effective format after analyze (see Stage
0.5).

Two ingest entry points feed the orchestrator:

- **Direct upload** — `POST /api/upload/commit` flips status to `transcribing`,
  probes the source video (size, dimensions, duration, fps, codec) onto
  `SopDoc.source`, then triggers `process-sop-screenshots`.
- **Loom URL** — `POST /api/ingest/loom` runs the `ingest-loom` task, which
  streams the Loom mp4 to R2, probes the source, then triggers the orchestrator.

Three rules govern what gets processed:

1. **Software-app or physical recordings.** App videos (web/mobile/desktop)
   run through the standard pipeline. Physical-world recordings (industrial
   procedures, on-site walkthroughs) are also accepted but always produce
   clips. Talking-head clips, slideshows, and gameplay are rejected.
2. **Narrated or silent — both work.** A video with a person talking goes
   through the *speech* head; a video with no narration goes through the
   *silent* head.
3. **Output format is user-chosen, with safety coercion.** `auto` picks
   screenshots for apps / clips for physical. `clips` always produces clips.
   `screenshots` on a physical recording is coerced to clips with a notice on
   the SOP page (`outputFormatCoerced`).

## High-level flow

```
ingest (upload-commit OR ingest-loom)
│   probe source → SopDoc.source { sizeBytes, width, height,
│                                  durationSec, fps, ext, mime, codec }
▼
process-sop-screenshots
│
├─ probeDuration ──────────────────→ fail: video_too_short / video_too_long
│
├─ download source video (once — reused by every stage below)
│
├─ Stage 0  ANALYZE  (vision, runs for ALL videos)
│     sample ~1 frame/min, clamped [8,20]
│     one VLM call → per-frame app-UI classification
│                   + appType (web/mobile/desktop/physical/none)
│                   + industry (curated enum)
│                   + category + domainSummary
│     < 50% app-UI frames AND not physical ─→ fail: not_an_app   (permanent)
│     VLM call errors ────────────────────────→ fail: analysis_failed (retryable)
│
├─ Stage 0.5  RESOLVE OUTPUT FORMAT  (pure)
│     resolveOutputFormat(sop.outputFormat, analysis.appType)
│       → effectiveOutputFormat: "screenshots" | "clips"
│       → outputFormatCoerced?  (set when physical + user picked screenshots)
│     persisted on SopDoc; drives the Stage 5 branch and the viewer renderer.
│
├─ Stage 1  transcribe (always run; Whisper handles no-audio gracefully)
│
├─ branch: hasUsableSpeech(segments, transcript)?
│   ├─ SPEECH head                          ├─ SILENT head
│   │  outputLanguage = detected lang        │  outputLanguage = defaultLanguage
│   │  normalize (source language)           │  sampleFrames (density)
│   │  extract (steps from transcript)        │  visualExtract (steps from frames)
│   │  resolveTimes (segmentIds → times)     │
│   └─── converge on: { title, steps:[{title,startTime,endTime}] } ────────────┘
│
├─ branch on effectiveOutputFormat:
│
│   ── SCREENSHOTS branch ──
│   ├─ Stage 2  buildFramePool
│   ├─ Stage 3  extractClickEvents → classifyAndMergeEvents
│   ├─ Stage 4  per-step loop: classify → canonicalize → buildActions
│   │                          → collapse → highlight
│   │            (each highlight carries source.subStepIndex + source.grounder)
│   ├─ Stage 5a uploadScreenshots
│   │            (each Screenshot carries sizeBytes/width/height/ext/mime
│   │             + optional highlight + highlight.source breadcrumb)
│
│   ── CLIPS branch (physical, or app/web with user-picked clips) ──
│   ├─ Stage 5b runExtractClips  (one clip + midpoint poster per step)
│   │            (each clip is ffprobed for width/height/codec/durationSec)
│   ├─ Stage 5b runUploadClips
│   │            (each Clip carries size/dims/codec/ext/mime + poster sub-block)
│
└─ done · steps + screenshots OR clips written to the SOP document
```

## Stages in detail

### Pre-stage — ingest + source probe

Before the orchestrator runs, the ingest layer probes the source video and
writes `SopDoc.source = { sizeBytes, width, height, durationSec, fps, ext,
mime, codec }`. For direct uploads the probe runs inside
`POST /api/upload/commit` after R2 confirms the bytes; for Loom it runs inside
the `ingest-loom` trigger task right after the stream finishes. Probe failure
is non-fatal — the field is just absent and the pipeline continues.

### Pre-stage — duration probe

`probeDuration` reads the video length. Outside the configured
`[minVideoDurationSec, maxVideoDurationSec]` range → fail with
`video_too_short` / `video_too_long`.

The source video is then downloaded once to a temp dir and reused by Stage 0,
the silent head, and the frame pool. It is disposed when the run ends.

### Stage 0 — analyze (app-recording gate + context)

`analyzeVideo` runs first for **every** video, before transcription.

- Samples roughly one frame per minute, clamped to `[8, 20]` frames. Sampling
  by duration (not a fixed small count) means a long stretch of non-app content
  cannot hide between samples.
- One vision-LLM call classifies **each** frame as app-UI or not, and returns
  an overall `appType` (`web` / `mobile` / `desktop` / `physical` / `none`),
  an `industry` (curated enum), a `category`, and a one-line `domainSummary`
  used for downstream grounding.
- The caller computes the app-UI fraction. **< 50% → reject** as `not_an_app`
  (permanent; the run will not be retried), *unless* `appType === "physical"`,
  in which case the recording is accepted and routed to the clips branch.
- A VLM outage throws → `analysis_failed` (retryable). The pipeline never
  silently ingests an unverified video.

`category` / `domainSummary` / `appType` / `industry` are persisted on the SOP
document.

### Stage 0.5 — resolve output format

`resolveOutputFormat(sop.outputFormat, analysis.appType)` is a pure function
that takes the user's pick (`auto` | `screenshots` | `clips`) and the detected
appType, and returns `effectiveOutputFormat: "screenshots" | "clips"`. If the
user picked `screenshots` for a physical recording, it also returns
`outputFormatCoerced = { from: "screenshots", to: "clips", reason: "physical_detected" }`,
which the viewer surfaces as an amber notice. The truth table:

| User pick × appType | app/web      | physical                       |
|---------------------|--------------|--------------------------------|
| `auto`              | screenshots  | clips                          |
| `screenshots`       | screenshots  | clips (coerced + notice)       |
| `clips`             | clips        | clips                          |

`effectiveOutputFormat` is persisted and drives the Stage 5 branch and the SOP
viewer's per-step renderer.

### Stage 1 — transcribe

`transcribe` (fal / Whisper) always runs. A video with no audio track simply
returns no segments. The whisper cost is only recorded when segments exist.

### The speech / silent branch

`hasUsableSpeech(segments, transcript)` decides the head. It keys on **usable
speech**, not on the presence of an audio track — a silent video may still
carry background music or UI sounds.

**Speech head** (narrated video):

- `outputLanguage` = the language Whisper detected. The upload-form language is
  ignored for narrated videos.
- `normalize` cleans the transcript in its source language.
- `extract` produces the step list from the transcript.
- `resolveTimes` converts the extracted `startSegmentId` / `endSegmentId` into
  `startTime` / `endTime`.

**Silent head** (no narration):

- `outputLanguage` = the upload form's `defaultLanguage` (falls back to `vi`).
- `sampleFrames` samples a dense set of frames across the video.
- `visualExtract` (a vision-LLM call) reads the workflow off those frames and
  returns the step list with time windows directly.

Both heads converge on the same shape:
`{ title, steps: [{ title, description, startTime, endTime }] }`. From Stage 2
onward the code path is identical for both.

### Stage 2 — buildFramePool

`buildFramePool` samples the video at `sampleFps`, applies a motion filter and
dedup, and produces `denseFrames` — the frame pool every later stage works from.

### Stage 3 — detect & classify events

- `extractClickEvents` detects UI events per step from the frame pool using
  CV frame-differencing.
- `classifyAndMergeEvents` labels each event click-vs-input and merges typing
  runs into a single input event.

### Stage 4 — per-step loop

For each step:

1. `buildScreenClusters` groups frames into screen-identity clusters.
2. `classifyAndRemap` (vision LLM) keeps/discards each candidate and assigns a
   `screenName` / `elementCaption` / display frame. Runs **one candidate per
   call** for reliable image-to-candidate mapping.
3. `canonicalizeActions` (text LLM) reconciles the per-candidate captions into
   consistent canonical forms in the output language.
4. `buildActionsForStep` deduplicates and assembles the step's `Action[]`.
5. `collapseDuplicateActions` collapses adjacent near-identical display frames.
6. `highlightActions` runs the highlighter on each non-`view` action.

### The highlight (per action)

`runLocateHighlight` renders the yellow-circle point:

```
frame ─→ downscale to 1280px ─→ pointFallbackHighlight:
            UI-TARS point grounder  ──found?──→ yellow circle at point
                  │ throws/empty                 (decision.grounder = "ui-tars")
            Qwen3-VL fallback       ──found?──→ yellow circle at point
                  │ both empty            → no-highlight: no_specific_target
                  │ both threw            → no-highlight: grounding_unavailable
         view verb ──────────────────────────→ always no-highlight (view_action)
```

The highlight is always a **point** (yellow circle, normalized 0–1), never a
bounding box. `highlightActions` writes a `highlight.source` breadcrumb onto
each populated action: `{ subStepIndex, grounder }`. It's stored on the
`Screenshot` record alongside the point and lets a debugger trace any
mis-highlight back to which sub-step and which grounder produced it.

### Stage 5a — uploadScreenshots (screenshots branch)

`uploadScreenshots` renders each highlighted frame (sharp composites the
yellow circle onto the source jpeg), uploads it to R2, and writes the
`Screenshot` records onto each step. Each record carries `sizeBytes`,
`width`, `height`, `ext: "jpg"`, `mime: "image/jpeg"`, and (when present)
`highlight` + `highlight.source`. The SOP document is marked `done`.

### Stage 5b — extract + upload clips (clips branch)

`runExtractClips` trims one mp4 per step (start→end) plus a midpoint poster
jpeg, all into a temp dir. Each clip is ffprobed for `width`, `height`,
`durationSec`, `codec`; the poster is sharp-probed for dimensions and
stat-ed for size. `runUploadClips` then puts the mp4 + poster to R2 and
writes one `Clip` per step carrying `sizeBytes`, `width`, `height`,
`durationSec`, `codec`, `ext: "mp4"`, `mime: "video/mp4"`, plus a poster
sub-block (`posterSizeBytes`, `posterWidth`, `posterHeight`,
`posterMime`). The SOP document is marked `done`. Clips never carry a
highlight overlay — the format implies the user watches the action play out.

## Language

- **Speech videos:** output language = the language Whisper detects from the
  audio. The upload-form language is ignored.
- **Silent videos:** output language = the upload form's `defaultLanguage`
  (falls back to `vi`). There is no audio to detect from.

## Error codes

| Code | Stage | Retryable | Meaning |
|---|---|---|---|
| `video_too_short` / `video_too_long` | probe | no | Duration out of range |
| `not_an_app` | Stage 0 | no | < 50% of sampled frames show an app UI |
| `analysis_failed` | Stage 0 | yes | The analyze VLM call errored |
| `video_download_failed` | pre-stage | yes | Source video could not be fetched |
| `transcription_failed` | Stage 1 | yes | Whisper failed |
| `generation_failed` | extract / per-step loop | yes | Step extraction or classification failed |
| `frame_sampling_failed` | silent head | yes | Frame sampling for `visualExtract` failed |
| `visual_extract_failed` | silent head | yes | `visualExtract` failed |
| `screenshot_pool_failed` | Stage 2 | yes | Frame pool build failed |
| `click_detect_failed` | Stage 3 | yes | Click-event detection failed |
| `clip_extract_failed` | Stage 5b | yes | Per-step clip extraction failed |
| `highlight_failed` | Stage 4 | yes | Reserved; same policy as `verify_failed` |

## Verified behavior (E2E)

| Date | Case | Video | Result |
|---|---|---|---|
| 2026-05-18 | Narrated, app/web | HubSpot CRM walkthrough (~19.6 min) | `done` — speech branch, language `vi` detected, `appType: web`, 5 steps / 85 screenshots, ~$0.22/run |
| 2026-05-18 | Silent, app/web | Same walkthrough, audio stripped (~5 min trim) | `done` — silent branch, language `vi` from default, `appType: web`, 10 steps / 36 screenshots, ~$0.10/run |
| 2026-05-18 | Non-app | A dance tutorial (real-world footage) | `failed` / `not_an_app` — rejected after one ~$0.002 vision call |
| 2026-05-20 | Output-format `auto` → screenshots | Trimmed HubSpot CRM (~5 min) | `done` — `appType: web`, `effectiveOutputFormat: screenshots`, 3 steps, `Screenshot.{sizeBytes,width,height}` populated, `highlight.source.grounder: "ui-tars"` confirmed live |
| 2026-05-20 | Output-format `clips` (app/web → clips) | Trimmed HubSpot CRM (~5 min) | `done` — `effectiveOutputFormat: clips`, 6 steps, `Clip` carries size/dims/codec + full poster sub-block |
| 2026-05-20 | Output-format `screenshots` on physical | Physical assembly clip | `done` — `outputFormatCoerced: { from: "screenshots", to: "clips", reason: "physical_detected" }`, amber notice rendered on SOP page |

## Notes

- The pipeline produces **screenshots OR clips**, gated by user choice
  (`SopDoc.outputFormat`) and resolved per-run at Stage 0.5
  (`effectiveOutputFormat`). The earlier document/PDF pipeline was removed and
  is in git history.
- Every run captures asset metadata: `SopDoc.source` for the source video,
  `Screenshot.{sizeBytes,width,height,ext,mime}` and `Clip.{sizeBytes,width,
  height,durationSec,codec,ext,mime,poster*}` for each derived asset, and
  `Screenshot.highlight.source` for each grounded point.
- Per-run AI cost is tracked per stage and persisted on the SOP document
  (`aiCost`).
- Design and implementation history:
  - `docs/superpowers/specs/2026-05-18-pipeline-consolidation-design.md` + plan
  - `docs/superpowers/specs/2026-05-18-physical-clip-pipeline-design.md` + plan
  - `docs/superpowers/specs/2026-05-20-user-selectable-output-format-design.md` + plan
  - `docs/superpowers/specs/2026-05-20-asset-metadata-storage-design.md` + plan
