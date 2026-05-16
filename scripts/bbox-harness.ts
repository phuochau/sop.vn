/**
 * bbox-harness — isolated test rig for the locateHighlight (yellow rectangle) stage.
 *
 * It runs locateHighlight on hand-picked video frames without the rest of the
 * pipeline, so the bbox solution can be iterated and eyeballed quickly.
 *
 * Usage:
 *   npx tsx --env-file=.env scripts/bbox-harness.ts sample <video> [count]
 *     Extract <count> random frames from <video> into a run dir and write a
 *     fixtures skeleton. Fill in `intent` and `verb` for each case, then `run`.
 *
 *   npx tsx --env-file=.env scripts/bbox-harness.ts run <fixtures.json>
 *     Extract each labelled frame, call locateHighlight, draw the box, and write
 *     annotated_NN.jpg next to a results.json summary.
 *
 * Fixtures file shape:
 *   {
 *     "video": "samples/hubspot_crm.mp4",
 *     "language": "en",
 *     "cases": [ { "t": 12.5, "intent": "Click Get Started", "verb": "click" } ]
 *   }
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { runLocateHighlight } from "../src/trigger/stages/locateHighlight";
import { buildBufferWithOptionalHighlight } from "../src/trigger/stages/uploadScreenshots";
import { candidateLocate } from "./bbox-proto/locate";
import { groundingLocate } from "./bbox-proto/grounding";
import { hybridLocate } from "./bbox-proto/hybrid";
import { DEFAULT_UITARS_MODEL } from "./bbox-proto/uitars";

const DEFAULT_GROUNDING_MODEL = "qwen/qwen2.5-vl-72b-instruct";
const DEFAULT_PIPELINE_MODEL = "google/gemini-2.5-flash";

const run = promisify(execFile);

type Verb = "click" | "input" | "select" | "link" | "view";
type Box = { x: number; y: number; w: number; h: number };
type Case = { t: number; intent: string; verb: Verb; gt?: Box | null };
type Fixtures = { video: string; language?: string; cases: Case[] };

/** Intersection-over-union of two frame-normalized boxes. */
function iou(a: Box, b: Box): number {
  const ix = Math.max(a.x, b.x);
  const iy = Math.max(a.y, b.y);
  const ix2 = Math.min(a.x + a.w, b.x + b.w);
  const iy2 = Math.min(a.y + a.h, b.y + b.h);
  const iw = Math.max(0, ix2 - ix);
  const ih = Math.max(0, iy2 - iy);
  const inter = iw * ih;
  const union = a.w * a.h + b.w * b.h - inter;
  return union > 0 ? inter / union : 0;
}

async function videoDuration(video: string): Promise<number> {
  const { stdout } = await run("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video,
  ]);
  const d = Number(stdout.trim());
  if (!Number.isFinite(d) || d <= 0) throw new Error(`could not read duration of ${video}`);
  return d;
}

async function extractFrame(video: string, t: number, outPath: string): Promise<void> {
  // -ss before -i: fast seek to the keyframe-accurate-enough position.
  await run("ffmpeg", [
    "-y", "-ss", String(t), "-i", video, "-frames:v", "1", "-q:v", "2", outPath,
  ]);
}

function runDir(label: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = path.join("scripts", "bbox-runs", `${stamp}-${label}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function cmdSample(video: string, count: number): Promise<void> {
  if (!fs.existsSync(video)) throw new Error(`video not found: ${video}`);
  const duration = await videoDuration(video);
  // Random timestamps in the inner 90% of the video (skip intro/outro fades).
  const times = Array.from({ length: count }, () =>
    Number((duration * (0.05 + Math.random() * 0.9)).toFixed(2)),
  ).sort((a, b) => a - b);

  const dir = runDir("sample");
  for (let i = 0; i < times.length; i++) {
    await extractFrame(video, times[i], path.join(dir, `frame_${pad(i)}.jpg`));
  }
  const fixtures: Fixtures = {
    video,
    language: "en",
    cases: times.map((t) => ({ t, intent: "<FILL IN: what is the user doing>", verb: "click" })),
  };
  const fixturesPath = path.join(dir, "fixtures.json");
  fs.writeFileSync(fixturesPath, JSON.stringify(fixtures, null, 2));
  console.log(`Extracted ${count} frames to ${dir}`);
  console.log(`Fill in intent/verb in ${fixturesPath}, then:`);
  console.log(`  npx tsx --env-file=.env scripts/bbox-harness.ts run ${fixturesPath}`);
}

type Mode = "stable" | "candidate" | "both" | "grounding" | "hybrid";

async function runStable(
  c: Case, framePath: string, dir: string, i: number, language: string,
): Promise<object> {
  const decision = await runLocateHighlight({
    intent: c.intent, verb: c.verb, framePath,
  });
  const { buf } = await buildBufferWithOptionalHighlight(
    framePath, decision.bbox ? { bbox: decision.bbox } : null);
  fs.writeFileSync(path.join(dir, `annotated_${pad(i)}_stable.jpg`), buf);
  console.log(
    `  stable    → ${decision.highlight}` +
      (decision.bbox ? ` bbox=${fmtBox(decision.bbox)}` : "") +
      (decision.noHighlightReason ? ` (${decision.noHighlightReason})` : ""),
  );
  return { highlight: decision.highlight, bbox: decision.bbox,
    noHighlightReason: decision.noHighlightReason };
}

async function runCandidate(
  c: Case, framePath: string, dir: string, i: number, language: string, model: string,
): Promise<object> {
  const traceDir = path.join(dir, `case_${pad(i)}`);
  fs.mkdirSync(traceDir, { recursive: true });
  const res = await candidateLocate({
    intent: c.intent, verb: c.verb, framePath, language, traceDir, model,
  });
  const { buf } = await buildBufferWithOptionalHighlight(
    framePath, res.bbox ? { bbox: res.bbox } : null);
  fs.writeFileSync(path.join(dir, `annotated_${pad(i)}_candidate.jpg`), buf);
  console.log(
    `  candidate → ${res.highlight}` +
      (res.bbox ? ` bbox=${fmtBox(res.bbox)}` : "") +
      (res.reason ? ` (${res.reason})` : "") +
      (res.verified === false ? " [verify=FAIL]" : res.verified ? " [verify=ok]" : ""),
  );
  return { highlight: res.highlight, bbox: res.bbox, element: res.element,
    verified: res.verified, reason: res.reason, trace: res.trace };
}

async function runGrounding(
  c: Case, framePath: string, dir: string, i: number, model: string,
): Promise<object> {
  const res = await groundingLocate({
    intent: c.intent, verb: c.verb, framePath, model,
  });
  const { buf } = await buildBufferWithOptionalHighlight(
    framePath, res.bbox ? { bbox: res.bbox } : null);
  fs.writeFileSync(path.join(dir, `annotated_${pad(i)}_grounding.jpg`), buf);
  console.log(
    `  grounding → ${res.highlight}` +
      (res.bbox ? ` bbox=${fmtBox(res.bbox)}` : "") +
      (res.reason ? ` (${res.reason})` : ""),
  );
  return { highlight: res.highlight, bbox: res.bbox, element: res.element,
    reason: res.reason };
}

async function runHybrid(
  c: Case, framePath: string, dir: string, i: number, model: string,
): Promise<object> {
  const traceDir = path.join(dir, `case_${pad(i)}`);
  fs.mkdirSync(traceDir, { recursive: true });
  const res = await hybridLocate({
    intent: c.intent, verb: c.verb, framePath, traceDir, model: model || undefined,
  });
  const { buf } = await buildBufferWithOptionalHighlight(
    framePath, res.bbox ? { bbox: res.bbox } : null);
  fs.writeFileSync(path.join(dir, `annotated_${pad(i)}_hybrid.jpg`), buf);
  console.log(
    `  hybrid    → ${res.highlight}` +
      (res.bbox ? ` bbox=${fmtBox(res.bbox)}` : "") +
      (res.reason ? ` (${res.reason})` : "") +
      (res.trace.snapped ? " [snapped]" : ""),
  );
  return { highlight: res.highlight, bbox: res.bbox, point: res.point,
    reason: res.reason, trace: res.trace };
}

async function cmdRun(fixturesPath: string, mode: Mode, model: string): Promise<void> {
  const fixtures = JSON.parse(fs.readFileSync(fixturesPath, "utf8")) as Fixtures;
  if (!fixtures.video || !Array.isArray(fixtures.cases)) {
    throw new Error("fixtures must have { video, cases[] }");
  }
  const language = fixtures.language ?? "en";
  const dir = runDir(`run-${mode}`);
  const results: object[] = [];
  const scores: Scores = { stable: [], candidate: [], grounding: [], hybrid: [] };

  for (let i = 0; i < fixtures.cases.length; i++) {
    const c = fixtures.cases[i];
    const framePath = path.join(dir, `frame_${pad(i)}.jpg`);
    await extractFrame(fixtures.video, c.t, framePath);
    console.log(`[${pad(i)}] t=${c.t}s ${c.verb} — ${c.intent}`);

    const row: Record<string, unknown> = { case: i, t: c.t, verb: c.verb, intent: c.intent };
    if (c.gt) row.gt = c.gt;
    if (mode === "stable" || mode === "both") {
      const r = await runStable(c, framePath, dir, i, language);
      row.stable = r;
      scoreGt(c, (r as { bbox?: Box | null }).bbox ?? null, "stable", scores);
    }
    if (mode === "candidate" || mode === "both") {
      const r = await runCandidate(c, framePath, dir, i, language, model);
      row.candidate = r;
      scoreGt(c, (r as { bbox?: Box | null }).bbox ?? null, "candidate", scores);
    }
    if (mode === "grounding") {
      const r = await runGrounding(c, framePath, dir, i, model);
      row.grounding = r;
      scoreGt(c, (r as { bbox?: Box | null }).bbox ?? null, "grounding", scores);
    }
    if (mode === "hybrid") {
      const r = await runHybrid(c, framePath, dir, i, model);
      row.hybrid = r;
      scoreGt(c, (r as { bbox?: Box | null }).bbox ?? null, "hybrid", scores);
    }
    if (c.gt) {
      const cand = (row.candidate as { bbox?: Box | null } | undefined)?.bbox ?? null;
      const st = (row.stable as { bbox?: Box | null } | undefined)?.bbox ?? null;
      const gr = (row.grounding as { bbox?: Box | null } | undefined)?.bbox ?? null;
      const hy = (row.hybrid as { bbox?: Box | null } | undefined)?.bbox ?? null;
      const b = cand ?? gr ?? hy ?? st;
      row.iou = b ? Number(iou(b, c.gt).toFixed(4)) : 0;
    }
    results.push(row);
  }

  const summaryPath = path.join(dir, "results.json");
  fs.writeFileSync(summaryPath, JSON.stringify(results, null, 2));
  console.log(`\nDone. Annotated frames + ${summaryPath} in ${dir}`);
  reportScores(scores);
}

type Scores = {
  stable: number[]; candidate: number[]; grounding: number[]; hybrid: number[];
};
const PASS_IOU = 0.9;

/**
 * Score a predicted box against a case's ground truth.
 * `view` cases (gt=null) are scored as 1.0 when nothing was drawn, 0.0 otherwise.
 * Cases with no gt label at all are skipped.
 */
function scoreGt(c: Case, predicted: Box | null, mode: keyof Scores, scores: Scores): void {
  if (c.gt === undefined) return; // unlabelled — not part of the eval
  let score: number;
  if (c.gt === null) {
    score = predicted === null ? 1 : 0; // should NOT highlight
  } else {
    score = predicted ? iou(predicted, c.gt) : 0;
  }
  scores[mode].push(score);
  console.log(`  ${mode.padEnd(9)} IoU=${score.toFixed(3)} ${score >= PASS_IOU ? "PASS" : "MISS"}`);
}

function reportScores(scores: Scores): void {
  for (const mode of ["stable", "candidate", "grounding", "hybrid"] as const) {
    const s = scores[mode];
    if (s.length === 0) continue;
    const mean = s.reduce((a, b) => a + b, 0) / s.length;
    const passes = s.filter((v) => v >= PASS_IOU).length;
    console.log(
      `${mode}: mean IoU=${mean.toFixed(4)}  ` +
        `pass@${PASS_IOU}=${passes}/${s.length} (${((passes / s.length) * 100).toFixed(0)}%)`,
    );
  }
}

/** Render each gt-labelled case's frame with its gt box drawn, for label review. */
async function cmdGt(fixturesPath: string): Promise<void> {
  const fixtures = JSON.parse(fs.readFileSync(fixturesPath, "utf8")) as Fixtures;
  const dir = runDir("gt-review");
  for (let i = 0; i < fixtures.cases.length; i++) {
    const c = fixtures.cases[i];
    const framePath = path.join(dir, `frame_${pad(i)}.jpg`);
    await extractFrame(fixtures.video, c.t, framePath);
    const { buf } = await buildBufferWithOptionalHighlight(
      framePath, c.gt ? { bbox: c.gt } : null);
    fs.writeFileSync(path.join(dir, `gt_${pad(i)}.jpg`), buf);
    console.log(`[${pad(i)}] ${c.verb} — ${c.intent}` + (c.gt ? "" : " (no gt)"));
  }
  console.log(`\nGT review images in ${dir}`);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function fmtBox(b: { x: number; y: number; w: number; h: number }): string {
  const r = (n: number) => n.toFixed(3);
  return `{x=${r(b.x)} y=${r(b.y)} w=${r(b.w)} h=${r(b.h)}}`;
}

async function main(): Promise<void> {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === "sample") {
    const video = rest[0];
    const count = rest[1] ? Number(rest[1]) : 8;
    if (!video) throw new Error("usage: sample <video> [count]");
    await cmdSample(video, count);
  } else if (cmd === "run") {
    if (!rest[0]) throw new Error("usage: run <fixtures.json> [stable|candidate|both]");
    const mode = (rest[1] ?? "both") as Mode;
    if (!["stable", "candidate", "both", "grounding", "hybrid"].includes(mode)) {
      throw new Error(`unknown mode '${mode}' (expected stable|candidate|both|grounding|hybrid)`);
    }
    const model = rest[2] ?? (
      mode === "grounding" ? DEFAULT_GROUNDING_MODEL :
      mode === "hybrid" ? DEFAULT_UITARS_MODEL :
      DEFAULT_PIPELINE_MODEL);
    await cmdRun(rest[0], mode, model);
  } else if (cmd === "gt") {
    if (!rest[0]) throw new Error("usage: gt <fixtures.json>");
    await cmdGt(rest[0]);
  } else {
    console.error("usage: bbox-harness.ts <sample|run|gt> ...");
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
