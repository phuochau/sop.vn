import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { detectClickEvents, bboxIou, mergeEvents } from "./clickEventDetect";

async function makeFrame(w: number, h: number, bg: string, rects: { x: number; y: number; w: number; h: number; fill: string }[], outPath: string): Promise<void> {
  const svgRects = rects
    .map(r => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.fill}"/>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${bg}"/>${svgRects}</svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile(outPath);
}

test("detectClickEvents finds a planted localized change", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "click-"));
  try {
    const f0 = path.join(tmp, "f0.jpg");
    const f1 = path.join(tmp, "f1.jpg");
    const f2 = path.join(tmp, "f2.jpg");
    // f1 differs from f0 in a 200x60 rect at (400, 300); f2 same as f1 (stable)
    await makeFrame(1280, 720, "#f5f5f5", [], f0);
    await makeFrame(1280, 720, "#f5f5f5", [{ x: 400, y: 300, w: 200, h: 60, fill: "#000000" }], f1);
    await makeFrame(1280, 720, "#f5f5f5", [{ x: 400, y: 300, w: 200, h: 60, fill: "#000000" }], f2);
    const events = await detectClickEvents([
      { t: 0, localPath: f0 },
      { t: 0.5, localPath: f1 },
      { t: 1.0, localPath: f2 },
    ]);
    assert.equal(events.length, 1, `expected 1 event, got ${events.length}`);
    const e = events[0];
    assert.equal(e.time, 0);
    assert.ok(e.bbox.x > 0.25 && e.bbox.x < 0.40, `bbox.x ${e.bbox.x} not near 0.31`);
    assert.ok(e.bbox.y > 0.35 && e.bbox.y < 0.50, `bbox.y ${e.bbox.y} not near 0.42`);
    assert.ok(e.afterFramePath === f1);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("detectClickEvents returns no events for identical frames", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "click-"));
  try {
    const f0 = path.join(tmp, "f0.jpg");
    const f1 = path.join(tmp, "f1.jpg");
    const f2 = path.join(tmp, "f2.jpg");
    await makeFrame(1280, 720, "#ffffff", [], f0);
    await makeFrame(1280, 720, "#ffffff", [], f1);
    await makeFrame(1280, 720, "#ffffff", [], f2);
    const events = await detectClickEvents([
      { t: 0, localPath: f0 },
      { t: 0.5, localPath: f1 },
      { t: 1.0, localPath: f2 },
    ]);
    assert.equal(events.length, 0);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("detectClickEvents rejects continuous change (simulated video)", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "click-"));
  try {
    const f0 = path.join(tmp, "f0.jpg");
    const f1 = path.join(tmp, "f1.jpg");
    const f2 = path.join(tmp, "f2.jpg");
    // Rect at different positions in each frame: continuous motion
    await makeFrame(1280, 720, "#ffffff", [{ x: 100, y: 100, w: 80, h: 80, fill: "#000000" }], f0);
    await makeFrame(1280, 720, "#ffffff", [{ x: 200, y: 100, w: 80, h: 80, fill: "#000000" }], f1);
    await makeFrame(1280, 720, "#ffffff", [{ x: 300, y: 100, w: 80, h: 80, fill: "#000000" }], f2);
    const events = await detectClickEvents([
      { t: 0, localPath: f0 },
      { t: 0.5, localPath: f1 },
      { t: 1.0, localPath: f2 },
    ]);
    // Steadiness rejects: secondaryMAD ≈ primaryMAD → ratio ≈ 1 > 0.30
    assert.equal(events.length, 0, `expected 0 events for moving rect, got ${events.length}`);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

// Note: a synthetic "typing run" integration test was considered but removed —
// clean SVG characters don't overlap, which is correctly treated as continuous
// motion by the bidirectional steadiness check. Real typing produces overlapping
// fringe diffs from anti-aliasing; that path is exercised in smoke testing.
// The mergeEvents unit test below covers the merge logic in isolation.

test("detectClickEvents rejects overly-large changes", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "click-"));
  try {
    const f0 = path.join(tmp, "f0.jpg");
    const f1 = path.join(tmp, "f1.jpg");
    const f2 = path.join(tmp, "f2.jpg");
    // 60% of frame area changes (e.g., page navigation)
    await makeFrame(1280, 720, "#ffffff", [], f0);
    await makeFrame(1280, 720, "#ffffff", [{ x: 100, y: 100, w: 1080, h: 500, fill: "#000000" }], f1);
    await makeFrame(1280, 720, "#ffffff", [{ x: 100, y: 100, w: 1080, h: 500, fill: "#000000" }], f2);
    const events = await detectClickEvents([
      { t: 0, localPath: f0 },
      { t: 0.5, localPath: f1 },
      { t: 1.0, localPath: f2 },
    ]);
    assert.equal(events.length, 0, `expected 0 events for huge change, got ${events.length}`);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("detectClickEvents accepts last-pair event with no F+2 for steadiness", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "click-"));
  try {
    const f0 = path.join(tmp, "f0.jpg");
    const f1 = path.join(tmp, "f1.jpg");
    await makeFrame(1280, 720, "#f5f5f5", [], f0);
    await makeFrame(1280, 720, "#f5f5f5", [{ x: 400, y: 300, w: 200, h: 60, fill: "#000000" }], f1);
    const events = await detectClickEvents([
      { t: 0, localPath: f0 },
      { t: 0.5, localPath: f1 },
    ]);
    assert.equal(events.length, 1, `expected 1 event on 2-frame input, got ${events.length}`);
  } finally {
    await fs.promises.rm(tmp, { recursive: true, force: true });
  }
});

test("bboxIou identical bboxes returns 1", () => {
  const a = { x: 0.1, y: 0.2, w: 0.3, h: 0.4 };
  assert.ok(Math.abs(bboxIou(a, a) - 1) < 1e-9);
});

test("bboxIou disjoint bboxes returns 0", () => {
  const a = { x: 0, y: 0, w: 0.1, h: 0.1 };
  const b = { x: 0.5, y: 0.5, w: 0.1, h: 0.1 };
  assert.equal(bboxIou(a, b), 0);
});

test("bboxIou half-overlap returns 1/3", () => {
  const a = { x: 0, y: 0, w: 0.2, h: 0.2 };
  const b = { x: 0.1, y: 0, w: 0.2, h: 0.2 };
  const iou = bboxIou(a, b);
  assert.ok(Math.abs(iou - 1 / 3) < 1e-9, `iou ${iou} not 1/3`);
});

test("mergeEvents collapses overlapping consecutive events within window", () => {
  const events = [
    { time: 0.0, bbox: { x: 0.1, y: 0.1, w: 0.1, h: 0.1 }, beforeFramePath: "a0", afterFramePath: "a", area: 100, density: 0.5 },
    { time: 0.5, bbox: { x: 0.12, y: 0.1, w: 0.1, h: 0.1 }, beforeFramePath: "b0", afterFramePath: "b", area: 100, density: 0.5 },
    { time: 5.0, bbox: { x: 0.5, y: 0.5, w: 0.1, h: 0.1 }, beforeFramePath: "c0", afterFramePath: "c", area: 100, density: 0.5 },
  ];
  const merged = mergeEvents(events, 1.5, 0.30);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].time, 0.0);
  assert.equal(merged[0].beforeFramePath, "a0");
  assert.equal(merged[1].time, 5.0);
});
