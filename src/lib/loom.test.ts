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
