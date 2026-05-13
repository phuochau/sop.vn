import { test } from "node:test";
import assert from "node:assert";
import { anchorClickEvents } from "./anchorClickEvents";
import type { ClickEvent } from "@/trigger/lib/clickEventDetect";

function ev(overrides: Partial<ClickEvent> = {}): ClickEvent {
  return {
    time: 0,
    bbox: { x: 0.4, y: 0.4, w: 0.1, h: 0.05 },
    beforeFramePath: "/tmp/before.jpg",
    afterFramePath: "/tmp/after.jpg",
    area: 1000,
    density: 0.7,
    ...overrides,
  };
}

test("anchorClickEvents centers bbox on detected cursor and uses BEFORE frame", async () => {
  const detect = async () => ({ x: 0.5, y: 0.6, score: 0.7 });
  const events = [ev({ bbox: { x: 0.1, y: 0.1, w: 0.12, h: 0.04 } })];
  const anchored = await anchorClickEvents(events, {}, detect);
  assert.equal(anchored.length, 1);
  const a = anchored[0];
  assert.equal(a.cursorAnchored, true);
  assert.equal(a.displayFramePath, "/tmp/before.jpg");
  // bbox centered on cursor
  assert.ok(Math.abs(a.bbox.x + a.bbox.w / 2 - 0.5) < 1e-9, `center x off: ${a.bbox.x + a.bbox.w / 2}`);
  assert.ok(Math.abs(a.bbox.y + a.bbox.h / 2 - 0.6) < 1e-9, `center y off`);
  // bbox size = diff size (within clamp). diff was {w: 0.12, h: 0.04}; both within [min,max].
  assert.ok(Math.abs(a.bbox.w - 0.12) < 1e-9);
  assert.ok(Math.abs(a.bbox.h - 0.04) < 1e-9);
});

test("anchorClickEvents falls back to diff bbox + AFTER frame when cursor not found", async () => {
  const detect = async () => null;
  const events = [ev({ bbox: { x: 0.2, y: 0.2, w: 0.15, h: 0.08 } })];
  const anchored = await anchorClickEvents(events, {}, detect);
  assert.equal(anchored[0].cursorAnchored, false);
  assert.equal(anchored[0].displayFramePath, "/tmp/after.jpg");
  assert.deepEqual(anchored[0].bbox, { x: 0.2, y: 0.2, w: 0.15, h: 0.08 });
});

test("anchorClickEvents clamps bbox size to min and max", async () => {
  const detect = async () => ({ x: 0.5, y: 0.5, score: 0.7 });
  // Tiny diff w/h → should clamp UP to minimum
  const tiny = await anchorClickEvents([ev({ bbox: { x: 0, y: 0, w: 0.01, h: 0.005 } })], {}, detect);
  assert.ok(Math.abs(tiny[0].bbox.w - 0.05) < 1e-9, `tiny w should clamp to min 0.05, got ${tiny[0].bbox.w}`);
  assert.ok(Math.abs(tiny[0].bbox.h - 0.025) < 1e-9);
  // Huge diff → should clamp DOWN to maximum
  const huge = await anchorClickEvents([ev({ bbox: { x: 0, y: 0, w: 0.50, h: 0.30 } })], {}, detect);
  assert.ok(Math.abs(huge[0].bbox.w - 0.20) < 1e-9);
  assert.ok(Math.abs(huge[0].bbox.h - 0.10) < 1e-9);
});

test("anchorClickEvents clamps bbox to image bounds when cursor near edge", async () => {
  const detect = async () => ({ x: 0.02, y: 0.97, score: 0.7 });
  const anchored = await anchorClickEvents([ev()], {}, detect);
  const b = anchored[0].bbox;
  assert.ok(b.x >= 0 && b.x + b.w <= 1, `bbox out of x bounds: ${b.x}+${b.w}`);
  assert.ok(b.y >= 0 && b.y + b.h <= 1, `bbox out of y bounds: ${b.y}+${b.h}`);
});

test("anchorClickEvents threshold reaches detector", async () => {
  let received: number | undefined;
  const detect = async (_p: string, opts?: { threshold?: number }) => {
    received = opts?.threshold;
    return null;
  };
  await anchorClickEvents([ev()], { cursorThreshold: 0.42 }, detect);
  assert.equal(received, 0.42);
});
