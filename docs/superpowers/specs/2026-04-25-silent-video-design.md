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
- Reuse `runClip`, `runKeyframes`, and PDF export unchanged.
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
            (speech path,        (silent path)
             unchanged)             │
                      │             ▼
                      ▼      runVisualContext   ◄── 2-8 keyframes
                runNormalize         │
                      │              ▼
                      ▼      runVisualExtract   ◄── whole video → Gemini
                  runContext         │
                      │              │
                      └──────┬───────┘
                             ▼
                          runClip ─► runKeyframes ─► PDF
```

Both branches converge at `runClip` with the same shape: `{ title, steps: [{ title, description, startSec, endSec }] }`.

## Branch decision

```ts
const stage1 = await runTranscribe(signedVideo); // never throws on no-audio
const { segments, transcript, language } = stage1;

const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
const hasUsableSpeech = segments.length > 0 && wordCount >= 30;
```

- `segments: []` covers literal silence and music-only audio (ASR returns nothing useful).
- `wordCount >= 30` covers videos with stray utterances ("uh", "ok") that aren't enough to drive an SOP.
- 30 is a starting threshold; tunable later from production data.

## Components

### New files

#### `src/trigger/lib/sampleFrames.ts`

Pure ffmpeg helper.

- Signature: `sampleFrames(srcPath: string, durationSec: number) => Promise<string[]>` — returns absolute paths to JPEGs.
- Frame count: `N = clamp(2, 8, floor(durationSec / 1))`.
- Spacing: positions at `(i + 1) * durationSec / (N + 1)` for `i in [0, N)`. Avoids 0s and end-of-video which often render black.
- Output: writes to a tmp dir; caller is responsible for disposing it.

#### `src/trigger/stages/visualContext.ts`

- Signature: `runVisualContext({ framePaths: string[], language: string }) => Promise<{ category, domainSummary }>`.
- Mirrors `runContext` output shape. Used to populate `category` and `domainSummary` on the SOP doc.
- Implementation: send frames as base64 image content to a vision model via OpenRouter (Gemini 2.5 Flash is sufficient — categorization doesn't need motion). Prompt asks for category + one-paragraph domain summary in `language`.

#### `src/trigger/stages/visualExtract.ts`

- Signature: `runVisualExtract({ videoUrl: string, durationSec: number, category: string, language: string }) => Promise<{ title, steps: [{ title, description, startSec, endSec }] }>`.
- Output schema is identical to `runExtract` so `runClip` can consume either result.
- Implementation: presign R2 video URL → call Gemini 2.5 (Pro for quality, Flash if duration < threshold) via OpenRouter with the video URL.
- Prompt template (paraphrased):
  > You are watching a how-to video with no spoken audio. The category is `{category}`. Identify the discrete actions being performed. For each action, write a clear instructional step in `{language}` describing what to do. Return JSON: `{ title, steps: [{ title, description, startSec, endSec }] }`. Timestamps must be within `[0, {durationSec}]` and steps must be ordered and non-overlapping.
- Validation: Zod schema (reuse from `src/lib/schemas.ts` if extract already has one; otherwise extract a shared schema). Validates non-empty steps, ordered timestamps, `endSec <= durationSec`.
- Retry: 1 retry on schema-invalid response or transient network/5xx errors. Subsequent failure → throw.

### Modified files

#### `src/trigger/stages/transcribe.ts`

- Stops treating "no audio stream" or empty result as fatal. Returns `{ transcript: "", segments: [], language: null }` for those cases.
- Still throws on actual ASR API errors (network, 5xx) — those continue to fail with `transcription_failed`.

#### `src/trigger/processSop.ts`

- Adds the `hasUsableSpeech` branch after `runTranscribe`.
- Removes the early `silent_audio` failure.
- Silent branch:
  1. Set status `analyzing`.
  2. Download source video to tmp once (reuse pattern from existing `runClip`/`runKeyframes`).
  3. `sampleFrames(srcPath, durationSec)` → frame paths.
  4. `runVisualContext({ framePaths, language: doc.defaultLanguage })`.
  5. Persist `category`, `domainSummary`, `language: doc.defaultLanguage`.
  6. Set status `generating`.
  7. `runVisualExtract({ videoUrl, durationSec, category, language })`.
  8. Set status `clipping`. Hand `extracted.steps` to existing `runClip`.
  9. Continue through existing `runKeyframes` → PDF.
  10. Dispose tmp video and tmp frame dir.
- Sets `inputMode: "speech" | "silent"` on the SOP doc when branch is chosen.

#### `src/lib/mongo.ts` (or wherever `Sop`/`ErrorCode` types live)

- Add `inputMode: "speech" | "silent"` to `Sop`.
- Add `defaultLanguage: string` to `Sop` (set at upload, defaults to `"vi"`).
- Remove `"silent_audio"` from `ErrorCode`.
- Add `"visual_context_failed"` and `"visual_extract_failed"` to `ErrorCode`.

#### `src/lib/openrouter.ts`

- Extend with a Gemini-video helper that accepts a video URL + prompt and returns parsed JSON. Co-locate inside `visualExtract.ts` if it ends up being the only caller.

#### Upload UI (in `src/app`) and upload API route

- Add a language selector with default Vietnamese (`vi`).
- Helper text: *"Only used when no one is speaking in the video."*
- Persist `defaultLanguage` on the SOP document.

## Data flow (silent branch)

| Step | Action | Persists |
|---|---|---|
| 1 | `runTranscribe` returns empty | — |
| 2 | Branch to silent; set `inputMode: "silent"` | `inputMode` |
| 3 | Download video to tmp; `sampleFrames` | — |
| 4 | `runVisualContext` | `category`, `domainSummary`, `language: defaultLanguage` |
| 5 | `runVisualExtract` | `title`, intermediate `steps[]` |
| 6 | `runClip` | `steps[]` with R2 keys |
| 7 | `runKeyframes` | `steps[].keyframeR2Keys` |
| 8 | Mark `done` | `status: "done"` |

## Schema changes

`Sop` document additions:

- `inputMode: "speech" | "silent"`
- `defaultLanguage: string` (e.g., `"vi"`, `"en"`)

`ErrorCode` changes:

- Remove: `silent_audio`
- Add: `visual_context_failed`, `visual_extract_failed`

## Error handling

- Frame extraction failure → `visual_context_failed`.
- Vision model failure or invalid context response after retry → `visual_context_failed`.
- Gemini call failure or schema-invalid result after retry → `visual_extract_failed`.
- Empty `steps[]` after retry → `visual_extract_failed`.
- Each visual stage retries once on transient/schema errors; throws thereafter.
- All log entries include `inputMode` so success/failure rates can be tracked separately for the two paths.

## Testing

- `stages/visualContext.test.ts` — mocks OpenRouter; asserts category extraction; asserts frame count matches the clamp rule.
- `stages/visualExtract.test.ts` — mocks Gemini-via-OpenRouter; asserts parsed shape; rejects out-of-range timestamps; rejects empty steps; asserts prompt contains `language` and `durationSec`.
- `lib/sampleFrames.test.ts` — runs ffmpeg against a fixture in `samples/`; verifies counts for `durationSec` of 30, 5, 3, 2.
- A small unit test for the `hasUsableSpeech` predicate (segment-count + word-count combinations).
- Manual end-to-end: upload a silent screen recording with `defaultLanguage = "vi"`; verify PDF reads naturally in Vietnamese.

## Open questions

None blocking. Future enhancements considered out of scope for this spec:

- Scene-detect-driven frame sampling (replaces uniform spacing in `sampleFrames`).
- Visual+speech fusion for partial-speech videos.
- Language detection from on-screen UI text in silent videos.
