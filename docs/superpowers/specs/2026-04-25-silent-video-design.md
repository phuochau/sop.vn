# Silent-video SOP pipeline

Date: 2026-04-25
Status: Draft

## Problem

The current pipeline (`src/trigger/processSop.ts`) drives every stage from the ASR transcript: `runNormalize`, `runContext`, and `runExtract` all consume cleaned segments. A video with no spoken narration fails fast with `silent_audio`, even though it may be a perfectly usable how-to recording.

We want to support these silent (or speech-light) videos by deriving the SOP from visual analysis instead.

## Goals

- Auto-detect "no usable speech" and branch into a visual pipeline — not a hard failure.
- Detect industry/category from visuals only.
- Generate step text from visuals (title, description, start/end timestamps) in the user's chosen language.
- Reuse the existing clip cutting / keyframe extraction / PDF export with minimal refactor.
- Surface input mode (speech vs silent) on the SOP doc for analytics and UI.

## Non-goals

- Replacing the speech path. Speech remains the default for videos with narration.
- Mixed-mode SOPs that fuse speech + visual signals in a single run.
- Visual context detection upgrades beyond uniform frame sampling (scene-detect is a future enhancement).
- Auto-detecting language from on-screen text.

## High-level architecture

A branch point is added immediately after `runTranscribe`:

```
probeDuration
   │
   ▼
runTranscribe ──► hasUsableSpeech?
                      │
          yes ────────┤────────── no
                      │              │
                      ▼              ▼
                runNormalize     runVisualContext   ◄── 2-8 keyframes
                      │              │
                      ▼              ▼
                  runContext     runVisualExtract   ◄── denser frames
                      │              │
                      ▼              │
                  runExtract         │
                      │              │
                      ▼              │
              resolveTimes(           │
                rawSegments,         │
                extractedSteps)      │
                      │              │
                      └──────┬───────┘
                             ▼
                    runClip(resolvedSteps)
                             │
                             ▼
                        runKeyframes ─► PDF
```

Both branches converge at `runClip`, which is refactored to accept already-resolved `{ title, description, startTime, endTime }` steps. The speech path runs `resolveTimes` (existing helper in `clip.ts`) before calling `runClip`. The silent path produces resolved steps directly from `runVisualExtract`.

## Branch decision

After `runTranscribe` (which is modified to no longer throw on no-audio):

```ts
const stage1 = await runTranscribe(signedVideo);
const { segments, transcript } = stage1;

const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
const hasUsableSpeech = segments.length > 0 && wordCount >= 30;
```

- `segments: []` covers literal silence and music-only audio.
- `wordCount >= 30` catches stray utterances ("uh", "ok") that aren't enough to drive an SOP.
- 30 is a starting threshold; tunable later from production data.
- Vietnamese (the default `defaultLanguage`) is space-separated, so `split(/\s+/)` is correct. **Caveat:** for non-spaced languages (Chinese, Japanese, Thai), the count would be unreliable. Out of scope for the MVP since `defaultLanguage` is `vi` and other supported language is `en`. Revisit if more languages are added.
- `language` from `runTranscribe` is `null` when no audio; on the silent branch it is discarded and `doc.defaultLanguage` is used instead.

## Multimodal calling strategy

The existing `llmJson` helper in `src/lib/openrouter.ts` only accepts text `system`/`user` strings. OpenRouter's Gemini endpoints **do not reliably support remote video URLs**. Sending the whole video is therefore not pursued.

Instead, the silent path sends **image arrays** to Gemini-vision via OpenRouter. Gemini accepts arrays of images in a single chat call. Frames are extracted with `ffmpeg` and sent as base64 `image_url` content parts.

A new helper is added next to `llmJson`:

```ts
// src/lib/openrouter.ts
export async function llmJsonVision<T extends ZodTypeAny>(opts: {
  model: string;
  system: string;
  userText: string;
  imagePaths: string[];          // local JPEG paths, read & encoded as base64 data URLs
  schema: T;
  schemaName: string;
  maxRetries: number;
}): Promise<z.infer<T>>;
```

This wraps the same `/chat/completions` endpoint, but constructs the user message as an array of content parts: a leading `{ type: "text", text: userText }` followed by one `{ type: "image_url", image_url: { url: "data:image/jpeg;base64,..." } }` per frame. Same `response_format: json_schema` and same retry semantics as `llmJson`. **All retries live in this helper** — visual stages call it with `maxRetries: 1` and do not add their own retry loop.

**Schema-constraint propagation.** `zodToJsonSchemaLike` does not propagate Zod refinements like `.min(1)` or `.nonnegative()` into the JSON Schema sent to the model. They are enforced post-parse by `schema.parse(...)`. Implication: any "must contain at least one X" / ordering / range constraint must be **restated in the user prompt** so the model knows about it; otherwise it may emit empties and trigger unnecessary retries. The `runVisualExtract` prompt (below) explicitly states "at least one step, ordered, non-overlapping, timestamps within range".

**Payload size.** `sampleFrames` writes JPEGs at 768px wide, quality ~5 (ffmpeg `-qscale:v 5`). At ~80 KB per frame, the density-mode max of 60 frames is ~5 MB raw, ~6.5 MB base64 — within OpenRouter's per-request limits. If a future model/provider tightens limits, dial `max` down or switch to URL references.

`zodToJsonSchemaLike` may need extension if the new schema introduces types it doesn't yet support; if so, add cases inline (the existing helper already supports object/array/string/number/enum, which is sufficient for the schemas below).

## Components

### New files

#### `src/trigger/lib/sampleFrames.ts`

Pure ffmpeg helper.

- Signature: `sampleFrames(srcPath: string, durationSec: number, opts?: { count?: number; targetFps?: number; max?: number }) => Promise<{ paths: string[]; tmpDir: string; dispose: () => Promise<void> }>`.
- Two modes:
  - **Fixed-count mode** (used by `runVisualContext`): `count = clamp(2, 8, floor(durationSec))`. Frames at positions `(i + 1) * durationSec / (count + 1)` for `i in [0, count)`. The pre-stage `minVideoDurationSec` gate guarantees `durationSec` is large enough that the lower clamp is never hit in practice.
  - **Density mode** (used by `runVisualExtract`): `count = clamp(2, 60, ceil(durationSec * 0.5))` (i.e., ~one frame every 2 seconds, between 2 and 60 frames). Spacing uses the same `(i + 1) * durationSec / (count + 1)` formula.
- Output: writes JPEGs to a tmp dir at 768px wide using ffmpeg `-qscale:v 5`. Returns `{ paths, timestamps, tmpDir, dispose }` (mirrors `fetchSourceVideo`); `timestamps[i]` is the second-offset corresponding to `paths[i]`.

#### `src/trigger/stages/visualContext.ts`

- Signature: `runVisualContext({ framePaths: string[], language: string }) => Promise<{ category: Category; domainSummary: string }>`.
- Output shape matches `runContext` (`category` from existing enum in `schemas.ts`, `domainSummary: string`).
- Implementation: calls `llmJsonVision` with `framePaths` (the 2–8 context frames), the existing `ContextOutput` schema, and a vision-friendly prompt asking for category + a one-paragraph domain summary in `language`. Model is read from a shared config knob `config.models.visionModel` (default `google/gemini-2.5-flash`). The same knob is used by `runVisualExtract`.

#### `src/trigger/stages/visualExtract.ts`

- Signature: `runVisualExtract({ framePaths: string[], frameTimestamps: number[], durationSec: number, category: Category, language: string }) => Promise<{ title: string; steps: { title: string; description: string; startTime: number; endTime: number }[] }>`.
- `frameTimestamps[i]` corresponds to `framePaths[i]` and is provided by `sampleFrames` (density mode).
- Output schema is a **new** Zod schema added to `src/lib/schemas.ts` (see below). It uses `startTime`/`endTime` in seconds — different from the existing `SopExtractOutput`, which uses segment IDs.
- Implementation: calls `llmJsonVision` with `framePaths`. The user prompt:
  1. Lists the timestamp of each frame (so the model can map visual content back to seconds).
  2. States the category.
  3. Instructs: *"You are watching a how-to video with no spoken audio. Identify discrete actions. For each, write a clear instructional step in `{language}`. Return JSON: `{ title, steps: [{ title, description, startTime, endTime }] }`. Timestamps must be within `[0, {durationSec}]`, ordered, and non-overlapping."*
- Validation: the new Zod schema enforces shape; the stage additionally asserts steps are sorted, `endTime <= durationSec`, and there is at least one step. On schema/assertion failure, `llmJsonVision`'s built-in retry handles it; if retries are exhausted, the call throws and `processSop` maps the error to `visual_extract_failed`.

### Modified files

#### `src/trigger/stages/clip.ts`

- Refactor: `runClip` no longer manages source-video lifecycle. The caller is always responsible for fetching and disposing the source video.

  ```ts
  export async function runClip(args: {
    sopId: string;
    srcPath: string;          // required: caller-owned, pre-downloaded
    resolvedSteps: { title: string; description: string; startTime: number; endTime: number }[];
  }): Promise<{ steps: Step[] }>;
  ```

  - The returned `disposeSrc` and `srcPath` fields are dropped from the result — both branches own these externally.
- `resolveTimes` remains exported and unchanged. The speech-path call site (`processSop.ts`) calls `resolveTimes` first, then passes the result to `runClip`.
- **Speech-path duration.** `resolveTimes` requires `videoDurationSec`. Today the pre-stage `probeDuration(signedVideo)` already computes this and discards it; the refactor captures it in a variable (`durationSec`) and reuses it for both `resolveTimes` and any downstream stage that needs it. `fetchSourceVideo` is then called once on the speech path and its `srcPath` passed into `runClip` and `runKeyframes`. The caller disposes in a `finally`.

#### `src/trigger/stages/transcribe.ts`

- Stops treating "no audio stream" or empty ASR result as fatal. The two cases the modified `transcribe.ts` now returns `{ transcript: "", segments: [], language: null }` for:
  1. `NO_AUDIO_STREAM` — file has no audio track at all.
  2. fal returns 0 segments (or its `silent_audio` indicator) — has audio, but no transcribable speech.
- Continues to throw on real ASR API errors (network, 5xx); those still map to `transcription_failed`.
- `processSop.ts` consequently drops both the `msg.includes("NO_AUDIO_STREAM") → silent_audio` path and the `segments.length === 0 → silent_audio` early failure (lines 50 and 54 in the current file).

#### `src/trigger/processSop.ts`

- Drops the `silent_audio` early failure.
- After `runTranscribe`, evaluates `hasUsableSpeech`:
  - **Speech path** (existing logic, with adjustments):
    - Sets `inputMode: "speech"` on the SOP doc.
    - Captures the `durationSec` from the existing pre-stage `probeDuration` call (currently discarded).
    - Calls `fetchSourceVideo(doc.videoR2Key)` once at the start of the clipping phase; passes `srcPath` into both the refactored `runClip` and the existing `runKeyframes`; disposes in a `finally`.
    - Calls `resolveTimes(rawSegments, extracted.steps, durationSec)` and passes the resolved steps into `runClip`.
  - **Silent path**:
    1. Sets `inputMode: "silent"`.
    2. Status `analyzing`.
    3. `fetchSourceVideo(doc.videoR2Key)` → `{ srcPath, dispose }`. (Used for both visual stages and `runClip`, avoiding double-download.)
    4. `sampleFrames(srcPath, durationSec, { count: clamp(...) })` → context frame paths.
    5. `runVisualContext({ framePaths, language: doc.defaultLanguage })`. Persist `category`, `domainSummary`, and `language: doc.defaultLanguage` on the doc.
    6. Status `generating`.
    7. `sampleFrames(srcPath, durationSec, { targetFps: 0.5, max: 60 })` → extract frame paths + timestamps.
    8. `runVisualExtract(...)` → `{ title, steps[] }` with `startTime`/`endTime`.
    9. Persist `title`.
    10. Status `clipping`. Call refactored `runClip({ ..., resolvedSteps, srcPath })`.
    11. Continue through existing `runKeyframes` (passing the same `srcPath`; it already accepts it).
    12. Dispose `srcPath` and any frame tmp dirs in a `finally`.

#### `src/lib/mongo.ts` (or wherever `Sop`/`ErrorCode` types live)

- Add `inputMode?: "speech" | "silent"` to `Sop` (optional for back-compat with existing docs).
- Add `defaultLanguage?: string` to `Sop` (optional; consumers default to `"vi"` when missing).
- Remove `"silent_audio"` from `ErrorCode`.
- Add `"visual_context_failed"`, `"visual_extract_failed"`, and `"frame_sampling_failed"` to `ErrorCode`.
- No data migration is performed; both new fields are optional and existing in-flight SOPs will simply lack them (they only matter for new uploads going forward).

#### `src/lib/schemas.ts`

Add:

```ts
export const VisualSopExtractOutput = z.object({
  title: z.string(),
  steps: z.array(z.object({
    title: z.string(),
    description: z.string(),
    startTime: z.number(),
    endTime: z.number(),
  })).min(1),
});
```

Used by `runVisualExtract`.

#### `src/lib/openrouter.ts`

Add `llmJsonVision` (described above). Keep `llmJson` unchanged.

#### Upload UI and API

- `src/app/upload/page.tsx`: add a language selector with options `[{ value: "vi", label: "Tiếng Việt" }, { value: "en", label: "English" }]`. Default `"vi"`. Helper text below: *"Only used when no one is speaking in the video."* The selected value is included in the request body to the commit route.
- `src/app/api/upload/commit/route.ts`: accept `defaultLanguage` from the request body, validate against the allowed enum, and include it on the inserted SOP document. (`init` route is unchanged.)

## Data flow (silent branch)

| Step | Action | Persists |
|---|---|---|
| 1 | `runTranscribe` returns empty | — |
| 2 | Branch to silent | `inputMode: "silent"` |
| 3 | `fetchSourceVideo` | — |
| 4 | `sampleFrames` (context, 2–8) | — |
| 5 | `runVisualContext` | `category`, `domainSummary`, `language: defaultLanguage` |
| 6 | `sampleFrames` (extract, ≤60) | — |
| 7 | `runVisualExtract` | `title` |
| 8 | `runClip(resolvedSteps, srcPath)` | `steps[]` with R2 keys |
| 9 | `runKeyframes` | `steps[].keyframeR2Keys` |
| 10 | Mark `done` | `status: "done"` |

`language` semantics:
- **Speech path**: `language` is the Whisper-detected value from `runTranscribe`.
- **Silent path**: `language` is `doc.defaultLanguage` (Whisper's `null` is discarded).
- Implementation step: audit `synthesizeOverview.ts`, `synthesizeStep.ts`, and `renderPdf.tsx` to confirm `language` is used only as an opaque tag (passed into prompts or rendered as-is), not pattern-matched for Whisper-specific values. If any consumer assumes specific values, normalize the silent-path value to the same domain (e.g., `"vi"` / `"en"`) — the upload-time enum already enforces this.

## Schema changes summary

`Sop` document additions (both optional, no migration):

- `inputMode?: "speech" | "silent"`
- `defaultLanguage?: string` (e.g., `"vi"`, `"en"`)

`ErrorCode` changes:

- Remove: `silent_audio`
- Add: `visual_context_failed`, `visual_extract_failed`, `frame_sampling_failed`, `video_download_failed`

## Error handling

- `fetchSourceVideo` failure on either branch → `video_download_failed` (new error code in `ErrorCode`).
- `sampleFrames` (ffmpeg) failure → `frame_sampling_failed`.
- `runVisualContext` failure (after retries inside `llmJsonVision`) → `visual_context_failed`.
- `runVisualExtract` failure or empty `steps[]` (after retries) → `visual_extract_failed`.
- Retries: handled inside `llmJsonVision` (`maxRetries: 1`). Stages do not wrap with additional retry logic.
- Logging: every event log entry on the silent branch includes `inputMode: "silent"` so success/failure rates can be tracked separately.

## Testing

- `src/trigger/lib/sampleFrames.test.ts` — runs ffmpeg against the existing `samples/` fixture directory (matching the convention used by `clip.test.ts` and `keyframes.test.ts`; if no silent fixture is present, add a short one). Cases:
  - Fixed-count mode for `durationSec` of 30, 5, 3, 2 → returns `clamp(2, 8, floor(d))` frames.
  - Density mode for a 5s video → 3 frames (`ceil(5*0.5)=3`), 30s → 15 frames, 200s → capped at 60.
  - `timestamps[]` is monotonically increasing and within `[0, durationSec]`.
- `src/trigger/stages/visualContext.test.ts` — mocks `llmJsonVision`; asserts category enum is returned and `framePaths` count is forwarded as given (clamping is `sampleFrames`'s concern, asserted there).
- `src/trigger/stages/visualExtract.test.ts` — mocks `llmJsonVision`; asserts:
  - Parsed shape passes through.
  - Out-of-range or unsorted timestamps cause an assertion error (so the retry path triggers).
  - Empty `steps[]` causes an assertion error.
  - Prompt text contains `language`, `durationSec`, and the per-frame timestamps.
- A unit test for the `hasUsableSpeech` predicate covering: empty segments + empty transcript; empty segments + long transcript; non-empty segments + 5-word transcript; non-empty segments + 50-word transcript.
- Manual end-to-end: upload a silent screen recording with `defaultLanguage = "vi"`; verify the PDF reads naturally in Vietnamese and step boundaries align with on-screen actions.

## Open questions

None blocking. Future enhancements considered out of scope:

- Scene-detect-driven frame sampling.
- Visual + speech fusion for partial-speech videos.
- Language detection from on-screen UI text.
- True video-input call to Gemini (would require switching off OpenRouter for this stage; revisit if image-array quality is insufficient).
