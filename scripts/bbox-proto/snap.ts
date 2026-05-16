/**
 * Pixel-snap a UI element's bounding box by edge projection.
 *
 * The LLM grid-locate says WHICH element and gives a box that is ~15-30% loose.
 * This module snaps each of the four edges to the element's true pixel edge.
 *
 * Method — per-edge gradient projection:
 *  - Compute the Sobel gradient of the crop.
 *  - For the left edge: scan candidate columns in a band around the LLM edge.
 *    Score each column by COVERAGE — the fraction of the box's height where the
 *    vertical-edge gradient (|Gx|) is strong. A real border is a continuous
 *    line, so it covers ~the whole edge; text glyphs cover only ~30%, flat
 *    regions ~0%. The winning column is the snapped left edge.
 *  - Right edge likewise; top/bottom use horizontal-edge gradient (|Gy|).
 *
 * Why coverage (not average strength):
 *  - Text inside an element produces strong but INTERMITTENT gradients — high
 *    average, low coverage. Averaging snapped edges onto text; coverage does
 *    not, because text never spans a whole edge.
 *  - The mouse cursor is a small blob — negligible coverage of a full edge.
 *  - It is contrast-relative, so it works on dark themes as well as light.
 *  - Each edge is gated: it only moves when a line covers most of the edge AND
 *    stands well above the band's median. A borderless edge — e.g. the top of a
 *    plain list row — finds nothing and keeps the LLM edge. Snapping only ever
 *    tightens a confident edge; it never makes a box worse.
 */
import sharp from "sharp";
import type { Box } from "./contract";

export type EdgeSnap = { moved: boolean; fromPx: number; toPx: number };
export type SnapResult = {
  box: Box; // crop-normalized
  snapped: boolean; // at least one edge moved
  method: "edge_projection";
  edges: { left: EdgeSnap; right: EdgeSnap; top: EdgeSnap; bottom: EdgeSnap };
};

export type SnapOpts = {
  /** Search band per edge, as a fraction of the box's size on that axis. */
  bandFrac: number;
  /** Floor for the band in pixels. */
  minBandPx: number;
  /** Per-pixel Sobel magnitude that counts as "on an edge". */
  pixThreshold: number;
  /** Winning coverage must exceed this fraction of the edge length. */
  minCoverage: number;
  /** Winning coverage must also exceed this multiple of the band's median. */
  prominence: number;
};

export const defaultSnapOpts: SnapOpts = {
  bandFrac: 0.28,
  minBandPx: 10,
  pixThreshold: 36,
  minCoverage: 0.55,
  prominence: 1.6,
};

type Grad = { gx: Float32Array; gy: Float32Array; w: number; h: number };

/** Sobel gradient magnitudes of the crop, on greyscale. */
async function gradient(cropPath: string): Promise<Grad> {
  const { data, info } = await sharp(cropPath)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const g = data; // 1 channel
  const gx = new Float32Array(w * h);
  const gy = new Float32Array(w * h);
  const at = (x: number, y: number) => g[y * w + x];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const tl = at(x - 1, y - 1), tc = at(x, y - 1), tr = at(x + 1, y - 1);
      const ml = at(x - 1, y), mr = at(x + 1, y);
      const bl = at(x - 1, y + 1), bc = at(x, y + 1), br = at(x + 1, y + 1);
      gx[y * w + x] = Math.abs(tr + 2 * mr + br - tl - 2 * ml - bl);
      gy[y * w + x] = Math.abs(bl + 2 * bc + br - tl - 2 * tc - tr);
    }
  }
  return { gx, gy, w, h };
}

const clampi = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

/**
 * Snap one edge. `coverage(i)` is the edge-line coverage (0-1) at position i;
 * search [lo,hi] for the best-covered line. Returns the snapped position, or
 * `orig` when no line covers enough of the edge.
 */
function snapEdge(
  lo: number, hi: number, orig: number, opts: SnapOpts,
  coverage: (i: number) => number,
): number {
  if (hi <= lo) return orig;
  const scores: number[] = [];
  let bestIdx = orig;
  let bestScore = -1;
  for (let i = lo; i <= hi; i++) {
    const s = coverage(i);
    scores.push(s);
    // Prefer better coverage; on a tie, the line closer to the original edge.
    if (s > bestScore || (s === bestScore && Math.abs(i - orig) < Math.abs(bestIdx - orig))) {
      bestScore = s;
      bestIdx = i;
    }
  }
  const sorted = [...scores].sort((a, b) => a - b);
  const median = sorted[sorted.length >> 1] || 0;
  if (bestScore < opts.minCoverage || bestScore < opts.prominence * Math.max(median, 0.05)) {
    return orig; // no continuous edge stands out — keep the LLM edge
  }
  return bestIdx;
}

/**
 * Snap `approx` (crop-normalized) to the element's pixel edges in `cropPath`.
 */
export async function snapToElement(
  cropPath: string,
  approx: Box,
  opts: SnapOpts = defaultSnapOpts,
): Promise<SnapResult> {
  const { gx, gy, w, h } = await gradient(cropPath);

  const bx = approx.x * w;
  const by = approx.y * h;
  const bw = approx.w * w;
  const bh = approx.h * h;
  const x0 = bx, x1 = bx + bw, y0 = by, y1 = by + bh;

  const bandX = Math.max(opts.minBandPx, Math.round(bw * opts.bandFrac));
  const bandY = Math.max(opts.minBandPx, Math.round(bh * opts.bandFrac));

  // Inner y-range used to score vertical edges, and x-range for horizontal —
  // shrunk slightly so a loose perpendicular edge does not dilute the score.
  const iy0 = clampi(Math.round(y0 + bh * 0.12), 1, h - 2);
  const iy1 = clampi(Math.round(y1 - bh * 0.12), 1, h - 2);
  const ix0 = clampi(Math.round(x0 + bw * 0.12), 1, w - 2);
  const ix1 = clampi(Math.round(x1 - bw * 0.12), 1, w - 2);

  const pt = opts.pixThreshold;
  // Vertical-edge coverage of column c: fraction of the box height where the
  // horizontal gradient is strong (i.e. a continuous vertical line).
  const colScore = (c: number): number => {
    if (c < 1 || c >= w - 1 || iy1 <= iy0) return 0;
    let n = 0;
    for (let y = iy0; y <= iy1; y++) if (gx[y * w + c] > pt) n++;
    return n / (iy1 - iy0 + 1);
  };
  // Horizontal-edge coverage of row r: fraction of the box width where the
  // vertical gradient is strong (i.e. a continuous horizontal line).
  const rowScore = (r: number): number => {
    if (r < 1 || r >= h - 1 || ix1 <= ix0) return 0;
    let n = 0;
    for (let x = ix0; x <= ix1; x++) if (gy[r * w + x] > pt) n++;
    return n / (ix1 - ix0 + 1);
  };

  const left = snapEdge(
    clampi(Math.round(x0 - bandX), 1, w - 2),
    clampi(Math.round(x0 + bandX), 1, w - 2),
    Math.round(x0), opts, colScore);
  const right = snapEdge(
    clampi(Math.round(x1 - bandX), 1, w - 2),
    clampi(Math.round(x1 + bandX), 1, w - 2),
    Math.round(x1), opts, colScore);
  const top = snapEdge(
    clampi(Math.round(y0 - bandY), 1, h - 2),
    clampi(Math.round(y0 + bandY), 1, h - 2),
    Math.round(y0), opts, rowScore);
  const bottom = snapEdge(
    clampi(Math.round(y1 - bandY), 1, h - 2),
    clampi(Math.round(y1 + bandY), 1, h - 2),
    Math.round(y1), opts, rowScore);

  // Keep the box non-degenerate; if a snap inverted an edge, drop that pair.
  const sx0 = right > left ? left : Math.round(x0);
  const sx1 = right > left ? right : Math.round(x1);
  const sy0 = bottom > top ? top : Math.round(y0);
  const sy1 = bottom > top ? bottom : Math.round(y1);

  const edge = (from: number, to: number): EdgeSnap => ({
    moved: from !== to, fromPx: from, toPx: to,
  });
  return {
    box: { x: sx0 / w, y: sy0 / h, w: (sx1 - sx0) / w, h: (sy1 - sy0) / h },
    snapped: sx0 !== Math.round(x0) || sx1 !== Math.round(x1) ||
      sy0 !== Math.round(y0) || sy1 !== Math.round(y1),
    method: "edge_projection",
    edges: {
      left: edge(Math.round(x0), sx0), right: edge(Math.round(x1), sx1),
      top: edge(Math.round(y0), sy0), bottom: edge(Math.round(y1), sy1),
    },
  };
}
