import sharp from "sharp";
import { hammingDistance } from "./perceptualHash";

export type DensePoolFrame = { t: number; localPath: string };

export type ClusterMember = { frame: DensePoolFrame; dHash: string };

export type ScreenCluster = {
  letter: string;
  representative: DensePoolFrame;
  members: ClusterMember[];
  timeSpan: { start: number; end: number };
  dHash: string;
};

const TOP_MASK_FRAC = 0.06;
const BOTTOM_MASK_FRAC = 0.08;

export async function maskedDHash(imagePath: string): Promise<string> {
  const W = 9;
  const H = 8;
  const { data } = await sharp(imagePath)
    .grayscale()
    .resize(W, H, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const topRowsMasked = Math.round(H * TOP_MASK_FRAC);
  const bottomRowsMasked = Math.round(H * BOTTOM_MASK_FRAC);

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

function chooseCentroid(members: ClusterMember[]): ClusterMember {
  if (members.length === 1) return members[0];
  let bestIdx = 0;
  let bestSum = Infinity;
  for (let i = 0; i < members.length; i++) {
    let sum = 0;
    for (let j = 0; j < members.length; j++) {
      if (i === j) continue;
      sum += hammingDistance(members[i].dHash, members[j].dHash);
    }
    if (sum < bestSum || (sum === bestSum && members[i].frame.t < members[bestIdx].frame.t)) {
      bestSum = sum;
      bestIdx = i;
    }
  }
  return members[bestIdx];
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

  const clusters: { seedHash: string; members: typeof hashes }[] = [];
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
    if (!placed) clusters.push({ seedHash: h.hash, members: [h] });
  }

  clusters.sort((a, b) => a.members[0].frame.t - b.members[0].frame.t);

  return clusters.map((c, i) => {
    const members: ClusterMember[] = c.members.map(m => ({ frame: m.frame, dHash: m.hash }));
    const times = members.map(m => m.frame.t);
    const centroid = chooseCentroid(members);
    return {
      letter: String.fromCharCode("A".charCodeAt(0) + i),
      representative: centroid.frame,
      members,
      timeSpan: { start: Math.min(...times), end: Math.max(...times) },
      dHash: c.seedHash,
    };
  });
}

export function clusterFor(letter: string | null, clusters: ScreenCluster[]): ScreenCluster | null {
  if (!letter) return null;
  return clusters.find(c => c.letter === letter) ?? null;
}

export function selectInClusterFrame(
  cluster: ScreenCluster,
  window: { start: number; end: number },
): DensePoolFrame {
  const inWindow = cluster.members.filter(m => m.frame.t >= window.start && m.frame.t <= window.end);
  if (inWindow.length === 0) return cluster.representative;
  const repMember = cluster.members.find(m => m.frame.localPath === cluster.representative.localPath) ?? cluster.members[0];
  let best = inWindow[0];
  let bestDist = hammingDistance(best.dHash, repMember.dHash);
  for (let i = 1; i < inWindow.length; i++) {
    const d = hammingDistance(inWindow[i].dHash, repMember.dHash);
    if (d < bestDist) { best = inWindow[i]; bestDist = d; }
  }
  return best.frame;
}
