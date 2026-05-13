export type Bbox = { x: number; y: number; w: number; h: number };
export type CropWindow = { cx: number; cy: number; cw: number; ch: number };

export function computeCropWindow(
  diff: Bbox,
  frameW: number,
  frameH: number,
  opts: { multiplier: number; minPx: number; maxFrac: number },
): CropWindow {
  const diffW = diff.w * frameW;
  const diffH = diff.h * frameH;
  const targetW = Math.max(diffW * opts.multiplier, opts.minPx);
  const targetH = Math.max(diffH * opts.multiplier, opts.minPx);
  const maxW = frameW * opts.maxFrac;
  const maxH = frameH * opts.maxFrac;
  const cw = Math.round(Math.min(targetW, maxW));
  const ch = Math.round(Math.min(targetH, maxH));
  const centerX = (diff.x + diff.w / 2) * frameW;
  const centerY = (diff.y + diff.h / 2) * frameH;
  let cx = Math.round(centerX - cw / 2);
  let cy = Math.round(centerY - ch / 2);
  cx = Math.max(0, Math.min(frameW - cw, cx));
  cy = Math.max(0, Math.min(frameH - ch, cy));
  return { cx, cy, cw, ch };
}

export function diffBboxInCrop(diff: Bbox, crop: CropWindow, frameW: number, frameH: number): Bbox {
  const fxPx = diff.x * frameW;
  const fyPx = diff.y * frameH;
  const fwPx = diff.w * frameW;
  const fhPx = diff.h * frameH;
  return {
    x: (fxPx - crop.cx) / crop.cw,
    y: (fyPx - crop.cy) / crop.ch,
    w: fwPx / crop.cw,
    h: fhPx / crop.ch,
  };
}

export function cropBboxToFullFrame(cropBbox: Bbox, crop: CropWindow, frameW: number, frameH: number): Bbox {
  return {
    x: (crop.cx + cropBbox.x * crop.cw) / frameW,
    y: (crop.cy + cropBbox.y * crop.ch) / frameH,
    w: (cropBbox.w * crop.cw) / frameW,
    h: (cropBbox.h * crop.ch) / frameH,
  };
}

export function padBbox(bbox: Bbox, frameW: number, frameH: number, padPx: number): Bbox {
  const padX = padPx / frameW;
  const padY = padPx / frameH;
  const x = Math.max(0, bbox.x - padX);
  const y = Math.max(0, bbox.y - padY);
  const rightEdge = Math.min(1, bbox.x + bbox.w + padX);
  const bottomEdge = Math.min(1, bbox.y + bbox.h + padY);
  return { x, y, w: rightEdge - x, h: bottomEdge - y };
}
