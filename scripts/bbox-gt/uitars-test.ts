/**
 * UI-TARS grounding benchmark — standalone.
 *
 * UI-TARS is a model purpose-built for GUI grounding, but it does NOT support
 * structured JSON output: it replies with coordinates in its own text format
 * (a point or a box). So this script calls OpenRouter directly with no
 * response_format, parses whatever UI-TARS returns, and scores it against the
 * ground-truth set by IoU.
 *
 * Usage: npx tsx --env-file=.env scripts/bbox-gt/uitars-test.ts [fixtures.json] [model]
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import sharp from "sharp";

const run = promisify(execFile);
const API = "https://openrouter.ai/api/v1/chat/completions";
const FIXTURES = process.argv[2] ?? "scripts/bbox-gt/gt.json";
const MODEL = process.argv[3] ?? "bytedance/ui-tars-1.5-7b";

type Box = { x: number; y: number; w: number; h: number };
type Case = { t: number; intent: string; verb: string; gt?: Box | null };

function iou(a: Box, b: Box): number {
  const ix = Math.max(a.x, b.x), iy = Math.max(a.y, b.y);
  const ix2 = Math.min(a.x + a.w, b.x + b.w), iy2 = Math.min(a.y + a.h, b.y + b.h);
  const inter = Math.max(0, ix2 - ix) * Math.max(0, iy2 - iy);
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

type Point = { x: number; y: number };

/**
 * UI-TARS replies free-form with ABSOLUTE pixel coordinates. Pull out either a
 * box (4 numbers) or a click point (2 numbers), normalized by the frame size.
 */
function parseUiTars(text: string, w: number, h: number):
  { box: Box | null; point: Point | null; kind: string } {
  const nums = (text.match(/-?\d+\.?\d*/g) ?? []).map(Number);
  if (nums.length >= 4) {
    const [a, b, c, d] = nums;
    const x1 = Math.min(a, c) / w, x2 = Math.max(a, c) / w;
    const y1 = Math.min(b, d) / h, y2 = Math.max(b, d) / h;
    if (x2 > x1 && y2 > y1) {
      return { box: { x: x1, y: y1, w: x2 - x1, h: y2 - y1 }, point: null, kind: "box" };
    }
  }
  if (nums.length >= 2) {
    return { box: null, point: { x: nums[0] / w, y: nums[1] / h }, kind: "point" };
  }
  return { box: null, point: null, kind: "none" };
}

/** Is point p inside box b? */
function pointInBox(p: Point, b: Box): boolean {
  return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
}

async function callUiTars(framePath: string, intent: string, verb: string): Promise<string> {
  const b64 = (await fs.promises.readFile(framePath)).toString("base64");
  const body = {
    model: MODEL,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "Locate the single UI element the user interacts with for this step",
              "and output its bounding box.",
              `Step intent: ${intent}`,
              `Action verb: ${verb}`,
              "",
              "Output ONLY the bounding box as (x1,y1,x2,y2) where x1,y1 is the",
              "top-left corner and x2,y2 the bottom-right corner, on a 0-1000",
              "normalized scale (0 = left/top edge, 1000 = right/bottom edge).",
            ].join("\n"),
          },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } },
        ],
      },
    ],
    temperature: 0,
  };
  const res = await fetch(API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY!}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://sop.vn",
      "X-Title": "SOP.vn",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function main(): Promise<void> {
  const gt = JSON.parse(fs.readFileSync(FIXTURES, "utf8")) as
    { video: string; cases: Case[] };
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = path.join("scripts", "bbox-runs", `${stamp}-uitars`);
  fs.mkdirSync(dir, { recursive: true });
  console.log(`Model: ${MODEL}\n`);

  const scores: number[] = [];
  const results: object[] = [];
  for (let i = 0; i < gt.cases.length; i++) {
    const c = gt.cases[i];
    const id = String(i).padStart(2, "0");
    const frame = path.join(dir, `frame_${id}.jpg`);
    await run("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(c.t),
      "-i", gt.video, "-frames:v", "1", "-q:v", "2", frame]);

    if (c.verb === "view") {
      console.log(`[${id}] view — skipped (no box expected)`);
      results.push({ case: i, verb: "view" });
      fs.rmSync(frame);
      continue;
    }

    const meta = await sharp(frame).metadata();
    const W = meta.width ?? 1920, H = meta.height ?? 1080;

    let raw = "";
    let parsed: { box: Box | null; point: Point | null; kind: string } =
      { box: null, point: null, kind: "none" };
    try {
      raw = await callUiTars(frame, c.intent, c.verb);
      parsed = parseUiTars(raw, W, H);
    } catch (e) {
      raw = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
    }

    // Score: a box -> IoU; a point -> "hit" (inside GT) + distance to centre.
    let iouScore = 0;
    let hit: boolean | null = null;
    let distPx: number | null = null;
    if (c.gt) {
      if (parsed.box) iouScore = iou(parsed.box, c.gt);
      if (parsed.point) {
        hit = pointInBox(parsed.point, c.gt);
        const cx = c.gt.x + c.gt.w / 2, cy = c.gt.y + c.gt.h / 2;
        distPx = Math.round(Math.hypot(
          (parsed.point.x - cx) * W, (parsed.point.y - cy) * H));
      }
      scores.push(parsed.box ? iouScore : (hit ? 1 : 0));
    }

    // Render: green = GT box, yellow = UI-TARS box or point crosshair.
    const rect = (b: Box, color: string) =>
      `<rect x="${b.x * W}" y="${b.y * H}" width="${b.w * W}" height="${b.h * H}" ` +
      `fill="none" stroke="${color}" stroke-width="4"/>`;
    // "Click here" yellow-circle point highlight.
    const marker = (p: Point) => {
      const px = p.x * W, py = p.y * H;
      const r = Math.round(W * 0.016);
      return `<circle cx="${px}" cy="${py}" r="${r * 1.85}" fill="#ffd400" ` +
        `fill-opacity="0.12" stroke="#ffd400" stroke-width="3" stroke-opacity="0.45"/>` +
        `<circle cx="${px}" cy="${py}" r="${r}" fill="#ffd400" fill-opacity="0.15" ` +
        `stroke="#ffd400" stroke-width="6"/>` +
        `<circle cx="${px}" cy="${py}" r="6" fill="#ffd400"/>`;
    };
    const svg = `<svg width="${W}" height="${H}">` +
      (parsed.box ? rect(parsed.box, "#ffd400") : "") +
      (parsed.point ? marker(parsed.point) : "") + "</svg>";
    await sharp(frame).composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .jpeg({ quality: 90 }).toFile(path.join(dir, `cmp_${id}.jpg`));
    fs.rmSync(frame);

    const detail = parsed.box
      ? `IoU=${iouScore.toFixed(3)}`
      : parsed.point
        ? `point ${hit ? "HIT" : "MISS"} dist=${distPx}px`
        : "no output";
    console.log(`[${id}] ${detail.padEnd(26)} ${c.intent}`);
    console.log(`      raw: ${raw.replace(/\s+/g, " ").slice(0, 110)}`);
    results.push({ case: i, intent: c.intent, kind: parsed.kind,
      iou: Number(iouScore.toFixed(4)), hit, distPx, box: parsed.box,
      point: parsed.point, raw });
  }

  fs.writeFileSync(path.join(dir, "results.json"), JSON.stringify(results, null, 2));

  const pts = results.filter((r): r is { hit: boolean; distPx: number } =>
    (r as { kind?: string }).kind === "point" && (r as { hit: unknown }).hit !== null);
  const hits = pts.filter((r) => r.hit).length;
  const dists = pts.map((r) => r.distPx).sort((a, b) => a - b);
  const medDist = dists.length ? dists[dists.length >> 1] : 0;
  console.log(`\n--- UI-TARS produced click POINTS, not boxes ---`);
  console.log(`point lands inside the target element: ${hits}/${pts.length}`);
  console.log(`median distance from element centre: ${medDist}px`);
  console.log(`Compare images (GREEN=GT box, YELLOW=UI-TARS point) in ${dir}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
