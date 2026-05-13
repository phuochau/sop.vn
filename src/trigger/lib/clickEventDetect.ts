import sharp from "sharp";

export type ClickEvent = {
  time: number;
  bbox: { x: number; y: number; w: number; h: number }; // normalized 0..1
  beforeFramePath: string;
  afterFramePath: string;
  area: number;
  density: number;
};

export type ClickDetectOptions = {
  diffThreshold?: number;
  minAreaFrac?: number;
  maxAreaFrac?: number;
  minDensity?: number;
  steadinessThreshold?: number;
  mergeWindowSec?: number;
  mergeIouMin?: number;
  maxEventsPerVideo?: number;
  diffMaxEdge?: number;
};

type GrayFrame = { data: Uint8Array; w: number; h: number };

async function loadGrayscale(path: string, maxEdge: number): Promise<GrayFrame> {
  const meta = await sharp(path).metadata();
  const w0 = meta.width ?? 0;
  const h0 = meta.height ?? 0;
  if (w0 <= 0 || h0 <= 0) throw new Error(`bad image dimensions: ${w0}x${h0} for ${path}`);
  const longest = Math.max(w0, h0);
  const pipeline = longest > maxEdge
    ? sharp(path).resize({ width: maxEdge, height: maxEdge, fit: "inside" })
    : sharp(path);
  const raw = await pipeline.grayscale().raw().toBuffer({ resolveWithObject: true });
  const channels = raw.info.channels;
  const W = raw.info.width;
  const H = raw.info.height;
  const data = new Uint8Array(W * H);
  if (channels === 1) {
    data.set(raw.data);
  } else {
    for (let i = 0; i < W * H; i++) data[i] = raw.data[i * channels];
  }
  return { data, w: W, h: H };
}

function pixelDiffMask(a: GrayFrame, b: GrayFrame, threshold: number): Uint8Array {
  if (a.w !== b.w || a.h !== b.h) throw new Error("frame size mismatch");
  const n = a.w * a.h;
  const mask = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const d = Math.abs(a.data[i] - b.data[i]);
    if (d > threshold) mask[i] = 1;
  }
  return mask;
}

type Component = {
  area: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

function connectedComponentsLargest(mask: Uint8Array, W: number, H: number): Component | null {
  const labels = new Int32Array(W * H);
  const queue = new Int32Array(W * H);
  let best: Component | null = null;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = y * W + x;
      if (mask[idx] !== 1 || labels[idx] !== 0) continue;
      let qHead = 0;
      let qTail = 0;
      queue[qTail++] = idx;
      labels[idx] = 1;
      let area = 0;
      let minX = x, maxX = x, minY = y, maxY = y;
      while (qHead < qTail) {
        const p = queue[qHead++];
        const py = (p / W) | 0;
        const px = p - py * W;
        area++;
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
        // 4-connectivity
        if (px > 0 && mask[p - 1] === 1 && labels[p - 1] === 0) { labels[p - 1] = 1; queue[qTail++] = p - 1; }
        if (px + 1 < W && mask[p + 1] === 1 && labels[p + 1] === 0) { labels[p + 1] = 1; queue[qTail++] = p + 1; }
        if (py > 0 && mask[p - W] === 1 && labels[p - W] === 0) { labels[p - W] = 1; queue[qTail++] = p - W; }
        if (py + 1 < H && mask[p + W] === 1 && labels[p + W] === 0) { labels[p + W] = 1; queue[qTail++] = p + W; }
      }
      if (!best || area > best.area) {
        best = { area, minX, maxX, minY, maxY };
      }
    }
  }
  return best;
}

function meanAbsDiffOverBbox(a: GrayFrame, b: GrayFrame, minX: number, minY: number, maxX: number, maxY: number): number {
  let sum = 0;
  let count = 0;
  const W = a.w;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const i = y * W + x;
      sum += Math.abs(a.data[i] - b.data[i]);
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

export function bboxIou(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);
  if (x2 <= x1 || y2 <= y1) return 0;
  const inter = (x2 - x1) * (y2 - y1);
  const ua = a.w * a.h + b.w * b.h - inter;
  return ua > 0 ? inter / ua : 0;
}

function bboxUnion(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): { x: number; y: number; w: number; h: number } {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.w, b.x + b.w);
  const y2 = Math.max(a.y + a.h, b.y + b.h);
  return { x, y, w: x2 - x, h: y2 - y };
}

export function mergeEvents(events: ClickEvent[], windowSec: number, iouMin: number): ClickEvent[] {
  if (events.length <= 1) return events;
  const out: ClickEvent[] = [];
  let current = events[0];
  for (let i = 1; i < events.length; i++) {
    const next = events[i];
    if (next.time - current.time < windowSec && bboxIou(current.bbox, next.bbox) >= iouMin) {
      const union = bboxUnion(current.bbox, next.bbox);
      current = {
        time: current.time,
        bbox: union,
        beforeFramePath: current.beforeFramePath,
        afterFramePath: next.afterFramePath,
        area: current.area + next.area,
        density: Math.min(current.density, next.density),
      };
    } else {
      out.push(current);
      current = next;
    }
  }
  out.push(current);
  return out;
}

export async function detectClickEvents(
  frames: { t: number; localPath: string }[],
  opts: ClickDetectOptions = {},
): Promise<ClickEvent[]> {
  const diffThreshold = opts.diffThreshold ?? 25;
  const minAreaFrac = opts.minAreaFrac ?? 0.003;
  const maxAreaFrac = opts.maxAreaFrac ?? 0.20;
  const minDensity = opts.minDensity ?? 0.20;
  const steadinessThreshold = opts.steadinessThreshold ?? 0.30;
  const mergeWindowSec = opts.mergeWindowSec ?? 1.5;
  const mergeIouMin = opts.mergeIouMin ?? 0.30;
  const maxEvents = opts.maxEventsPerVideo ?? 60;
  const diffMaxEdge = opts.diffMaxEdge ?? 640;

  if (frames.length < 2) return [];

  // Pre-compute total mask area per adjacent pair. Used for both forward and
  // backward steadiness comparisons: a real click is preceded AND followed by
  // stillness; continuous motion has comparable mask areas in neighboring pairs.
  const pairs: { mask: Uint8Array; maskArea: number; gray0: GrayFrame; gray1: GrayFrame }[] = [];
  let g0 = await loadGrayscale(frames[0].localPath, diffMaxEdge);
  for (let i = 0; i < frames.length - 1; i++) {
    const g1 = await loadGrayscale(frames[i + 1].localPath, diffMaxEdge);
    if (g0.w !== g1.w || g0.h !== g1.h) {
      pairs.push({ mask: new Uint8Array(0), maskArea: 0, gray0: g0, gray1: g1 });
    } else {
      const mask = pixelDiffMask(g0, g1, diffThreshold);
      let area = 0;
      for (let p = 0; p < mask.length; p++) area += mask[p];
      pairs.push({ mask, maskArea: area, gray0: g0, gray1: g1 });
    }
    g0 = g1;
  }

  const events: ClickEvent[] = [];

  for (let i = 0; i < pairs.length; i++) {
    const pair = pairs[i];
    if (pair.maskArea === 0) continue;
    const W = pair.gray0.w;
    const H = pair.gray0.h;
    const totalPixels = W * H;
    const component = connectedComponentsLargest(pair.mask, W, H);
    if (!component) continue;

    const minArea = minAreaFrac * totalPixels;
    const maxArea = maxAreaFrac * totalPixels;
    if (component.area < minArea || component.area > maxArea) continue;

    const bboxW = component.maxX - component.minX + 1;
    const bboxH = component.maxY - component.minY + 1;
    const density = component.area / (bboxW * bboxH);
    if (density < minDensity) continue;

    // Steadiness: reject if EITHER neighboring pair has a comparable mask area
    // (continuous motion). A real click is bracketed by relatively still frames.
    if (component.area >= 1) {
      const fwd = i + 1 < pairs.length ? pairs[i + 1].maskArea / component.area : 0;
      const bwd = i > 0 ? pairs[i - 1].maskArea / component.area : 0;
      if (fwd > steadinessThreshold || bwd > steadinessThreshold) continue;
    }

    events.push({
      time: frames[i].t,
      bbox: {
        x: component.minX / W,
        y: component.minY / H,
        w: bboxW / W,
        h: bboxH / H,
      },
      beforeFramePath: frames[i].localPath,
      afterFramePath: frames[i + 1].localPath,
      area: component.area,
      density,
    });
  }

  // Temporal merge across pairs
  const merged = mergeEvents(events, mergeWindowSec, mergeIouMin);

  // Cap by area*density (importance proxy)
  if (merged.length <= maxEvents) return merged;
  return [...merged]
    .sort((a, b) => b.area * b.density - a.area * a.density)
    .slice(0, maxEvents)
    .sort((a, b) => a.time - b.time);
}
