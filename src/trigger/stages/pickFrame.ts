import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { logger } from "@trigger.dev/sdk/v3";
import type { z } from "zod";
import { llmJsonVision } from "@/lib/openrouter";
import { FramePick, SubStepPlan } from "@/lib/schemas";
import { config } from "@/config";
import type { NarrationSegment } from "@/trigger/lib/narration";
import type { ScreenCluster } from "@/trigger/lib/screenId";

type SubStep = z.infer<typeof SubStepPlan>;

export type PickerFn = (args: {
  intent: string;
  verb: SubStep["verb"];
  montagePath: string;
  validLetters: string[];
  language: string;
}) => Promise<z.infer<typeof FramePick>>;

const TILE_W = 640;
const TILE_H = 360;
const LABEL_H = 36;

export function computeSearchWindow(
  subStep: { narrationSegmentIds: number[]; timeWindow: { start: number; end: number } | null },
  narration: NarrationSegment[],
  step: { tStart: number; tEnd: number },
  pad: { pre: number; post: number } = {
    pre: config.screenshots.pickFrame.searchWindowPrePadSec,
    post: config.screenshots.pickFrame.searchWindowPostPadSec,
  },
): { start: number; end: number } {
  if (subStep.narrationSegmentIds.length > 0) {
    const refs = narration.filter(n => subStep.narrationSegmentIds.includes(n.id));
    if (refs.length > 0) {
      const start = Math.min(...refs.map(n => n.start)) - pad.pre;
      const end = Math.max(...refs.map(n => n.end)) + pad.post;
      return { start, end };
    }
  }
  if (subStep.timeWindow) {
    return { start: subStep.timeWindow.start - pad.pre, end: subStep.timeWindow.end + pad.post };
  }
  return { start: step.tStart, end: step.tEnd };
}

/**
 * The instant a sub-step's action happens: the *unpadded* end of its
 * narration range. A narrator describes an action as or just before it
 * completes, so the late edge of the narration best marks the action moment.
 * Unlike computeSearchWindow, this applies no padding — padding only widens
 * the candidate *search*, it does not locate the action. Falls back to the
 * sub-step's timeWindow end, then to the step's end. The fallback *ordering*
 * (narration -> timeWindow -> step) matches computeSearchWindow's; each
 * fallback returns the end edge, since this is an instant, not a window.
 */
export function computeActionTime(
  subStep: { narrationSegmentIds: number[]; timeWindow: { start: number; end: number } | null },
  narration: NarrationSegment[],
  step: { tStart: number; tEnd: number },
): number {
  if (subStep.narrationSegmentIds.length > 0) {
    const refs = narration.filter(n => subStep.narrationSegmentIds.includes(n.id));
    if (refs.length > 0) return Math.max(...refs.map(n => n.end));
  }
  if (subStep.timeWindow) return subStep.timeWindow.end;
  return step.tEnd;
}

function inWindowDwell(cluster: ScreenCluster, window: { start: number; end: number }): number {
  return Math.max(
    0,
    Math.min(cluster.timeSpan.end, window.end) - Math.max(cluster.timeSpan.start, window.start),
  );
}

export function shortlistClusters(
  clusters: ScreenCluster[],
  window: { start: number; end: number },
  cap: number,
): ScreenCluster[] {
  const overlapping = clusters
    .map(c => ({ c, dwell: inWindowDwell(c, window) }))
    .filter(x => x.dwell > 0)
    .sort((a, b) => b.dwell - a.dwell);
  return overlapping.slice(0, cap).map(x => x.c);
}

async function buildMontage(clusters: ScreenCluster[], outDir: string): Promise<string> {
  const tiles: Buffer[] = [];
  for (const c of clusters) {
    const labelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_W}" height="${LABEL_H}">
      <rect width="${TILE_W}" height="${LABEL_H}" fill="#222"/>
      <text x="12" y="26" fill="#fff" font-family="sans-serif" font-size="22" font-weight="700">${c.letter}</text>
    </svg>`;
    const imgBuf = await sharp(c.representative.localPath)
      .resize({ width: TILE_W, height: TILE_H - LABEL_H, fit: "inside", withoutEnlargement: true })
      .toBuffer();
    const tile = await sharp({
      create: { width: TILE_W, height: TILE_H, channels: 3, background: "#000" },
    })
      .composite([
        { input: Buffer.from(labelSvg), top: 0, left: 0 },
        { input: imgBuf, top: LABEL_H, left: 0 },
      ])
      .jpeg({ quality: 85 })
      .toBuffer();
    tiles.push(tile);
  }
  const outPath = path.join(outDir, "shortlist.jpg");
  const composites = tiles.map((buf, i) => ({ input: buf, top: 0, left: i * TILE_W }));
  await sharp({
    create: { width: TILE_W * tiles.length, height: TILE_H, channels: 3, background: "#000" },
  })
    .composite(composites)
    .jpeg({ quality: 85 })
    .toFile(outPath);
  return outPath;
}

export function sanitizePick(
  pick: z.infer<typeof FramePick>,
  validLetters: Set<string>,
): z.infer<typeof FramePick> {
  let picked: string | null = pick.picked;
  let runnerUp: string | null = pick.runnerUp;
  if (picked && !validLetters.has(picked)) picked = null;
  if (runnerUp && !validLetters.has(runnerUp)) runnerUp = null;
  if (picked === null) runnerUp = null;
  if (runnerUp && runnerUp === picked) runnerUp = null;
  return { picked, runnerUp, reasoning: pick.reasoning };
}

async function defaultPicker(args: {
  intent: string;
  verb: SubStep["verb"];
  montagePath: string;
  validLetters: string[];
  language: string;
}): Promise<z.infer<typeof FramePick>> {
  const userText = [
    `Intent: ${args.intent}`,
    `Verb: ${args.verb}`,
    `Candidate letters: ${args.validLetters.join(", ")}`,
  ].join("\n");
  return llmJsonVision({
    model: config.ai.visionModel,
    system: config.ai.prompts.pickFrameSystem(args.language),
    userText,
    imagePaths: [args.montagePath],
    schema: FramePick,
    schemaName: "frame_pick",
    temperature: 0.0,
  });
}

export async function runPickFrame(args: {
  subStep: SubStep;
  narration: NarrationSegment[];
  step: { stepIndex: number; tStart: number; tEnd: number };
  clusters: ScreenCluster[];
  language: string;
  picker?: PickerFn;
}): Promise<{ pick: z.infer<typeof FramePick>; shortlist: ScreenCluster[] }> {
  const picker = args.picker ?? defaultPicker;
  const cap = config.screenshots.screenId.maxMontageClusters;
  const window = computeSearchWindow(args.subStep, args.narration, args.step);
  const shortlist = shortlistClusters(args.clusters, window, cap);
  if (shortlist.length === 0) {
    logger.info("pipeline.pick.empty_shortlist", { stepIndex: args.step.stepIndex, intent: args.subStep.intent });
    return { pick: { picked: null, runnerUp: null, reasoning: "no candidate clusters overlap the search window" }, shortlist: [] };
  }

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "pick-"));
  try {
    const montagePath = await buildMontage(shortlist, tmpDir);
    const raw = await picker({
      intent: args.subStep.intent,
      verb: args.subStep.verb,
      montagePath,
      validLetters: shortlist.map(c => c.letter),
      language: args.language,
    });
    const validLetters = new Set(shortlist.map(c => c.letter));
    const pick = sanitizePick(raw, validLetters);
    if (raw.picked && pick.picked === null) {
      logger.warn("pipeline.pick.invalid_letter", {
        stepIndex: args.step.stepIndex,
        intent: args.subStep.intent,
        rawPicked: raw.picked,
        valid: [...validLetters],
      });
    }
    if (pick.picked === null) {
      logger.info("pipeline.pick.no_match", {
        stepIndex: args.step.stepIndex,
        intent: args.subStep.intent,
        reasoning: pick.reasoning,
      });
    }
    return { pick, shortlist };
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}
