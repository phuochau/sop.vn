# Export SOP as PDF — Design

**Date:** 2026-04-25
**Status:** Draft for review
**Owner:** Hau Vo

## Problem

The result page (`/sop/[id]`) presents an SOP as a video-centric experience: each step is a clickable poster that plays a clip. Users want to export the SOP as a **PDF for reading** — a static, paper-friendly document that stands on its own without the video.

The naive approach (render the web page to PDF) produces a thin document: the poster is a single frame, and the actual instructional content lives in the moving picture and the spoken words. A reader who can't watch the video gets little value.

## Goals

1. One-click PDF export from the result page.
2. The PDF reads like a real document — paragraphs, sub-bullets, callouts — not a screenshot of the webpage.
3. Print-optimized layout (A4) designed separately from the web UI, but using the same brand language.
4. Fast enough that users wait through it (loading state → download), not so slow it needs a separate "your PDF is ready" notification flow.

## Non-goals

- Pixel-matching the web result page.
- Editable PDFs / form fields.
- Multi-language export (Vietnamese only, matching current product).
- User-customizable layouts or templates.

## Approach (decisions made during brainstorming)

| Decision                      | Choice                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------- |
| Visual fidelity               | Print-optimized layout, distinct from web UI                                    |
| PDF generation library        | `@react-pdf/renderer` (declarative, no Chromium, JSX-style iteration)           |
| Where it runs                 | Trigger.dev background task (`generateSopPdf`)                                  |
| Step content depth            | LLM-rewritten prose + sub-bullets + callouts + 3-keyframe strip per step        |
| Document-level content        | LLM-generated Overview (purpose, audience, prerequisites, tools, duration)     |
| Keyframe extraction location  | Upstream — during initial `processSop`, so PDF generation never touches video  |

## Architecture

### High-level flow

```
[/sop/:id page]
   click "Xuất PDF"
        │
        ▼
POST /api/sop/:id/pdf  ──► trigger generateSopPdf({ sopId })  ──► returns runId + publicAccessToken
        │
        ▼
UI subscribes via Trigger.dev realtime (useRealtimeRun)
        │
        ▼ when sop.pdf.status === "ready"
download from sop.pdf.url
```

### Mongo schema additions

The SOP document gains a `pdf` subdocument:

```ts
pdf: {
  status: "idle" | "generating" | "ready" | "error";
  url?: string;          // R2 key or presigned URL
  generatedAt?: Date;
  errorMessage?: string;
  runId?: string;        // current Trigger.dev run, used to dedupe double-clicks
}
```

Each step in the SOP gains keyframe URLs (populated by upstream pipeline):

```ts
step.keyframes: string[]  // 3 R2 URLs, evenly spaced across [startTime, endTime]
```

The existing `posterUrl` is retained as a fallback for when keyframes are missing.

## Pipeline: `generateSopPdf` task

Stages 2 and 3 run in parallel; stage 3's per-step work also fans out in parallel.

```
1. Load                 Mongo: SOP doc + transcript
                        Mark sop.pdf.status = "generating"

2. Synthesize Overview  LLM call: full transcript + step list →
                        { purpose, audience, prerequisites,
                          toolsMaterials, estimatedDuration }

3. Synthesize Steps     For each step, in parallel:
                          a. Slice transcript by [startTime, endTime]
                          b. LLM rewrite → { prose, subBullets[], callouts[] }
                          (keyframes already exist from upstream pipeline)

4. Render PDF           @react-pdf/renderer: build document tree from
                        Overview + enriched Steps + keyframe URLs.
                        Output: Buffer

5. Upload               PUT buffer to R2 at  pdfs/{sopId}-{ts}.pdf

6. Finalize             Mongo: sop.pdf = { status:"ready", url, generatedAt }

   On any failure       sop.pdf.status = "error" + errorMessage
```

### Upstream change: keyframe extraction in `processSop`

To keep `generateSopPdf` fast and video-free, **`processSop` is extended to extract 3 keyframes per step during initial processing** (one ffmpeg pass per step, evenly spaced across the step's time range). Keyframes are uploaded to R2 and their URLs persisted on each step. The existing single `posterUrl` is preserved.

This decouples PDF export from video lifetime — `cleanupVideos` can delete source video without affecting future PDF exports.

## Content synthesis (LLM prompts)

Two distinct LLM calls via the existing `lib/openrouter.ts`. Small/fast model — these are formatting tasks, not reasoning tasks. All outputs are Zod-validated; schemas live in `lib/schemas.ts`.

### Call A — Overview (one per PDF)

**Input:** SOP title, category, full transcript, list of step titles.

**Output schema:**
```ts
{
  purpose: string;          // 2-3 sentences: what this SOP teaches and why
  audience: string;         // who should read this
  prerequisites: string[];  // bullets
  toolsMaterials: string[]; // bullets — apps, accounts, physical items mentioned
  estimatedDuration: string;// "~5 phút"
}
```

**Prompt direction:** *"You are writing the opening of a printed SOP document. Read the transcript and step list. Produce a concise overview a reader sees before the steps. Vietnamese output. No filler."*

### Call B — Step rewrite (one per step, parallel)

**Input:** step `{title, description, startTime, endTime}` + transcript slice for that time range + previous step's title (for continuity).

**Output schema:**
```ts
{
  prose: string;            // 1-3 short paragraphs, reading-optimized
  subBullets: string[];     // discrete actions in order, imperative voice
  callouts: Array<{
    kind: "warning" | "tip" | "note";
    text: string;
  }>;
}
```

**Prompt direction:** *"Rewrite this step for a reader who cannot watch the video. Convert spoken Vietnamese into clear written instructions. Use imperative voice for actions. Extract any warnings, tips, or non-obvious context as callouts. Do not invent steps not present in the transcript."*

### Graceful degradation

- Per-step rewrite failure → fall back to the original `step.description`. PDF still renders.
- Overview failure → omit the Overview block, render PDF without it. Log warning.
- Missing keyframes on a step → fall back to single `posterUrl`.

## PDF layout

A4 portrait. Inter font registered with React-PDF to match web brand. Vietnamese text supported.

### Page 1 — Cover

- SOPvn wordmark (top-left, small)
- SOP category pill
- SOP title (large, bold)
- Meta row: created date · total duration · step count
- Horizontal rule
- **Overview** block: Purpose, Audience, Prerequisites, Tools/Materials, Estimated Duration

### Page 2 — Table of contents

- Numbered list of step titles with start-time stamps.
- Skipped if SOP has ≤3 steps.

### Pages 3+ — One section per step

`break` between steps so each starts on a fresh page (or shares only if the prior ends near the top — React-PDF `wrap` + `break` handles this).

```
┌─────────────────────────────────────────────┐
│  Step 03 · 00:42 – 01:15                    │
│                                             │
│  Tiêu đề bước                               │
│                                             │
│  ┌──────┐ ┌──────┐ ┌──────┐                 │
│  │      │ │      │ │      │                 │
│  └──────┘ └──────┘ └──────┘                 │
│                                             │
│  Prose paragraphs…                          │
│                                             │
│  • Sub-bullet action 1                      │
│  • Sub-bullet action 2                      │
│                                             │
│  ┌─ ⚠ Cảnh báo ───────────────────────────┐ │
│  │ Warning text                            │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

### Page footer (every page after cover)

Fixed `<View>`: SOP title (left) · page X of Y (right) · subtle hairline rule.

### Visual language

Match web brand: Inter, `#0A0A0A` body text, `#6B7280` meta, accent color for step number badge and callout borders. Spacing/sizes optimized for print, not screen.

## API surface

### `POST /api/sop/[id]/pdf`

Kicks off the job.

- Reads `sop.pdf`. If `status === "ready"` and `sop.updatedAt <= sop.pdf.generatedAt`, returns `{ status: "ready", url }` immediately (cache hit).
- Otherwise calls `tasks.trigger("generate-sop-pdf", { sopId })`, sets `sop.pdf = { status: "generating", runId }`, returns `{ status: "generating", runId, publicAccessToken }`.

### `GET /api/sop/[id]/pdf`

Returns the current `sop.pdf` doc. Polling fallback if realtime is unavailable.

### Concurrency guard

If `POST` arrives while `status === "generating"`, return the existing `runId` instead of starting a duplicate job.

## UI: Export button on `/sop/[id]`

States driven primarily by `useRealtimeRun(runId, { accessToken })` with `GET /api/sop/[id]/pdf` as a fallback.

```
idle        → "Xuất PDF"           (default button)
generating  → "Đang tạo PDF..."    (disabled, spinner)
ready       → auto-trigger download via <a href={url} download>
              then snap back to idle (button stays enabled for re-download)
error       → "Thử lại"            (red, click retries)
```

Cache-hit path skips `generating` entirely — click → instant download. A short toast confirms download start.

## Error handling summary

| Failure                        | Behavior                                                            |
| ------------------------------ | ------------------------------------------------------------------- |
| Per-step LLM rewrite           | Fall back to existing `step.description`. PDF still renders.        |
| Overview LLM call              | Omit Overview block. Render PDF anyway. Log warning.                |
| Missing keyframes on a step    | Fall back to single `posterUrl`.                                    |
| Render or R2 upload failure    | `sop.pdf.status = "error"` + errorMessage. UI shows "Thử lại".      |
| Double-click during generating | `POST` returns existing `runId`. No duplicate job.                  |

## Cache invalidation

- Cache hit when `sop.updatedAt <= sop.pdf.generatedAt`.
- Editing the SOP (admin re-run, etc.) bumps `sop.updatedAt` → next click regenerates.
- Old PDFs in R2 are swept by extending `cleanupVideos` to also clean stale `pdfs/` entries on a TTL.

## File-level changes (preview)

New:
- `src/trigger/generateSopPdf.ts` — Trigger.dev task entry
- `src/trigger/stages/synthesizeOverview.ts` — LLM call A
- `src/trigger/stages/synthesizeStep.ts` — LLM call B (per step)
- `src/trigger/stages/renderPdf.tsx` — React-PDF document component + render
- `src/app/api/sop/[id]/pdf/route.ts` — POST + GET handlers
- `src/components/ExportPdfButton.tsx` — UI button with realtime states

Modified:
- `src/lib/schemas.ts` — Zod schemas for Overview and StepRewrite outputs
- `src/lib/mongo.ts` — SOP type adds `pdf` subdoc and `step.keyframes`
- `src/trigger/processSop.ts` — extend with per-step keyframe extraction stage
- `src/trigger/cleanupVideos.ts` — also sweep stale `pdfs/`
- `src/app/sop/[id]/page.tsx` — mount `<ExportPdfButton />`

## Open questions / risks

- **Font registration:** React-PDF needs Inter (and a Vietnamese-supporting fallback) registered with explicit `.ttf` files. Need to verify Inter ships glyphs for Vietnamese diacritics; if not, swap to Be Vietnam Pro or similar.
- **R2 presigned URL TTL:** PDFs may be downloaded later than they are generated. Either issue long-TTL presigned URLs or proxy through the API route. To be decided in implementation.
- **LLM latency at scale:** ~10 parallel step rewrites + 1 overview ≈ a few seconds end-to-end at current model speeds. If a SOP has 30+ steps, total time could grow. Acceptable for v1; revisit if it becomes a UX problem.
