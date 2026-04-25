import { test } from "node:test";
import assert from "node:assert";
import { pickKeyframeTimestamps } from "./keyframes";

test("pickKeyframeTimestamps returns 3 evenly-spaced times inside the range", () => {
  const ts = pickKeyframeTimestamps(10, 20);
  assert.equal(ts.length, 3);
  assert.ok(ts[0] > 10 && ts[0] < ts[1] && ts[1] < ts[2] && ts[2] < 20);
  // 25%, 50%, 75% of the range
  assert.equal(ts[0], 12.5);
  assert.equal(ts[1], 15);
  assert.equal(ts[2], 17.5);
});

test("pickKeyframeTimestamps handles a tiny range without collapsing", () => {
  const ts = pickKeyframeTimestamps(5, 5.4);
  assert.equal(ts.length, 3);
  assert.ok(ts[0] < ts[1] && ts[1] < ts[2]);
});
