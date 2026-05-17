import { test } from "node:test";
import assert from "node:assert";
import { highlightActions } from "./highlightActions";
import type { Action } from "@/lib/schemas";

function act(over: Partial<Action>): Action {
  return {
    stepIndex: 0,
    order: 0,
    verb: "click",
    description: "Click the Sign in button",
    displayFramePath: "/frame.jpg",
    time: 1.0,
    ...over,
  };
}

test("writes a point highlight onto a non-view action when the highlighter returns a point", async () => {
  const actions = [act({ verb: "click" })];
  const out = await highlightActions({
    actions,
    highlighter: async () => ({ highlight: "yes", point: { x: 0.5, y: 0.4 }, bbox: null, noHighlightReason: null }),
  });
  assert.deepEqual(out[0].highlight, { kind: "click", point: { x: 0.5, y: 0.4 } });
});

test("maps verb 'input' to highlight kind 'input', everything else to 'click'", async () => {
  const out = await highlightActions({
    actions: [act({ verb: "input" }), act({ verb: "select", order: 1 }), act({ verb: "link", order: 2 })],
    highlighter: async () => ({ highlight: "yes", point: { x: 0.1, y: 0.2 }, bbox: null, noHighlightReason: null }),
  });
  assert.equal(out[0].highlight!.kind, "input");
  assert.equal(out[1].highlight!.kind, "click");
  assert.equal(out[2].highlight!.kind, "click");
});

test("leaves a view action untouched and never calls the highlighter for it", async () => {
  let calls = 0;
  const out = await highlightActions({
    actions: [act({ verb: "view", description: "Review this screen" })],
    highlighter: async () => { calls++; return { highlight: "yes", point: { x: 0, y: 0 }, bbox: null, noHighlightReason: null }; },
  });
  assert.equal(calls, 0);
  assert.equal(out[0].highlight, undefined);
});

test("leaves highlight unset when the highlighter returns no point", async () => {
  const out = await highlightActions({
    actions: [act({ verb: "click" })],
    highlighter: async () => ({ highlight: "no", point: null, bbox: null, noHighlightReason: "no_specific_target" }),
  });
  assert.equal(out[0].highlight, undefined);
});

test("grounds each call on the action's own displayFramePath and description", async () => {
  const seen: { intent: string; framePath: string }[] = [];
  await highlightActions({
    actions: [
      act({ verb: "click", description: "Click A", displayFramePath: "/a.jpg" }),
      act({ verb: "click", description: "Click B", displayFramePath: "/b.jpg", order: 1 }),
    ],
    highlighter: async (a) => { seen.push({ intent: a.intent, framePath: a.framePath }); return { highlight: "no", point: null, bbox: null, noHighlightReason: "no_specific_target" }; },
  });
  assert.deepEqual(seen, [
    { intent: "Click A", framePath: "/a.jpg" },
    { intent: "Click B", framePath: "/b.jpg" },
  ]);
});
