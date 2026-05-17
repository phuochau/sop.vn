import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { logger } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { llmJsonVision } from "@/lib/openrouter";
import { StepClassification, ClassifiedCandidate as ClassifiedCandidateSchema } from "@/lib/schemas";
import { config } from "@/config";
import { markRegion } from "@/trigger/lib/markRegion";
import type { RawEvent } from "./classifyAndMergeEvents";
import { type DensePoolFrame } from "@/trigger/lib/screenId";

export type ClassifiedCandidate = z.infer<typeof ClassifiedCandidateSchema>;

export type CandidateForLLM = {
  index: number;
  time: number;
  kindHint: "click" | "input";
  windowFramePaths: string[];
};

export type ClassifiedActionRecord = ClassifiedCandidate & {
  displayFramePath: string;
};

type ClassifierFn = (args: {
  stepTitle: string;
  language: string;
  candidates: CandidateForLLM[];
}) => Promise<z.infer<typeof StepClassification>>;

/**
 * Sort by time ASC then split into chunks of `cap`.
 */
export function chunkCandidatesBySort<T extends { time: number }>(
  candidates: T[],
  cap: number,
): T[][] {
  const sorted = [...candidates].sort((a, b) => a.time - b.time);
  const out: T[][] = [];
  for (let i = 0; i < sorted.length; i += cap) {
    out.push(sorted.slice(i, i + cap));
  }
  return out.length > 0 ? out : [[]];
}

async function defaultClassifier(args: {
  stepTitle: string;
  language: string;
  candidates: CandidateForLLM[];
}): Promise<z.infer<typeof StepClassification>> {
  const lines: string[] = [
    `Step title: ${args.stepTitle}`,
    `Number of candidates in this batch: ${args.candidates.length}`,
    `Images are supplied as one flat ordered list, grouped per candidate in index`,
    `order: candidate 0's window frames first, then candidate 1's, and so on.`,
    `Each candidate's displayFrameIndex is 0-based into that candidate's own window.`,
    ``,
    `Candidates:`,
  ];
  for (const c of args.candidates) {
    lines.push(
      `- index=${c.index} time=${c.time.toFixed(2)} kindHint=${c.kindHint} windowLength=${c.windowFramePaths.length}`,
    );
  }
  const userText = lines.join("\n");

  // Flat image list: candidate-by-candidate in index order.
  const imagePaths: string[] = [];
  for (const c of args.candidates) {
    imagePaths.push(...c.windowFramePaths);
  }

  return llmJsonVision({
    model: config.ai.visionModel,
    system: config.ai.prompts.classifyStepSystem(args.language),
    userText,
    imagePaths,
    schema: StepClassification,
    schemaName: "step_classification",
    temperature: 0.0,
  });
}

export async function classifyStepWithLLM(args: {
  stepTitle: string;
  language: string;
  candidates: CandidateForLLM[];
  maxCandidatesPerCall?: number;
  classifier?: ClassifierFn;
}): Promise<ClassifiedCandidate[]> {
  const cap = args.maxCandidatesPerCall ?? config.screenshots.classify.maxCandidatesPerCall;
  const classifier = args.classifier ?? defaultClassifier;
  if (args.candidates.length === 0) return [];

  const chunks = chunkCandidatesBySort(args.candidates, cap);
  const out: ClassifiedCandidate[] = [];
  for (const chunk of chunks) {
    if (chunk.length === 0) continue;
    const result = await classifier({
      stepTitle: args.stepTitle,
      language: args.language,
      candidates: chunk,
    });
    out.push(...result.candidates);
  }
  return out;
}

export async function classifyAndRemap(args: {
  stepTitle: string;
  language: string;
  events: RawEvent[];
  denseFrames: DensePoolFrame[];
}): Promise<ClassifiedActionRecord[]> {
  if (args.events.length === 0) return [];

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "classify-"));
  try {
    const candidates: (CandidateForLLM & { event: RawEvent; window: DensePoolFrame[] })[] = [];
    for (let i = 0; i < args.events.length; i++) {
      const e = args.events[i];
      const window = buildCandidateWindow(args.denseFrames, e, {
        maxFrames: config.screenshots.classify.maxWindowFrames,
        preSec: config.screenshots.classify.windowPreSec,
        postSec: config.screenshots.classify.windowPostSec,
        maxSpanSec: config.screenshots.classify.windowMaxSpanSec,
      });
      const windowFramePaths: string[] = [];
      for (let k = 0; k < window.length; k++) {
        const markedPath = path.join(tmpDir, `c${i}-w${k}.jpg`);
        await markRegion(window[k].localPath, e.bbox, markedPath);
        windowFramePaths.push(markedPath);
      }
      candidates.push({
        index: i,
        time: e.time,
        kindHint: e.kindHint,
        windowFramePaths,
        event: e,
        window,
      });
    }

    const classified = await classifyStepWithLLM({
      stepTitle: args.stepTitle,
      language: args.language,
      candidates: candidates.map(c => ({
        index: c.index,
        time: c.time,
        kindHint: c.kindHint,
        windowFramePaths: c.windowFramePaths,
      })),
    });

    const records: ClassifiedActionRecord[] = [];
    const debugRows: Record<string, unknown>[] = [];
    for (const cc of classified) {
      const cand = candidates.find(c => c.index === cc.index);
      if (!cand) {
        logger.warn("pipeline.classifier.unknown_index", { index: cc.index });
        continue;
      }

      let displayFramePath = "";
      let resolvedIndex: number | null = null;
      if (cc.decision === "action") {
        const window = cand.window;
        const last = window.length - 1;
        if (cc.displayFrameIndex === null) {
          // LLM error on an action — fall back to the frame nearest event.time.
          let nearest = 0;
          for (let k = 1; k < window.length; k++) {
            if (
              Math.abs(window[k].t - cand.event.time) <
              Math.abs(window[nearest].t - cand.event.time)
            ) {
              nearest = k;
            }
          }
          resolvedIndex = nearest;
          logger.info("pipeline.classifier.index_missing", {
            index: cc.index,
            time: cand.time,
            resolvedIndex,
          });
        } else if (cc.displayFrameIndex < 0 || cc.displayFrameIndex > last) {
          resolvedIndex = Math.max(0, Math.min(last, cc.displayFrameIndex));
          logger.info("pipeline.classifier.index_clamped", {
            index: cc.index,
            time: cand.time,
            llmIndex: cc.displayFrameIndex,
            resolvedIndex,
            windowLength: window.length,
          });
        } else {
          resolvedIndex = cc.displayFrameIndex;
        }
        displayFramePath = window[resolvedIndex].localPath;
      }

      records.push({
        ...cc,
        displayFramePath,
      });
      debugRows.push({
        index: cc.index,
        time: cand.time,
        kindHint: cand.kindHint,
        decision: cc.decision,
        verb: cc.verb,
        screenName: cc.screenName,
        elementCaption: cc.elementCaption,
        discardReason: cc.discardReason,
        llmDisplayFrameIndex: cc.displayFrameIndex,
        displayFrameIndex: resolvedIndex,
        displayFramePath,
        windowFramePaths: cand.windowFramePaths,
      });
    }

    // STEPIKA_DEBUG_DIR: env-gated dump of window frames + classifier decisions
    // for offline accuracy investigation. No-op when the var is unset.
    const debugDir = process.env.STEPIKA_DEBUG_DIR;
    if (debugDir) {
      const stepSlug = args.stepTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
      const outDir = path.join(debugDir, `${Date.now()}-${stepSlug}`);
      await fs.promises.mkdir(outDir, { recursive: true });
      for (const row of debugRows) {
        const i = row.index as number;
        const paths = row.windowFramePaths as string[];
        for (let k = 0; k < paths.length; k++) {
          try {
            await fs.promises.copyFile(paths[k], path.join(outDir, `c${i}-w${k}.jpg`));
          } catch { /* frame may be missing */ }
        }
      }
      await fs.promises.writeFile(
        path.join(outDir, "decisions.json"),
        JSON.stringify({ stepTitle: args.stepTitle, rows: debugRows }, null, 2),
      );
      logger.info("pipeline.classifier.debug_dump", { outDir, rows: debugRows.length });
    }
    return records;
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}

export function buildCandidateWindow(
  denseFrames: DensePoolFrame[],
  event: RawEvent,
  opts: { maxFrames: number; preSec: number; postSec: number; maxSpanSec: number },
): DensePoolFrame[] {
  if (denseFrames.length === 0) return [];
  const sorted = [...denseFrames].sort((a, b) => a.t - b.t);
  const byPath = new Map(sorted.map(f => [f.localPath, f] as const));

  const beforeAnchor = byPath.get(event.beforeFramePath) ?? null;
  const afterAnchor = byPath.get(event.afterFramePath) ?? null;
  const afterT = afterAnchor ? afterAnchor.t : event.time;

  const rangeStart = event.time - opts.preSec;
  const rangeEnd = Math.min(afterT, event.time + opts.maxSpanSec) + opts.postSec;

  const anchors: DensePoolFrame[] = [];
  if (beforeAnchor) anchors.push(beforeAnchor);
  if (afterAnchor && afterAnchor.localPath !== beforeAnchor?.localPath) anchors.push(afterAnchor);
  const anchorPaths = new Set(anchors.map(a => a.localPath));

  let sampled = sorted.filter(
    f => f.t >= rangeStart && f.t <= rangeEnd && !anchorPaths.has(f.localPath),
  );
  const budget = Math.max(0, opts.maxFrames - anchors.length);
  if (sampled.length > budget) sampled = decimateEvenly(sampled, budget);

  const seen = new Set<string>();
  const out: DensePoolFrame[] = [];
  for (const f of [...anchors, ...sampled].sort((a, b) => a.t - b.t)) {
    if (seen.has(f.localPath)) continue;
    seen.add(f.localPath);
    out.push(f);
  }
  if (out.length > 0) return out;

  let nearest = sorted[0];
  for (const f of sorted) {
    if (Math.abs(f.t - event.time) < Math.abs(nearest.t - event.time)) nearest = f;
  }
  return [nearest];
}

function decimateEvenly(frames: DensePoolFrame[], n: number): DensePoolFrame[] {
  if (n <= 0) return [];
  if (frames.length <= n) return frames;
  if (n === 1) return [frames[0]];
  const picked: DensePoolFrame[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    const idx = Math.round((i * (frames.length - 1)) / (n - 1));
    const f = frames[idx];
    if (!seen.has(f.localPath)) { seen.add(f.localPath); picked.push(f); }
  }
  return picked;
}
