# Loom URL Ingest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users paste a public Loom share URL on the upload page; the server resolves the MP4 via Loom's `transcoded-url` endpoint, streams it into R2, and triggers the existing `process-sop` pipeline unchanged.

**Architecture:** New `POST /api/ingest/loom` route inserts a SOP doc in status `"ingesting"` and fires a new Trigger.dev task `ingest-loom`. The task resolves the MP4 URL, streams it to R2 via `@aws-sdk/lib-storage`, then `tasks.trigger("process-sop", ...)` with an idempotency key. Cleanup is handled by extending the existing `cleanupVideos` schedule with a stuck-`ingesting` watchdog.

**Tech Stack:** Next.js 16 App Router, `@trigger.dev/sdk/v3` (matches existing repo imports), MongoDB driver, AWS SDK v3 + `@aws-sdk/lib-storage` (new dep), zod, Node built-in test runner via `tsx --test`.

**Note on `inputMode`:** `SopDoc.inputMode` (`"speech" | "silent"`) is set later by `process-sop` after probing the audio. Loom-ingested SOPs do not pre-set it on insert, identical to the direct-upload path in `/api/upload/init`.

**Spec:** `docs/superpowers/specs/2026-05-02-loom-url-ingest-design.md`

**Worktree:** `.worktrees/loom-url-ingest` on branch `feature/loom-url-ingest`. Do NOT merge to main.

**Test command (used throughout):** `npx tsx --test <test-file>`

**Typecheck command (used throughout):** `npx tsc --noEmit`

---

## File map

| Path | Action | Purpose |
|---|---|---|
| `src/lib/mongo.ts` | Modify | Extend `SopStatus`, `ErrorCode`, `EventDoc`; add Loom-source fields to `SopDoc`. |
| `src/lib/loom.ts` | Create | URL parser, resolver, streamer. |
| `src/lib/loom.test.ts` | Create | Unit tests (parser, resolver fetch-mocked, streamer fetch+upload-mocked). |
| `src/trigger/ingestLoom.ts` | Create | Trigger.dev `ingest-loom` task. |
| `src/trigger/ingestLoom.test.ts` | Create | Unit tests for task body (refactored to allow injection). |
| `src/app/api/ingest/loom/route.ts` | Create | `POST` handler: validate, insert SOP, trigger task. |
| `src/components/UploadZone.tsx` | Modify | Discriminated `Source` state, enabled URL field, Loom submit branch. |
| `src/app/processing/[id]/page.tsx` | Modify | Add `"ingesting"` to `Status` and `STATUS_STEP_INDEX`; copy. |
| `src/trigger/cleanupVideos.ts` | Modify | Add stuck-`ingesting` watchdog sweep. |
| `package.json` | Modify | Add `@aws-sdk/lib-storage` dependency. |

---

## Task 1: Extend `mongo.ts` types

**Files:**
- Modify: `src/lib/mongo.ts`

- [ ] **Step 1: Read the current file**

Run: `cat src/lib/mongo.ts`

Expected output: contents shown in spec lines 16-80. Confirm `SopStatus`, `ErrorCode`, `SopDoc`, `EventDoc` match the spec's "before" assumptions.

- [ ] **Step 2: Extend `SopStatus`**

In `src/lib/mongo.ts`, replace:
```ts
export type SopStatus =
  | "uploading" | "transcribing" | "normalizing" | "analyzing"
  | "generating" | "clipping" | "done" | "failed";
```
with:
```ts
export type SopStatus =
  | "uploading" | "ingesting" | "transcribing" | "normalizing" | "analyzing"
  | "generating" | "clipping" | "done" | "failed";
```

- [ ] **Step 3: Extend `ErrorCode`**

In `src/lib/mongo.ts`, add `"loom_ingest_failed"` to the `ErrorCode` union, after `"video_download_failed"`:
```ts
export type ErrorCode =
  | null
  | "video_too_short" | "video_too_long" | "unsupported_format"
  | "file_too_large" | "transcription_failed"
  | "generation_failed" | "clipping_failed"
  | "visual_context_failed" | "visual_extract_failed"
  | "frame_sampling_failed" | "video_download_failed"
  | "loom_ingest_failed"
  | "unknown";
```

- [ ] **Step 4: Add Loom-source fields to `SopDoc`**

In `src/lib/mongo.ts`, inside `interface SopDoc`, after `defaultLanguage?: string;` add:
```ts
  sourceType?: "upload" | "loom";   // absent ⇒ "upload" (legacy rows)
  sourceUrl?: string;               // original Loom share URL (sourceType === "loom")
  videoId?: string;                 // Loom video ID (sourceType === "loom")
  videoSizeBytes?: number;          // recorded after successful R2 stream
```

- [ ] **Step 5: Extend `EventDoc`**

In `src/lib/mongo.ts`, replace the `EventDoc` interface with:
```ts
export interface EventDoc {
  _id: ObjectId;
  type: "upload" | "sop_completed" | "share_view" | "loom_ingest_error";
  sopId: ObjectId | null;
  // Diagnostic fields used by "loom_ingest_error" only. Free-form on purpose:
  // the SopDoc.errorCode union is strict; this field is just for logs.
  errorCode?: string;
  httpStatus?: number;
  createdAt: Date;
}
```

- [ ] **Step 6: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no output (pass).

- [ ] **Step 7: Commit**

```bash
git add src/lib/mongo.ts
git commit -m "feat(mongo): extend SopStatus/ErrorCode/SopDoc/EventDoc for Loom ingest

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 2: URL parser

**Files:**
- Create: `src/lib/loom.ts`
- Create: `src/lib/loom.test.ts`

- [ ] **Step 1: Create the test file with parser tests**

Write `src/lib/loom.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert";
import { parseLoomUrl } from "./loom";

test("parseLoomUrl accepts canonical share URL", () => {
  const r = parseLoomUrl("https://www.loom.com/share/26a9c4b4f0e9456e8e0e9f5a3d8a7c2b");
  assert.deepEqual(r, { videoId: "26a9c4b4f0e9456e8e0e9f5a3d8a7c2b" });
});

test("parseLoomUrl accepts URL without www", () => {
  const r = parseLoomUrl("https://loom.com/share/abcdef0123456789abcdef0123456789");
  assert.deepEqual(r, { videoId: "abcdef0123456789abcdef0123456789" });
});

test("parseLoomUrl accepts embed URL", () => {
  const r = parseLoomUrl("https://www.loom.com/embed/abcdef0123456789abcdef0123456789");
  assert.deepEqual(r, { videoId: "abcdef0123456789abcdef0123456789" });
});

test("parseLoomUrl accepts recording URL", () => {
  const r = parseLoomUrl("https://www.loom.com/recording/abcdef0123456789abcdef0123456789");
  assert.deepEqual(r, { videoId: "abcdef0123456789abcdef0123456789" });
});

test("parseLoomUrl tolerates trailing slash and query string", () => {
  const r = parseLoomUrl("https://www.loom.com/share/abcdef0123456789abcdef0123456789/?t=10");
  assert.deepEqual(r, { videoId: "abcdef0123456789abcdef0123456789" });
});

test("parseLoomUrl is case-insensitive on host", () => {
  const r = parseLoomUrl("https://WWW.LOOM.COM/share/abcdef0123456789abcdef0123456789");
  assert.deepEqual(r, { videoId: "abcdef0123456789abcdef0123456789" });
});

test("parseLoomUrl trims surrounding whitespace", () => {
  const r = parseLoomUrl("  https://www.loom.com/share/abcdef0123456789abcdef0123456789  ");
  assert.deepEqual(r, { videoId: "abcdef0123456789abcdef0123456789" });
});

test("parseLoomUrl rejects non-Loom host", () => {
  assert.equal(parseLoomUrl("https://www.youtube.com/watch?v=abcd"), null);
});

test("parseLoomUrl rejects unknown path", () => {
  assert.equal(parseLoomUrl("https://www.loom.com/something/abcdef0123456789abcdef0123456789"), null);
});

test("parseLoomUrl rejects bad ID (too short)", () => {
  assert.equal(parseLoomUrl("https://www.loom.com/share/abcdef"), null);
});

test("parseLoomUrl rejects bad ID (non-hex)", () => {
  assert.equal(parseLoomUrl("https://www.loom.com/share/zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz"), null);
});

test("parseLoomUrl rejects empty / garbage", () => {
  assert.equal(parseLoomUrl(""), null);
  assert.equal(parseLoomUrl("not a url"), null);
});
```

- [ ] **Step 2: Run test, expect failure (file does not exist)**

Run: `npx tsx --test src/lib/loom.test.ts`
Expected: failure — `Cannot find module './loom'`.

- [ ] **Step 3: Create `src/lib/loom.ts` with parser**

Write `src/lib/loom.ts`:
```ts
const ID_RE = /^[a-f0-9]{16,64}$/;
const ALLOWED_PATHS = new Set(["share", "embed", "recording"]);

export function parseLoomUrl(input: string): { videoId: string } | null {
  if (!input) return null;
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  if (host !== "loom.com" && host !== "www.loom.com") return null;

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  const [section, id] = parts;
  if (!ALLOWED_PATHS.has(section)) return null;
  const lower = id.toLowerCase();
  if (!ID_RE.test(lower)) return null;
  return { videoId: lower };
}
```

- [ ] **Step 4: Run tests, expect all parser tests pass**

Run: `npx tsx --test src/lib/loom.test.ts`
Expected: all 12 parser tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/loom.ts src/lib/loom.test.ts
git commit -m "feat(loom): URL parser for share/embed/recording links

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 3: MP4 resolver

**Files:**
- Modify: `src/lib/loom.ts`
- Modify: `src/lib/loom.test.ts`

- [ ] **Step 1: Append resolver tests**

Append to `src/lib/loom.test.ts`:
```ts
import { resolveLoomMp4, LOOM_USER_AGENT } from "./loom";

function withMockedFetch(impl: typeof fetch, fn: () => Promise<void>) {
  const original = global.fetch;
  global.fetch = impl as typeof fetch;
  return fn().finally(() => { global.fetch = original; });
}

test("resolveLoomMp4 returns mp4Url on 200 + url field", async () => {
  await withMockedFetch(async (input, init) => {
    assert.equal(String(input), "https://www.loom.com/api/campaigns/sessions/abcdef0123456789abcdef0123456789/transcoded-url");
    assert.equal((init as RequestInit).method, "POST");
    const headers = new Headers((init as RequestInit).headers);
    assert.equal(headers.get("user-agent"), LOOM_USER_AGENT);
    assert.equal(headers.get("origin"), "https://www.loom.com");
    assert.equal(headers.get("referer"), "https://www.loom.com/share/abcdef0123456789abcdef0123456789");
    return new Response(JSON.stringify({ url: "https://cdn.loom.com/foo.mp4" }), { status: 200 });
  }, async () => {
    const r = await resolveLoomMp4("abcdef0123456789abcdef0123456789");
    assert.deepEqual(r, { ok: true, mp4Url: "https://cdn.loom.com/foo.mp4" });
  });
});

test("resolveLoomMp4 returns transcode_unavailable on empty body", async () => {
  await withMockedFetch(async () => new Response("", { status: 200 }), async () => {
    const r = await resolveLoomMp4("abcdef0123456789abcdef0123456789");
    assert.deepEqual(r, { ok: false, error: "transcode_unavailable" });
  });
});

test("resolveLoomMp4 returns transcode_unavailable on 200 without url field", async () => {
  await withMockedFetch(async () => new Response(JSON.stringify({}), { status: 200 }), async () => {
    const r = await resolveLoomMp4("abcdef0123456789abcdef0123456789");
    assert.deepEqual(r, { ok: false, error: "transcode_unavailable" });
  });
});

test("resolveLoomMp4 maps 404 to not_found", async () => {
  await withMockedFetch(async () => new Response("", { status: 404 }), async () => {
    const r = await resolveLoomMp4("abcdef0123456789abcdef0123456789");
    assert.deepEqual(r, { ok: false, error: "not_found", httpStatus: 404 });
  });
});

test("resolveLoomMp4 maps 401/403 to private_or_restricted", async () => {
  for (const status of [401, 403]) {
    await withMockedFetch(async () => new Response("", { status }), async () => {
      const r = await resolveLoomMp4("abcdef0123456789abcdef0123456789");
      assert.deepEqual(r, { ok: false, error: "private_or_restricted", httpStatus: status });
    });
  }
});

test("resolveLoomMp4 maps other 5xx to http_error", async () => {
  await withMockedFetch(async () => new Response("", { status: 502 }), async () => {
    const r = await resolveLoomMp4("abcdef0123456789abcdef0123456789");
    assert.deepEqual(r, { ok: false, error: "http_error", httpStatus: 502 });
  });
});

test("resolveLoomMp4 maps AbortError to timeout", async () => {
  await withMockedFetch(async () => { throw new DOMException("aborted", "AbortError"); }, async () => {
    const r = await resolveLoomMp4("abcdef0123456789abcdef0123456789");
    assert.deepEqual(r, { ok: false, error: "timeout" });
  });
});

test("resolveLoomMp4 maps TimeoutError to timeout", async () => {
  // AbortSignal.timeout in modern Node throws DOMException("...", "TimeoutError"),
  // not "AbortError". Both must map to the same outcome.
  await withMockedFetch(async () => { throw new DOMException("timed out", "TimeoutError"); }, async () => {
    const r = await resolveLoomMp4("abcdef0123456789abcdef0123456789");
    assert.deepEqual(r, { ok: false, error: "timeout" });
  });
});
```

- [ ] **Step 2: Run tests, expect failure (`resolveLoomMp4` not exported)**

Run: `npx tsx --test src/lib/loom.test.ts`
Expected: failure — `'resolveLoomMp4' is not exported`.

- [ ] **Step 3: Add resolver to `src/lib/loom.ts`**

Append to `src/lib/loom.ts`:
```ts
export const LOOM_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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

export async function resolveLoomMp4(videoId: string): Promise<ResolveResult> {
  const endpoint = `https://www.loom.com/api/campaigns/sessions/${videoId}/transcoded-url`;
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": LOOM_USER_AGENT,
        "Origin": "https://www.loom.com",
        "Referer": `https://www.loom.com/share/${videoId}`,
      },
      body: "",
      signal: AbortSignal.timeout(30_000),
    });
  } catch (e) {
    const name = (e as { name?: string } | null)?.name;
    if (name === "AbortError" || name === "TimeoutError") {
      return { ok: false, error: "timeout" };
    }
    return { ok: false, error: "http_error" };
  }

  if (res.status === 401 || res.status === 403) {
    return { ok: false, error: "private_or_restricted", httpStatus: res.status };
  }
  if (res.status === 404) {
    return { ok: false, error: "not_found", httpStatus: res.status };
  }
  if (res.status >= 400) {
    return { ok: false, error: "http_error", httpStatus: res.status };
  }

  const text = await res.text();
  if (!text.trim()) return { ok: false, error: "transcode_unavailable" };
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { ok: false, error: "transcode_unavailable" }; }
  const url = (parsed as { url?: unknown })?.url;
  if (typeof url !== "string" || !url.startsWith("https://")) {
    return { ok: false, error: "transcode_unavailable" };
  }
  return { ok: true, mp4Url: url };
}
```

- [ ] **Step 4: Run tests**

Run: `npx tsx --test src/lib/loom.test.ts`
Expected: all parser + resolver tests pass.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/lib/loom.ts src/lib/loom.test.ts
git commit -m "feat(loom): resolveLoomMp4 via undocumented transcoded-url endpoint

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: R2 streaming downloader

**Files:**
- Modify: `package.json`
- Modify: `src/lib/loom.ts`
- Modify: `src/lib/loom.test.ts`

- [ ] **Step 1: Install `@aws-sdk/lib-storage`**

Run: `npm install @aws-sdk/lib-storage`
Expected: package added; `package.json` and `package-lock.json` updated.

- [ ] **Step 2: Append streamer tests**

Append to `src/lib/loom.test.ts`:
```ts
import { streamLoomToR2 } from "./loom";

const VALID_KEY = "videos/test/abc.mp4";

test("streamLoomToR2 rejects pre-download when Content-Length exceeds cap", async () => {
  const oversize = String(600 * 1024 * 1024);
  await withMockedFetch(async () =>
    new Response("", { status: 200, headers: { "Content-Length": oversize, "Content-Type": "video/mp4" } }),
    async () => {
      const r = await streamLoomToR2({ mp4Url: "https://cdn.loom.com/x.mp4", r2Key: VALID_KEY });
      assert.deepEqual(r, { ok: false, error: "size_exceeded" });
    });
});

test("streamLoomToR2 maps fetch failure to stream_error", async () => {
  await withMockedFetch(async () => { throw new Error("net"); }, async () => {
    const r = await streamLoomToR2({ mp4Url: "https://cdn.loom.com/x.mp4", r2Key: VALID_KEY });
    assert.deepEqual(r, { ok: false, error: "stream_error" });
  });
});

test("streamLoomToR2 maps non-2xx fetch to stream_error", async () => {
  await withMockedFetch(async () => new Response("", { status: 500 }), async () => {
    const r = await streamLoomToR2({ mp4Url: "https://cdn.loom.com/x.mp4", r2Key: VALID_KEY });
    assert.deepEqual(r, { ok: false, error: "stream_error" });
  });
});

test("streamLoomToR2 enforces cap when Content-Length is missing (streamed bytes overflow)", async () => {
  // No Content-Length header → cap is enforced via running byte counter.
  // Body emits one giant chunk that exceeds the 500MB cap.
  const cap = 500 * 1024 * 1024;
  await withMockedFetch(async () => {
    const big = new Uint8Array(cap + 1024);
    return new Response(big, { status: 200, headers: { "Content-Type": "video/mp4" } });
  }, async () => {
    const r = await streamLoomToR2({ mp4Url: "https://cdn.loom.com/x.mp4", r2Key: VALID_KEY });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, "size_exceeded");
  });
});
```

The full happy-path streaming test (which would require mocking `@aws-sdk/lib-storage`'s `Upload` class) is intentionally deferred to manual end-to-end testing in Task 10 — over-mocking the AWS SDK provides little signal.

- [ ] **Step 3: Run tests, expect failure (`streamLoomToR2` not exported)**

Run: `npx tsx --test src/lib/loom.test.ts`
Expected: failure — symbol not exported.

- [ ] **Step 4: Implement `streamLoomToR2` in `src/lib/loom.ts`**

Append to `src/lib/loom.ts`:
```ts
import { Upload } from "@aws-sdk/lib-storage";
import { Readable } from "node:stream";
import { r2, R2_BUCKET, deleteObject } from "@/lib/r2";
import { config } from "@/config";

export type StreamError = "size_exceeded" | "stalled" | "stream_error";

export type StreamResult =
  | { ok: true; bytes: number }
  | { ok: false; error: StreamError };

const STALL_MS = 60_000;

export async function streamLoomToR2(args: {
  mp4Url: string;
  r2Key: string;
}): Promise<StreamResult> {
  const cap = config.limits.maxVideoSizeMB * 1024 * 1024;

  let res: Response;
  try {
    res = await fetch(args.mp4Url, { signal: AbortSignal.timeout(30_000) });
  } catch {
    return { ok: false, error: "stream_error" };
  }
  if (!res.ok || !res.body) return { ok: false, error: "stream_error" };

  const cl = res.headers.get("content-length");
  if (cl && Number(cl) > cap) return { ok: false, error: "size_exceeded" };

  // Wrap the WHATWG body stream as a Node Readable so lib-storage Upload accepts it.
  // Track bytes for cap enforcement and last-progress for stall detection.
  let bytes = 0;
  let lastChunkAt = Date.now();
  let stallTimer: NodeJS.Timeout | null = null;
  const ac = new AbortController();
  let outcome: StreamError | null = null;

  const monitored = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = (res.body as ReadableStream<Uint8Array>).getReader();
      stallTimer = setInterval(() => {
        if (Date.now() - lastChunkAt > STALL_MS) {
          outcome = "stalled";
          ac.abort();
          controller.error(new Error("stall"));
        }
      }, 5_000);
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          if (!value) continue;
          bytes += value.byteLength;
          lastChunkAt = Date.now();
          if (bytes > cap) {
            outcome = "size_exceeded";
            ac.abort();
            controller.error(new Error("cap"));
            return;
          }
          controller.enqueue(value);
        }
        controller.close();
      } catch (e) {
        if (!outcome) outcome = "stream_error";
        controller.error(e);
      } finally {
        if (stallTimer) clearInterval(stallTimer);
      }
    },
  });

  const nodeBody = Readable.fromWeb(monitored as never);

  try {
    const upload = new Upload({
      client: r2,
      params: {
        Bucket: R2_BUCKET,
        Key: args.r2Key,
        Body: nodeBody,
        ContentType: "video/mp4",
      },
    });
    await upload.done();
  } catch {
    // Best-effort cleanup of any partial multipart bytes left in R2.
    try { await deleteObject(args.r2Key); } catch { /* swallow */ }
    return { ok: false, error: outcome ?? "stream_error" };
  }

  return { ok: true, bytes };
}
```

- [ ] **Step 5: Run tests**

Run: `npx tsx --test src/lib/loom.test.ts`
Expected: all parser + resolver + streamer tests pass.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/lib/loom.ts src/lib/loom.test.ts
git commit -m "feat(loom): streamLoomToR2 multipart upload with cap + stall detector

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 5: Trigger.dev `ingest-loom` task

**Files:**
- Create: `src/trigger/ingestLoom.ts`
- Create: `src/trigger/ingestLoom.test.ts`

- [ ] **Step 1: Create the test file**

Write `src/trigger/ingestLoom.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert";
import { decideIngest, mapStreamErrorToCode } from "./ingestLoom";

test("decideIngest: ingesting → run", () => {
  assert.deepEqual(decideIngest("ingesting", true), { action: "run" });
  assert.deepEqual(decideIngest("ingesting", false), { action: "run" });
});

test("decideIngest: transcribing + r2 present → resume (re-trigger only)", () => {
  assert.deepEqual(decideIngest("transcribing", true), { action: "resume" });
});

test("decideIngest: transcribing + no r2 → noop (something is wrong, leave it)", () => {
  assert.deepEqual(decideIngest("transcribing", false), { action: "noop" });
});

test("decideIngest: any other status → noop", () => {
  for (const s of ["uploading", "normalizing", "analyzing", "generating", "clipping", "done", "failed"] as const) {
    assert.deepEqual(decideIngest(s, true), { action: "noop" });
  }
});

test("mapStreamErrorToCode: size_exceeded → file_too_large", () => {
  assert.equal(mapStreamErrorToCode("size_exceeded"), "file_too_large");
});

test("mapStreamErrorToCode: other stream errors → loom_ingest_failed", () => {
  assert.equal(mapStreamErrorToCode("stalled"), "loom_ingest_failed");
  assert.equal(mapStreamErrorToCode("stream_error"), "loom_ingest_failed");
});
```

- [ ] **Step 2: Run test, expect failure**

Run: `npx tsx --test src/trigger/ingestLoom.test.ts`
Expected: failure — module not found.

- [ ] **Step 3: Create `src/trigger/ingestLoom.ts`**

Write `src/trigger/ingestLoom.ts`:
```ts
import { task, tasks, logger } from "@trigger.dev/sdk/v3";
import { ObjectId } from "mongodb";
import { sops, events, type SopStatus, type ErrorCode } from "@/lib/mongo";
import { resolveLoomMp4, streamLoomToR2, type StreamError } from "@/lib/loom";

export type Decision =
  | { action: "run" }
  | { action: "resume" }
  | { action: "noop" };

// Pure decision logic — testable without DB.
export function decideIngest(status: SopStatus, hasR2Object: boolean): Decision {
  if (status === "ingesting") return { action: "run" };
  if (status === "transcribing" && hasR2Object) return { action: "resume" };
  return { action: "noop" };
}

export function mapStreamErrorToCode(e: StreamError): ErrorCode {
  return e === "size_exceeded" ? "file_too_large" : "loom_ingest_failed";
}

async function logIngestError(
  sopId: ObjectId,
  errorCode: string,
  httpStatus?: number,
) {
  await (await events()).insertOne({
    _id: new ObjectId(),
    type: "loom_ingest_error",
    sopId,
    errorCode,
    httpStatus,
    createdAt: new Date(),
  });
}

async function failSop(sopId: ObjectId, errorCode: ErrorCode) {
  await (await sops()).updateOne(
    { _id: sopId },
    { $set: { status: "failed", errorCode, updatedAt: new Date() } },
  );
}

export const ingestLoom = task({
  id: "ingest-loom",
  maxDuration: 60 * 15,
  run: async (payload: { sopId: string }) => {
    const _id = new ObjectId(payload.sopId);
    const col = await sops();
    const doc = await col.findOne({ _id });
    if (!doc) { logger.error("ingestLoom: sop not found", { sopId: payload.sopId }); return; }
    if (!doc.videoId || !doc.videoR2Key) {
      logger.error("ingestLoom: missing videoId or videoR2Key", { sopId: payload.sopId });
      await failSop(_id, "loom_ingest_failed");
      return;
    }

    const decision = decideIngest(doc.status, Boolean(doc.videoSizeBytes));
    if (decision.action === "noop") {
      logger.info("ingestLoom: noop", { status: doc.status });
      return;
    }
    if (decision.action === "resume") {
      logger.info("ingestLoom: resuming process-sop trigger");
      await tasks.trigger(
        "process-sop",
        { sopId: payload.sopId },
        { idempotencyKey: `${payload.sopId}-process-sop` },
      );
      return;
    }

    // action === "run"
    const resolved = await resolveLoomMp4(doc.videoId);
    if (!resolved.ok) {
      await logIngestError(_id, resolved.error, resolved.httpStatus);
      await failSop(_id, "loom_ingest_failed");
      return;
    }

    const streamed = await streamLoomToR2({ mp4Url: resolved.mp4Url, r2Key: doc.videoR2Key });
    if (!streamed.ok) {
      await logIngestError(_id, streamed.error);
      await failSop(_id, mapStreamErrorToCode(streamed.error));
      return;
    }

    await col.updateOne(
      { _id },
      { $set: { status: "transcribing", videoSizeBytes: streamed.bytes, updatedAt: new Date() } },
    );

    await tasks.trigger(
      "process-sop",
      { sopId: payload.sopId },
      { idempotencyKey: `${payload.sopId}-process-sop` },
    );
  },
});
```

- [ ] **Step 4: Run tests**

Run: `npx tsx --test src/trigger/ingestLoom.test.ts`
Expected: all 6 tests pass.

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 6: Commit**

```bash
git add src/trigger/ingestLoom.ts src/trigger/ingestLoom.test.ts
git commit -m "feat(trigger): ingest-loom task with safe-retry decision logic

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 6: API route `POST /api/ingest/loom`

**Files:**
- Create: `src/app/api/ingest/loom/route.ts`

- [ ] **Step 1: Create the route**

Write `src/app/api/ingest/loom/route.ts`:
```ts
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";
import { sops } from "@/lib/mongo";
import { newShareToken, videoKey } from "@/lib/utils";
import { config } from "@/config";
import { parseLoomUrl } from "@/lib/loom";

const Body = z.object({
  url: z.string().min(1),
  defaultLanguage: z.enum(["vi", "en"]).default("vi"),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const loom = parseLoomUrl(parsed.data.url);
  if (!loom) return NextResponse.json({ error: "invalid_url" }, { status: 400 });

  const _id = new ObjectId();
  const key = videoKey(_id.toHexString(), "mp4");
  const now = new Date();
  const videoExpiresAt = new Date(now.getTime() + config.retention.videoRetentionDays * 86400_000);

  await (await sops()).insertOne({
    _id,
    title: "",
    category: "",
    status: "ingesting",
    errorCode: null,
    videoR2Key: key,
    videoExpiresAt,
    transcript: null,
    language: null,
    segments: [],
    segmentsClean: null,
    domainSummary: null,
    steps: [],
    shareToken: newShareToken(),
    defaultLanguage: parsed.data.defaultLanguage,
    sourceType: "loom",
    sourceUrl: parsed.data.url,
    videoId: loom.videoId,
    createdAt: now,
    updatedAt: now,
  });

  await tasks.trigger("ingest-loom", { sopId: _id.toHexString() });

  return NextResponse.json({ sopId: _id.toHexString() });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/ingest/loom/route.ts
git commit -m "feat(api): POST /api/ingest/loom creates SOP and triggers ingest task

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 7: Cleanup watchdog for stuck `ingesting`

**Files:**
- Modify: `src/trigger/cleanupVideos.ts`

- [ ] **Step 1: Add the sweep**

In `src/trigger/cleanupVideos.ts`, inside the `run:` function, AFTER the existing `expired` sweep (after the `for (const d of expired)` loop) and BEFORE the stale-PDF sweep, insert:
```ts
    // Sweep stuck-"ingesting" SOPs older than 30 minutes.
    // Threshold > task maxDuration (15 min) so in-flight tasks are not affected.
    const stuckBefore = new Date(now.getTime() - 30 * 60 * 1000);
    const stuck = await col.find({
      status: "ingesting",
      createdAt: { $lt: stuckBefore },
    }).toArray();
    for (const d of stuck) {
      if (d.videoR2Key) {
        try { await deleteObject(d.videoR2Key); }
        catch (e) { logger.warn("r2 delete stuck-ingest failed", { key: d.videoR2Key, e: String(e) }); }
      }
      await col.updateOne(
        { _id: d._id, status: "ingesting" },     // race-safe: only flip if still ingesting
        { $set: { status: "failed", errorCode: "loom_ingest_failed", videoR2Key: null, updatedAt: now } },
      );
    }
```

- [ ] **Step 2: Update the final log line to include the new count**

Change:
```ts
    logger.info(`cleanup: videos=${expired.length} pdfs=${stalePdfs.length}`);
```
to:
```ts
    logger.info(`cleanup: videos=${expired.length} pdfs=${stalePdfs.length} stuckIngest=${stuck.length}`);
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add src/trigger/cleanupVideos.ts
git commit -m "feat(cleanup): sweep stuck-ingesting SOPs older than 30 min

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 8: Processing page status copy

**Files:**
- Modify: `src/app/processing/[id]/page.tsx`

- [ ] **Step 1: Extend the local `Status` type**

In `src/app/processing/[id]/page.tsx`, change:
```ts
type Status =
  | "uploading" | "transcribing" | "normalizing" | "analyzing"
  | "generating" | "clipping" | "done" | "failed";
```
to:
```ts
type Status =
  | "uploading" | "ingesting" | "transcribing" | "normalizing" | "analyzing"
  | "generating" | "clipping" | "done" | "failed";
```

- [ ] **Step 2: Extend `STATUS_STEP_INDEX`**

Change:
```ts
const STATUS_STEP_INDEX: Record<Status, number> = {
  uploading: 0, transcribing: 0, normalizing: 1, analyzing: 2,
  generating: 3, clipping: 4, done: 5, failed: 0,
};
```
to:
```ts
const STATUS_STEP_INDEX: Record<Status, number> = {
  uploading: 0, ingesting: 0, transcribing: 0, normalizing: 1, analyzing: 2,
  generating: 3, clipping: 4, done: 5, failed: 0,
};
```

- [ ] **Step 3: Add a Loom-specific error message**

In the `ERROR_MSG` map, add:
```ts
  loom_ingest_failed: "Không thể tải video Loom. Hãy đảm bảo liên kết đã đặt 'Anyone with the link can view' rồi thử lại.",
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add "src/app/processing/[id]/page.tsx"
git commit -m "feat(processing): support ingesting status and loom_ingest_failed error

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 9: UploadZone — enable Loom URL flow

**Files:**
- Modify: `src/components/UploadZone.tsx`

- [ ] **Step 1: Read the current file**

Use the `Read` tool on `src/components/UploadZone.tsx` (full file). Confirm the structure: file pick state at the top of the component, presigned PUT to R2 via XHR, `/api/upload/init` + `/api/upload/commit` flow, dropzone JSX, URL-input block, options row, privacy note, error/uploading display, submit button.

- [ ] **Step 2: Replace state and submit logic**

Locate the current state declarations (around lines 8-15 of `UploadZone.tsx`) and the `submit` function. Replace with the discriminated-union shape and dual submit branches.

Specifically: replace the block starting `const [file, setFile] = useState...` through the end of the `async function submit() {...}` body with:

```tsx
  type Source =
    | { kind: "none" }
    | { kind: "file"; file: File }
    | { kind: "url"; url: string };

  const [source, setSource] = useState<Source>({ kind: "none" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPublic, setIsPublic] = useState(false);
  const [language, setLanguage] = useState<"vi" | "en">("vi");

  function pickFile(f: File | null) {
    setError(null);
    if (!f) { setSource({ kind: "none" }); return; }
    if (f.size > config.limits.maxVideoSizeMB * 1024 * 1024) { setError("File vượt quá 500MB."); return; }
    if (!config.limits.allowedMimeTypes.includes(f.type)) { setError("Định dạng không hỗ trợ. Dùng MP4, MOV, hoặc WEBM."); return; }
    setSource({ kind: "file", file: f });
  }

  function setUrl(u: string) {
    setError(null);
    if (!u) { setSource({ kind: "none" }); return; }
    setSource({ kind: "url", url: u });
  }

  async function submitFile(file: File) {
    const init = await fetch("/api/upload/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, sizeBytes: file.size, mimeType: file.type }),
    }).then(r => r.json());
    if (init.error) throw new Error(init.error);

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", init.uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100)); };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`R2 ${xhr.status}`));
      xhr.onerror = () => reject(new Error("network"));
      xhr.send(file);
    });

    const commit = await fetch("/api/upload/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sopId: init.sopId, defaultLanguage: language }),
    });
    if (!commit.ok) throw new Error("commit_failed");
    return init.sopId as string;
  }

  async function submitLoomUrl(url: string) {
    const r = await fetch("/api/ingest/loom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, defaultLanguage: language }),
    });
    const json = await r.json();
    if (!r.ok) {
      if (json.error === "invalid_url") throw new Error("Liên kết Loom không hợp lệ.");
      throw new Error(json.error ?? "ingest_failed");
    }
    return json.sopId as string;
  }

  async function submit() {
    if (source.kind === "none") return;
    setSubmitting(true);
    setError(null);
    try {
      const sopId =
        source.kind === "file"
          ? await submitFile(source.file)
          : await submitLoomUrl(source.url);
      router.push(`/processing/${sopId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      setSubmitting(false);
    }
  }
```

- [ ] **Step 3: Replace JSX dropzone references to `file` and `pick`**

Inside the dropzone JSX, replace `file` with `source.kind === "file" ? source.file : null` for display, and `pick` with `pickFile`. Specifically:

- The `onDrop` handler: change `pick(e.dataTransfer.files?.[0] ?? null)` to `pickFile(e.dataTransfer.files?.[0] ?? null)`.
- The conditional display: replace `{file ? (` with `{source.kind === "file" ? (`. Inside, change `file.name` to `source.file.name` and `file.size` to `source.file.size`.
- The hidden input's `onChange`: change `pick(e.target.files?.[0] ?? null)` to `pickFile(e.target.files?.[0] ?? null)`.
- Disable file picker when a URL is set: add `pointerEvents: source.kind === "url" ? "none" : undefined, opacity: source.kind === "url" ? 0.5 : 1` to the dropzone wrapper's inline `style`.

- [ ] **Step 4: Enable the URL input**

Replace the disabled URL input block (the one with `placeholder="https://youtube.com/watch?v=..."`) with:

```tsx
          {/* URL input — Loom only for now */}
          <div className={`flex items-center gap-2 rounded-2xl border border-gray-200 bg-white pl-[18px] pr-1.5 py-1.5 ${source.kind === "file" ? "opacity-50 pointer-events-none" : ""}`}>
            <Link2 className="w-4.5 h-4.5 text-[#9CA3AF] shrink-0" strokeWidth={2} />
            <input
              type="url"
              value={source.kind === "url" ? source.url : ""}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.loom.com/share/..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#9CA3AF] text-[#0A0A0A]"
            />
          </div>
          <p className="text-[12px] text-[#9CA3AF] -mt-3 px-1">
            Chỉ dán liên kết Loom công khai bạn có quyền sử dụng.
          </p>
```

- [ ] **Step 5: Update the submit button gating and progress UI**

Replace the existing submit button block (`disabled={!file || uploading} onClick={submit}`) and the surrounding `{uploading && (...)}` block with:

```tsx
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          {submitting && source.kind === "file" && (
            <div className="space-y-1.5">
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-[#0066FF] transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-gray-500 text-center">Đang tải lên… {progress}%</p>
            </div>
          )}
          {submitting && source.kind === "url" && (
            <p className="text-xs text-gray-500 text-center">Đang tạo SOP…</p>
          )}

          {/* Submit */}
          <button
            disabled={source.kind === "none" || submitting}
            onClick={submit}
            className="w-full inline-flex items-center justify-center gap-2.5 rounded-full bg-[#0066FF] text-white font-medium text-[15px] px-7 py-4 hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4.5 h-4.5" strokeWidth={2} />
            Bắt đầu tạo SOP
          </button>
```

The button's `className` and label are unchanged from the original; only the `disabled` expression was updated.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output.

- [ ] **Step 7: Smoke test in dev**

Run: `npm run dev`
Manually open `http://localhost:3000/upload`. Verify:
- File picker still works.
- Pasting a Loom share URL enables the submit button and disables the file picker visually.
- Pasting `https://invalid` shows "Liên kết Loom không hợp lệ." after submit.
- (End-to-end Loom resolution is verified in Task 10.)

Stop the dev server with Ctrl+C.

- [ ] **Step 8: Commit**

```bash
git add src/components/UploadZone.tsx
git commit -m "feat(upload): enable Loom URL submit branch with discriminated source state

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Task 10: End-to-end smoke test

**Files:** none modified — verification only.

- [ ] **Step 1: Start dev server**

Run: `npm run dev`
Wait for "Ready in ..."

- [ ] **Step 2: Submit a real public Loom URL**

In a separate terminal, paste a Loom URL the human operator owns (or any public Loom share link) into the upload page and click submit.

- [ ] **Step 3: Verify processing page renders the `ingesting` state**

Expected: page transitions through `ingesting` → `transcribing` → ... → `done`. No error.

- [ ] **Step 4: Verify the SOP doc**

Run a Mongo query (via existing admin tools or `mongosh`) — the latest SOP should have:
- `sourceType: "loom"`
- `sourceUrl` matching the pasted URL
- `videoId` matching the Loom ID
- `videoSizeBytes` populated after ingest completes

- [ ] **Step 5: Verify R2**

Confirm an object exists at the SOP's `videoR2Key`.

- [ ] **Step 6: Negative case — private link**

Submit a Loom share URL set to "Restricted" / "Workspace only". Expected: SOP transitions to `failed` with `errorCode: "loom_ingest_failed"`. Processing page shows the Vietnamese error message.

- [ ] **Step 7: Stop dev server.** No commit.

---

## Self-review checklist

- All sections of the spec are covered:
  - Schema additions → Task 1
  - URL parser → Task 2
  - Resolver → Task 3
  - Streamer → Task 4
  - Trigger.dev task → Task 5
  - API route → Task 6
  - Stuck-`ingesting` watchdog → Task 7
  - Processing page status → Task 8
  - UploadZone UX → Task 9
  - End-to-end verification → Task 10
- No placeholders, "TBD"s, "similar to Task N"s, or vague handwave steps.
- Type names consistent across tasks: `Source`, `StreamResult`, `StreamError`, `ResolveResult`, `ResolveError`, `Decision`.
- The signature of `streamLoomToR2` declared in Task 4 matches its consumer in Task 5 (`{ ok: true; bytes } | { ok: false; error: StreamError }`).
- The idempotency key string used in Task 5 matches the Invariants section of the spec.
- Test command and typecheck command are explicit in every task.
