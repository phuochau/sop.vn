/**
 * Benchmark fallback point-grounding models against the ground-truth set.
 *
 * Scores point hit-rate: does the model's click point land inside the
 * hand-labelled target element? This is the metric that matters for the point
 * highlighter — exactly how UI-TARS was measured (31/31).
 *
 * Usage: npx tsx --env-file=.env scripts/bbox-gt/point-fallback-test.ts <model>
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";
import { pointGroundingLocate } from "../bbox-proto/pointGrounding";

const run = promisify(execFile);

type Box = { x: number; y: number; w: number; h: number };
type Verb = "click" | "input" | "select" | "link" | "view";
type Case = { t: number; intent: string; verb: Verb; gt?: Box | null };

function pointInBox(px: number, py: number, b: Box): boolean {
  return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h;
}

async function main(): Promise<void> {
  const model = process.argv[2];
  if (!model) throw new Error("usage: point-fallback-test.ts <model>");
  const gt = JSON.parse(fs.readFileSync("scripts/bbox-gt/gt.json", "utf8")) as
    { video: string; cases: Case[] };
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = path.join("scripts", "bbox-runs", `${stamp}-fallback`);
  fs.mkdirSync(dir, { recursive: true });
  console.log(`Fallback model: ${model}\n`);

  let hits = 0, scored = 0;
  const dists: number[] = [];
  for (let i = 0; i < gt.cases.length; i++) {
    const c = gt.cases[i];
    const id = String(i).padStart(2, "0");
    if (c.verb === "view") { console.log(`[${id}] view — skipped`); continue; }
    const frame = path.join(dir, `frame_${id}.jpg`);
    await run("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(c.t),
      "-i", gt.video, "-frames:v", "1", "-q:v", "2", frame]);
    const meta = await sharp(frame).metadata();
    const W = meta.width ?? 1920, H = meta.height ?? 1080;

    let res; let err = "";
    try {
      res = await pointGroundingLocate({ intent: c.intent, verb: c.verb, framePath: frame, model });
    } catch (e) { err = e instanceof Error ? e.message : String(e); }

    let detail = err ? `ERROR ${err.slice(0, 60)}` : "no point";
    if (res?.point && c.gt) {
      scored++;
      const hit = pointInBox(res.point.x, res.point.y, c.gt);
      if (hit) hits++;
      const cx = c.gt.x + c.gt.w / 2, cy = c.gt.y + c.gt.h / 2;
      const d = Math.round(Math.hypot((res.point.x - cx) * W, (res.point.y - cy) * H));
      dists.push(d);
      detail = `${hit ? "HIT " : "MISS"} dist=${d}px`;
    } else if (res && !res.point) {
      detail = "found=no";
    }
    console.log(`[${id}] ${detail.padEnd(22)} ${c.intent}`);
    fs.rmSync(frame);
  }

  dists.sort((a, b) => a - b);
  const med = dists.length ? dists[dists.length >> 1] : 0;
  console.log(`\n${model}`);
  console.log(`point inside element: ${hits}/${scored}   median dist: ${med}px`);
}

main().catch((e) => { console.error(e); process.exit(1); });
