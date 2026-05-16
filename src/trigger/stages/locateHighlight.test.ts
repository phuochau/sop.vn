import { test } from "node:test";
import assert from "node:assert";
import { coerceForViewVerb, type HighlighterFn, pointFallbackHighlight, runLocateHighlightWith } from "./locateHighlight";

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
    highlighter,
  });
  assert.equal(out.highlight, "no");
  assert.equal(out.bbox, null);
});

const okFrame = "src/trigger/stages/__fixtures__/sample-1080p.jpg";

test("pointFallbackHighlight uses the UI-TARS point when found", async () => {
  const out = await pointFallbackHighlight(
    { intent: "Click Save", verb: "click", framePath: okFrame },
    {
      uiTars: async () => ({ point: { x: 0.4, y: 0.6 }, raw: "(x,y)" }),
      qwen: async () => { throw new Error("should not be called"); },
    },
  );
  assert.equal(out.highlight, "yes");
  assert.deepEqual(out.point, { x: 0.4, y: 0.6 });
  assert.equal(out.bbox, null);
});

test("pointFallbackHighlight falls back to Qwen when UI-TARS finds nothing", async () => {
  const out = await pointFallbackHighlight(
    { intent: "Click Save", verb: "click", framePath: okFrame },
    {
      uiTars: async () => ({ point: null, raw: "no" }),
      qwen: async () => ({ point: { x: 0.7, y: 0.2 } }),
    },
  );
  assert.equal(out.highlight, "yes");
  assert.deepEqual(out.point, { x: 0.7, y: 0.2 });
});

test("pointFallbackHighlight falls back to Qwen when UI-TARS throws", async () => {
  const out = await pointFallbackHighlight(
    { intent: "Click Save", verb: "click", framePath: okFrame },
    {
      uiTars: async () => { throw new Error("provider down"); },
      qwen: async () => ({ point: { x: 0.3, y: 0.3 } }),
    },
  );
  assert.equal(out.highlight, "yes");
  assert.deepEqual(out.point, { x: 0.3, y: 0.3 });
});

test("pointFallbackHighlight reports no_specific_target when both find nothing", async () => {
  const out = await pointFallbackHighlight(
    { intent: "Click Save", verb: "click", framePath: okFrame },
    {
      uiTars: async () => ({ point: null, raw: "no" }),
      qwen: async () => ({ point: null }),
    },
  );
  assert.equal(out.highlight, "no");
  assert.equal(out.noHighlightReason, "no_specific_target");
});

test("pointFallbackHighlight reports grounding_unavailable when both throw", async () => {
  const out = await pointFallbackHighlight(
    { intent: "Click Save", verb: "click", framePath: okFrame },
    {
      uiTars: async () => { throw new Error("down"); },
      qwen: async () => { throw new Error("down"); },
    },
  );
  assert.equal(out.highlight, "no");
  assert.equal(out.noHighlightReason, "grounding_unavailable");
});
