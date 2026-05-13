import sharp from "sharp";

const ARROW_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 22" width="16" height="22">
  <path d="M1.5,1 L1.5,17 L5.5,13 L8,18.5 L11,17 L8.5,11.5 L13.5,11.5 Z"
        fill="black" stroke="white" stroke-width="2" stroke-linejoin="round"/>
  <path d="M1.5,1 L1.5,17 L5.5,13 L8,18.5 L11,17 L8.5,11.5 L13.5,11.5 Z" fill="black"/>
</svg>`;

// Pointing-hand link cursor: fingertip up. Tip is at top-center of the bbox.
const HAND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" width="22" height="22">
  <path d="M9,1 C10,1 11,2 11,3 L11,10 L13,10 C14,10 15,10 16,11 L18,13 C19,14 19,15 19,16 L19,19 C19,20 18,21 17,21 L9,21 C8,21 7,20 6,19 L3,15 C2.5,14 3,13 4,13 L5,13 C5.5,13 6,13 6.5,13.5 L7,14 L7,3 C7,2 8,1 9,1 Z"
        fill="black" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M9,1 C10,1 11,2 11,3 L11,10 L13,10 C14,10 15,10 16,11 L18,13 C19,14 19,15 19,16 L19,19 C19,20 18,21 17,21 L9,21 C8,21 7,20 6,19 L3,15 C2.5,14 3,13 4,13 L5,13 C5.5,13 6,13 6.5,13.5 L7,14 L7,3 C7,2 8,1 9,1 Z" fill="black"/>
</svg>`;

type TemplateSpec = {
  svg: string;
  viewBoxW: number;
  viewBoxH: number;
  tipX: number; // tip coordinates in viewBox units
  tipY: number;
};

const TEMPLATE_SPECS: TemplateSpec[] = [
  { svg: ARROW_SVG, viewBoxW: 16, viewBoxH: 22, tipX: 1, tipY: 1 },
  { svg: HAND_SVG, viewBoxW: 22, viewBoxH: 22, tipX: 11, tipY: 1 },
];

type Template = {
  w: number;
  h: number;
  norm: Float32Array;
  tipX: number; // tip coordinates in rasterized pixel units
  tipY: number;
};

let templateCache: Template[] | null = null;

async function rasterize(svg: string, h: number, viewBoxW: number, viewBoxH: number): Promise<{ data: Buffer; w: number; h: number }> {
  const buf = Buffer.from(svg);
  const aspect = viewBoxW / viewBoxH;
  const w = Math.max(4, Math.round(h * aspect));
  const out = await sharp(buf)
    .resize(w, h, { fit: "fill" })
    .flatten({ background: "#ffffff" })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: out.data, w: out.info.width, h: out.info.height };
}

function buildNormalizedTemplate(raw: Buffer, w: number, h: number): Float32Array {
  const n = w * h;
  const t = new Float32Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    t[i] = raw[i];
    sum += t[i];
  }
  const mean = sum / n;
  let sqSum = 0;
  for (let i = 0; i < n; i++) {
    t[i] -= mean;
    sqSum += t[i] * t[i];
  }
  const norm = Math.sqrt(sqSum) || 1;
  for (let i = 0; i < n; i++) t[i] /= norm;
  return t;
}

async function loadTemplates(): Promise<Template[]> {
  if (templateCache) return templateCache;
  const heights = [18, 22, 26];
  const out: Template[] = [];
  for (const spec of TEMPLATE_SPECS) {
    for (const h of heights) {
      const r = await rasterize(spec.svg, h, spec.viewBoxW, spec.viewBoxH);
      const norm = buildNormalizedTemplate(r.data, r.w, r.h);
      const scale = h / spec.viewBoxH;
      out.push({
        w: r.w,
        h: r.h,
        norm,
        tipX: spec.tipX * scale,
        tipY: spec.tipY * scale,
      });
    }
  }
  templateCache = out;
  return templateCache;
}

function buildIntegralImages(I: Float32Array, W: number, H: number): { I1: Float64Array; I2: Float64Array } {
  const stride = W + 1;
  const I1 = new Float64Array(stride * (H + 1));
  const I2 = new Float64Array(stride * (H + 1));
  for (let y = 0; y < H; y++) {
    let rowSum = 0;
    let rowSum2 = 0;
    for (let x = 0; x < W; x++) {
      const v = I[y * W + x];
      rowSum += v;
      rowSum2 += v * v;
      I1[(y + 1) * stride + (x + 1)] = I1[y * stride + (x + 1)] + rowSum;
      I2[(y + 1) * stride + (x + 1)] = I2[y * stride + (x + 1)] + rowSum2;
    }
  }
  return { I1, I2 };
}

function patchSums(I1: Float64Array, I2: Float64Array, W: number, x: number, y: number, tw: number, th: number): { sum: number; sqSum: number } {
  const stride = W + 1;
  const a = y * stride + x;
  const b = y * stride + (x + tw);
  const c = (y + th) * stride + x;
  const d = (y + th) * stride + (x + tw);
  return { sum: I1[d] - I1[b] - I1[c] + I1[a], sqSum: I2[d] - I2[b] - I2[c] + I2[a] };
}

function nccAt(I: Float32Array, W: number, T: Float32Array, tw: number, th: number, x: number, y: number, I1: Float64Array, I2: Float64Array): number {
  const n = tw * th;
  const { sum, sqSum } = patchSums(I1, I2, W, x, y, tw, th);
  const mean = sum / n;
  const variance = sqSum - sum * sum / n;
  if (variance <= 1e-6) return -1;
  const stddev = Math.sqrt(variance);
  let dot = 0;
  for (let j = 0; j < th; j++) {
    const Irow = (y + j) * W + x;
    const Trow = j * tw;
    for (let i = 0; i < tw; i++) {
      dot += (I[Irow + i] - mean) * T[Trow + i];
    }
  }
  return dot / stddev;
}

function nccCoarse(I: Float32Array, W: number, H: number, T: Template, stride: number, I1: Float64Array, I2: Float64Array): { x: number; y: number; score: number } {
  let bestS = -Infinity;
  let bestX = 0;
  let bestY = 0;
  const maxY = H - T.h;
  const maxX = W - T.w;
  for (let y = 0; y <= maxY; y += stride) {
    for (let x = 0; x <= maxX; x += stride) {
      const s = nccAt(I, W, T.norm, T.w, T.h, x, y, I1, I2);
      if (s > bestS) {
        bestS = s;
        bestX = x;
        bestY = y;
      }
    }
  }
  return { x: bestX, y: bestY, score: bestS };
}

function nccRefine(I: Float32Array, W: number, H: number, T: Template, cx: number, cy: number, radius: number, I1: Float64Array, I2: Float64Array): { x: number; y: number; score: number } {
  let bestS = -Infinity;
  let bestX = cx;
  let bestY = cy;
  const x0 = Math.max(0, cx - radius);
  const y0 = Math.max(0, cy - radius);
  const x1 = Math.min(W - T.w, cx + radius);
  const y1 = Math.min(H - T.h, cy + radius);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const s = nccAt(I, W, T.norm, T.w, T.h, x, y, I1, I2);
      if (s > bestS) {
        bestS = s;
        bestX = x;
        bestY = y;
      }
    }
  }
  return { x: bestX, y: bestY, score: bestS };
}

export type CursorDetection = { x: number; y: number; score: number };

export async function detectCursor(
  imagePath: string,
  opts: { threshold?: number } = {},
): Promise<CursorDetection | null> {
  const threshold = opts.threshold ?? 0.55;
  const templates = await loadTemplates();

  const raw = await sharp(imagePath).grayscale().raw().toBuffer({ resolveWithObject: true });
  const W = raw.info.width;
  const H = raw.info.height;
  const I = new Float32Array(W * H);
  const channels = raw.info.channels;
  for (let i = 0; i < W * H; i++) I[i] = raw.data[i * channels];

  const { I1, I2 } = buildIntegralImages(I, W, H);

  let best: { x: number; y: number; score: number; template: Template } | null = null;
  for (const T of templates) {
    if (T.w >= W || T.h >= H) continue;
    const coarse = nccCoarse(I, W, H, T, 4, I1, I2);
    const refined = nccRefine(I, W, H, T, coarse.x, coarse.y, 4, I1, I2);
    if (!best || refined.score > best.score) best = { ...refined, template: T };
  }

  if (!best || best.score < threshold) return null;
  return {
    x: (best.x + best.template.tipX) / W,
    y: (best.y + best.template.tipY) / H,
    score: best.score,
  };
}

/**
 * Verify a cursor exists in a narrow window around a claimed location.
 * Returns full-image-normalized coords on success, or null if no cursor is found.
 * Used to falsify hallucinated cursor claims from an upstream signal.
 */
export async function verifyCursorInWindow(
  imagePath: string,
  cx: number,
  cy: number,
  opts: { windowFrac?: number; threshold?: number } = {},
): Promise<CursorDetection | null> {
  const windowFrac = opts.windowFrac ?? 0.08;
  const threshold = opts.threshold ?? 0.55;
  const cxClamped = Math.max(0, Math.min(1, cx));
  const cyClamped = Math.max(0, Math.min(1, cy));

  const meta = await sharp(imagePath).metadata();
  const imgW = meta.width ?? 0;
  const imgH = meta.height ?? 0;
  if (imgW <= 0 || imgH <= 0) return null;

  const winW = Math.round(windowFrac * imgW);
  const winH = Math.round(windowFrac * imgH);
  if (winW < 30 || winH < 30) return null;

  let x0 = Math.round(cxClamped * imgW - winW / 2);
  let y0 = Math.round(cyClamped * imgH - winH / 2);
  x0 = Math.max(0, Math.min(imgW - winW, x0));
  y0 = Math.max(0, Math.min(imgH - winH, y0));

  const raw = await sharp(imagePath)
    .extract({ left: x0, top: y0, width: winW, height: winH })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const W = raw.info.width;
  const H = raw.info.height;
  const channels = raw.info.channels;
  const I = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) I[i] = raw.data[i * channels];

  const { I1, I2 } = buildIntegralImages(I, W, H);
  const templates = await loadTemplates();

  let best: { x: number; y: number; score: number; template: Template } | null = null;
  for (const T of templates) {
    if (T.w >= W || T.h >= H) continue;
    const coarse = nccCoarse(I, W, H, T, 2, I1, I2);
    const refined = nccRefine(I, W, H, T, coarse.x, coarse.y, 3, I1, I2);
    if (!best || refined.score > best.score) best = { ...refined, template: T };
  }

  if (!best || best.score < threshold) return null;
  return {
    x: (x0 + best.x + best.template.tipX) / imgW,
    y: (y0 + best.y + best.template.tipY) / imgH,
    score: best.score,
  };
}

export const __test = { buildNormalizedTemplate, buildIntegralImages, nccAt, loadTemplates };
