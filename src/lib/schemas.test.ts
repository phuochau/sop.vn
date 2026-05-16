import { test } from "node:test";
import assert from "node:assert";
import { HighlightDecision } from "./schemas";

test("HighlightDecision accepts a point", () => {
  const parsed = HighlightDecision.parse({
    highlight: "yes",
    point: { x: 0.5, y: 0.4 },
    bbox: null,
    noHighlightReason: null,
  });
  assert.deepEqual(parsed.point, { x: 0.5, y: 0.4 });
});

test("HighlightDecision allows point to be omitted (optional key)", () => {
  const parsed = HighlightDecision.parse({
    highlight: "no",
    bbox: null,
    noHighlightReason: "view_action",
  });
  assert.equal(parsed.point ?? null, null);
});

test("HighlightDecision accepts the grounding_unavailable reason", () => {
  const parsed = HighlightDecision.parse({
    highlight: "no",
    point: null,
    bbox: null,
    noHighlightReason: "grounding_unavailable",
  });
  assert.equal(parsed.noHighlightReason, "grounding_unavailable");
});
