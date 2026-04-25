import { test } from "node:test";
import assert from "node:assert";
import { hasUsableSpeech } from "./branchDecision";

test("hasUsableSpeech: empty", () => {
  assert.equal(hasUsableSpeech({ segments: [], transcript: "" }), false);
});
test("hasUsableSpeech: empty segments but long transcript → false", () => {
  const t = "word ".repeat(50);
  assert.equal(hasUsableSpeech({ segments: [], transcript: t }), false);
});
test("hasUsableSpeech: 5-word transcript with segments → false", () => {
  assert.equal(
    hasUsableSpeech({ segments: [{ id: 0, start: 0, end: 1, text: "x" }], transcript: "one two three four five" }),
    false
  );
});
test("hasUsableSpeech: 50-word transcript with segments → true", () => {
  const t = "word ".repeat(50);
  assert.equal(
    hasUsableSpeech({ segments: [{ id: 0, start: 0, end: 1, text: "x" }], transcript: t }),
    true
  );
});
