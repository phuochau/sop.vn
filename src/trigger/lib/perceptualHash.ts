import sharp from "sharp";

/**
 * dHash: 8x9 grayscale, compare adjacent pixels in each row → 64 bits.
 * Returns 16-char lowercase hex.
 */
export async function dHash(imagePath: string): Promise<string> {
  const { data } = await sharp(imagePath)
    .grayscale()
    .resize(9, 8, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bits: number[] = [];
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = data[row * 9 + col];
      const right = data[row * 9 + col + 1];
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

export function hammingDistance(a: string, b: string): number {
  if (a.length !== b.length) throw new Error("hashes must be same length");
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    let v = xor;
    while (v) { dist += v & 1; v >>= 1; }
  }
  return dist;
}

/**
 * Resize an image so its longest edge is at most `maxEdgePx`, preserving aspect ratio.
 * No-op if both dimensions already fit. Output is JPEG.
 */
export async function downscaleToMaxEdge(inputPath: string, outputPath: string, maxEdgePx: number): Promise<void> {
  const img = sharp(inputPath);
  const meta = await img.metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  if (w === 0 || h === 0) throw new Error(`bad image dimensions: ${w}x${h}`);
  if (w <= maxEdgePx && h <= maxEdgePx) {
    await img.jpeg({ quality: 85 }).toFile(outputPath);
    return;
  }
  await img
    .resize({ width: maxEdgePx, height: maxEdgePx, fit: "inside" })
    .jpeg({ quality: 85 })
    .toFile(outputPath);
}
