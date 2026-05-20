import { test } from "node:test";
import assert from "node:assert";
import { rectSvg, circleSvg, screenshotMetaFromAction } from "./uploadScreenshots";
import type { Action } from "@/lib/schemas";

test("rectSvg renders a yellow rect with pixel-scaled coords", () => {
  const svg = rectSvg(1920, 1080, { x: 0.1, y: 0.2, w: 0.3, h: 0.05 });
  assert.ok(svg, "should return an SVG");
  assert.match(svg!, /<svg[^>]*width="1920"[^>]*height="1080"/);
  assert.match(svg!, /<rect[^>]*stroke="#F5C518"/);
  // x ≈ 0.1 * 1920 = 192 (+ stroke/2 inset); width ≈ 0.3 * 1920 = 576 (- stroke)
  assert.match(svg!, /<rect[^>]*x="\d+"[^>]*y="\d+"[^>]*width="\d+"[^>]*height="\d+"/);
});

test("rectSvg returns null on degenerate width", () => {
  assert.equal(rectSvg(1920, 1080, { x: 0.1, y: 0.2, w: 0.001, h: 0.2 }), null);
});

test("rectSvg returns null on degenerate height", () => {
  assert.equal(rectSvg(1920, 1080, { x: 0.1, y: 0.2, w: 0.2, h: 0.001 }), null);
});

test("rectSvg returns null when bbox overshoots right edge beyond tolerance", () => {
  // x + w = 0.9 + 0.5 = 1.4 > 1.05 ⇒ reject
  assert.equal(rectSvg(1920, 1080, { x: 0.9, y: 0.5, w: 0.5, h: 0.2 }), null);
});

test("rectSvg clips mild right-edge overshoot", () => {
  // x + w = 0.9 + 0.15 = 1.05 (within tolerance) ⇒ render with w clipped to 1 - x = 0.1
  const svg = rectSvg(1000, 1000, { x: 0.9, y: 0.2, w: 0.15, h: 0.2 });
  assert.ok(svg);
  // expected pixel width ≈ 0.1 * 1000 = 100, minus stroke; stroke = max(4, round(1000*0.005)) = 5
  // so width attribute ≈ 100 - 5 = 95
  // Extract the rect element first, then find its width attr (avoids capturing stroke-width)
  const rectEl = svg!.match(/<rect[^/]*/)?.[0] ?? "";
  const m = rectEl.match(/\bwidth="(\d+)"/);
  assert.ok(m, "should have a width");
  const px = parseInt(m![1], 10);
  assert.ok(px >= 90 && px <= 100, `expected width near 95, got ${px}`);
});

test("rectSvg rejects strongly negative origin", () => {
  assert.equal(rectSvg(1920, 1080, { x: -0.2, y: 0.2, w: 0.3, h: 0.2 }), null);
});

import fs from "node:fs";
import path from "node:path";
import { buildBufferWithOptionalHighlight } from "./uploadScreenshots";

const FIXTURE = path.join(__dirname, "__fixtures__", "sample-1080p.jpg");

test("buildBufferWithOptionalHighlight returns raw bytes when bbox is null", async () => {
  const raw = await fs.promises.readFile(FIXTURE);
  const { buf, error } = await buildBufferWithOptionalHighlight(FIXTURE, null);
  assert.equal(error, null);
  assert.ok(buf.equals(raw), "should return byte-identical raw file when no highlight");
});

test("buildBufferWithOptionalHighlight returns re-encoded bytes when bbox is valid", async () => {
  const raw = await fs.promises.readFile(FIXTURE);
  const { buf, error } = await buildBufferWithOptionalHighlight(FIXTURE, {
    bbox: { x: 0.1, y: 0.1, w: 0.2, h: 0.1 },
  });
  assert.equal(error, null);
  assert.ok(!buf.equals(raw), "should differ from raw (rectangle composited)");
  assert.ok(buf.length > 100, "should be a non-empty JPEG");
});

test("buildBufferWithOptionalHighlight falls back to raw on degenerate bbox and records the error", async () => {
  const raw = await fs.promises.readFile(FIXTURE);
  const { buf, error } = await buildBufferWithOptionalHighlight(FIXTURE, {
    bbox: { x: 0.1, y: 0.1, w: 0.001, h: 0.1 },
  });
  assert.equal(error, "bbox out of range");
  assert.ok(buf.equals(raw), "should return raw bytes when bbox is invalid");
});

test("circleSvg places a marker at the normalized point", () => {
  const svg = circleSvg(1000, 500, { x: 0.5, y: 0.5 });
  assert.ok(svg.includes('cx="500"'));
  assert.ok(svg.includes('cy="250"'));
  assert.ok(svg.includes("#F5C518"));
});

test("circleSvg clamps an out-of-range point into the frame", () => {
  const svg = circleSvg(1000, 500, { x: 1.4, y: -0.2 });
  assert.ok(svg.includes('cx="1000"'));
  assert.ok(svg.includes('cy="0"'));
});

test("buildBufferWithOptionalHighlight draws a circle for a point geom", async () => {
  const raw = await fs.promises.readFile(FIXTURE);
  const { buf, error } = await buildBufferWithOptionalHighlight(FIXTURE, {
    point: { x: 0.5, y: 0.5 },
  });
  assert.equal(error, null);
  assert.ok(!buf.equals(raw), "should differ from raw (circle composited)");
});

function baseAction(over: Partial<Action>): Action {
  return {
    stepIndex: 0, order: 0, verb: "click", description: "Click Save",
    screenName: "contacts", elementCaption: "Save button",
    displayFramePath: "/f.jpg", time: 5, ...over,
  };
}

test("screenshotMetaFromAction copies automation when present", () => {
  const meta = screenshotMetaFromAction(baseAction({
    automation: {
      action: "click",
      target: { text: "Save", role: "button", location: "toolbar" },
    },
  }));
  assert.equal(meta.automation?.action, "click");
  assert.equal(meta.automation?.target.role, "button");
});

test("screenshotMetaFromAction omits the automation key when the action has none", () => {
  const meta = screenshotMetaFromAction(baseAction({}));
  assert.ok(!("automation" in meta), "automation key should be absent");
});

test("buildBufferWithOptionalHighlight returns image width/height alongside the buffer (no-geom)", async () => {
  const { buf, error, width, height } = await buildBufferWithOptionalHighlight(FIXTURE, null);
  assert.equal(error, null);
  assert.ok(buf.length > 0);
  assert.equal(width, 1920);
  assert.equal(height, 1080);
});

test("buildBufferWithOptionalHighlight returns width/height when compositing a point", async () => {
  const { buf, error, width, height } = await buildBufferWithOptionalHighlight(
    FIXTURE,
    { point: { x: 0.5, y: 0.5 } },
  );
  assert.equal(error, null);
  assert.ok(buf.length > 0);
  assert.equal(width, 1920);
  assert.equal(height, 1080);
});
