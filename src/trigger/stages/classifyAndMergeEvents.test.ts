import { test } from "node:test";
import assert from "node:assert";
import { runClassifyAndMergeEvents } from "./classifyAndMergeEvents";
import type { ClickEvent } from "@/trigger/lib/clickEventDetect";

function ev(o: Partial<ClickEvent>): ClickEvent {
  return {
    time: 0,
    bbox: { x: 0.4, y: 0.4, w: 0.05, h: 0.05 },
    beforeFramePath: "/b",
    afterFramePath: "/a",
    area: 100,
    density: 0.5,
    ...o,
  };
}

test("single click event stays a click", () => {
  const evs = [ev({ time: 1, bbox: { x: 0.4, y: 0.4, w: 0.05, h: 0.05 } })];
  const out = runClassifyAndMergeEvents({ byStep: new Map([[0, evs]]) });
  const list = out.get(0)!;
  assert.equal(list.length, 1);
  assert.equal(list[0].kindHint, "click");
});

test("three consecutive wide low-density diffs merge into one input", () => {
  const evs = [
    ev({ time: 1.0, bbox: { x: 0.3, y: 0.5, w: 0.20, h: 0.04 }, density: 0.3 }),
    ev({ time: 1.5, bbox: { x: 0.3, y: 0.5, w: 0.22, h: 0.04 }, density: 0.3 }),
    ev({ time: 2.0, bbox: { x: 0.3, y: 0.5, w: 0.25, h: 0.04 }, density: 0.3 }),
  ];
  const out = runClassifyAndMergeEvents({ byStep: new Map([[0, evs]]) });
  const list = out.get(0)!;
  assert.equal(list.length, 1);
  assert.equal(list[0].kindHint, "input");
  assert.equal(list[0].time, 1.0);
  assert.equal(list[0].beforeFramePath, "/b");
  assert.ok(list[0].bbox.w >= 0.25, `union width should be >= 0.25, got ${list[0].bbox.w}`);
});

test("typing session and separate click in same step → two events", () => {
  const evs = [
    ev({ time: 1.0, bbox: { x: 0.3, y: 0.5, w: 0.20, h: 0.04 }, density: 0.3 }),
    ev({ time: 1.5, bbox: { x: 0.3, y: 0.5, w: 0.22, h: 0.04 }, density: 0.3 }),
    ev({ time: 5.0, bbox: { x: 0.7, y: 0.8, w: 0.05, h: 0.05 }, density: 0.6 }),
  ];
  const out = runClassifyAndMergeEvents({ byStep: new Map([[0, evs]]) });
  const list = out.get(0)!;
  assert.equal(list.length, 2);
  assert.equal(list[0].kindHint, "input");
  assert.equal(list[1].kindHint, "click");
});

test("non-overlapping wide diffs do NOT merge", () => {
  const evs = [
    ev({ time: 1.0, bbox: { x: 0.1, y: 0.3, w: 0.15, h: 0.04 }, density: 0.3 }),
    ev({ time: 1.5, bbox: { x: 0.6, y: 0.3, w: 0.15, h: 0.04 }, density: 0.3 }),
  ];
  const out = runClassifyAndMergeEvents({ byStep: new Map([[0, evs]]) });
  const list = out.get(0)!;
  assert.equal(list.length, 2);
});

test("typing session does not span across steps", () => {
  const a = ev({ time: 1.0, bbox: { x: 0.3, y: 0.5, w: 0.20, h: 0.04 }, density: 0.3 });
  const b = ev({ time: 1.5, bbox: { x: 0.3, y: 0.5, w: 0.22, h: 0.04 }, density: 0.3 });
  const out = runClassifyAndMergeEvents({ byStep: new Map([[0, [a]], [1, [b]]]) });
  assert.equal(out.get(0)!.length, 1);
  assert.equal(out.get(1)!.length, 1);
});
