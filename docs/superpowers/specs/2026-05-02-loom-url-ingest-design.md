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

Current: `uploading → transcribing → ... → ready | error`

After: `uploading | ingesting → transcribing → ... → ready | error`

Only one new state. `uploading` and `ingesting` are mutually exclusive — a SOP either came from a direct upload (commit step transitions `uploading → transcribing`) or from a Loom URL (ingest task transitions `ingesting → transcribing`). They never coexist on a single SOP.

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

The video ID is a 32-character lowercase hex string. Anything else returns `null`.

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
- Empty JSON body, headers: `Content-Type: application/json`, browser-like `User-Agent`, `Origin: https://www.loom.com`, `Referer: https://www.loom.com/share/<videoId>`.
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
export async function streamLoomToR2(args: {
  mp4Url: string;
  r2Key: string;
}): Promise<{ bytes: number }>
```

Uses `@aws-sdk/lib-storage` `Upload` with `Body` set to the response stream from `fetch(mp4Url)`. Multipart upload handles arbitrary sizes without buffering. ContentType `video/mp4`. 5 minute timeout on the initial fetch (CloudFront URLs are signed and short-lived; fail fast if they expire).

Enforces the existing 500 MB cap (`config.limits.maxVideoSizeMB`): reads `Content-Length` if present and aborts pre-download when exceeded; if absent, the upload aborts at the limit and the partial object is deleted.

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
  maxDuration: 600,
  run: async ({ sopId }) => { ... }
});
```

Steps:
1. Load SOP doc; expect `status: "ingesting"`. If not, exit (idempotency).
2. `resolveLoomMp4(videoId)`. On error: write `events { type: "loom_ingest_error", sopId, errorCode, httpStatus }`, set `sop.status = "error"` and `sop.errorCode = "loom_ingest_failed"`, return.
3. `streamLoomToR2({ mp4Url, r2Key })`.
4. On size-exceeded: write `events { type: "loom_ingest_error", errorCode: "size_exceeded" }`, set `sop.status = "error"`, `sop.errorCode = "file_too_large"`, return.
5. Update SOP: `status = "transcribing"`, `videoSizeBytes`.
6. `tasks.trigger("process-sop", { sopId })`.

Registered alongside existing tasks via the same `trigger.config.ts`.

### 6. UploadZone changes — `src/components/UploadZone.tsx`

The URL input becomes active. UX:

- A single submit pathway. State holds either `file: File` or `loomUrl: string` (mutually exclusive — picking a file disables the URL field, typing a URL disables the file picker until cleared).
- Inline disclaimer text under the URL input: `Chỉ dán liên kết Loom công khai bạn có quyền sử dụng.` (matches the option B copy from brainstorming.)
- On submit with a Loom URL: `POST /api/ingest/loom`, then `router.push("/processing/<sopId>")`. No XHR upload progress — the response is immediate.
- The submit button enables when *either* a valid file is picked or the URL field contains a string that `parseLoomUrl` accepts (we run the same regex client-side for cheap validation).
- The placeholder updates from `https://youtube.com/watch?v=...` to `https://www.loom.com/share/...`.

### 7. Processing page — `src/app/processing/[id]/page.tsx`

Adds an `ingesting` label to the existing status copy map. Vietnamese: `"Đang tải video từ Loom…"`. English (if rendered): `"Downloading from Loom…"`.

The existing status polling needs no changes — it already renders whatever string the SOP doc carries.

## Schema additions

`sops` collection — new optional fields:

| Field          | Type                          | Notes                                          |
|----------------|-------------------------------|------------------------------------------------|
| `sourceType`   | `"upload" \| "loom"`          | Set on creation. Existing rows treated as `"upload"` by absence. |
| `sourceUrl`    | `string \| undefined`         | Original Loom share URL when `sourceType === "loom"`. |
| `videoId`      | `string \| undefined`         | Loom video ID when `sourceType === "loom"`.    |
| `videoSizeBytes` | `number \| undefined`       | Recorded after successful R2 stream.           |

`events` collection gains a new `type` value: `"loom_ingest_error"` with `errorCode` and optional `httpStatus`. Document shape stays compatible with existing event records.

No migration. Old SOPs without `sourceType` continue to work; admin/queries treat absent `sourceType` as `"upload"`.

## Configuration

No new env vars. Loom endpoint is hardcoded in `src/lib/loom.ts`. The 500 MB cap stays in `src/config/index.ts` and is shared with direct uploads.

## Error handling

User-facing copy for any resolver failure (mapped from `ResolveError`):

> Không thể tải video Loom. Hãy đảm bảo liên kết đã đặt **Anyone with the link can view** rồi thử lại.

The `events` log retains the structured error code and HTTP status for diagnosis. The user-facing message stays generic to avoid leaking implementation details and to keep error UI simple in v1.

If `streamLoomToR2` fails mid-download (network drop, signed URL expired), the partial R2 object is deleted (best-effort) and the SOP transitions to `error` with `errorCode = "loom_ingest_failed"`.

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

## Open questions

None blocking. Resolved during brainstorming:
- Failure-mode strategy: strict + structured logs (option C).
- Download architecture: dedicated Trigger.dev task (option B).
- Attestation: inline disclaimer text only (option B).
- Source: direct Loom endpoint, not Apify or other third party.
