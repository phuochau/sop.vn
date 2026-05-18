# Physical / Clip Pipeline — Design (Sub-project B)

**Date:** 2026-05-18
**Status:** Approved (brainstorming)

## Context

Sub-project A (`industry` field + physical `appType`) shipped: Stage 0 can now
label a recording `appType: "physical"`, but such videos still reject via the
`not_an_app` gate. Sub-project B builds the pipeline that actually processes
them — producing **video clips** instead of screenshots.

The current pipeline (`processSopScreenshots.ts`) is screen-recording-specific
in its back half: dense frame pool, pixel-diff click detection, click/input
classification, screen clustering, UI-TARS highlight location, JPEG+SVG upload.
Its front half is generic and reusable: duration probe, source download,
Stage 0 analysis, transcription, normalization, and step extraction
(`extract` for narrated video, `visualExtract` for silent video) — all of which
produce a list of Steps with `{ title, description, startTime, endTime }`.

B reuses the entire front half and replaces the screen-specific back half with
three new stages: clip extraction, clip upload, and clip-aware compose.

## Goal

A `physical` video produces a finished SOP whose steps each carry one video
clip (trimmed from the source to the step's time span) plus a poster
thumbnail, viewable on the public share page.

## Design decisions (made during brainstorming)

These were settled in discussion; recorded here so the spec is self-contained:

- **One clip per Step.** Each Step gets exactly one clip = the source video
  trimmed to `[startTime, endTime]`. No sub-step clips. This reuses the proven
  `extract`/`visualExtract` segmentation unchanged; finer granularity is a
  future phase.
- **No highlight, no element metadata, no automation metadata** on clips —
  those are screen-UI concepts and meaningless for physical video.
- **Visual-first, narration-augmented:** the existing speech/silent branch
  already covers this — narrated physical video uses `extract`, silent physical
  video uses `visualExtract` (frame-based VLM). No new segmentation is built.
- **Branch inside the existing task**, not a new trigger task. Stages 0–3 are
  shared; only stages 4+ differ. The trigger task keeps its id
  `process-sop-screenshots` (renaming a task id is disruptive — it is triggered
  by id from the upload route).
- **One SOP is either screen or physical, never both.** `appType` is
  single-valued; mixed videos are out of scope.
- **Clips are served via presigned R2 URLs** returned directly by the share
  API — not a proxy route. Presigned URLs support HTTP range requests, which
  video seeking needs, for free.

## Non-goals

- Sub-step clip segmentation.
- Highlight, element metadata, automation metadata for clips.
- Mixed screen+physical SOPs.
- PDF / document input.
- A clip-editing or re-trimming UI.
- Any new VLM call — B adds no AI calls; segmentation is fully reused.
- Capping or splitting long clips (a long step yields a long clip in v1).

## Architecture

### Stage 0 routing change (`processSopScreenshots.ts`)

Today: `if (!decideAppGate(...)) return fail(_id, "not_an_app")`.

New routing, immediately after `runAnalyzeVideo`:

- `appType === "none"` → `fail(_id, "not_an_app")` (unchanged outcome).
- `appType === "physical"` → physical branch (skip `decideAppGate`).
- otherwise (`web`/`mobile`/`desktop`) → run `decideAppGate`; if it fails,
  `fail(_id, "not_an_app")`; else screen branch (existing behaviour).

`decideAppGate` itself is unchanged — it stays as the screen-path sanity check.
A boolean `isPhysical` is computed once and used to select the back-half
stages.

### Pipeline stages

Shared (unchanged) for both paths: duration probe, source download, Stage 0,
transcribe, speech/silent branch, normalize, `extract` / `visualExtract`. After
extraction both paths hold `resolved: { title, description, startTime,
endTime }[]` (from `resolveTimes` for narrated, direct for silent).

**Screen path:** existing stages 4–8 (frame pool → click detect → classify →
highlight → upload screenshots → compose). Unchanged.

**Physical path** — three new stages replacing 4–8:

1. **Extract clips** (`runExtractClips`, status `building-clips`): for each
   resolved step, ffmpeg-trim the source video to `[startTime, endTime]` into a
   temp `.mp4`, and grab one poster frame at the step midpoint into a temp
   `.jpg`. Returns, per step index, a local clip path + local poster path +
   the time bounds.
2. **Upload clips** (`runUploadClips`, status `uploading-clips`): for each
   step's clip, `putObject` the mp4 (`video/mp4`) and the poster (`image/jpeg`)
   to R2, producing a `Clip` record.
3. **Compose & persist:** assemble `Step[]` with `clips` populated instead of
   `screenshots`; write `status: "done"`.

### New ffmpeg helper

`src/trigger/lib/extractClip.ts` — `extractClip(srcPath, outPath, startSec,
endSec)`. Uses fluent-ffmpeg with `.seekInput(startSec)` +
`.duration(endSec - startSec)` and re-encodes (`libx264`, `aac`,
`-movflags +faststart` for progressive web playback). Re-encoding (not
`-c copy`) is chosen so cut boundaries are frame-accurate rather than snapped
to keyframes. Poster frames reuse the existing single-frame grab helper
(`grabFrame` in `src/trigger/lib/videoTmp.ts`).

## Data model (`src/lib/mongo.ts`)

New `Clip` interface:

```ts
export interface Clip {
  clipId: string;        // nanoid(10), unique per clip
  r2Key: string;         // mp4 object key in R2
  posterR2Key: string;   // jpg poster object key in R2
  startTime: number;     // clip start in source video, seconds
  endTime: number;       // clip end in source video, seconds
  order: number;         // display order within the step (0 in v1 — one clip)
}
```

`Step` gains two optional fields (both optional — a Step has *either*
`screenshots` *or* `clips`, depending on the pipeline path; legacy/screen SOPs
have neither set to `clips`):

```ts
  clips?: Clip[];
  clipsError?: string;   // set when clip extraction failed for the step
```

`SopStatus` union gains `"building-clips"` and `"uploading-clips"`.

R2 key helpers (`src/lib/utils.ts`, alongside `screenshotKey`):

```ts
clipKey(sopId, stepIndex, clipId)       → `${sopId}/clips/${stepIndex}/${clipId}.mp4`
clipPosterKey(sopId, stepIndex, clipId) → `${sopId}/clips/${stepIndex}/${clipId}-poster.jpg`
```

## Data flow

```
download → Stage 0 analyze ─ appType?
  ├─ "none"                       → fail(not_an_app)
  ├─ web/mobile/desktop + gate ok → SCREEN path (unchanged)
  ├─ web/mobile/desktop + gate ko → fail(not_an_app)
  └─ "physical"                   → PHYSICAL path:
       transcribe → (speech|silent branch) → normalize → extract/visualExtract
         → resolved steps [{title,description,startTime,endTime}]
         → runExtractClips   (ffmpeg trim + poster)      [building-clips]
         → runUploadClips    (putObject mp4 + poster)    [uploading-clips]
         → compose Step[] with clips → persist status=done
```

## Share API (`src/app/api/share/[token]/route.ts`)

The step mapping gains a `clips` array, built only when `s.clips` is present:

```ts
clips: (s.clips ?? []).map(c => ({
  clipId: c.clipId,
  url: presignGet(c.r2Key),          // presigned mp4 URL
  posterUrl: presignGet(c.posterR2Key),
  startTime: c.startTime,
  endTime: c.endTime,
  order: c.order,
})),
clipsError: s.clipsError,
```

`presignGet` is async, so the `steps.map` becomes a `Promise.all` over an async
mapper. `screenshots` mapping is unchanged. A step yields one of the two arrays
non-empty.

## UI (`src/app/share/[token]/page.tsx` + new component)

New component `src/components/StepCardClips.tsx` — same card shell as
`StepCardScreenshots` (number badge, title, description) but renders each clip
as an HTML5 `<video controls preload="metadata" poster={posterUrl}>` with the
presigned mp4 as `src`. On `clipsError`, shows the same amber "unavailable"
notice `StepCardScreenshots` uses.

`page.tsx` selects the component per step: if the step's `clips` array is
non-empty (or `clipsError` is set) render `StepCardClips`, else
`StepCardScreenshots`. A SOP-wide check is acceptable too since a SOP is wholly
one kind, but per-step keeps it simple and robust.

## Processing-status page (`src/app/processing/[id]/page.tsx`)

The status→label map gains friendly text for the two new statuses, e.g.
`building-clips` → "Cutting video clips…", `uploading-clips` → "Uploading
clips…". (Verify the exact shape of the existing map when implementing.)

## Error handling

- A `physical` video that produces zero steps from extraction fails the SOP the
  same way the screen path already handles an empty extraction (reuse the
  existing post-extract guard).
- If `extractClip` fails for one step, that step's `clipsError` is set and the
  step is persisted clip-less; other steps are unaffected — mirrors how
  `screenshotsError` works per step. The SOP still reaches `done`.
- ffmpeg/process errors that abort the whole stage map to a failure code; reuse
  the existing `withStage` wrapper and a suitable existing `ErrorCode`
  (`frame_sampling_failed` is the closest existing analogue for clip
  extraction; no new error code is introduced).
- Temp directories for clips/posters are removed in a `finally`, following the
  `dispose()` pattern in `sampleFrames`.

## Testing

- **`extractClip` helper** — integration test against the existing
  `samples/trimmed-hubspot_crm.mp4` fixture: trim a known sub-range, ffprobe the
  output, assert duration ≈ requested span (±0.5 s) and the file is a valid
  mp4.
- **`runExtractClips`** — with a tiny fixture and a few resolved steps, assert
  one clip + one poster temp file per step, correct time bounds, and that a
  failing step records a `clipsError` without aborting the others (inject a
  failing trim).
- **`runUploadClips`** — inject a fake `putObject`; assert two `putObject` calls
  per clip (mp4 + poster), correct content types, correct R2 keys, and a
  well-formed `Clip` record (ids, order).
- **Key helpers** — unit-test `clipKey` / `clipPosterKey` output shape.
- **Compose** — pure-function test that a physical run yields `Step[]` with
  `clips` set and `screenshots` unset.
- **Share API** — test that a SopDoc with `clips` yields a `clips` array with
  `url`/`posterUrl` present and `screenshots` empty.

## Files touched

**New:**
- `src/trigger/lib/extractClip.ts` — ffmpeg trim helper.
- `src/trigger/stages/extractClips.ts` — `runExtractClips` stage.
- `src/trigger/stages/uploadClips.ts` — `runUploadClips` stage.
- `src/components/StepCardClips.tsx` — clip renderer.
- Test files for each of the above.

**Modified:**
- `src/lib/mongo.ts` — `Clip` interface, `Step.clips`/`clipsError`,
  `SopStatus` additions.
- `src/lib/utils.ts` — `clipKey`, `clipPosterKey`.
- `src/trigger/processSopScreenshots.ts` — Stage 0 routing + physical branch.
- `src/app/api/share/[token]/route.ts` — `clips` in the step mapping.
- `src/app/share/[token]/page.tsx` — per-step component selection.
- `src/app/processing/[id]/page.tsx` — labels for the two new statuses.
