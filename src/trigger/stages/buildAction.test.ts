import { test } from "node:test";
import assert from "node:assert";
import { buildAction } from "./buildAction";

const subStep = {
  intent: "Click the Sign up button.",
  verb: "click" as const,
  narrationSegmentIds: [0],
  timeWindow: null,
  visualConfidence: "high" as const,
};

test("buildAction composes a click action with a point highlight", () => {
  const a = buildAction({
    stepIndex: 1, order: 2, subStep,
    verify: { match: "yes", reasoning: "ok" },
    highlight: {
      highlight: "yes", point: { x: 0.4, y: 0.6 },
      bbox: null, noHighlightReason: null,
    },
    framePath: "/frame.jpg", frameTime: 12.5, pickedClusterLetter: "A",
  });
  assert.equal(a.stepIndex, 1);
  assert.equal(a.verb, "click");
  assert.equal(a.description, "Click the Sign up button.");
  assert.equal(a.time, 12.5);
  assert.deepEqual(a.highlight, { kind: "click", point: { x: 0.4, y: 0.6 } });
  assert.equal(a.verifyMatch, "yes");
  assert.equal(a.pickedClusterLetter, "A");
});

test("buildAction omits highlight when highlight.highlight === no", () => {
  const a = buildAction({
    stepIndex: 0, order: 0, subStep,
    verify: { match: "yes", reasoning: "ok" },
    highlight: { highlight: "no", bbox: null, noHighlightReason: "no_specific_target" },
    framePath: "/x.jpg", frameTime: 0, pickedClusterLetter: "A",
  });
  assert.equal(a.highlight, undefined);
});

test("buildAction omits highlight when the decision has a null point", () => {
  const a = buildAction({
    stepIndex: 0, order: 0, subStep,
    verify: { match: "yes", reasoning: "ok" },
    highlight: { highlight: "yes", point: null, bbox: null, noHighlightReason: null },
    framePath: "/x.jpg", frameTime: 0, pickedClusterLetter: "A",
  });
  assert.equal(a.highlight, undefined);
});

test("buildAction coerces select/link verbs to highlight.kind: click", () => {
  const a = buildAction({
    stepIndex: 0, order: 0,
    subStep: { ...subStep, verb: "select" },
    verify: { match: "yes", reasoning: "ok" },
    highlight: {
      highlight: "yes", point: { x: 0.2, y: 0.3 },
      bbox: null, noHighlightReason: null,
    },
    framePath: "/x.jpg", frameTime: 5, pickedClusterLetter: "A",
  });
  assert.equal(a.highlight?.kind, "click");
});

test("buildAction keeps highlight.kind: input for input verb", () => {
  const a = buildAction({
    stepIndex: 0, order: 0,
    subStep: { ...subStep, verb: "input" },
    verify: { match: "yes", reasoning: "ok" },
    highlight: {
      highlight: "yes", point: { x: 0.2, y: 0.3 },
      bbox: null, noHighlightReason: null,
    },
    framePath: "/x.jpg", frameTime: 5, pickedClusterLetter: "A",
  });
  assert.equal(a.highlight?.kind, "input");
});

test("buildAction supports view verb with no highlight", () => {
  const a = buildAction({
    stepIndex: 0, order: 0,
    subStep: { ...subStep, verb: "view", intent: "View the dashboard." },
    verify: { match: "yes", reasoning: "ok" },
    highlight: { highlight: "no", bbox: null, noHighlightReason: "view_action" },
    framePath: "/x.jpg", frameTime: 5, pickedClusterLetter: "A",
  });
  assert.equal(a.verb, "view");
  assert.equal(a.highlight, undefined);
});
