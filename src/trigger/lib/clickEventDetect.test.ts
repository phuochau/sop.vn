import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";
import { mergeEvents, bboxIou, detectClickEvents } from "./clickEventDetect";
import type { ClickEvent } from "./clickEventDetect";

async function makeFrame(w: number, h: number, bg: string, rects: { x: number; y: number; w: number; h: number; fill: string }[], outPath: string): Promise<void> {
  const svgRects = rects
    .map(r => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.fill}"/>`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${bg}"/>${svgRects}</svg>`;
  await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toFile(outPath);
}

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

// --- end-to-end detection tests (restored from pre-rework coverage) ---

test("detectClickEvents finds a planted localized change", async () => {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "click-"));
  try {
    const f0 = path.join(tmp, "f0.jpg");
    const f1 = path.join(tmp, "f1.jpg");
    const f2 = path.join(tmp, "f2.jpg");
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
