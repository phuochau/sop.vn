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

**Explicitly cut from original spec:** S5 PDF export preview, S7 dedicated error screen (errors rendered inline on S2/S3), S4 thumbs up/down feedback.

UI is Vietnamese-only; strings copied from `mvp.pen`. shadcn primitives (Button, Card, Progress, Toast, Dialog, Input) styled to approximate each pen frame — visually equivalent, not pixel-perfect.

---

## Data Model (MongoDB)

```
sops {
  _id: ObjectId,
  title: string,
  category: string,
  status: "uploading" | "transcribing" | "generating" | "clipping" | "done" | "failed",
  errorCode: string | null,
  videoR2Key: string,
  videoExpiresAt: Date,           // createdAt + 30 days
  transcript: string | null,
  steps: [{
    title: string,
    description: string,
    startTime: number,            // seconds
    endTime: number,
    clipR2Key: string,
    posterR2Key: string
  }],
  shareToken: string,              // random, 16 chars, unique
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
   |<-- 200                       |                               | a. fal.ai transcribe → timestamped segments
   |                              |                               | b. OpenRouter → steps JSON (title, desc, start, end)
   |                              |                               | c. ffmpeg: cut clip + poster per step, upload to R2
   |                              |                               | d. update sops (steps, status=done)
   | 4. poll /api/sop/:id/status -|                               |
   |<-- {status, ...}             |                               |
   | 5. navigate to /sop/:id      |                               |
```

- **Poll interval:** 2 seconds.
- **Step statuses exposed to UI:** `transcribing` (S3 step 2 active), `generating` + `clipping` (S3 step 3 active), `done` (redirect S4), `failed` (inline error on S3 with retry → /upload).
- **Video cap:** 5 minutes, 500 MB, MP4/MOV/WEBM/AVI. Enforced server-side in `/api/upload/init`.

### Prompt (OpenRouter, configurable)

Input: timestamped transcript segments.
Output: strict JSON `{ "title": string, "category": string, "steps": [{ "title": string, "description": string, "startTime": number, "endTime": number }] }`. All text in Vietnamese. Prompt itself in English for model performance.

### Clip cutting (ffmpeg)

For each step, run `ffmpeg -ss {startTime} -to {endTime} -i input.mp4 -c copy clip.mp4` and `ffmpeg -ss {midpoint} -i input.mp4 -frames:v 1 poster.jpg`. Upload both to R2 under `sops/{sopId}/step-{i}.mp4` and `sops/{sopId}/step-{i}.jpg`. Clips served via R2 public URL (or signed URL if bucket is private).

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
    sopModel: "anthropic/claude-sonnet-4.5",
    transcriptionProvider: "fal",
    transcriptionModel: "fal-ai/whisper",
    sopSystemPrompt: `You are an expert at converting Vietnamese training videos into step-by-step SOPs...`,
    sopUserPromptTemplate: (segments: string) => `...`,
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
  - **Track A:** `/api/upload/init`, `/api/upload/commit`, `/api/sop/:id/status` endpoints.
  - **Track B:** Trigger.dev `processSop` task (fal.ai → OpenRouter → ffmpeg → Mongo).
- **Phase 3 — UI (parallel per screen):** S1, S2, S3, S4, S6, S7 — each read from `mvp.pen` and built with shadcn + Tailwind.
- **Phase 4 — Integration:** Deploy to Vercel; run one real end-to-end test video; fix obvious bugs.
- **Phase 5 — Cleanup cron + admin page polish.**

---

## Out of Scope (defer to v2+)

PDF export, user accounts, payment/subscription, inline SOP editing, thumbs feedback, English UI, Zalo/Drive integrations, per-step editing, mobile app, abuse protection (rate limits, Turnstile), proper analytics (PostHog).

---

## Open Items (intentionally deferred)

- **R2 bucket visibility:** public-read vs signed URLs. Default to signed URLs at the API layer so we can flip later without schema change.
- **Error UX detail:** inline error on S3 uses the error-message table from product spec (`SOPvn_MVP_Spec.md` §S7). No dedicated error route.
- **Exact Vietnamese copy:** pulled from `mvp.pen` during Phase 3, not transcribed here.
