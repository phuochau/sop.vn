# SOP Processing Pipeline

How a video becomes a screenshot-based SOP (standard operating procedure).

## Overview

The project has **one** trigger.dev task: `process-sop-screenshots`. It takes an
uploaded video and produces a step-by-step SOP where each action is illustrated
by a screenshot with a yellow-circle highlight point on the relevant UI element.

Two rules govern what gets processed:

1. **Only software-application recordings.** The video must show a web, mobile,
   or desktop app. Talking-head clips, slideshows, real-world footage, and
   gameplay are rejected up front.
2. **Narrated or silent — both work.** A video with a person talking is
   processed through the *speech* head; a video with no narration (silent, or
   music/UI-sound only) goes through the *silent* head.

## High-level flow

```
process-sop-screenshots
│
├─ probeDuration ──────────────────→ fail: video_too_short / video_too_long
│
├─ download source video (once — reused by every stage below)
│
├─ Stage 0  ANALYZE  (vision, runs for ALL videos)
│     sample ~1 frame/min, clamped [8,20]
│     one VLM call → per-frame app-UI classification + appType
│                   + category + domainSummary
│     < 50% app-UI frames ───────────→ fail: not_an_app       (permanent)
│     VLM call errors ───────────────→ fail: analysis_failed  (retryable)
│
├─ Stage 1  transcribe (always run; Whisper handles a no-audio track gracefully)
│
├─ branch: hasUsableSpeech(segments, transcript)?
│   │
│   ├─ SPEECH head                          ├─ SILENT head
│   │  outputLanguage = detected lang        │  outputLanguage = defaultLanguage
│   │  normalize (source language)           │  sampleFrames (density)
│   │  extract (steps from transcript)        │  visualExtract (steps from frames)
│   │  resolveTimes (segmentIds → times)     │
│   │
│   └─── both heads converge on: { title, steps:[{title,startTime,endTime}] } ───┘
│
├─ Stage 2  buildFramePool
├─ Stage 3  extractClickEvents → classifyAndMergeEvents
├─ Stage 4  per-step loop: classify → canonicalize → buildActions
│                          → collapse → highlight
├─ Stage 5  uploadScreenshots
│
└─ done · steps + screenshots written to the SOP document
```

## Stages in detail

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
  an overall `appType` (`web` / `mobile` / `desktop` / `none`), plus a
  `category` and a one-line `domainSummary` used for downstream grounding.
- The caller computes the app-UI fraction. **< 50% → reject** as `not_an_app`
  (permanent; the run will not be retried). A fraction (not all-or-nothing)
  tolerates intro/outro/talking segments while rejecting videos that are not
  fundamentally a software walkthrough.
- A VLM outage throws → `analysis_failed` (retryable). The pipeline never
  silently ingests an unverified video.

`category` / `domainSummary` / `appType` are persisted on the SOP document.

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
                  │ throws/empty
            Qwen3-VL fallback       ──found?──→ yellow circle at point
                  │ both empty            → no-highlight: no_specific_target
                  │ both threw            → no-highlight: grounding_unavailable
         view verb ──────────────────────────→ always no-highlight (view_action)
```

The highlight is always a **point** (yellow circle), never a bounding box.

### Stage 5 — upload

`uploadScreenshots` renders each highlighted frame, uploads it to R2, and writes
the `Screenshot` records onto each step. The SOP document is marked `done`.

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

## Verified behavior (E2E, 2026-05-18)

| Case | Video | Result |
|---|---|---|
| Narrated | HubSpot CRM walkthrough (~19.6 min) | `done` — speech branch, language `vi` detected, `appType: web`, 5 steps / 85 screenshots, ~$0.22/run |
| Silent | Same walkthrough, audio stripped (~5 min trim) | `done` — silent branch, language `vi` from default, `appType: web`, 10 steps / 36 screenshots, ~$0.10/run |
| Non-app | A dance tutorial (real-world footage) | `failed` / `not_an_app` — rejected after one ~$0.002 vision call |

## Notes

- The pipeline is screenshot-only. The earlier document/clip/PDF pipeline was
  removed; it can be recovered from git history if ever needed.
- Per-run AI cost is tracked per stage and persisted on the SOP document
  (`aiCost`).
- Design and implementation history:
  `docs/superpowers/specs/2026-05-18-pipeline-consolidation-design.md` and
  `docs/superpowers/plans/2026-05-18-pipeline-consolidation.md`.
