import { test } from "node:test";
import assert from "node:assert";
import { mergeEvents, bboxIou } from "./clickEventDetect";
import type { ClickEvent } from "./clickEventDetect";

function ev(overrides: Partial<ClickEvent>): ClickEvent {
  return {
    time: 0,
    bbox: { x: 0.4, y: 0.4, w: 0.1, h: 0.05 },
    beforeFramePath: "/b.jpg",
    afterFramePath: "/a.jpg",
    area: 100,
    density: 0.5,
    ...overrides,
  };
}

test("mergeEvents collapses pair at exactly the window boundary (using <=)", () => {
  const a = ev({ time: 46.0 });
  const b = ev({ time: 47.5, beforeFramePath: "/b2.jpg", afterFramePath: "/a2.jpg" });
  const merged = mergeEvents([a, b], 1.5, 0.30);
  assert.equal(merged.length, 1, "<=1.5s should merge");
});

test("mergeEvents collapses press-flicker with low IOU (mergeIouMin=0.20)", () => {
  const a = ev({ time: 46.0, bbox: { x: 0.30, y: 0.50, w: 0.10, h: 0.10 } });
  const b = ev({ time: 47.5, bbox: { x: 0.36, y: 0.50, w: 0.10, h: 0.10 } });
  const iou = bboxIou(a.bbox, b.bbox);
  assert.ok(iou >= 0.20 && iou < 0.30, `iou ${iou} should be in (0.20, 0.30)`);
  const mergedAt03 = mergeEvents([a, b], 4.0, 0.30);
  assert.equal(mergedAt03.length, 2, "iou 0.20-0.30 should NOT merge with 0.30 threshold");
  const mergedAt02 = mergeEvents([a, b], 4.0, 0.20);
  assert.equal(mergedAt02.length, 1, "iou 0.20-0.30 SHOULD merge with 0.20 threshold");
});

test("mergeEvents collapses across-transition duplicates within 4s window", () => {
  const a = ev({ time: 53.5 });
  const b = ev({ time: 57.5, beforeFramePath: "/b2.jpg", afterFramePath: "/a2.jpg" });
  const merged = mergeEvents([a, b], 4.0, 0.30);
  assert.equal(merged.length, 1, "4s gap should merge with 4s window");
});

test("mergeEvents keeps clicks 4.5s apart separate", () => {
  const a = ev({ time: 53.5 });
  const b = ev({ time: 58.0, beforeFramePath: "/b2.jpg", afterFramePath: "/a2.jpg" });
  const merged = mergeEvents([a, b], 4.0, 0.30);
  assert.equal(merged.length, 2, "4.5s gap should NOT merge");
});
