# Loom URL ingest

Date: 2026-05-02
Status: Draft

## Problem

The UI in `src/components/UploadZone.tsx` already advertises "tải tệp MP4/MOV và liên kết YouTube, Loom, Vimeo" and renders a URL input field — but the input is `disabled` and only direct file uploads to R2 actually work. Users who want to convert an existing Loom recording must download the MP4 themselves and re-upload it.

We want users to paste a public Loom share URL and have the server fetch the underlying MP4, then run the existing pipeline unchanged.

YouTube and Vimeo are explicitly out of scope for this iteration (separate ToS/runtime profile).

## Goals

- Accept a public Loom share URL (`loom.com/share/<id>` and the embed/recording variants) on the existing upload page.
- Server resolves the MP4 via Loom's `transcoded-url` endpoint, streams it into R2 under the same key shape as a direct upload, then triggers the existing `process-sop` task with no changes downstream.
- Long-running download runs as a Trigger.dev task so the API request returns instantly.
- The `/processing/[id]` page surfaces an "ingesting" state.
- Single user-facing error message for resolution failures, with structured error logs for diagnosis.
- Inline disclaimer in the UI that links must be public and the user has rights to process the video. No checkbox.

## Non-goals

- HLS/`.m3u8` fallback when `transcoded-url` returns empty. (Tracked via error logs; revisit after seeing real failure rates.)
- Private, password-protected, or workspace-restricted Loom videos.
- YouTube, Vimeo, or other URL sources.
- User attestation checkbox or login gate.
- Rate limiting or bot protection on the new endpoint (matches existing posture; deferred).
- Apify or any third-party resolver — direct call to Loom's endpoint per the brainstorming decision.
- Caching of resolved MP4 URLs across SOPs — every ingest fetches fresh.

## High-level architecture

```
[UploadZone] ──► POST /api/ingest/loom { url, defaultLanguage }
                      │
                      ▼
        validate URL → extract videoId
                      │
                      ▼
        sops.insertOne({ status: "ingesting",
                         sourceType: "loom",
                         sourceUrl, videoId,
                         videoR2Key, videoExpiresAt,
                         defaultLanguage, ... })
                      │
                      ▼
        tasks.trigger("ingest-loom", { sopId })
                      │
                      ▼
              ┌─────────────────────────────────────┐
              │  ingest-loom (Trigger.dev task)     │
              │  1. resolveLoomMp4(videoId)         │
              │  2. stream MP4 → R2 via @aws-sdk/   │
              │     lib-storage Upload (multipart)  │
              │  3. update sop.status="transcribing"│
              │  4. tasks.trigger("process-sop")    │
              └─────────────────────────────────────┘
                      │
                      ▼
              existing process-sop pipeline (unchanged)
```

A new SOP state `ingesting` is added between "created" and `transcribing`. No existing stage is modified.

## SOP state machine changes

Current `SopStatus` union (`src/lib/mongo.ts:16`):
`"uploading" | "transcribing" | "normalizing" | "analyzing" | "generating" | "clipping" | "done" | "failed"`

This change extends it with one new state:
`"uploading" | "ingesting" | "transcribing" | ... | "failed"`

`uploading` and `ingesting` are mutually exclusive — a SOP either came from a direct upload (commit transitions `uploading → transcribing`) or from a Loom URL (ingest task transitions `ingesting → transcribing`). They never coexist on a single SOP. Terminal failure state is `"failed"` with an `ErrorCode` (the existing convention; there is no `"error"` status).

A new `ErrorCode` value is added to the union in `src/lib/mongo.ts:20`:
- `"loom_ingest_failed"` — covers all resolver and download failures end-to-end.

The existing `"file_too_large"` is reused when the streamed download exceeds the 500 MB cap (consistent with the upload path).

## Components

### 1. URL parser — `src/lib/loom.ts`

Pure function with no I/O.

```ts
export function parseLoomUrl(input: string): { videoId: string } | null
```

Accepts (case-insensitive host, trailing slash and query string tolerated):
- `https://www.loom.com/share/<id>`
- `https://loom.com/share/<id>`
- `https://www.loom.com/embed/<id>`
- `https://www.loom.com/recording/<id>` (some legacy share links)

The Loom video ID is a hex-only string of typical length 32, e.g. `26a9c4b4f0e9456e8e0e9f5a3d8a7c2b`. To stay forgiving against future ID-length changes, the regex accepts `[a-f0-9]{16,64}`. Anything else returns `null`.

### 2. Resolver — `src/lib/loom.ts`

```ts
export type ResolveError =
  | "invalid_url"
  | "not_found"
  | "private_or_restricted"
  | "transcode_unavailable"
  | "http_error"
  | "timeout";

export type ResolveResult =
  | { ok: true; mp4Url: string }
  | { ok: false; error: ResolveError; httpStatus?: number };

export async function resolveLoomMp4(videoId: string): Promise<ResolveResult>
```

Implementation:
- `POST https://www.loom.com/api/campaigns/sessions/<videoId>/transcoded-url`
- Empty JSON body, headers:
  - `Content-Type: application/json`
  - `User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36` (pinned, kept in `src/lib/loom.ts` as a constant)
  - `Origin: https://www.loom.com`
  - `Referer: https://www.loom.com/share/<videoId>`
- 30 s timeout via `AbortSignal.timeout`.
- Map response:
  - `200` with `{ url: "https://cdn.loom.com/..." }` → `{ ok: true, mp4Url }`
  - `200` with empty body or no `url` field → `transcode_unavailable` (this is the HLS-only case we're not handling in v1)
  - `403`, `401` → `private_or_restricted`
  - `404` → `not_found`
  - other 4xx/5xx → `http_error` (with `httpStatus`)
  - `AbortError` → `timeout`

### 3. Streaming downloader — `src/lib/loom.ts`

```ts
export type StreamError = "size_exceeded" | "stalled" | "stream_error";

export type StreamResult =
  | { ok: true; bytes: number }
  | { ok: false; error: StreamError };

export async function streamLoomToR2(args: {
  mp4Url: string;
  r2Key: string;
}): Promise<StreamResult>
```

Uses `@aws-sdk/lib-storage` `Upload` with `Body` set to the response stream from `fetch(mp4Url)`. Multipart upload handles arbitrary sizes without buffering. ContentType `video/mp4`.

No fixed end-to-end fetch timeout (a 500 MB video on a slow link can run several minutes). Instead, two guards:
- **Initial-response timeout** — 30 s `AbortSignal.timeout` on the `fetch` call itself; this fails fast if the signed CloudFront URL has already expired.
- **Stall detector** — a watchdog that aborts the stream if no bytes are received for 60 s. Reset on every chunk. Total wall-time bounded by the task's `maxDuration` (see below).

Enforces the existing 500 MB cap (`config.limits.maxVideoSizeMB`):
- If `Content-Length` is present and exceeds the cap → abort before consuming the body, return `size_exceeded`.
- If absent → tracks streamed bytes; aborts the multipart upload and deletes the partial R2 object once the cap is crossed.

Returns `{ ok: true, bytes }` on success; `{ ok: false, error: "size_exceeded" | "stalled" | "stream_error" }` on failure. The function performs its own partial-object cleanup; the caller does not need to.

### 4. API route — `src/app/api/ingest/loom/route.ts`

```ts
POST /api/ingest/loom
Body: { url: string; defaultLanguage: "vi" | "en" }
```

- Validates body with zod (matches existing routes' style).
- Calls `parseLoomUrl(url)`. On `null`, returns `400 { error: "invalid_url" }`.
- Inserts SOP doc with `status: "ingesting"`, `sourceType: "loom"`, `sourceUrl`, `videoId`, `videoR2Key: videoKey(_id, "mp4")`, `videoExpiresAt`, plus the same defaults as `/api/upload/init`.
- Triggers `ingest-loom` task.
- Returns `{ sopId }`.

No presigned URL flow — the server is the only thing that can fetch from Loom.

### 5. Trigger.dev task — `src/trigger/ingestLoom.ts`

```ts
export const ingestLoom = task({
  id: "ingest-loom",
  maxDuration: 60 * 15,            // 15 min, same ceiling as process-sop
  run: async ({ sopId }) => { ... }
});
```

Steps (designed for safe retry — Trigger.dev may rerun the task after partial progress):

1. Load SOP doc by `_id`. If not found, log and return.
2. **Branch on current status:**
   - `"ingesting"` → run resolve+stream below.
   - `"transcribing"` and an R2 object already exists at `videoR2Key` → resume by re-triggering `process-sop` (step 7) only. Skip resolve and stream.
   - any other status → log and return (already terminal or in-flight elsewhere).
3. `resolveLoomMp4(videoId)`. On error: emit `events { type: "loom_ingest_error", sopId, errorCode, httpStatus? }`, mark SOP failed via `setFailed(_id, "loom_ingest_failed")`, return.
4. `streamLoomToR2({ mp4Url, r2Key })`.
5. On `size_exceeded` → emit `events { type: "loom_ingest_error", errorCode: "size_exceeded" }`, set `sop.errorCode = "file_too_large"`, status `"failed"`, return. On `stalled` / `stream_error` → emit error event, mark `"loom_ingest_failed"`.
6. Update SOP: `status = "transcribing"`, `videoSizeBytes = bytes`.
7. `tasks.trigger("process-sop", { sopId }, { idempotencyKey: ` + "`${sopId}-process-sop`" + ` })`.

Triggering with an `idempotencyKey` makes the resume path safe — a duplicate trigger after step 6 will dedupe at Trigger.dev rather than running the pipeline twice.

Registered alongside existing tasks via the same `trigger.config.ts`.

### 6. UploadZone changes — `src/components/UploadZone.tsx`

The URL input becomes active. UX:

- Component state uses a discriminated union for the input source so two-way disabling is unambiguous:
  ```ts
  type Source =
    | { kind: "none" }
    | { kind: "file"; file: File }
    | { kind: "url"; url: string };
  ```
  Picking a file replaces `source` with `{ kind: "file", ... }`; typing in the URL field replaces it with `{ kind: "url", ... }`. The opposite input is disabled when `kind` is set; clearing returns to `"none"`.
- Inline disclaimer text under the URL input: `Chỉ dán liên kết Loom công khai bạn có quyền sử dụng.` (matches the option B copy from brainstorming.)
- On submit with `kind: "url"`:
  1. Run `parseLoomUrl` client-side; show inline error and stop on `null`.
  2. `POST /api/ingest/loom { url, defaultLanguage }` → `{ sopId }`.
  3. `router.push("/processing/" + sopId)`.
  No XHR upload progress UI on this branch — the response returns in milliseconds.
- The existing file submit path is unchanged. Both branches converge on `router.push("/processing/" + sopId)`.
- The placeholder updates from `https://youtube.com/watch?v=...` to `https://www.loom.com/share/...`.

### 7. Processing page — `src/app/processing/[id]/page.tsx`

Adds an `ingesting` label to the existing status copy map. Vietnamese: `"Đang tải video từ Loom…"`. English (if rendered): `"Downloading from Loom…"`.

The existing status polling needs no changes — it already renders whatever string the SOP doc carries.

## Schema additions

### `SopDoc` (`src/lib/mongo.ts:53`) — new optional fields

| Field            | Type                          | Notes                                                         |
|------------------|-------------------------------|---------------------------------------------------------------|
| `sourceType`     | `"upload" \| "loom"`          | Set on creation. Existing rows treated as `"upload"` by absence. |
| `sourceUrl`      | `string \| undefined`         | Original Loom share URL when `sourceType === "loom"`.         |
| `videoId`        | `string \| undefined`         | Loom video ID when `sourceType === "loom"`.                   |
| `videoSizeBytes` | `number \| undefined`         | Recorded after successful R2 stream.                          |

### `SopStatus` (`src/lib/mongo.ts:16`) — new value

Add `"ingesting"`. The status appears between insert and the existing `"transcribing"` for SOPs created via Loom URL.

### `ErrorCode` (`src/lib/mongo.ts:20`) — new value

Add `"loom_ingest_failed"`. The existing `"file_too_large"` is reused for size cap violations.

### `EventDoc` (`src/lib/mongo.ts:75`) — extended

The `type` union widens to include `"loom_ingest_error"`, and two new optional fields are added so the same record can carry diagnostic detail:

```ts
export interface EventDoc {
  _id: ObjectId;
  type: "upload" | "sop_completed" | "share_view" | "loom_ingest_error";
  sopId: ObjectId | null;
  errorCode?: string;     // resolver / stream error code (free-form, internal)
  httpStatus?: number;    // when the upstream HTTP call returned a status
  createdAt: Date;
}
```

The two new fields are optional, so existing event documents remain valid and existing reads (e.g. admin stats) ignore them.

No migration. Old SOPs without `sourceType` continue to work; admin/queries treat absent `sourceType` as `"upload"`.

## Configuration

No new env vars. Loom endpoint is hardcoded in `src/lib/loom.ts`. The 500 MB cap stays in `src/config/index.ts` and is shared with direct uploads.

## Error handling

User-facing copy for any resolver failure (mapped from `ResolveError`):

> Không thể tải video Loom. Hãy đảm bảo liên kết đã đặt **Anyone with the link can view** rồi thử lại.

The `events` log retains the structured error code and HTTP status for diagnosis. The user-facing message stays generic to avoid leaking implementation details and to keep error UI simple in v1.

If `streamLoomToR2` fails mid-download (network drop, signed URL expired, stall, size cap), the partial R2 object is deleted (best-effort by the streamer itself) and the SOP transitions to `failed` with the appropriate `ErrorCode`.

### Stuck-`ingesting` watchdog

The existing `cleanupVideos` schedule (`src/trigger/cleanupVideos.ts`) runs daily at 03:00 UTC. It is extended with a third sweep:

```ts
const stuckBefore = new Date(now.getTime() - 30 * 60 * 1000); // 30 min
const stuck = await col.find({
  status: "ingesting",
  createdAt: { $lt: stuckBefore },
}).toArray();
for (const d of stuck) {
  if (d.videoR2Key) {
    try { await deleteObject(d.videoR2Key); } catch { /* may not exist */ }
  }
  await col.updateOne(
    { _id: d._id, status: "ingesting" },
    { $set: { status: "failed", errorCode: "loom_ingest_failed", videoR2Key: null, updatedAt: now } }
  );
}
```

The `{ status: "ingesting" }` predicate on the update guards against a race where the task completes between the `find` and the `update`. Daily cadence is sufficient — this is a safety net, not a primary mechanism. The 30-minute threshold is comfortably longer than the 15-minute task `maxDuration`.

The existing video-retention sweep already handles ingested SOPs the same as uploaded ones (filters on `videoR2Key: { $ne: null }`), so no additional change there.

## Testing

Following the existing convention (`*.test.ts` colocated next to stage files, run by Node's built-in test runner per other tests in the repo):

1. **`src/lib/loom.test.ts`** — `parseLoomUrl`:
   - Accepts share / embed / recording URLs with and without `www.`, with trailing slash, with query strings.
   - Rejects malformed input, non-Loom hosts, IDs of wrong length/charset.
2. **`src/lib/loom.test.ts`** — `resolveLoomMp4`:
   - Mocks `fetch`. Verifies request URL, method, headers (`Origin`, `Referer`).
   - Maps each response shape to the right `ResolveResult`.
   - 30 s timeout returns `timeout`.
3. **`src/lib/loom.test.ts`** — `streamLoomToR2`:
   - Mocks `fetch` + `@aws-sdk/lib-storage` `Upload`.
   - Aborts when `Content-Length` exceeds the cap.
   - Aborts when streamed bytes exceed the cap with no `Content-Length`.
4. **`src/trigger/ingestLoom.test.ts`** — task:
   - On resolver error: writes the event, sets SOP error, does not trigger `process-sop`.
   - On success: updates SOP to `transcribing`, triggers `process-sop` with the sopId.

UI changes are smoke-tested manually (the project has no component test setup).

## Rollout plan

1. Land the worktree branch on `feature/loom-url-ingest`. Do **not** merge to main per user instruction.
2. Manual end-to-end check using a personal public Loom share link.
3. Deploy preview, validate `/processing` UI shows the new `ingesting` state.
4. After ~1 week of real traffic, query `events.loom_ingest_error` aggregated by `errorCode` to decide whether to invest in the HLS/`.m3u8` fallback (the loop-back point on the C choice from brainstorming).

## Concurrency & dedupe

No per-user dedupe in v1. A user pasting the same Loom URL twice creates two SOPs and downloads the MP4 twice. This is consistent with the existing upload flow (which also doesn't dedupe identical files) and avoids the complexity of fingerprinting incomplete records. Revisit if abuse appears in logs.

## Invariants

- `process-sop` is never triggered for a SOP whose `videoR2Key` does not point at an existing object. The ingest task only triggers `process-sop` after `streamLoomToR2` returns success.
- A SOP in status `"ingesting"` always has `videoR2Key` populated (allocated at insert time) but the R2 object may not exist yet.
- Triggering `process-sop` is idempotent at the Trigger.dev layer via `idempotencyKey: ${sopId}-process-sop`.

## Open questions

None blocking. Resolved during brainstorming:
- Failure-mode strategy: strict + structured logs (option C).
- Download architecture: dedicated Trigger.dev task (option B).
- Attestation: inline disclaimer text only (option B).
- Source: direct Loom endpoint, not Apify or other third party.
