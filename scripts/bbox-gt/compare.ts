/**
 * Render GT-vs-prediction comparison frames.
 *   GREEN  = ground-truth box (hand-labelled, pixel-exact)
 *   YELLOW = pipeline prediction
 * Usage: npx tsx scripts/bbox-gt/compare.ts <run-results.json>
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";

const run = promisify(execFile);

type Box = { x: number; y: number; w: number; h: number };
type Row = { case: number; t: number; intent: string; gt?: Box; iou?: number;
  candidate?: { bbox: Box | null }; grounding?: { bbox: Box | null } };

async function main(): Promise<void> {
  const resultsPath = process.argv[2];
  if (!resultsPath) throw new Error("usage: compare.ts <results.json>");
  const rows = JSON.parse(fs.readFileSync(resultsPath, "utf8")) as Row[];
  const video = "samples/hubspot_crm.mp4";
  const outDir = path.join(path.dirname(resultsPath), "compare");
  fs.mkdirSync(outDir, { recursive: true });

  for (const r of rows) {
    const frame = path.join(outDir, `frame_${String(r.case).padStart(2, "0")}.jpg`);
    await run("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(r.t),
      "-i", video, "-frames:v", "1", "-q:v", "2", frame]);
    const meta = await sharp(frame).metadata();
    const W = meta.width ?? 1920;
    const H = meta.height ?? 1080;
    const rect = (b: Box, color: string) =>
      `<rect x="${b.x * W}" y="${b.y * H}" width="${b.w * W}" height="${b.h * H}" ` +
      `fill="none" stroke="${color}" stroke-width="4"/>`;
    const parts: string[] = [];
    if (r.gt) parts.push(rect(r.gt, "#00e000"));
    const pred = r.grounding?.bbox ?? r.candidate?.bbox;
    if (pred) parts.push(rect(pred, "#ffd400"));
    const svg = `<svg width="${W}" height="${H}">${parts.join("")}</svg>`;
    const out = path.join(outDir, `cmp_${String(r.case).padStart(2, "0")}.jpg`);
    await sharp(frame)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .jpeg({ quality: 90 })
      .toFile(out);
    fs.rmSync(frame);
    const iou = r.iou !== undefined ? r.iou.toFixed(3) : "—";
    console.log(`cmp_${String(r.case).padStart(2, "0")}.jpg  IoU=${iou}  ${r.intent}`);
  }
  console.log(`\nGREEN = ground truth, YELLOW = prediction. Images in ${outDir}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
