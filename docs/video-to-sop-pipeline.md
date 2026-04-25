# Video → SOP pipeline (POC walkthrough)

This document explains, end-to-end, how the current proof-of-concept turns an uploaded training video into a structured SOP and a printable PDF. It is meant to be read by an engineer who will re-implement the POC for production: every external service, prompt, ffmpeg invocation, branching decision, and Mongo state transition is described here.

The system is **three trigger.dev v3 tasks** (two on-demand, one scheduled):

1. `processSop` (slug `process-sop`) — runs once per uploaded video. Produces the structured SOP (`title`, `steps[]`, clips, posters, keyframes) and stores it in MongoDB + Cloudflare R2.
2. `generateSopPdf` (slug `generate-sop-pdf`) — runs on-demand when the user clicks **Export PDF**. Synthesizes an overview + per-step rewrite and renders a PDF via `@react-pdf/renderer`.
3. `cleanupVideos` — daily cron that deletes expired source videos and stale PDFs from R2 and resets the corresponding Mongo state.

## Document map

- §0 — Stack, models, env vars, R2 keyspace
- §1 — Data model (MongoDB)
- §2 — Ingest path (upload → claim → trigger)
- §3 — `processSop` orchestration & state machine
- §4 — Speech path (Stages 1–5)
- §5 — Silent path (Stages 3–5)
- §6 — `generateSopPdf` (overview + per-step rewrite, both modes)
- §7 — `cleanupVideos` cron
- §8 — OpenRouter client behavior
- §9 — Worked end-to-end timeline
- §10 — Implementation gotchas

Code locations referenced throughout:

- `src/trigger/processSop.ts` — main orchestrator
- `src/trigger/generateSopPdf.ts` — PDF orchestrator
- `src/trigger/cleanupVideos.ts` — cron
- `src/trigger/stages/*.ts` — one file per stage
- `src/trigger/lib/*.ts` — ffmpeg helpers, frame sampling, branch decision, R2 fetch
- `src/lib/openrouter.ts` — JSON-mode and vision LLM clients
- `src/lib/fal.ts` — Whisper client
- `src/lib/mongo.ts` — Mongo types & collection accessors
- `src/lib/r2.ts` — R2 SDK wrappers (`presignGet`, `presignPut`, `putObject`, `deleteObject`)
- `src/lib/utils.ts` — R2 key builders, share-token generator
- `src/lib/schemas.ts` — Zod schemas for every LLM JSON output
- `src/config/index.ts` — model IDs, prompt templates, limits
- `src/app/api/upload/{init,commit}/route.ts` — ingest API
- `src/app/api/sop/[id]/pdf/route.ts` — PDF claim/poll endpoint
- `trigger.config.ts` — runtime config

---

## 0. Stack, models, environment, R2 keyspace

### 0.1 Models & services

| Concern | Choice |
|---|---|
| Job runner | `trigger.dev` v3, Node runtime, global `maxDuration: 3600` (per-task overrides below), single-attempt retry policy |
| LLM gateway | OpenRouter Chat Completions API w/ `response_format: json_schema, strict: true`, `temperature: 0.2` |
| ASR | fal.ai `fal-ai/whisper`, Whisper v3, `chunk_level: "segment"`, `task: "transcribe"`, no language hint (auto-detect) |
| Normalize transcript | `google/gemini-2.5-flash` (`config.ai.normalizeModel`) |
| Domain context (text) | `google/gemini-2.5-flash` (`config.ai.contextModel`) |
| Step extraction (speech path) | `anthropic/claude-sonnet-4.5` (`config.ai.sopModel`) — chosen for adherence to "let the trainer's narration decide where steps begin and end" |
| PDF overview + step rewrite (speech path) | `google/gemini-2.5-flash` (`config.ai.pdfModel`) |
| All vision calls (silent path + silent PDF) | `google/gemini-2.5-flash` (`config.ai.visionModel`) |
| Object storage | Cloudflare R2 (presigned GET, 3600s TTL); single bucket from `R2_BUCKET` env var |
| DB | MongoDB (`sops`, `events` collections) |
| Video tooling | `fluent-ffmpeg` calling system `ffmpeg`/`ffprobe`, bundled into the trigger.dev worker via `@trigger.dev/build/extensions/core` `ffmpeg()` |
| Fonts in PDFs | Be Vietnam Pro `.ttf` files bundled into the worker via `additionalFiles({ files: ["public/fonts/*.ttf"] })` |

Per-task `maxDuration` overrides: `processSop` is **900 s** (15 min); `generateSopPdf` is **300 s** (5 min); the global `3600` from `trigger.config.ts` is just an upper bound.

### 0.2 Retry semantics

- **trigger.dev** retries: `maxAttempts: 1` globally — i.e. **no automatic retry** of a whole task. Per-stage code does its own targeted retries instead.
- **OpenRouter** retries: `config.ai.maxRetries = 1` means **up to 2 total attempts** per call. The retry loop is `for attempt in 0..maxRetries`, so `0` means a single attempt and `1` means one retry (two total). Same body each attempt; no auto-repair prompt.
- Per-stage exceptions: `runContext` uses `maxRetries: 0` (failure is non-fatal, returns empty strings); `runVisualExtract` runs the retry loop **at the stage level** so post-parse timestamp invariants can also force a retry.

### 0.3 Environment variables

```bash
MONGODB_URI=mongodb+srv://...
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=sopvn-mvp
FAL_API_KEY=
OPENROUTER_API_KEY=
TRIGGER_SECRET_KEY=
ADMIN_PASSWORD=change-me
NEXT_PUBLIC_APP_URL=http://localhost:3000   # used as OpenRouter HTTP-Referer
```

`NEXT_PUBLIC_APP_URL` is sent as the `HTTP-Referer` header on every OpenRouter call along with `X-Title: SOP.vn` — OpenRouter ranks/identifies callers by these.

### 0.4 R2 keyspace

All keys are flat under one bucket (`R2_BUCKET`). Object lifecycle is managed by the application, not by R2 lifecycle rules.

| Object | Key template | Created by | Deleted by |
|---|---|---|---|
| Source video | `sops/<sopId>/source.<ext>` | API: `/api/upload/init` (presigned PUT) | `cleanupVideos` after `videoExpiresAt` |
| Step clip | `sops/<sopId>/step-<i>.mp4` | `runClip` | (manual / SOP delete) |
| Step poster | `sops/<sopId>/step-<i>.jpg` | `runClip` | (manual / SOP delete) |
| Step keyframe | `sops/<sopId>/step-<stepIdx>-frame-<frameIdx>.jpg` | `runKeyframes` | (manual / SOP delete) |
| Generated PDF | `sops/<sopId>/sop-<ts>.pdf` | `generateSopPdf` | `generateSopPdf` itself replaces previous; `cleanupVideos` after 30 days idle |

Indices `<i>`, `<stepIdx>`, `<frameIdx>` are **0-indexed**. `<ts>` is `Date.now()` epoch milliseconds. `<ext>` is one of `mp4|mov|webm|avi`, derived from upload MIME (`extFromMime`).

### 0.5 Config surface (`src/config/index.ts`)

```ts
limits: {
  maxVideoSizeMB: 500,
  maxVideoDurationSec: 60 * 60,    // 1 hour
  minVideoDurationSec: 10,
  allowedMimeTypes: ["video/mp4","video/quicktime","video/webm","video/x-msvideo"],
}
retention: {
  videoRetentionDays: 30,           // sets videoExpiresAt at upload time
}
app: {
  shareTokenLength: 16,
  pollIntervalMs: 2000,
}
ai.maxRetries: 1
```

Frame-sampling constants (`src/trigger/lib/sampleFrames.ts`):

```ts
DENSITY_TARGET_FPS = 0.5
DENSITY_MAX = 60
FIXED_MIN = 2
FIXED_MAX = 8
```

PDF cleanup TTL is hard-coded in `cleanupVideos.ts` as `30 * 24 * 60 * 60 * 1000` ms (30 days), not in `config`.

---

## 1. Data model (MongoDB)

Two collections, both keyed by `ObjectId`. Defined in `src/lib/mongo.ts`.

### 1.1 `sops` collection — `SopDoc`

```ts
type SopStatus =
  | "uploading"     // doc created, awaiting client PUT to R2 + commit
  | "transcribing"  // Stage 1
  | "normalizing"   // Stage 2 (speech only)
  | "analyzing"     // Stage 3 (both paths)
  | "generating"    // Stage 4 (both paths)
  | "clipping"      // Stage 5 (both paths)
  | "done"
  | "failed";

type ErrorCode =
  | null
  | "video_too_short" | "video_too_long" | "unsupported_format"
  | "file_too_large"  | "transcription_failed"
  | "generation_failed" | "clipping_failed"
  | "visual_context_failed" | "visual_extract_failed"
  | "frame_sampling_failed" | "video_download_failed"
  | "unknown";

type PdfStatus = "idle" | "generating" | "ready" | "error";

interface Segment      { id: number; start: number; end: number; text: string; }
interface CleanSegment { id: number; text: string; }

interface Step {
  title: string;
  description: string;
  startTime: number;          // seconds
  endTime: number;            // seconds
  clipR2Key: string;          // sops/<sopId>/step-<i>.mp4
  posterR2Key: string;        // sops/<sopId>/step-<i>.jpg
  keyframeR2Keys: string[];   // 0–3 entries; PDF falls back to poster if empty
}

interface SopPdfState {
  status: PdfStatus;
  r2Key?: string;             // latest generated PDF
  generatedAt?: Date;         // when status flipped to "ready"
  startedAt?: Date;           // when status flipped to "generating"; staleness guard
  errorMessage?: string;
  runId?: string;             // current trigger.dev run id (idempotency)
}

interface SopDoc {
  _id: ObjectId;
  title: string;                          // "" until Stage 4
  category: string;                       // "" until Stage 3
  inputMode?: "speech" | "silent";        // set after Stage 1
  defaultLanguage?: string;               // "vi" | "en"; chosen at upload commit
  status: SopStatus;
  errorCode: ErrorCode;
  videoR2Key: string | null;              // null after cleanup
  videoExpiresAt: Date;                   // now + retention.videoRetentionDays
  transcript: string | null;              // empty string on silent path
  language: string | null;                // ISO-ish, e.g. "vi", "en"
  segments: Segment[];                    // [] on silent path
  segmentsClean: CleanSegment[] | null;   // null on silent path
  domainSummary: string | null;
  steps: Step[];
  shareToken: string;                     // unique, length 16
  pdf?: SopPdfState;
  createdAt: Date;
  updatedAt: Date;
}
```

Indexes (created on first DB connect via `ensureIndexes`):
- `sops.shareToken` — unique
- `sops.videoExpiresAt`
- `events.{type, createdAt}`

### 1.2 `events` collection — `EventDoc`

```ts
interface EventDoc {
  _id: ObjectId;
  type: "upload" | "sop_completed" | "share_view";
  sopId: ObjectId | null;
  createdAt: Date;
}
```

Used for analytics/admin only — pipeline correctness does not depend on it.

---

## 2. Ingest path (upload → claim → trigger)

The pipeline begins outside trigger.dev: a Next.js App Router API creates the SOP doc, hands the client a presigned PUT URL, and only then triggers `processSop`.

```
Client                  /api/upload/init           R2                /api/upload/commit       trigger.dev
  │                          │                      │                       │                       │
  │── POST {file meta} ─────▶│                      │                       │                       │
  │                          │── insertOne(sops) ──▶ Mongo                  │                       │
  │                          │                      │                       │                       │
  │  { sopId, uploadUrl }  ◀─│                      │                       │                       │
  │── PUT video bytes ───────────────────────────▶ R2                       │                       │
  │                                                                         │                       │
  │── POST {sopId, defaultLanguage} ──────────────────────────────────────▶│                       │
  │                                                                         │── tasks.trigger ─────▶│
  │                                                                         │                       │
  │  { ok: true }  ◀────────────────────────────────────────────────────────│                       │
```

**`POST /api/upload/init`** (`src/app/api/upload/init/route.ts`) accepts `{ filename, sizeBytes, mimeType }`. It:

1. Validates `sizeBytes ≤ maxVideoSizeMB` (else 400 `file_too_large`) and `mimeType ∈ allowedMimeTypes` (else 400 `unsupported_format`). These are pre-trigger checks; the duration check (§3.1) runs in the worker after the bytes are uploaded.
2. Creates a fresh `ObjectId`, computes `videoR2Key = sops/<sopId>/source.<ext>`, sets `videoExpiresAt = now + 30 days`.
3. Inserts the SOP doc with `status: "uploading"`, `title: ""`, `category: ""`, empty arrays/nulls for everything Stage-filled, and a fresh 16-char `shareToken`.
4. Returns `{ sopId, uploadUrl, videoKey, filename }`. `uploadUrl` is a presigned R2 PUT URL.

**Client** PUTs the bytes directly to R2 using the presigned URL — the Next.js server never sees the video.

**`POST /api/upload/commit`** (`src/app/api/upload/commit/route.ts`) accepts `{ sopId, defaultLanguage }` (`vi` or `en`, default `vi`). It:

1. Atomically updates the doc with `{ _id, status: "uploading" } → { status: "transcribing", defaultLanguage }`. Mismatched state → 404 `not_found_or_wrong_state`.
2. Inserts an `{ type: "upload" }` event.
3. Calls `tasks.trigger("process-sop", { sopId })`.

The `defaultLanguage` field is **only consulted on the silent path** (when Whisper produces no usable speech and there's no detected language to use). On the speech path, the language used in prompts is the one Whisper auto-detected.

### 2.1 Failure surfacing to the client

There is no webhook back to the client. The UI polls `GET /api/sop/[id]/status` (every `config.app.pollIntervalMs = 2000` ms) and reads `status` + `errorCode`. When `status === "failed"`, the UI shows a message keyed off `errorCode` (e.g. `video_too_short` → "Video must be at least 10 seconds"). Re-upload is the recovery — there is no retry button.

---

## 3. `processSop` orchestration & state machine

### 3.1 Stage 0 — duration probe (pre-stage)

Before spending money on Whisper or any LLM, `processSop` downloads the video from R2 to `/tmp` and runs `ffprobe`:

```ts
// src/trigger/lib/probe.ts
ffmpeg.ffprobe(file, (err, data) => {
  resolve(Number(data.format.duration ?? 0));
});
```

Reject `< 10 s` (`video_too_short`) and `> 3600 s` (`video_too_long`). The numeric `durationSec` is captured for downstream reuse — every subsequent stage that needs it gets it as a function argument, not a re-probe.

### 3.2 State machine

Set by `setStatus(_id, status, extra)` and `fail(_id, errorCode)` helpers:

```
queued
  → transcribing       (Stage 1)
  → normalizing        (Stage 2, speech path only)
  → analyzing          (Stage 3)
  → generating         (Stage 4)
  → clipping           (Stage 5)        title is set here as `extra.title`
  → done
  | failed (errorCode set)
```

`errorCode` ∈

- `video_too_short`, `video_too_long` (Stage 0)
- `transcription_failed` (Stage 1)
- `visual_context_failed`, `visual_extract_failed`, `frame_sampling_failed` (silent path)
- `generation_failed` (speech-path Stage 4)
- `video_download_failed`, `clipping_failed` (Stage 5)
- `unknown` (any unhandled throw)

After success, an `{ type: "sop_completed", sopId }` event is inserted.

### 3.3 The speech-vs-silent branch

After Whisper returns, `hasUsableSpeech` decides the path:

```ts
// src/trigger/lib/branchDecision.ts
export function hasUsableSpeech({ segments, transcript }) {
  const wordCount = transcript.trim().split(/\s+/).filter(Boolean).length;
  return segments.length > 0 && wordCount >= 30;
}
```

- ≥ 30 words **and** ≥ 1 segment → speech path (§4).
- otherwise → silent path (§5).

The chosen mode is persisted as `inputMode: "speech" | "silent"` and influences both `processSop` (here) and `generateSopPdf` (§6).

> Known limitation: `split(/\s+/)` undercounts in non-space-delimited languages (Chinese, Japanese, Thai). For the POC, Whisper still produces multiple segments for those languages, so the `segments.length > 0` clause carries the gate; revisit if we expand language support.

The remainder of §3 splits into the speech path (§4) and the silent path (§5), then merges back at the PDF stage (§6).

---

## 4. Speech path (transcript-driven)

This path runs when Whisper produced ≥ 1 segment with ≥ 30 transcript words.

### 4.1 Stage 1 — transcribe

`src/trigger/stages/transcribe.ts`. Input: a presigned R2 GET URL. Output: `{ transcript, segments, language }`.

1. Download presigned R2 video to `/tmp/tx-XXXX/src.mp4`.
2. Run `ffprobe` to confirm an audio stream exists. If not, return `{ transcript: "", segments: [], language: null }` — this short-circuits to the silent path.
3. Extract mono 16 kHz PCM WAV with ffmpeg:
   ```bash
   ffmpeg -i src.mp4 -vn -ac 1 -ar 16000 -acodec pcm_s16le -f wav audio.wav
   ```
   Equivalent fluent-ffmpeg call:
   ```ts
   ffmpeg(vid)
     .noVideo()
     .audioCodec("pcm_s16le")
     .audioChannels(1)
     .audioFrequency(16000)
     .format("wav")
     .save(aud);
   ```
4. Upload the WAV via `fal.storage.upload(file)`.
5. Call `fal.subscribe("fal-ai/whisper", { audio_url, task: "transcribe", chunk_level: "segment", version: "3" })`. Language is omitted → Whisper auto-detects.
6. Map fal's `chunks[]` (or `segments[]`) into our `Segment` shape:
   ```ts
   { id: i, start: chunk.timestamp[0], end: chunk.timestamp[1], text: chunk.text.trim() }
   ```
   Empty-text segments are dropped. `transcript = segments.map(s => s.text).join(" ")`. `language` is `null` only when no segments were returned.

### 4.2 Stage 2 — normalize

`src/trigger/stages/normalize.ts`. Cleans ASR artifacts (filler words, stutters, self-corrections) **without renumbering segment IDs** — downstream code resolves step boundaries through these IDs back to original timestamps.

Model: `google/gemini-2.5-flash`. JSON mode, `strict: true`. Schema:

```ts
NormalizeOutput = { segments: { id: number, text: string }[] }
```

System prompt:

```text
You clean ASR transcripts. Remove filler words, stutters, and self-corrections.
Preserve meaning and the original language of each segment. CRITICAL: return the
same segment IDs unchanged — do not merge, split, or renumber.

LANGUAGE: Source language is <lang>; keep cleaned segments in <lang>.
```

User prompt:

```text
Segments (JSON):
[{"id":0,"text":"..."}, ...]

Return { "segments": [{ id, text }] } with SAME ids.
```

Defensive: if the returned ID set differs from the input, fall back to raw segments. If the LLM call throws after retries, also fall back. Never blocks the pipeline.

### 4.3 Stage 3 — context

`src/trigger/stages/context.ts`. Classifies the video's domain — used as a hint for Stage 4.

Model: `google/gemini-2.5-flash`. Schema: `ContextOutput = { category: string, domainSummary: string }`. `maxRetries: 0` — failure is non-fatal, returns `{ category: "", domainSummary: "" }`.

System prompt:

```text
You classify training videos. Read the transcript and return a short freeform
string naming the domain or industry (e.g., "Specialty espresso brewing",
"Vietnamese stir-fry cooking", "Manicure prep") plus a 1-2 sentence summary of
what the video teaches.

LANGUAGE: Output the summary in <lang>. Keep technical / industry / brand terms
in their original form.
```

User prompt:

```text
Transcript:
<full cleaned transcript joined with spaces>

Return { "category": <freeform string naming the domain/industry>, "domainSummary": string }.
```

### 4.4 Stage 4 — extract SOP structure

`src/trigger/stages/extract.ts`. The headline LLM call: cleaned segments → SOP title + steps with segment-ID ranges.

Model: **`anthropic/claude-sonnet-4.5`** (the only place we use Claude). Schema:

```ts
SopExtractOutput = {
  title: string,
  steps: {
    title: string,
    description: string,
    startSegmentId: number,
    endSegmentId: number,
  }[]   // min 1
}
```

System prompt:

```text
You convert narrated training videos into structured SOPs. You receive cleaned,
indexed transcript segments. Let the trainer's narration decide where steps
begin and end — do NOT impose a preferred number of steps. Each step is a
coherent unit the trainer is explaining. Each step has: a short title (≤8 words),
a 2-4 sentence description, and a startSegmentId/endSegmentId referencing the
input segment IDs. Also produce an overall SOP title.

LANGUAGE: Output the title and every step's title and description in <lang>.
Keep technical / industry / brand terms in their original form (do not translate them).

Return strict JSON only.
```

User prompt:

```text
Category: <category>
Domain summary: <domainSummary>

Segments (JSON, use ids to reference):
[{"id":0,"text":"..."}, ...]

Return { "title": string, "steps": [{ "title", "description", "startSegmentId", "endSegmentId" }] }.
```

### 4.5 Stage 5 — resolve, clip, keyframe

After the LLM returns segment-id ranges, we convert them to timestamps and physically cut the video.

**5a. `resolveTimes` (`src/trigger/stages/clip.ts`)** — segment ID → wall-clock seconds:

```ts
for each step in extractedSteps:
  a = rawSegments[step.startSegmentId]
  b = rawSegments[step.endSegmentId]
  start = clamp(a.start, 0, durationSec)
  end   = clamp(b.end,   0, durationSec)
  if end <= start: skip
  if start < prevEnd: start = prevEnd        // enforce monotonic, no overlap
  prevEnd = end
  emit { title, description, startTime: start, endTime: end }
```

**5b. `runClip` — cut clip + grab a poster.** For each resolved step, in a temp dir:

```bash
# Stream-copy clip (fast, no re-encode); moov atom moved to the front for streaming:
ffmpeg -ss <start> -i src.mp4 -t <end-start> -c copy -movflags +faststart step-<i>.mp4

# Poster = single frame at the midpoint, scaled to 640px wide:
ffmpeg -i src.mp4 -ss <mid> -vframes 1 -vf scale=640:-2 step-<i>.jpg
# (implemented via fluent-ffmpeg .screenshots({ timestamps:[mid], size:"640x?" }))
```

Both files are uploaded to R2 under `sops/<sopId>/step-<i>.{mp4,jpg}`. If a step's ffmpeg fails, that step is skipped (warning logged). If the final `steps` array is empty, the whole stage throws → `clipping_failed`.

**5c. `runKeyframes`** — three additional stills per step at 25%, 50%, 75% of the step span:

```ts
function pickKeyframeTimestamps(start, end) {
  const span = end - start;
  return [start + span*0.25, start + span*0.5, start + span*0.75];
}
```

Each frame is grabbed with the same `screenshots()` call and uploaded to `sops/<sopId>/step-<stepIdx>-frame-<frameIdx>.jpg`. An individual frame failure leaves the step with fewer keyframes. Total `runKeyframes` failure (rare) sets `keyframeR2Keys: []`; the PDF step then falls back to the poster.

> Note: keyframe[1] (50%) and the poster are at the same timestamp. The duplication is intentional — the poster is a separate logical asset (used by listing/sharing UI), and re-sampling is cheap relative to the rest of the pipeline.

Final write:

```ts
sops.updateOne({ _id }, { $set: { steps: stepsOut, status: "done" } })
events.insertOne({ type: "sop_completed", sopId: _id })
```

After Stage 5, control returns to the user — the SOP page polls until `status === "done"` and then renders. The PDF (§6) is on-demand, not automatic.

---

## 5. Silent path (vision-driven)

Stages 1–2 are skipped: there is no usable speech, so there's no transcript to normalize. The orchestrator records `transcript: ""`, `segments: []`, `language: defaultLanguage ?? "vi"`, `inputMode: "silent"` and proceeds to Stage 3 with a vision LLM instead of text.

The source video is downloaded **once** to a temp dir with `fetchSourceVideo(videoR2Key)` and reused across context-frame sampling, extract-frame sampling, clipping, and keyframing. Caller owns disposal — see §10.

### 5.1 Stage 3 — visual context

Frame sampling, **`mode: "fixed"`** (`src/trigger/lib/sampleFrames.ts`):

```ts
FIXED_MIN = 2; FIXED_MAX = 8;
count = clamp(2, 8, floor(durationSec))
timestamps = [(i+1) * durationSec / (count+1) for i in 0..count-1]   // evenly spaced, no endpoints
```

For each timestamp:

```bash
ffmpeg -ss <t> -i src.mp4 -frames:v 1 -vf scale=768:-2 -qscale:v 5 frame-<i>.jpg
```

`-qscale:v 5` is JPEG quality ≈ 75. 768 px wide keeps the LLM payload small.

Then `runVisualContext` (vision call, `google/gemini-2.5-flash`, schema `ContextOutput`).

System prompt:

```text
You classify training videos by looking at sampled frames. Identify a short
freeform string naming the domain or industry (e.g., "Specialty espresso
brewing", "Vietnamese stir-fry cooking", "Manicure prep") and write a 1-2
sentence summary of what the video teaches.

LANGUAGE: Output the summary in <lang>. Keep technical / industry / brand terms
in their original form.
```

User content: text + N inline-base64 JPEG `image_url` parts:

```text
These <N> frames are sampled evenly across a how-to video.
Return { "category": <freeform string naming the domain/industry>, "domainSummary": string }.
```

Failure → `visual_context_failed`.

### 5.2 Stage 4 — visual extract

Frame sampling, **`mode: "density"`**:

```ts
DENSITY_TARGET_FPS = 0.5; DENSITY_MAX = 60;
count = clamp(2, 60, ceil(durationSec * 0.5))   // 1 frame per ~2 s, capped at 60
```

Same per-frame ffmpeg command as §5.1.

`runVisualExtract` posts the frames + their timestamps to `google/gemini-2.5-flash`. Schema:

```ts
VisualSopExtractOutput = {
  title: string,
  steps: { title, description, startTime: number, endTime: number }[]   // min 1
}
```

System prompt:

```text
You convert silent how-to videos into structured SOPs. You receive frames sampled
from the video plus the second-offset of each frame, and a freeform "category" +
a short "domainSummary" provided in the user prompt. Identify the discrete
actions being performed. For each action, write a clear instructional step in
the output language. Each step has: a short title (≤8 words), a 3-6 sentence
paragraph description describing what to do (instructional, present-tense,
imperative voice), and startTime/endTime in seconds within the video duration.
Order steps chronologically and do not overlap them. Return at least one step.

LANGUAGE: Output the title and every step's title and description in <lang>.
Keep technical / industry / brand terms in their original form. Return strict JSON only.
```

User prompt:

```text
Video duration: <durationSec> seconds.
Category: <category>
Domain summary: <domainSummary>
Frame timestamps (frames are attached in this order):
Frame 1: 1.23s
Frame 2: 3.45s
...

Return { "title": string, "steps": [{ "title", "description", "startTime", "endTime" }] }.
Each step description must be a 3-6 sentence instructional paragraph. Steps must be
ordered chronologically, non-overlapping, with timestamps within [0, <durationSec>].
Return at least one step.
```

**Critical: post-parse timestamp validation with retry.** Unlike other stages, retries are owned at the stage level (not inside `llmJsonVision`) so timestamp invariants can also force a retry:

```ts
for attempt in 0..maxRetries:
  out = llmJsonVision(...)
  prevEnd = 0
  for s in out.steps:
    assert s.startTime >= 0
    assert s.startTime >= prevEnd                    // chronological
    assert s.endTime > s.startTime
    assert s.endTime <= durationSec
    prevEnd = s.endTime
  return out
throw lastErr
```

Failure → `visual_extract_failed`.

### 5.3 Stage 5 — clip + keyframes (silent)

Identical to §4.5, but `resolvedSteps` come straight from the LLM (`startTime`/`endTime` already in seconds), no `resolveTimes` call needed.

After Stage 5, control returns to the user the same way — the silent SOP doc is now structurally identical to a speech SOP except `transcript === ""`, `segments === []`, `segmentsClean === null`, `inputMode === "silent"`. `generateSopPdf` (§6) branches on `inputMode`.

---

## 6. PDF synthesis (`generateSopPdf`)

Given a finished SOP, this task synthesizes a printable document. It branches on `inputMode`.

Concurrency note: per-step rewrites are issued via `Promise.all` — the LLM calls fan out without an explicit cap. OpenRouter rate-limit responses bubble up as throws and are absorbed by each call's own `maxRetries` retry; if you increase fan-out (e.g. >20 steps) you'll likely need a real concurrency limiter.

### 6.1 Idempotent claim & poll API

`POST /api/sop/[id]/pdf` is called when the user clicks Export. It:

1. Returns `{ status: "ready", url }` immediately if `pdf.status === "ready"` and `doc.updatedAt <= pdf.generatedAt` (cache hit, SOP not modified since).
2. Returns `{ status: "generating", runId }` if a recent run is in flight (`pdf.startedAt` within last 5 minutes).
3. Otherwise atomically claims the slot: `findOneAndUpdate` requires `pdf.status !== "generating"` OR `pdf.startedAt` older than 5-min cutoff (handles crashes). On claim success, sets `pdf.status = "generating"`, `pdf.startedAt = now`, then triggers `generateSopPdf` and writes `pdf.runId`.
4. On `tasks.trigger` failure, flips `pdf.status = "error"` and returns 500.

`GET /api/sop/[id]/pdf` is the poll endpoint — returns `{ status, url, errorMessage, runId }`.

`pdf.status` flips to `"error"` only when `generateSopPdf`'s top-level catch fires — i.e. unrecoverable failures (R2 upload failure, renderer throw). Per-step rewrite failures and overview synth failures are caught locally and replaced with safe fallbacks; they never poison the PDF state.

### 6.2 Pre-load step images

Before either branch runs, `generateSopPdf` pre-loads (for every step) the keyframe images from R2 into memory `Buffer`s, falling back to the poster if no keyframes exist. The renderer needs them, and on the silent path the per-step rewriter needs them too — so we load once and reuse:

```ts
loadStepImages(doc, i):
  for k in step.keyframeR2Keys: try push fetchR2Buffer(k)
  if keyframes.length === 0 and step.posterR2Key:
    posterImage = fetchR2Buffer(step.posterR2Key)
  return { keyframes, posterImage }
```

### 6.3 Speech mode — overview synthesis

`runSynthesizeOverview` (`src/trigger/stages/synthesizeOverview.ts`). Skipped entirely if `doc.transcript` is empty — the renderer just omits the overview section.

Model: `google/gemini-2.5-flash`. Schema:

```ts
OverviewOutput = {
  purpose: string,
  audience: string,
  prerequisites: string[],
  toolsMaterials: string[],
  estimatedDuration: string,    // e.g. "~10 phút" or "~10 minutes"
}
```

System prompt:

```text
You are writing the opening of a printed SOP document. The reader cannot watch
the source video — they only have your text. Read the full transcript and step
list, then produce a concise overview: purpose (2-3 sentences), audience (one
sentence), prerequisites (bullets), tools/materials mentioned (bullets), and
estimated duration (a short phrase like "~N minutes" / "~N phút" matching the
output language). No filler, no speculation beyond what the transcript supports.

LANGUAGE: Output every field in <lang>. Keep technical / industry / brand terms
in their original form.
```

User prompt:

```text
SOP title: <title>
Category: <category>

Step titles:
1. <title1>
2. <title2>
...

Full transcript:
<doc.transcript>

Return strict JSON: { "purpose", "audience", "prerequisites": string[], "toolsMaterials": string[], "estimatedDuration" }.
```

### 6.4 Speech mode — per-step rewrite

`runSynthesizeStep`. For each step we slice the transcript by **time overlap** (not segment IDs) — robust to the segment-ID resolver having clamped step boundaries:

```ts
sliceTranscriptByTime(segments, start, end) =
  segments.filter(s => s.end > start && s.start < end).map(s => s.text).join(" ").trim()
```

If the slice is empty we **skip the LLM** and return a fallback `{ prose: step.description, subBullets: [], callouts: [] }`.

Model: `google/gemini-2.5-flash`. Schema:

```ts
StepRewriteOutput = {
  prose: string,
  subBullets: string[],
  callouts: { kind: "warning"|"tip"|"note", text: string }[],
}
```

System prompt:

```text
You rewrite a single step of a training SOP for a reader who cannot watch the
video. Convert the spoken transcript slice into clear written instructions.
Output: 1-3 short paragraphs of prose, an ordered list of discrete actions in
imperative voice (subBullets), and any warnings/tips/notes as callouts with
kind="warning"|"tip"|"note". Do not invent steps not present in the transcript.
If there are no callouts, return an empty array.

LANGUAGE: Output prose, subBullets, and callouts in <lang>. Keep technical /
industry / brand terms in their original form.
```

User prompt:

```text
Step title: <step.title>
Original short description: <step.description>
Previous step title (for continuity, do not repeat its content): <prevTitle>     # only if i > 0

Transcript slice for this step:
<sliceTranscriptByTime(...) or "(empty — fall back to the original description)">

Return strict JSON: { "prose", "subBullets": string[], "callouts": [{ "kind": "warning"|"tip"|"note", "text" }] }.
```

On any failure the call is non-fatal; the fallback rewrite is used so the PDF still renders.

### 6.5 Silent mode — overview synthesis

`runVisualOverview`. Re-downloads the source video once for the whole task (`fetchSourceVideo`), then re-samples frames in `"fixed"` mode (2–8 frames, evenly spaced) **specifically for the overview** — these are the same kind of context frames Stage 3 used, but recomputed because the originals were temp files cleaned up after `processSop` finished.

`durationSec` for the silent PDF path is derived from the SOP itself: `Math.max(...steps.map(s => s.endTime))`. We don't re-probe.

Vision call, `google/gemini-2.5-flash`, schema `OverviewOutput`.

System prompt:

```text
You are writing the opening of a printed SOP document for a how-to video that
has no spoken audio. You receive a few sampled frames, the SOP title, a freeform
category, a short domainSummary, and the list of step titles. Produce a concise
overview: purpose (2-3 sentences), audience (one sentence), prerequisites (3-5
bullets), tools/materials visible in the frames or implied by the category (3-8
bullets), and estimated duration (a short phrase like "~N minutes" / "~N phút"
matching the output language). Base every claim on the frames or the supplied
context — do not invent.

LANGUAGE: Output every field in <lang>. Keep technical / industry / brand terms
in their original form.
```

User prompt:

```text
SOP title: <title>
Category: <category>
Domain summary: <domainSummary>

Step titles:
1. <title1>
...

These <N> frames are sampled evenly across the video.
Return strict JSON: { "purpose", "audience", "prerequisites": string[], "toolsMaterials": string[], "estimatedDuration" }.
```

### 6.6 Silent mode — per-step rewrite

`runVisualStep`. Reuses the keyframe buffers loaded in §6.2 (or the poster as a single-buffer fallback). Writes them to a tmp dir as JPEGs, calls the vision LLM, cleans up. If `imageBuffers.length === 0`, skip the LLM and return the fallback rewrite.

Vision call, `google/gemini-2.5-flash`, schema `StepRewriteOutput`.

System prompt:

```text
You rewrite a single step of a silent training SOP for a reader who cannot
watch the video. You receive the keyframes for this step, the step's title and
short description, the previous step's title (for continuity), the SOP's
freeform category, and a domainSummary. Output: 1-3 short paragraphs of prose,
an ordered list of discrete actions in imperative voice (subBullets), and any
warnings/tips/notes as callouts with kind="warning"|"tip"|"note". Describe only
what the keyframes show or what the supplied context warrants — do not invent
actions. If there are no callouts, return an empty array.

LANGUAGE: Output prose, subBullets, and callouts in <lang>. Keep technical /
industry / brand terms in their original form.
```

User prompt:

```text
Step title: <step.title>
Original short description: <step.description>
Previous step title (for continuity, do not repeat its content): <prevTitle>     # if i > 0
Category: <category>
Domain summary: <domainSummary>

These <N> images are the keyframes for this step.
Return strict JSON: { "prose", "subBullets": string[], "callouts": [{ "kind": "warning"|"tip"|"note", "text" }] }.
```

### 6.7 Render and persist

`renderSopPdf` (`src/trigger/stages/renderPdf.tsx`) is `@react-pdf/renderer` building a typed `RenderInput`:

```ts
{
  title, category, createdAt, overview,
  steps: [{ index, title, startTime, endTime, rewrite, keyframes: Buffer[], posterImage: Buffer | null }],
}
```

Be Vietnam Pro fonts (bundled via `additionalFiles`) are registered for full Vietnamese diacritic coverage. The output `Buffer` is uploaded to R2 at `sops/<sopId>/sop-<ts>.pdf`. The previous PDF (if any) is deleted from R2 to prevent leaks. Mongo state lands at `pdf.status = "ready"`.

---

## 7. `cleanupVideos` cron

`schedules.task` with cron `0 3 * * *` (03:00 UTC daily). Two sweeps:

1. **Source videos** with `videoExpiresAt < now` and a non-null `videoR2Key` → delete the R2 object, set `videoR2Key = null`. The SOP doc itself is preserved (the user can still view the SOP and the PDF; only the original video is purged). `videoExpiresAt` was set at upload time as `now + 30 days` (`config.retention.videoRetentionDays`).
2. **Generated PDFs** with `pdf.status === "ready"` and `pdf.generatedAt` older than the hard-coded `PDF_TTL_MS = 30 days` → delete the R2 object and reset `pdf.{status,r2Key,generatedAt,runId,startedAt}` to idle/null. Resetting (rather than leaving `status: "ready"`) ensures the next click regenerates instead of 404'ing on a deleted object.

R2 deletion failures are logged as warnings and do not block the rest of the sweep.

---

## 8. OpenRouter client behavior

`src/lib/openrouter.ts` exposes `llmJson` (text) and `llmJsonVision` (text + base64 images). Both:

- Send `temperature: 0.2`.
- Use `response_format: { type: "json_schema", json_schema: { name, strict: true, schema } }`.
- Headers include `HTTP-Referer: NEXT_PUBLIC_APP_URL` and `X-Title: SOP.vn`.
- Convert our Zod schemas to JSON Schema with a small bespoke converter (`zodToJsonSchemaLike`) supporting `ZodObject | ZodArray | ZodString | ZodNumber | ZodEnum`. **Every object field is required**; `additionalProperties: false`. **Constraint for schema authors:** do not use `.optional()`, `.nullable()`, or unions — the converter will throw with `Unsupported Zod type`.
- Retry up to `maxRetries` times on any throw (HTTP non-2xx, empty content, JSON parse error, Zod validation error). Same body each attempt; no auto-repair prompt.

Vision messages use the `image_url` content-part with `data:image/jpeg;base64,...` URLs — frames are read from disk and base64-encoded at request time. There is no separate image upload step.

---

## 9. End-to-end timeline (worked example, speech path, 3-minute video)

1. User opens upload page; client posts file metadata to `POST /api/upload/init`. Server creates SOP doc with `status: "uploading"` and returns `{ sopId, uploadUrl }`.
2. Client PUTs the bytes directly to R2 at `sops/<sopId>/source.mp4`.
3. Client calls `POST /api/upload/commit { sopId, defaultLanguage: "vi" }`. Server flips status to `"transcribing"`, inserts an `upload` event, and triggers `processSop`.
4. **Stage 0 — probe.** `ffprobe` reports 180 s. Pass.
5. **Stage 1 — transcribe.** WAV extracted (`ffmpeg -vn -ac 1 -ar 16000`). Whisper returns ~40 segments, `language: "vi"`, transcript ~600 words. `inputMode = "speech"`.
6. **Stage 2 — normalize.** Gemini 2.5 Flash returns 40 cleaned segments with same IDs.
7. **Stage 3 — context.** `status="analyzing"`. Gemini returns `{ category: "Specialty espresso brewing", domainSummary: "..." }`.
8. **Stage 4 — extract.** `status="generating"`. Claude Sonnet 4.5 returns `{ title: "Pull a perfect espresso shot", steps: [6 steps with segment-id ranges] }`.
9. **Stage 5 — clip + keyframes.** `status="clipping"`. `resolveTimes` produces 6 monotonic `[start,end]` ranges. ffmpeg cuts 6 stream-copy MP4s + 6 posters; 18 keyframes (3 per step) at 25/50/75% of each step.
10. R2 now holds: 1 source MP4, 6 clips, 6 posters, 18 keyframes. SOP doc: `status="done"`, `steps[6]` populated. `events` gets `sop_completed`.
11. User clicks **Export PDF** → `POST /api/sop/<id>/pdf`. Server claims slot, sets `pdf.status="generating"`, fires `generateSopPdf`, returns runId.
12. PDF task loads 6 × `{ keyframes: Buffer[3], posterImage: null }`.
13. **Overview** — Gemini 2.5 Flash returns `{ purpose, audience, prerequisites, toolsMaterials, estimatedDuration: "~10 phút" }`.
14. **Rewrite × 6** — for each step: slice transcript by time overlap, Gemini 2.5 Flash returns `{ prose, subBullets, callouts }`. Issued in parallel via `Promise.all`.
15. `@react-pdf/renderer` produces a `Buffer`, uploaded to `sops/<sopId>/sop-<ts>.pdf`. `pdf.status="ready"`. UI poll (`GET /api/sop/<id>/pdf`) flips to ready and reveals the download link.
16. **30 days later**, `cleanupVideos` deletes the source MP4 and sets `videoR2Key=null`. **30 days after** PDF generation, the PDF is also deleted and `pdf.*` resets to idle.

---

## 10. Implementation gotchas

- **Segment IDs are sacred on the speech path.** `runNormalize` MUST return the exact same set of IDs as input. The whole timeline of clips depends on `rawSegments[id].start` lookups in `resolveTimes`. Any normalize that merges/splits must be rejected and the raw segments used instead — this defensive fallback is already in place.
- **Timestamps are sacred on the silent path.** Always re-validate post-parse: chronological, non-overlapping, within `[0, durationSec]`. Bad timestamps cause ffmpeg to silently produce empty clips. The `runVisualExtract` retry loop runs `maxRetries+1` total attempts (so default = 2) on either schema or invariant failure.
- **Whisper language detection only fires if there are segments.** With no audio (probe says no audio stream), we early-return `language: null` without calling fal — saves money and matches the silent-path expectation.
- **`fetchSourceVideo` callers own the lifecycle.** It returns `{ srcPath, tmpDir, dispose }`; always wrap usage in `try/finally { src.dispose() }`. Same for `sampleFrames`'s `{ paths, timestamps, tmpDir, dispose }` return. Forgetting this leaks `/tmp` on the worker.
- **Stream-copy vs re-encode.** Step clips use `-c copy -movflags +faststart` for speed (no quality loss, but the cut is constrained to keyframes — accept ±1s slop). Frames re-encode via `-vf scale=...` because we need different dimensions/quality.
- **Vision payloads are big.** A 60-frame density sample at 768 px wide can be several MB of base64 JSON. The OpenRouter client builds them in memory; keep `DENSITY_MAX = 60` unless you measure.
- **trigger.dev `maxAttempts: 1`.** Per-stage retries already exist for the noisy operations. Re-attempting the whole task would re-run Whisper, the Claude call, and the ffmpeg cuts — expensive and not idempotent.
- **R2 GETs are presigned for 3600 s.** `processSop`'s `maxDuration` is 900 s, so a single presigned URL is fine for a whole run; if you raise either limit, re-presign defensively.
- **Fonts must be bundled into the trigger.dev worker.** `@react-pdf/renderer` cannot fetch them at runtime in the deployed environment — `additionalFiles({ files: ["public/fonts/*.ttf"] })` is what makes Vietnamese rendering work in production.
- **No optional/nullable fields in LLM schemas.** The Zod-to-JSON-Schema converter only handles `ZodObject | ZodArray | ZodString | ZodNumber | ZodEnum`, all required. If you need nullability, model it as an explicit empty string / empty array in the prompt instead.
- **PDF claim is best-effort idempotent.** Two simultaneous Export clicks: only one wins the Mongo `findOneAndUpdate` claim; the other gets `{ status: "generating", runId }` for the in-flight run. After 5 minutes with no completion, the staleness guard lets a fresh click reclaim — at the cost of a possibly-still-running orphan trigger run that will eventually overwrite the eventual PDF (last write wins on `pdf.r2Key`).
