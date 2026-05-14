import { test } from "node:test";
import assert from "node:assert";
import { coerceForViewVerb, type HighlighterFn, runLocateHighlightWith } from "./locateHighlight";

test("coerceForViewVerb forces no-highlight regardless of LLM output", () => {
  const out = coerceForViewVerb("view", {
    highlight: "yes",
    bbox: { x: 0, y: 0, w: 0.1, h: 0.1 },
    elementCaption: "should be ignored",
    noHighlightReason: null,
  });
  assert.equal(out.highlight, "no");
  assert.equal(out.bbox, null);
  assert.equal(out.elementCaption, null);
  assert.equal(out.noHighlightReason, "view_action");
});

test("coerceForViewVerb leaves non-view verbs untouched", () => {
  const input = {
    highlight: "yes" as const,
    bbox: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
    elementCaption: "Sign up button",
    noHighlightReason: null,
  };
  const out = coerceForViewVerb("click", input);
  assert.deepEqual(out, input);
});

test("runLocateHighlightWith returns highlighter output for non-view verb", async () => {
  const highlighter: HighlighterFn = async () => ({
    highlight: "yes",
    bbox: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
    elementCaption: "Verify email button",
    noHighlightReason: null,
  });
  const out = await runLocateHighlightWith({
    intent: "Click Verify email.",
    verb: "click",
    framePath: "/x.jpg",
    language: "en",
    highlighter,
  });
  assert.equal(out.highlight, "yes");
  assert.equal(out.elementCaption, "Verify email button");
});

test("runLocateHighlightWith coerces view-verb regardless of LLM output", async () => {
  const highlighter: HighlighterFn = async () => ({
    highlight: "yes",
    bbox: { x: 0, y: 0, w: 0.1, h: 0.1 },
    elementCaption: "ignored",
    noHighlightReason: null,
  });
  const out = await runLocateHighlightWith({
    intent: "View the dashboard.",
    verb: "view",
    framePath: "/x.jpg",
    language: "en",
    highlighter,
  });
  assert.equal(out.highlight, "no");
  assert.equal(out.bbox, null);
});
