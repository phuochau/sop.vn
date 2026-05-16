/**
 * Pixel-snap a box to a UI element's true edges, using OpenCV Canny edges and
 * a projection-profile search. Runs ONLY on a zoomed crop where the element
 * dominates the image — so there are no neighbouring elements to snap onto.
 *
 * Each box edge is moved to the strongest straight edge line within a bounded
 * search band. If no strong line is found on a side, that edge is left where
 * the LLM put it (graceful degradation for borderless targets like text links).
 */
import sharp from "sharp";
import { getCv } from "./cv";
import type { Box } from "./contract";

export type EdgeTrace = { movedPx: number; snapped: boolean };
export type SnapResult = {
  box: Box;
  edges: { top: EdgeTrace; right: EdgeTrace; bottom: EdgeTrace; left: EdgeTrace };
};

export type SnapOpts = {
  searchFrac: number; // band size as fraction of the box's shorter side
  minBandPx: number; // floor for the search band
  minDensity: number; // fraction of the span that must be edge pixels
  cannyLo: number;
  cannyHi: number;
};

export const defaultSnapOpts: SnapOpts = {
  // The starting box comes from a quantized grid cell, so the true edge can be
  // most of a cell away — the search band must be wide enough to reach it.
  searchFrac: 0.3,
  minBandPx: 20,
  minDensity: 0.3,
  cannyLo: 60,
  cannyHi: 180,
};

/** Build a 0/255 edge map for the crop. Returns row-major width*height bytes. */
async function edgeMap(
  cropPath: string,
  opts: SnapOpts,
): Promise<{ data: Uint8Array; w: number; h: number }> {
  const cv = await getCv();
  const { data, info } = await sharp(cropPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  // Build the Mat directly — cv.matFromImageData is browser-oriented and hangs
  // under Node. new Mat + .data.set() is the Node-safe construction.
  const src = new cv.Mat(info.height, info.width, cv.CV_8UC4);
  src.data.set(new Uint8Array(data.buffer, data.byteOffset, data.length));
  const gray = new cv.Mat();
  const edges = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  cv.Canny(gray, edges, opts.cannyLo, opts.cannyHi);
  const out = new Uint8Array(edges.data); // copy out before freeing
  src.delete();
  gray.delete();
  edges.delete();
  return { data: out, w: info.width, h: info.height };
}

/**
 * Find the line (row or column) of strongest edge density within [lo, hi].
 * `density(i)` returns the edge fraction for line index i. Returns the chosen
 * index, or `orig` if nothing crosses minDensity.
 */
function bestLine(
  lo: number,
  hi: number,
  orig: number,
  minDensity: number,
  density: (i: number) => number,
): number {
  let bestIdx = orig;
  let bestDen = minDensity;
  for (let i = lo; i <= hi; i++) {
    const d = density(i);
    // Strict improvement, or equal density but closer to the original edge.
    if (d > bestDen || (d === bestDen && Math.abs(i - orig) < Math.abs(bestIdx - orig))) {
      bestDen = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export async function cvSnap(
  cropPath: string,
  box: Box,
  opts: SnapOpts = defaultSnapOpts,
): Promise<SnapResult> {
  const { data, w, h } = await edgeMap(cropPath, opts);
  const isEdge = (x: number, y: number): boolean =>
    x >= 0 && x < w && y >= 0 && y < h && data[y * w + x] > 0;

  // Box in crop pixels.
  const bx = Math.round(box.x * w);
  const by = Math.round(box.y * h);
  const bw = Math.max(1, Math.round(box.w * w));
  const bh = Math.max(1, Math.round(box.h * h));
  const x2 = bx + bw;
  const y2 = by + bh;

  const band = Math.max(opts.minBandPx, Math.round(Math.min(bw, bh) * opts.searchFrac));
  const clampX = (x: number) => Math.max(0, Math.min(w - 1, x));
  const clampY = (y: number) => Math.max(0, Math.min(h - 1, y));

  // Horizontal-line density (a candidate row), measured across the box's x-span.
  const rowDensity = (r: number): number => {
    let n = 0;
    for (let x = bx; x < x2; x++) if (isEdge(x, r)) n++;
    return n / bw;
  };
  // Vertical-line density (a candidate column), measured across the box's y-span.
  const colDensity = (c: number): number => {
    let n = 0;
    for (let y = by; y < y2; y++) if (isEdge(c, y)) n++;
    return n / bh;
  };

  const top = bestLine(clampY(by - band), clampY(by + band), by, opts.minDensity, rowDensity);
  const bottom = bestLine(clampY(y2 - band), clampY(y2 + band), y2, opts.minDensity, rowDensity);
  const left = bestLine(clampX(bx - band), clampX(bx + band), bx, opts.minDensity, colDensity);
  const right = bestLine(clampX(x2 - band), clampX(x2 + band), x2, opts.minDensity, colDensity);

  // Keep the box non-degenerate; if snapping inverted an edge, fall back.
  const sx = Math.min(left, right) === Math.max(left, right) ? bx : Math.min(left, right);
  const sx2 = Math.max(left, right) > sx ? Math.max(left, right) : x2;
  const sy = Math.min(top, bottom) === Math.max(top, bottom) ? by : Math.min(top, bottom);
  const sy2 = Math.max(top, bottom) > sy ? Math.max(top, bottom) : y2;

  return {
    box: { x: sx / w, y: sy / h, w: (sx2 - sx) / w, h: (sy2 - sy) / h },
    edges: {
      top: { movedPx: top - by, snapped: top !== by },
      right: { movedPx: right - x2, snapped: right !== x2 },
      bottom: { movedPx: bottom - y2, snapped: bottom !== y2 },
      left: { movedPx: left - bx, snapped: left !== bx },
    },
  };
}
