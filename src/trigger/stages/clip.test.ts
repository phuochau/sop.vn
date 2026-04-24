import { test } from "node:test";
import assert from "node:assert";
import { resolveTimes } from "./clip";

test("resolveTimes clamps, orders, drops invalid", () => {
  const segs = [
    { id: 0, start: 0, end: 5, text: "a" },
    { id: 1, start: 5, end: 10, text: "b" },
    { id: 2, start: 10, end: 15, text: "c" },
  ];
  const extracted = [
    { title: "A", description: "", startSegmentId: 0, endSegmentId: 1 },
    { title: "B", description: "", startSegmentId: 2, endSegmentId: 2 },
    { title: "Bad", description: "", startSegmentId: 99, endSegmentId: 100 },
  ];
  const out = resolveTimes(segs, extracted, 15);
  assert.equal(out.length, 2);
  assert.equal(out[0].startTime, 0);
  assert.equal(out[0].endTime, 10);
  assert.equal(out[1].startTime, 10);
  assert.equal(out[1].endTime, 15);
});
