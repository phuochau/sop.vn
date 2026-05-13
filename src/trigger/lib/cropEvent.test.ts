import { test } from "node:test";
import assert from "node:assert";
import { computeCropWindow, diffBboxInCrop, cropBboxToFullFrame, padBbox } from "./cropEvent";

test("computeCropWindow centers on diff with 3x multiplier", () => {
  // diff 192×36 px → 3× = 576×108 → minPx floors h to 400, then maxFrac caps h at 360 (720×0.5)
  const diff = { x: 0.5, y: 0.5, w: 0.1, h: 0.05 };
  const crop = computeCropWindow(diff, 1920, 720, { multiplier: 3, minPx: 400, maxFrac: 0.5 });
  assert.equal(crop.cw, 576);
  assert.equal(crop.ch, 360);
  // centerX = 0.55*1920 = 1056; cx = 1056 - 288 = 768
  assert.equal(crop.cx, 768);
  // centerY = 0.525*720 = 378; cy = 378 - 180 = 198
  assert.equal(crop.cy, 198);
});

test("computeCropWindow respects min size floor", () => {
  const diff = { x: 0.5, y: 0.5, w: 0.01, h: 0.01 };
  const crop = computeCropWindow(diff, 1920, 1080, { multiplier: 3, minPx: 400, maxFrac: 0.5 });
  assert.equal(crop.cw, 400);
  assert.equal(crop.ch, 400);
});

test("computeCropWindow caps at maxFrac of frame", () => {
  const diff = { x: 0.1, y: 0.1, w: 0.4, h: 0.4 };
  const crop = computeCropWindow(diff, 1000, 1000, { multiplier: 3, minPx: 400, maxFrac: 0.5 });
  assert.equal(crop.cw, 500);
  assert.equal(crop.ch, 500);
});

test("computeCropWindow clamps to frame bounds at near edge", () => {
  const diff = { x: 0.0, y: 0.0, w: 0.05, h: 0.05 };
  const crop = computeCropWindow(diff, 1920, 1080, { multiplier: 3, minPx: 400, maxFrac: 0.5 });
  assert.equal(crop.cx, 0);
  assert.equal(crop.cy, 0);
});

test("computeCropWindow clamps to frame bounds at far edge", () => {
  const diff = { x: 0.95, y: 0.95, w: 0.05, h: 0.05 };
  const crop = computeCropWindow(diff, 1920, 1080, { multiplier: 3, minPx: 400, maxFrac: 0.5 });
  assert.equal(crop.cx + crop.cw, 1920);
  assert.equal(crop.cy + crop.ch, 1080);
});

test("padBbox expands bbox by padPx on each side", () => {
  const bbox = { x: 0.5, y: 0.5, w: 0.1, h: 0.05 };
  const padded = padBbox(bbox, 1920, 1080, 8);
  // padX = 8/1920 ≈ 0.00417, padY = 8/1080 ≈ 0.00741
  assert.ok(Math.abs(padded.x - (0.5 - 8 / 1920)) < 1e-9);
  assert.ok(Math.abs(padded.y - (0.5 - 8 / 1080)) < 1e-9);
  assert.ok(Math.abs(padded.w - (0.1 + 2 * 8 / 1920)) < 1e-9);
  assert.ok(Math.abs(padded.h - (0.05 + 2 * 8 / 1080)) < 1e-9);
});

test("padBbox clamps to frame bounds at edges", () => {
  const bbox = { x: 0.0, y: 0.0, w: 0.1, h: 0.05 };
  const padded = padBbox(bbox, 1920, 1080, 8);
  assert.equal(padded.x, 0);
  assert.equal(padded.y, 0);
  // width grows only on the right side since left is clamped
  assert.ok(Math.abs(padded.w - (0.1 + 8 / 1920)) < 1e-9);
});

test("padBbox clamps to frame bounds at far edge", () => {
  const bbox = { x: 0.95, y: 0.97, w: 0.05, h: 0.03 };
  const padded = padBbox(bbox, 1920, 1080, 8);
  // right edge clamped at 1, left side grows
  assert.ok(Math.abs(padded.x - (0.95 - 8 / 1920)) < 1e-9);
  assert.ok(Math.abs(padded.x + padded.w - 1) < 1e-9);
  assert.ok(Math.abs(padded.y + padded.h - 1) < 1e-9);
});

test("cropBboxToFullFrame inverts diffBboxInCrop", () => {
  const diff = { x: 0.5, y: 0.5, w: 0.1, h: 0.05 };
  const W = 1920, H = 720;
  const crop = computeCropWindow(diff, W, H, { multiplier: 3, minPx: 400, maxFrac: 0.5 });
  const inCrop = diffBboxInCrop(diff, crop, W, H);
  const roundTrip = cropBboxToFullFrame(inCrop, crop, W, H);
  assert.ok(Math.abs(roundTrip.x - diff.x) < 1e-9);
  assert.ok(Math.abs(roundTrip.y - diff.y) < 1e-9);
  assert.ok(Math.abs(roundTrip.w - diff.w) < 1e-9);
  assert.ok(Math.abs(roundTrip.h - diff.h) < 1e-9);
});
