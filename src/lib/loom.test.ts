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
  await withMockedFetch(async () => { throw new DOMException("timed out", "TimeoutError"); }, async () => {
    const r = await resolveLoomMp4("abcdef0123456789abcdef0123456789");
    assert.deepEqual(r, { ok: false, error: "timeout" });
  });
});
