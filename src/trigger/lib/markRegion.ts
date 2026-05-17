import sharp from "sharp";

export type MarkBbox = { x: number; y: number; w: number; h: number }; // normalized 0..1

/**
 * Draw a magenta (#FF00FF) stroked rectangle (no fill) at `bbox` onto the full
 * frame at `srcFramePath` and write the result to `outPath`. The marker is an
 * SVG composited at the frame's native pixel dimensions, so marker and base
 * frame share one coordinate space. Magenta is used deliberately so the marker
 * is never confused with the yellow-circle highlight. When `bbox` touches a
 * frame edge the outward half of the stroke is clipped — that is acceptable.
 */
export async function markRegion(
  srcFramePath: string,
  bbox: MarkBbox,
  outPath: string,
): Promise<void> {
  const meta = await sharp(srcFramePath).metadata();
  const W = meta.width ?? 0;
  const H = meta.height ?? 0;
  if (!W || !H) throw new Error(`missing image metadata for ${srcFramePath}`);

  const rx = bbox.x * W;
  const ry = bbox.y * H;
  const rw = bbox.w * W;
  const rh = bbox.h * H;
  const strokeW = 4;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="none" stroke="#FF00FF" stroke-width="${strokeW}"/>
  </svg>`;

  await sharp(srcFramePath)
    .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
    .jpeg({ quality: 90 })
    .toFile(outPath);
}
