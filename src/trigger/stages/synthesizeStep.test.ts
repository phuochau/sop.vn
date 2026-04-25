import { test } from "node:test";
import assert from "node:assert";
import { sliceTranscriptByTime } from "./synthesizeStep";

test("sliceTranscriptByTime concatenates segments overlapping the range", () => {
  const segs = [
    { id: 0, start: 0,  end: 5,  text: "alpha" },
    { id: 1, start: 5,  end: 10, text: "beta" },
    { id: 2, start: 10, end: 15, text: "gamma" },
    { id: 3, start: 15, end: 20, text: "delta" },
  ];
  // step from 6s to 14s overlaps segments 1 and 2
  const out = sliceTranscriptByTime(segs, 6, 14);
  assert.equal(out, "beta gamma");
});

test("sliceTranscriptByTime returns empty string when no overlap", () => {
  const segs = [{ id: 0, start: 0, end: 5, text: "alpha" }];
  assert.equal(sliceTranscriptByTime(segs, 100, 200), "");
});
