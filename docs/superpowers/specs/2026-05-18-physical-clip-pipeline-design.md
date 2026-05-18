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

Today the code is, in order: call `runAnalyzeVideo` → `if (!decideAppGate(...))
return fail(_id, "not_an_app")` → destructure `{ category, domainSummary,
appType, industry }` → `updateOne` persisting those four fields.

New routing replaces **only the gate's `fail` decision**. The
field-destructure and the `updateOne` persist of `category`/`domainSummary`/
`appType`/`industry` **must still run on the physical branch** — `extract` and
`visualExtract` consume `category` and `domainSummary` downstream. Concretely:

- `appType === "none"` → `fail(_id, "not_an_app")` (unchanged outcome).
- `appType === "physical"` → do NOT call `decideAppGate`; set `isPhysical =
  true`; continue.
- otherwise (`web`/`mobile`/`desktop`) → call `decideAppGate`; if it fails,
  `fail(_id, "not_an_app")`; else `isPhysical = false`; continue.

After this routing, the existing destructure + `updateOne` run unchanged for
every non-rejected path. `decideAppGate` itself is not modified — it stays as
the screen-path sanity check. The boolean `isPhysical` selects the back-half.

### Pipeline stages

Shared (unchanged) for both paths: duration probe, source download, Stage 0,
transcribe, speech/silent branch, normalize, `extract` / `visualExtract`. After
extraction both paths hold `resolved: { title, description, startTime,
endTime }[]` (from `resolveTimes` for narrated, direct for silent). The
`resolved` variable already exists in the orchestrator and is populated by both
the speech and silent branches before the back-half begins.

**The back-half is not a tidy stage block.** In the current code the screen
back-half (frame pool → click detect → classify/merge → a per-step loop doing
screen clustering / classify / canonicalize / highlight → upload screenshots →
compose `Step[]` → persist `status:done` → insert the `sop_completed` event) is
~130 continuous lines, not a callable unit. The branch is therefore introduced
as a literal `if (isPhysical) { …physical… } else { …existing screen lines… }`
wrapping that region. The existing screen lines are moved verbatim into the
`else` with no behavioural change. **No refactor of the screen path into a
named function is in scope** — minimising risk to working code is preferred.

**Screen path (`else` branch):** the existing back-half, unchanged.

**Physical path (`if (isPhysical)` branch)** — its own self-contained sequence:

1. **Extract clips** (`runExtractClips`, status `building-clips`): for each
   resolved step, ffmpeg-trim the source video to `[startTime, endTime]` into a
   temp `.mp4`, and grab one poster frame at the step midpoint into a temp
   `.jpg`. Returns, per step index, a local clip path + local poster path +
   the time bounds. The returned temp paths must outlive `runUploadClips`, so
   the temp-dir cleanup is **not** done inside `runExtractClips` — it is done in
   the orchestrator's outer `finally` (the same place `pool.dispose()` runs for
   the screen path). `runExtractClips` returns a `dispose()` for that purpose.
2. **Upload clips** (`runUploadClips`, status `uploading-clips`): for each
   step's clip, upload the mp4 (`video/mp4`) and the poster (`image/jpeg`) to
   R2, producing a `Clip` record. See the testing section for the `putObject`
   dependency-injection requirement.
3. **Compose & persist:** assemble `Step[]` with `clips` populated (and
   `screenshots` unset); persist via `updateOne` with `{ title, steps,
   status: "done" }`; then insert the `sop_completed` event. These three lines
   mirror the screen path's existing tail — duplicating ~5 trivial lines is
   accepted over refactoring the shared tail out of working code.

### New ffmpeg helper

`src/trigger/lib/extractClip.ts` — `extractClip(srcPath, outPath, startSec,
endSec)`. Uses fluent-ffmpeg with `.seekInput(startSec)` +
`.duration(endSec - startSec)` and re-encodes (`libx264` at `-preset veryfast`,
`aac` audio, `-movflags +faststart` for progressive web playback). Re-encoding
(not `-c copy`) is chosen so cut boundaries are frame-accurate rather than
snapped to keyframes; `-preset veryfast` keeps re-encode time low. Poster
frames reuse the existing single-frame grab helper `grabFrame(input, out,
atSec)` in `src/trigger/lib/videoTmp.ts` — note it produces a 640px-wide JPEG
(it uses fluent-ffmpeg `.screenshots`), which is fine for a thumbnail; `out`'s
parent directory must exist before the call.

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

`SopStatus` union gains `"building-clips"` and `"uploading-clips"`. The
`ErrorCode` union gains `"clip_extract_failed"` (see Error handling).

R2 key helpers (`src/lib/utils.ts`, alongside `screenshotKey`). They must follow
the existing key convention — every key helper in that file starts with the
`sops/` prefix and uses a `step-${stepIndex}` segment (e.g. `screenshotKey` →
`sops/${sopId}/screenshots/step-${stepIndex}/${frameId}.jpg`):

```ts
clipKey(sopId, stepIndex, clipId)       → `sops/${sopId}/clips/step-${stepIndex}/${clipId}.mp4`
clipPosterKey(sopId, stepIndex, clipId) → `sops/${sopId}/clips/step-${stepIndex}/${clipId}-poster.jpg`
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

Today the route's `doc.steps.map` is fully synchronous and screenshots are
exposed as a proxy URL (`/api/screenshots/${sopId}/${frameId}.jpg`), not a
presigned URL. Clips instead use **presigned R2 URLs returned directly** in the
response. The screenshot proxy route is small and image-oriented; serving video
through it would need HTTP range-request handling and content-type branching,
whereas a presigned R2 URL gives native range support (which video seeking
needs) with zero new route code — hence clips diverge from the screenshot
proxy pattern.

The route has **no local `Step` type** — it maps `doc.steps` directly off the
MongoDB `Step` interface (already widened in `mongo.ts` with `clips?`/
`clipsError?`). So no type declaration is edited here; only the output mapping
changes. The step mapping gains a `clips` array, emitted unconditionally (empty
array when the step has no clips, exactly as `screenshots` is already emitted
with `s.screenshots ?? []`):

```ts
clips: await Promise.all((s.clips ?? []).map(async c => ({
  clipId: c.clipId,
  url: await presignGet(c.r2Key, CLIP_URL_TTL_SEC),
  posterUrl: await presignGet(c.posterR2Key, CLIP_URL_TTL_SEC),
  startTime: c.startTime,
  endTime: c.endTime,
  order: c.order,
}))),
clipsError: s.clipsError,
```

`presignGet` (in `src/lib/r2.ts`) is async but does only local crypto — no
network — so the per-request cost of `2 × clipCount` presign calls is
negligible. Because it is async, the whole `doc.steps.map(...)` becomes
`await Promise.all(doc.steps.map(async (s, i) => ({ ... })))`. The `screenshots`
mapping inside it is unchanged. `presignGet`'s default TTL is 3600 s, too short
for a long clip still playing an hour later; clip URLs use an explicit
`CLIP_URL_TTL_SEC = 21600` (6 hours) constant defined in the route. For any
given step exactly one of `screenshots` / `clips` is non-empty.

## UI (`src/app/share/[token]/page.tsx` + new component)

New component `src/components/StepCardClips.tsx` — same card shell as
`StepCardScreenshots` (number badge, title, description) but renders each clip
as an HTML5 `<video controls preload="metadata" poster={posterUrl}>` with the
presigned mp4 as `src`. On `clipsError`, shows the same amber "unavailable"
notice `StepCardScreenshots` uses.

`page.tsx` changes:

- The page's local `Step` type currently hard-requires `screenshots:
  ScreenshotItem[]`. It must be widened: `screenshots` becomes optional and a
  `clips?: ClipItem[]` plus `clipsError?: string` are added. A new `ClipItem`
  type is declared matching the share-API `clips` shape (`clipId`, `url`,
  `posterUrl`, `startTime`, `endTime`, `order`). (The share-API route has no
  local `Step` type, so there is no second type to keep in sync.)
- The render loop selects the component per step: if the step's `clips` array
  is non-empty (or `clipsError` is set) render `StepCardClips`, else
  `StepCardScreenshots`.

## Processing-status page (`src/app/processing/[id]/page.tsx`)

This page does **not** have a status→label map. It has: (a) a locally
hand-duplicated `Status` union, (b) a `STATUS_STEP_INDEX` record mapping each
status to a progress-step index, and (c) a `STEPS` array of progress-step
labels. Required changes:

- Add `"building-clips"` and `"uploading-clips"` to the local `Status` union.
- Add both to `STATUS_STEP_INDEX`, mapping `building-clips` to the same index
  the screen path's `building-pool` uses and `uploading-clips` to the index
  `uploading-screenshots` uses — so the progress bar advances correctly for the
  physical path without new progress-step rows.
- The `STEPS` label copy is screen-specific (e.g. "create screenshots"). For
  v1 this slightly-off copy on a physical run is **accepted** — the processing
  page is a transient progress view; per-pipeline copy is a deferred polish
  item, not part of this spec.

## Error handling

- A `physical` video that produces zero steps from extraction fails the SOP the
  same way the screen path already handles an empty extraction (reuse the
  existing post-extract guard).
- If `extractClip` fails for one step, that step's `clipsError` is set and the
  step is persisted clip-less; other steps are unaffected — mirrors how
  `screenshotsError` works per step. The SOP still reaches `done`.
- ffmpeg/process errors that abort the whole clip-extraction stage map to a new
  `ErrorCode` value `clip_extract_failed` (added to the `ErrorCode` union in
  `mongo.ts`). The existing `frame_sampling_failed` is semantically about frame
  sampling, not clip trimming, so a dedicated code is clearer. The processing
  page's `ERROR_MSG` map gets a matching user-facing entry for
  `clip_extract_failed`. The stage is wrapped with the existing `withStage`
  helper, as the screen stages are.
- Temp directories for clips/posters are removed in a `finally`, following the
  `dispose()` pattern in `sampleFrames`.

## Testing

- **`extractClip` helper** — integration test against the existing
  `samples/trimmed-hubspot_crm.mp4` fixture: trim a known sub-range, ffprobe the
  output, assert duration ≈ requested span (±0.5 s) and the file is a valid
  mp4.
- **`runExtractClips`** — against the `samples/trimmed-hubspot_crm.mp4` fixture
  with a few resolved steps, assert one clip + one poster temp file per step,
  correct time bounds, and that a failing step records a `clipsError` without
  aborting the others (inject a failing trim via the injectable `extractClip`
  dependency).
- **`runUploadClips`** — note that `uploadScreenshots.ts` calls `putObject` via
  a hard `import` with no injection seam, so it is **not** a pattern to mirror
  for testability. `runUploadClips` must therefore be designed with dependency
  injection: a final optional parameter `putObject: PutObjectFn =
  realPutObject` (defaulting to the real `@/lib/r2` `putObject`). The test
  passes a fake and asserts two calls per clip (mp4 `video/mp4` + poster
  `image/jpeg`), correct R2 keys, and a well-formed `Clip` record (ids, order).
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
  `SopStatus` additions, `ErrorCode` gains `clip_extract_failed`.
- `src/lib/utils.ts` — `clipKey`, `clipPosterKey`.
- `src/trigger/processSopScreenshots.ts` — Stage 0 routing + `if (isPhysical)`
  back-half branch + clip-stage temp-dir dispose in the outer `finally` (the
  dispose handle is declared `undefined` at orchestrator outer scope, like the
  existing `pool` variable, so the `finally` can reach it).
- `src/app/api/share/[token]/route.ts` — `clips` added to the step output
  mapping; the `doc.steps.map` becomes `await Promise.all(...)`;
  `CLIP_URL_TTL_SEC` constant. (No local `Step` type exists in this file.)
- `src/app/share/[token]/page.tsx` — widen the local `Step` type, add the
  `ClipItem` type, per-step component selection.
- `src/app/processing/[id]/page.tsx` — add the two statuses to the local
  `Status` union and to `STATUS_STEP_INDEX`; add a `clip_extract_failed` entry
  to the `ERROR_MSG` map.
