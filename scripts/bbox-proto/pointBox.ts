/**
 * Point -> box: grow a reliable seed point into the element's box.
 *
 * UI-TARS gives a click point that lands inside the target element (verified
 * 14/14). From that trustworthy seed we recover the box with CV — which is
 * sound here precisely because the seed cannot be wrong:
 *
 *  1. Crop a window around the point; sample its border -> page background.
 *  2. Mark non-background pixels and label 4-connected components.
 *  3. Pick the component whose bounding box contains the seed (largest such —
 *     for a bordered card this is the border ring = the whole card; for a
 *     filled button, the fill; for text, a glyph).
 *  4. Merge-grow along the text line: absorb neighbouring components that sit
 *     on the same row within a small gap. A glyph becomes the whole label +
 *     its checkbox/icon; a solid button stays itself (nothing adjacent).
 *
 * Returns the element box, frame-normalized. Falls back to a small box at the
 * point only if no plausible component is found.
 */
import sharp from "sharp";
import type { Box, Point } from "./contract";

export type PointBoxResult = {
  box: Box; // frame-normalized
  method: "component" | "fallback";
  threshold: number;
  merged: number; // how many components were merged in
};

const THRESHOLDS = [44, 30, 20, 12];

type BoxPx = { x0: number; y0: number; x1: number; y1: number };
const wOf = (b: BoxPx) => b.x1 - b.x0;
const hOf = (b: BoxPx) => b.y1 - b.y0;

export async function pointToBox(
  framePath: string,
  point: Point,
): Promise<PointBoxResult> {
  const meta = await sharp(framePath).metadata();
  const fw = meta.width ?? 1920;
  const fh = meta.height ?? 1080;

  // Crop window around the seed (native resolution).
  const winW = Math.round(fw * 0.42);
  const winH = Math.round(fh * 0.36);
  const ox = Math.round(Math.min(Math.max(point.x * fw - winW / 2, 0), fw - winW));
  const oy = Math.round(Math.min(Math.max(point.y * fh - winH / 2, 0), fh - winH));

  const { data, info } = await sharp(framePath)
    .extract({ left: ox, top: oy, width: winW, height: winH })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, ch = info.channels;

  // Background colour = median of a thin border ring.
  const band = Math.max(2, Math.round(Math.min(w, h) * 0.04));
  const rs: number[] = [], gs: number[] = [], bs: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x >= band && x < w - band && y >= band && y < h - band) continue;
      const i = (y * w + x) * ch;
      rs.push(data[i]); gs.push(data[i + 1]); bs.push(data[i + 2]);
    }
  }
  const med = (a: number[]) => a.sort((p, q) => p - q)[a.length >> 1];
  const [br, bgc, bb] = [med(rs), med(gs), med(bs)];

  // Seed in crop pixels.
  const sx = Math.round(point.x * fw - ox);
  const sy = Math.round(point.y * fh - oy);

  const fallback: PointBoxResult = {
    box: { x: point.x - 0.015, y: point.y - 0.015, w: 0.03, h: 0.03 },
    method: "fallback", threshold: 0, merged: 0,
  };

  for (const threshold of THRESHOLDS) {
    const fg = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * ch;
        const dist = (Math.abs(data[i] - br) + Math.abs(data[i + 1] - bgc) +
          Math.abs(data[i + 2] - bb)) / 3;
        if (dist > threshold) fg[y * w + x] = 1;
      }
    }
    const comps = labelComponents(fg, w, h);
    if (comps.length === 0) continue;

    // Component whose bbox contains the seed; prefer the largest such.
    let seed: BoxPx | null = null;
    for (const c of comps) {
      if (sx >= c.x0 && sx <= c.x1 && sy >= c.y0 && sy <= c.y1) {
        if (!seed || wOf(c) * hOf(c) > wOf(seed) * hOf(seed)) seed = c;
      }
    }
    if (!seed) continue;

    // Merge-grow along the text line: absorb same-row neighbours within a gap.
    let merged = { ...seed };
    let mergedCount = 0;
    for (let pass = 0; pass < 6; pass++) {
      const gap = Math.max(8, hOf(merged) * 1.3);
      let grew = false;
      for (const c of comps) {
        if (c === seed) continue;
        const yo = Math.min(c.y1, merged.y1) - Math.max(c.y0, merged.y0);
        const minH = Math.min(hOf(c), hOf(merged));
        if (yo < minH * 0.4) continue; // not on the same row
        const xgap = Math.max(0, Math.max(c.x0 - merged.x1, merged.x0 - c.x1));
        if (xgap > gap) continue;
        const nx0 = Math.min(merged.x0, c.x0), ny0 = Math.min(merged.y0, c.y0);
        const nx1 = Math.max(merged.x1, c.x1), ny1 = Math.max(merged.y1, c.y1);
        if (nx0 !== merged.x0 || ny0 !== merged.y0 ||
            nx1 !== merged.x1 || ny1 !== merged.y1) {
          merged = { x0: nx0, y0: ny0, x1: nx1, y1: ny1 };
          mergedCount++;
          grew = true;
        }
      }
      if (!grew) break;
    }

    // Gate: reject implausible results (touches window edge / fills it).
    const touchesEdge = merged.x0 <= 0 || merged.y0 <= 0 ||
      merged.x1 >= w - 1 || merged.y1 >= h - 1;
    const fillsWindow = wOf(merged) > w * 0.92 || hOf(merged) > h * 0.92;
    if (touchesEdge || fillsWindow) continue;
    if (wOf(merged) < 3 || hOf(merged) < 3) continue;

    return {
      box: {
        x: (ox + merged.x0) / fw, y: (oy + merged.y0) / fh,
        w: wOf(merged) / fw, h: hOf(merged) / fh,
      },
      method: "component", threshold, merged: mergedCount,
    };
  }
  return fallback;
}

/** Label 4-connected foreground components; return their bounding boxes. */
function labelComponents(fg: Uint8Array, w: number, h: number): BoxPx[] {
  const label = new Int32Array(w * h);
  const stack: number[] = [];
  const comps: BoxPx[] = [];
  for (let s = 0; s < w * h; s++) {
    if (fg[s] === 0 || label[s] !== 0) continue;
    const id = comps.length + 1;
    let x0 = w, y0 = h, x1 = 0, y1 = 0, size = 0;
    stack.length = 0;
    stack.push(s);
    label[s] = id;
    while (stack.length) {
      const p = stack.pop() as number;
      const px = p % w, py = (p / w) | 0;
      size++;
      if (px < x0) x0 = px;
      if (px > x1) x1 = px;
      if (py < y0) y0 = py;
      if (py > y1) y1 = py;
      if (px > 0 && fg[p - 1] && !label[p - 1]) { label[p - 1] = id; stack.push(p - 1); }
      if (px < w - 1 && fg[p + 1] && !label[p + 1]) { label[p + 1] = id; stack.push(p + 1); }
      if (py > 0 && fg[p - w] && !label[p - w]) { label[p - w] = id; stack.push(p - w); }
      if (py < h - 1 && fg[p + w] && !label[p + w]) { label[p + w] = id; stack.push(p + w); }
    }
    // Drop noise specks.
    if (size >= 4) comps.push({ x0, y0, x1, y1 });
  }
  return comps;
}
