import { test } from "node:test";
import assert from "node:assert";
import { rectSvg } from "./uploadScreenshots";

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
import { buildUploadBuffer } from "./uploadScreenshots";

const FIXTURE = path.join(__dirname, "__fixtures__", "sample-1080p.jpg");

test("buildUploadBuffer returns raw bytes when highlight is null", async () => {
  const raw = await fs.promises.readFile(FIXTURE);
  const { buf, error } = await buildUploadBuffer(FIXTURE, null);
  assert.equal(error, null);
  assert.ok(buf.equals(raw), "should return byte-identical raw file when no highlight");
});

test("buildUploadBuffer returns re-encoded bytes when highlight is valid", async () => {
  const raw = await fs.promises.readFile(FIXTURE);
  const { buf, error } = await buildUploadBuffer(FIXTURE, {
    kind: "click",
    bbox: { x: 0.1, y: 0.1, w: 0.2, h: 0.1 },
  });
  assert.equal(error, null);
  assert.ok(!buf.equals(raw), "should differ from raw (rectangle composited)");
  assert.ok(buf.length > 100, "should be a non-empty JPEG");
});

test("buildUploadBuffer falls back to raw on degenerate bbox and records the error", async () => {
  const raw = await fs.promises.readFile(FIXTURE);
  const { buf, error } = await buildUploadBuffer(FIXTURE, {
    kind: "click",
    bbox: { x: 0.1, y: 0.1, w: 0.001, h: 0.1 },
  });
  assert.equal(error, "bbox out of range");
  assert.ok(buf.equals(raw), "should return raw bytes when bbox is invalid");
});
