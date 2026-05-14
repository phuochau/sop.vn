import sharp from "sharp";
import { hammingDistance } from "./perceptualHash";

export type DensePoolFrame = { t: number; localPath: string };

export type ScreenCluster = {
  letter: string;            // "A", "B", "C", ...
  representative: DensePoolFrame;
  members: DensePoolFrame[];
  timeSpan: { start: number; end: number };
  dHash: string;
};

const TOP_MASK_FRAC = 0.06;
const BOTTOM_MASK_FRAC = 0.08;

/**
 * dHash of a frame after masking the top URL/tab strip and bottom chat widget area.
 */
export async function maskedDHash(imagePath: string): Promise<string> {
  const W = 9;
  const H = 8;
  const { data } = await sharp(imagePath)
    .grayscale()
    .resize(W, H, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const topRowsMasked = Math.round(H * TOP_MASK_FRAC); // for H=8: 0 rows
  const bottomRowsMasked = Math.round(H * BOTTOM_MASK_FRAC); // for H=8: 1 row

  const buf = Buffer.from(data);
  for (let row = 0; row < topRowsMasked; row++) {
    for (let col = 0; col < W; col++) buf[row * W + col] = 128;
  }
  for (let row = H - bottomRowsMasked; row < H; row++) {
    for (let col = 0; col < W; col++) buf[row * W + col] = 128;
  }

  const bits: number[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = buf[row * W + col];
      const right = buf[row * W + col + 1];
      bits.push(left < right ? 1 : 0);
    }
  }
  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    const nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3];
    hex += nibble.toString(16);
  }
  return hex;
}

function sampleFramesInRange(denseFrames: DensePoolFrame[], start: number, end: number, samplingSec: number): DensePoolFrame[] {
  if (denseFrames.length === 0) return [];
  const sorted = [...denseFrames].sort((a, b) => a.t - b.t);
  const sampled: DensePoolFrame[] = [];
  let nextAnchor = start;
  for (const f of sorted) {
    if (f.t < start || f.t > end) continue;
    if (f.t + 1e-6 >= nextAnchor) {
      sampled.push(f);
      nextAnchor = f.t + samplingSec;
    }
  }
  return sampled;
}

export async function buildScreenClusters(args: {
  denseFrames: DensePoolFrame[];
  stepStart: number;
  stepEnd: number;
  samplingSec: number;
  hammingThreshold: number;
}): Promise<ScreenCluster[]> {
  const sampled = sampleFramesInRange(args.denseFrames, args.stepStart, args.stepEnd, args.samplingSec);
  if (sampled.length === 0) return [];

  const hashes: { frame: DensePoolFrame; hash: string }[] = [];
  for (const f of sampled) {
    hashes.push({ frame: f, hash: await maskedDHash(f.localPath) });
  }

  // Single-linkage cluster by Hamming <= threshold against any cluster member.
  const clusters: { hash: string; members: typeof hashes }[] = [];
  for (const h of hashes) {
    let placed = false;
    for (const c of clusters) {
      const close = c.members.some(m => hammingDistance(m.hash, h.hash) <= args.hammingThreshold);
      if (close) {
        c.members.push(h);
        placed = true;
        break;
      }
    }
    if (!placed) clusters.push({ hash: h.hash, members: [h] });
  }

  // Order clusters by earliest member's time so letters are stable.
  clusters.sort((a, b) => a.members[0].frame.t - b.members[0].frame.t);

  return clusters.map((c, i) => {
    const members = c.members.map(m => m.frame);
    const start = members[0].t;
    const end = members[members.length - 1].t;
    // Representative = the cluster member nearest the median sampled timestamp.
    // Spec §5 step 4 uses this for View card displayFramePath.
    const median = (start + end) / 2;
    const representative = [...members].sort(
      (a, b) => Math.abs(a.t - median) - Math.abs(b.t - median),
    )[0];
    return {
      letter: String.fromCharCode("A".charCodeAt(0) + i),
      representative,
      members,
      timeSpan: { start, end },
      dHash: c.hash,
    };
  });
}
