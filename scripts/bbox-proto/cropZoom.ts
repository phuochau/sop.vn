/**
 * Crop a window out of the full-resolution frame and upscale it so the target
 * element fills the image — for grid-based refine.
 *
 * `cropAroundPoint` opens the first window around the coarse point.
 * `cropRegion` opens a tighter window around an already-found box, which is how
 * iterative zoom-refine works: each pass crops closer, so the refine grid's
 * cells cover fewer and fewer frame pixels and the box gets progressively
 * tighter.
 *
 * `cropBoxToFrame` maps a crop-space box back to frame-normalized coordinates.
 */
import path from "node:path";
import sharp from "sharp";
import type { Box, Point } from "./contract";

/** Crop rectangle in frame pixels, plus the frame size. */
export type CropMap = {
  ox: number;
  oy: number;
  cw: number;
  ch: number;
  frameW: number;
  frameH: number;
};

export type CropResult = { cropPath: string; map: CropMap };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Crop the pixel rectangle [w×h] centred on (cx,cy), aspect-clamped and shifted
 * fully inside the frame, then upscale so the longest edge is `targetEdgePx`.
 */
async function cropCenteredRect(
  framePath: string,
  frameW: number,
  frameH: number,
  cx: number,
  cy: number,
  w: number,
  h: number,
  maxAspect: number,
  targetEdgePx: number,
  outPath: string,
): Promise<CropResult> {
  // Hard-clamp aspect ratio by growing the short side.
  if (w / h > maxAspect) h = w / maxAspect;
  if (h / w > maxAspect) w = h / maxAspect;
  w = Math.min(w, frameW);
  h = Math.min(h, frameH);

  const ox = Math.round(clamp(cx - w / 2, 0, frameW - w));
  const oy = Math.round(clamp(cy - h / 2, 0, frameH - h));
  const cw = Math.max(1, Math.round(w));
  const ch = Math.max(1, Math.round(h));

  const scale = targetEdgePx / Math.max(cw, ch);
  await sharp(framePath)
    .extract({ left: ox, top: oy, width: cw, height: ch })
    .resize({ width: Math.round(cw * scale), height: Math.round(ch * scale) })
    .jpeg({ quality: 92 })
    .toFile(outPath);

  return { cropPath: outPath, map: { ox, oy, cw, ch, frameW, frameH } };
}

async function frameSize(framePath: string): Promise<{ w: number; h: number }> {
  const meta = await sharp(framePath).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (!w || !h) throw new Error("frameSize: missing image metadata");
  return { w, h };
}

export type PointCropOpts = {
  cropWFrac: number;
  cropHFrac: number;
  maxAspect: number;
  targetEdgePx: number;
};

/** First window: a fixed fraction of the frame, centred on the coarse point. */
export async function cropAroundPoint(
  framePath: string,
  point: Point,
  outPath: string,
  opts: PointCropOpts,
): Promise<CropResult> {
  const { w: fw, h: fh } = await frameSize(framePath);
  return cropCenteredRect(
    framePath, fw, fh, point.x * fw, point.y * fh,
    opts.cropWFrac * fw, opts.cropHFrac * fh,
    opts.maxAspect, opts.targetEdgePx, outPath,
  );
}

export type RegionCropOpts = {
  marginFrac: number; // expand the region by this fraction of its size per side
  maxAspect: number;
  targetEdgePx: number;
};

/** Tighter window: around an already-found box, expanded by a margin. */
export async function cropRegion(
  framePath: string,
  region: Box,
  outPath: string,
  opts: RegionCropOpts,
): Promise<CropResult> {
  const { w: fw, h: fh } = await frameSize(framePath);
  const cx = (region.x + region.w / 2) * fw;
  const cy = (region.y + region.h / 2) * fh;
  const w = region.w * fw * (1 + 2 * opts.marginFrac);
  const h = region.h * fh * (1 + 2 * opts.marginFrac);
  return cropCenteredRect(
    framePath, fw, fh, cx, cy, w, h, opts.maxAspect, opts.targetEdgePx, outPath,
  );
}

/** Map a frame-normalized box into crop-space normalized coordinates. */
export function frameBoxToCrop(box: Box, map: CropMap): Box {
  return {
    x: (box.x * map.frameW - map.ox) / map.cw,
    y: (box.y * map.frameH - map.oy) / map.ch,
    w: (box.w * map.frameW) / map.cw,
    h: (box.h * map.frameH) / map.ch,
  };
}

/** Map a crop-space normalized box back to frame-normalized coordinates. */
export function cropBoxToFrame(box: Box, map: CropMap): Box {
  const fx = map.ox + box.x * map.cw;
  const fy = map.oy + box.y * map.ch;
  return {
    x: fx / map.frameW,
    y: fy / map.frameH,
    w: (box.w * map.cw) / map.frameW,
    h: (box.h * map.ch) / map.frameH,
  };
}
