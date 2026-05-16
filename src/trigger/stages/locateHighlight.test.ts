import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { coerceForViewVerb, type HighlighterFn, pointFallbackHighlight, runLocateHighlight, runLocateHighlightWith } from "./locateHighlight";

test("coerceForViewVerb forces no-highlight regardless of LLM output", () => {
  const out = coerceForViewVerb("view", {
    highlight: "yes",
    bbox: { x: 0, y: 0, w: 0.1, h: 0.1 },
    noHighlightReason: null,
  });
  assert.equal(out.highlight, "no");
  assert.equal(out.bbox, null);
  assert.equal(out.noHighlightReason, "view_action");
});

test("coerceForViewVerb leaves non-view verbs untouched", () => {
  const input = {
    highlight: "yes" as const,
    bbox: { x: 0.1, y: 0.1, w: 0.2, h: 0.2 },
    noHighlightReason: null,
  };
  const out = coerceForViewVerb("click", input);
  assert.deepEqual(out, input);
});

test("runLocateHighlightWith returns highlighter output for non-view verb", async () => {
  const highlighter: HighlighterFn = async () => ({
    highlight: "yes",
    bbox: { x: 0.1, y: 0.2, w: 0.3, h: 0.4 },
    noHighlightReason: null,
  });
  const out = await runLocateHighlightWith({
    intent: "Click Verify email.",
    verb: "click",
    framePath: "/x.jpg",
    highlighter,
  });
  assert.equal(out.highlight, "yes");
});

test("runLocateHighlightWith coerces view-verb regardless of LLM output", async () => {
  const highlighter: HighlighterFn = async () => ({
    highlight: "yes",
    bbox: { x: 0, y: 0, w: 0.1, h: 0.1 },
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

// Regression: runLocateHighlight's finally removes the downscaled-frame
// tmpdir. If it returns the highlighter promise without awaiting it, the
// finally runs (and rm's the frame) while the highlighter is still doing its
// async sharp reads — deleting the frame mid-flight and crashing the pipeline.
test("runLocateHighlight keeps the downscaled frame alive until the highlighter finishes", async () => {
  let frameExistedAfterAsyncWork: boolean | null = null;
  const slowHighlighter: HighlighterFn = async (a) => {
    // Stand in for the real highlighter's async frame reads (sharp + network).
    await new Promise((r) => setTimeout(r, 50));
    frameExistedAfterAsyncWork = fs.existsSync(a.framePath);
    return { highlight: "no", bbox: null, point: null, noHighlightReason: "no_specific_target" };
  };
  await runLocateHighlight({
    intent: "Click Save",
    verb: "click",
    framePath: okFrame,
    highlighter: slowHighlighter,
  });
  assert.equal(
    frameExistedAfterAsyncWork, true,
    "tmpdir was removed before the highlighter finished reading the frame",
  );
});
