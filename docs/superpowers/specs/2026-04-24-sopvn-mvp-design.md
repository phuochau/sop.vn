# SOP.vn MVP — Design Spec

**Date:** 2026-04-24
**Status:** Approved for implementation
**Source spec:** `SOPvn_MVP_Spec.md` (product spec)
**UI source:** `mvp.pen` (6 screens designed in Pencil)

---

## Goal

Validate the idea: *"Vietnamese shop owners upload a training video → AI produces a step-by-step SOP with a video clip per step → share via link."*

MVP quality bar: **just works.** No auth, no payments, no polish beyond what's needed to run the happy path end-to-end.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Styling | Tailwind + shadcn/ui |
| Hosting | Vercel |
| Database | MongoDB Atlas (free tier) |
| Object storage | Cloudflare R2 |
| Background jobs | Trigger.dev v3 (with `@trigger.dev/build/extensions/core` ffmpeg extension) |
| Transcription | fal.ai Whisper (`verbose_json` — segment timestamps) |
| SOP generation | OpenRouter → Claude Sonnet (model id configurable) |

**Secrets** (env): `MONGODB_URI`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE_URL`, `FAL_API_KEY`, `OPENROUTER_API_KEY`, `TRIGGER_SECRET_KEY`, `ADMIN_PASSWORD`.

**Tunables** (single file: `src/config/index.ts`): AI model ids, prompt template, max video size/duration, retention days, share token length, allowed mime types.

---

## Screens (6)

| # | Route | Purpose |
|---|---|---|
| S1 | `/` | Landing — hero + "Upload Video" CTA |
| S2 | `/upload` | Upload form (file + optional title/category) |
| S3 | `/processing/:id` | 3-step progress indicator, polls status |
| S4 | `/sop/:id` | SOP: step cards with inline video clip + title + description; Share Link button |
| S6 | `/share/:token` | Read-only SOP view for link recipients |
| S7 | `/admin` | Password-gated counters dashboard |

**Explicitly cut from original product spec:** S5 PDF export preview, the original S7 error screen (errors rendered inline on S2/S3 instead), S4 thumbs up/down feedback. Note: the S7 route in this design is a **new** admin dashboard, not the original error screen.

UI is Vietnamese-only; strings copied from `mvp.pen` for S1–S6. shadcn primitives (Button, Card, Progress, Toast, Dialog, Input) styled to approximate each pen frame — visually equivalent, not pixel-perfect. **S7 admin is not in `mvp.pen`** — built directly in code during Phase 3 as a minimal one-page layout.

---

## Data Model (MongoDB)

```
sops {
  _id: ObjectId,
  title: string,                   // AI-generated; overridden by user-entered S2 title if provided
  category: string,                // AI-generated; overridden by user-entered S2 category if provided
  status: "uploading" | "transcribing" | "normalizing" | "analyzing" | "generating" | "clipping" | "done" | "failed",
  errorCode:                       // set when status="failed"
    | null
    | "video_too_short"
    | "video_too_long"
    | "unsupported_format"
    | "file_too_large"
    | "silent_audio"
    | "transcription_failed"
    | "generation_failed"
    | "clipping_failed"
    | "unknown",
  videoR2Key: string | null,       // nulled after retention cleanup
  videoExpiresAt: Date,             // createdAt + 30 days
  transcript: string | null,              // joined clean text, for debugging/admin
  segments: [{ id, start, end, text }],     // raw Whisper output, authoritative timestamps
  segmentsClean: [{ id, text }] | null,     // normalized Stage 2 output
  domainSummary: string | null,              // Stage 3
  steps: [{
    title: string,
    description: string,
    startTime: number,              // seconds
    endTime: number,
    clipR2Key: string,
    posterR2Key: string
  }],
  shareToken: string,                // random, 16 chars; Mongo unique index
  createdAt: Date,
  updatedAt: Date
}

events {
  _id,
  type: "upload" | "sop_completed" | "share_view",
  sopId: ObjectId | null,
  createdAt: Date
}
```

Order of `steps` is the visual order. Step number = array index + 1.

No rate-limit collection for MVP.

---

## Processing Pipeline

### High-level flow
```
[Client]                    [Next.js API]                  [Trigger.dev Job]
   |                              |                               |
   | 1. POST /api/upload/init --->|                               |
   |    (filename, size)          | create sops doc (uploading)   |
   |<-- presigned R2 PUT URL + id |                               |
   | 2. PUT video to R2 --------->|                               |
   | 3. POST /api/upload/commit ->|                               |
   |    (sopId)                   | status=transcribing           |
   |                              | trigger.tasks.trigger("processSop", {sopId}) --->|
   |<-- 200                       |                               | runs staged AI pipeline (see below)
   | 4. poll /api/sop/:id/status -|                               |
   |<-- {status, ...}             |                               |
   | 5. navigate to /sop/:id      |                               |
```

### AI pipeline (4 stages, inside `processSop` Trigger.dev task)

**Design principle:** timestamps come from Whisper only. LLMs reference segments by ID, never emit raw timestamps. Code resolves IDs back to timestamps for ffmpeg.

```
┌─────────────────────────────────────────────────────────────────────┐
│ Stage 1 — ASR                                 status="transcribing" │
│ fal.ai Whisper verbose_json on R2 video URL                         │
│ → segments: [{ id, start, end, text }]  (id = array index)          │
│ Store `transcript` (joined text) + raw segments on sops doc         │
└─────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────────────────────────────────────────┐
│ Stage 2 — Normalize                           status="normalizing"  │
│ Cheap LLM via OpenRouter (`config.ai.normalizeModel`)               │
│ Input: indexed segments                                             │
│ Task: remove Vietnamese fillers ("ờ","à","thì là"), repetitions,    │
│ self-corrections. MUST preserve segment IDs 1:1.                    │
│ Output schema: [{ id: number, text: string }]                       │
│ → `segmentsClean`                                                   │
└─────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────────────────────────────────────────┐
│ Stage 3 — Context detect                      status="analyzing"    │
│ Cheap LLM (`config.ai.contextModel`)                                │
│ Input: joined clean transcript                                      │
│ Output schema:                                                      │
│   { category: "Coffee & Drinks" | "Food & Cooking"                  │
│             | "Spa & Beauty" | "Nail" | "Other",                    │
│     domainSummary: string }                                         │
│ Stored on sops doc. If user provided category on S2, user wins.     │
│ Used to select a domain terminology hint for Stage 4.               │
└─────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────────────────────────────────────────┐
│ Stage 4 — Step extraction                     status="generating"   │
│ Strong LLM (`config.ai.sopModel`) with strict JSON schema response  │
│ Input:                                                              │
│   - clean indexed segments                                          │
│   - domain terminology hint from Stage 3                            │
│ Prompt rule (explicit): "Let the trainer's narration decide where   │
│   steps begin and end. Do not impose a preferred number of steps."  │
│ Output schema:                                                      │
│   { title: string,                                                  │
│     steps: [{ title: string,                                        │
│               description: string,                                  │
│               startSegmentId: number,                               │
│               endSegmentId: number }] }                             │
│ Retry ONCE on schema-validation failure. If second attempt fails,   │
│ set status="failed", errorCode="generation_failed".                 │
└─────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────────────────────────────────────────┐
│ Stage 5 — Resolve + Clip                      status="clipping"     │
│ Pure code (no LLM):                                                 │
│  a. For each step, look up real start/end from raw Stage-1 segments │
│     via startSegmentId/endSegmentId                                 │
│  b. Validate: monotonic, endTime > startTime, in [0, videoDuration] │
│     If invalid, clamp; if still invalid, drop the step              │
│  c. Download original video to task tmp dir                         │
│  d. For each step: ffmpeg cut clip + extract poster frame at        │
│     midpoint, upload both to R2                                     │
│  e. Write final steps array + status="done" to Mongo                │
└─────────────────────────────────────────────────────────────────────┘
```

### Runtime details

- **Poll interval:** 2 seconds.
- **Step statuses exposed to UI:** `uploading`/`transcribing`/`normalizing`/`analyzing` → S3 step 2 active; `generating`/`clipping` → S3 step 3 active; `done` → redirect S4; `failed` → inline error on S3 with retry → /upload.
- **Video cap:** 5 minutes, 500 MB, MP4/MOV/WEBM/AVI. Enforced server-side in `/api/upload/init` (size + mime); duration validated in the Trigger.dev job via `ffprobe` before Stage 1.
- **Poll response shape:** `GET /api/sop/:id/status` → `{ status, errorCode, title, hasSteps: boolean }`. S3 uses `status` for the stepper and `errorCode` for failure messages.
- **Audio handling:** fal.ai Whisper accepts the video R2 URL directly and extracts audio internally — no separate audio-extraction step required.
- **Domain terminology hints** (injected into Stage 4 prompt based on Stage 3 category):
  - `Coffee & Drinks`: "chiết xuất, pha, định lượng, xay, tamping, crema"
  - `Food & Cooking`: "xào, hầm, nêm, luộc, ướp, gia vị"
  - `Spa & Beauty`: "tẩy tế bào chết, ủ, massage, mặt nạ, dưỡng"
  - `Nail`: "giũa, sơn gel, đắp, phủ bóng, dũa móng"
  - `Other`: "" (no hint)
- **Structured outputs:** all LLM calls use OpenRouter `response_format: { type: "json_schema", strict: true }` and Zod validation on receive. Stages 2 + 4 retry once on validation failure; Stage 3 does not retry (failure → `category="Other"`).
- **Model tiers** (all configurable in `src/config/index.ts`):
  - `normalizeModel` — cheap (e.g., `google/gemini-2.5-flash` or `anthropic/claude-haiku-4.5`)
  - `contextModel` — cheap (same tier)
  - `sopModel` — strong (e.g., `anthropic/claude-sonnet-4.5`)

### Clip cutting (ffmpeg)

For each step, run `ffmpeg -ss {startTime} -to {endTime} -i input.mp4 -c copy clip.mp4` and `ffmpeg -ss {midpoint} -i input.mp4 -frames:v 1 poster.jpg`. Upload both to R2 under `sops/{sopId}/step-{i}.mp4` and `sops/{sopId}/step-{i}.jpg`. Clips served via signed URLs from the API layer.

---

## Retention / Cleanup

Trigger.dev scheduled task, daily:
```
sops.find({ videoExpiresAt: { $lt: now }, videoR2Key: { $ne: null } })
  → delete videoR2Key from R2, set videoR2Key = null
```
Step clips + posters are kept indefinitely (tiny, and they are the SOP).

---

## Analytics

`events` collection. Write-only from app:
- `upload` — on `/api/upload/commit`
- `sop_completed` — on Trigger.dev job success
- `share_view` — on `GET /share/:token`

`/admin` page reads aggregates: counts per type for today / last 7 days / all-time. Password gate: single `ADMIN_PASSWORD` env var, compared in a server action on form submit. No session — password prompt on every load (cookie is overkill for MVP).

---

## Config File (`src/config/index.ts`)

```ts
export const config = {
  ai: {
    transcriptionProvider: "fal",
    transcriptionModel: "fal-ai/whisper",
    normalizeModel: "google/gemini-2.5-flash",     // cheap, fast
    contextModel: "google/gemini-2.5-flash",        // cheap, fast
    sopModel: "anthropic/claude-sonnet-4.5",        // strong
    maxRetries: 1,                                   // schema-validation retries
    domainTerminology: {
      "Coffee & Drinks": "chiết xuất, pha, định lượng, xay, tamping, crema",
      "Food & Cooking":  "xào, hầm, nêm, luộc, ướp, gia vị",
      "Spa & Beauty":    "tẩy tế bào chết, ủ, massage, mặt nạ, dưỡng",
      "Nail":            "giũa, sơn gel, đắp, phủ bóng, dũa móng",
      "Other":           "",
    },
    prompts: {
      normalizeSystem: `You clean Vietnamese ASR transcripts. Remove filler words ("ờ","à","ừm","thì","là" when used as filler), stutters, and self-corrections. Preserve all meaningful content. CRITICAL: return the same segment IDs unchanged — do not merge, split, or renumber.`,
      contextSystem: `You classify Vietnamese training videos. Read the transcript and return the single best-fit category plus a 1-2 sentence Vietnamese summary of what the video teaches.`,
      sopSystem: (domainHint: string) =>
        `You convert Vietnamese-narrated training videos into structured SOPs. You receive cleaned, indexed transcript segments. Let the trainer's narration decide where steps begin and end — do NOT impose a preferred number of steps. Each step is a coherent unit the trainer is explaining. Each step has: a short Vietnamese title (≤8 words), a 2-4 sentence Vietnamese description, and a startSegmentId/endSegmentId referencing the input segment IDs. Also produce an overall Vietnamese SOP title.${domainHint ? `\n\nDomain vocabulary to prefer when relevant: ${domainHint}` : ""}\n\nReturn strict JSON only.`,
    },
  },
  limits: {
    maxVideoSizeMB: 500,
    maxVideoDurationSec: 300,
    minVideoDurationSec: 10,
    allowedMimeTypes: ["video/mp4","video/quicktime","video/webm","video/x-msvideo"],
  },
  retention: { videoRetentionDays: 30 },
  app: { shareTokenLength: 16, pollIntervalMs: 2000 },
};
```

---

## Phases

Autonomous execution. Parallel subagents where tasks are independent.

- **Phase 1 — Foundation:** Next.js + Tailwind + shadcn scaffold, Mongo + R2 clients, config file, env wiring, Trigger.dev init with ffmpeg extension.
- **Phase 2 — Pipeline (parallel):**
  - **Track A:** `/api/upload/init`, `/api/upload/commit`, `/api/sop/:id/status`, `/api/sop/:id`, `/api/share/:token`, `/api/clips/:sopId/:key` (signed-URL proxy) endpoints.
  - **Track B:** Trigger.dev `processSop` task — Stage 1 (fal.ai) → Stage 2 (normalize) → Stage 3 (context) → Stage 4 (extract) → Stage 5 (resolve + ffmpeg + R2 + Mongo). Each stage is its own sub-function with Zod schemas and one-retry wrapper where noted.
- **Phase 3 — UI (parallel per screen):** S1, S2, S3, S4, S6, S7 — each read from `mvp.pen` and built with shadcn + Tailwind.
- **Phase 4 — Integration:** Deploy to Vercel; run one real end-to-end test video; fix obvious bugs.
- **Phase 5 — Cleanup cron:** daily Trigger.dev scheduled task that nulls expired `videoR2Key` and deletes from R2.

---

## Out of Scope (defer to v2+)

PDF export, user accounts, payment/subscription, inline SOP editing, thumbs feedback, English UI, Zalo/Drive integrations, per-step editing, mobile app, abuse protection (rate limits, Turnstile), proper analytics (PostHog).

---

## Open Items (intentionally deferred)

- **R2 bucket visibility:** public-read vs signed URLs. Default to signed URLs at the API layer so we can flip later without schema change.
- **Error UX detail:** inline error on S3 uses the error-message table from product spec (`SOPvn_MVP_Spec.md` §S7). No dedicated error route.
- **Exact Vietnamese copy:** pulled from `mvp.pen` during Phase 3, not transcribed here.
