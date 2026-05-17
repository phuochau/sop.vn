import { test } from "node:test";
import assert from "node:assert";
import { collapseDuplicateActions } from "./collapseDuplicateActions";
import type { Action } from "@/lib/schemas";

function action(over: Partial<Action>): Action {
  return {
    stepIndex: 0,
    order: 0,
    verb: "click",
    description: "a button",
    displayFramePath: "/f.jpg",
    time: 0,
    ...over,
  };
}

// Canned hashes: identical strings ⇒ distance 0; "FFFF..." ⇒ far apart.
const SAME_A = "0000000000000000";
const SAME_B = "ffffffffffffffff";
const hashByPath: Record<string, string> = { "/a.jpg": SAME_A, "/b.jpg": SAME_B };
const hashFn = async (p: string) => hashByPath[p] ?? null;

const OPTS = { gapSec: 5.0, hammingThreshold: 6, hashFn };

test("collapses adjacent same-frame same-verb actions within the gap", async () => {
  const out = await collapseDuplicateActions({
    actions: [
      action({ time: 39, displayFramePath: "/a.jpg" }),
      action({ time: 39.75, displayFramePath: "/a.jpg" }),
      action({ time: 41.5, displayFramePath: "/a.jpg" }),
    ],
    ...OPTS,
  });
  assert.equal(out.length, 1);
  assert.equal(out[0].time, 39);
  assert.equal(out[0].order, 0);
});

test("keeps actions whose display frames differ", async () => {
  const out = await collapseDuplicateActions({
    actions: [
      action({ time: 39, displayFramePath: "/a.jpg" }),
      action({ time: 39.75, displayFramePath: "/b.jpg" }),
    ],
    ...OPTS,
  });
  assert.equal(out.length, 2);
});

test("keeps same-frame actions that are beyond the time gap", async () => {
  const out = await collapseDuplicateActions({
    actions: [
      action({ time: 73, displayFramePath: "/a.jpg" }),
      action({ time: 83, displayFramePath: "/a.jpg" }),
    ],
    ...OPTS,
  });
  assert.equal(out.length, 2);
});

test("does not collapse across different verbs", async () => {
  const out = await collapseDuplicateActions({
    actions: [
      action({ time: 10, verb: "click", displayFramePath: "/a.jpg" }),
      action({ time: 10.5, verb: "input", displayFramePath: "/a.jpg" }),
    ],
    ...OPTS,
  });
  assert.equal(out.length, 2);
});

test("renumbers order after collapsing and sorts by time", async () => {
  const out = await collapseDuplicateActions({
    actions: [
      action({ time: 41.5, displayFramePath: "/a.jpg" }),
      action({ time: 39, displayFramePath: "/a.jpg" }),
      action({ time: 100, verb: "view", displayFramePath: "/b.jpg" }),
    ],
    ...OPTS,
  });
  assert.equal(out.length, 2);
  assert.deepEqual(out.map(a => a.time), [39, 100]);
  assert.deepEqual(out.map(a => a.order), [0, 1]);
});

test("returns single / empty input unchanged", async () => {
  assert.deepEqual(await collapseDuplicateActions({ actions: [], ...OPTS }), []);
  const one = [action({ time: 1 })];
  assert.deepEqual(await collapseDuplicateActions({ actions: one, ...OPTS }), one);
});
