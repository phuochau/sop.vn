/** Contact-sheet montage of cmp_*.jpg in a run dir. */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

async function main(): Promise<void> {
  const dir = process.argv[2];
  const files = fs.readdirSync(dir).filter((f) => /^cmp_\d+\.jpg$/.test(f)).sort();
  const cw = 384, ch = 216, cols = 5, pad = 6;
  const rows = Math.ceil(files.length / cols);
  const W = cols * cw + (cols + 1) * pad;
  const H = rows * ch + (rows + 1) * pad;
  const tiles = await Promise.all(files.map(async (f, i) => ({
    input: await sharp(path.join(dir, f)).resize(cw, ch, { fit: "fill" }).jpeg().toBuffer(),
    left: pad + (i % cols) * (cw + pad),
    top: pad + Math.floor(i / cols) * (ch + pad),
  })));
  await sharp({ create: { width: W, height: H, channels: 3, background: "#ffffff" } })
    .composite(tiles)
    .jpeg({ quality: 86 })
    .toFile(path.join(dir, "montage.jpg"));
  console.log(`montage.jpg ${W}x${H} ${files.length} frames`);
}

main().catch((e) => { console.error(e); process.exit(1); });
