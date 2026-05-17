import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { logger } from "@trigger.dev/sdk/v3";
import { z } from "zod";
import { llmJsonVision } from "@/lib/openrouter";
import { StepClassification, ClassifiedCandidate as ClassifiedCandidateSchema } from "@/lib/schemas";
import { config } from "@/config";
import { markRegion } from "@/trigger/lib/markRegion";
import type { RawEvent } from "./classifyAndMergeEvents";
import { maskedDHash, type ScreenCluster } from "@/trigger/lib/screenId";
import { hammingDistance } from "@/trigger/lib/perceptualHash";

export type ClassifiedCandidate = z.infer<typeof ClassifiedCandidateSchema>;

export type CandidateForLLM = {
  index: number;
  time: number;
  kindHint: "click" | "input";
  beforeMarkedPath: string;
  afterMarkedPath: string;
  screenCluster: string | null;
};

export type ClassifiedActionRecord = ClassifiedCandidate & {
  beforeFramePath: string;
  afterFramePath: string;
};

type ClassifierFn = (args: {
  stepTitle: string;
  language: string;
  candidates: CandidateForLLM[];
  montageImagePath: string | null;
}) => Promise<z.infer<typeof StepClassification>>;

/**
 * Sort by (screenCluster ASC with nulls last, time ASC) then split into chunks of `cap`.
 */
export function chunkCandidatesBySort<T extends { screenCluster: string | null; time: number }>(
  candidates: T[],
  cap: number,
): T[][] {
  const sorted = [...candidates].sort((a, b) => {
    if (a.screenCluster === null && b.screenCluster !== null) return 1;
    if (a.screenCluster !== null && b.screenCluster === null) return -1;
    if (a.screenCluster !== b.screenCluster) {
      return String(a.screenCluster).localeCompare(String(b.screenCluster));
    }
    return a.time - b.time;
  });
  const out: T[][] = [];
  for (let i = 0; i < sorted.length; i += cap) {
    out.push(sorted.slice(i, i + cap));
  }
  return out.length > 0 ? out : [[]];
}

/**
 * Build a horizontal montage of representative cluster frames, each labeled with its letter.
 * Returns the JPEG path, or null when only 0 or 1 cluster (nothing useful to show) OR > maxClusters.
 */
export async function buildMontage(
  clusters: ScreenCluster[],
  outDir: string,
  maxClusters: number,
): Promise<string | null> {
  if (clusters.length < 2 || clusters.length > maxClusters) return null;

  const tileW = 640;
  const tileH = 360;
  const labelH = 36;
  const tiles: Buffer[] = [];
  for (const c of clusters) {
    const labelSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tileW}" height="${labelH}">
      <rect width="${tileW}" height="${labelH}" fill="#222"/>
      <text x="12" y="26" fill="#fff" font-family="sans-serif" font-size="22" font-weight="700">${c.letter}</text>
    </svg>`;
    const imgBuf = await sharp(c.representative.localPath)
      .resize({ width: tileW, height: tileH - labelH, fit: "inside", withoutEnlargement: true })
      .toBuffer();
    const tile = await sharp({
      create: { width: tileW, height: tileH, channels: 3, background: "#000" },
    })
      .composite([
        { input: Buffer.from(labelSvg), top: 0, left: 0 },
        { input: imgBuf, top: labelH, left: 0 },
      ])
      .jpeg({ quality: 85 })
      .toBuffer();
    tiles.push(tile);
  }

  const outPath = path.join(outDir, "montage.jpg");
  const composites = tiles.map((buf, i) => ({ input: buf, top: 0, left: i * tileW }));
  await sharp({
    create: { width: tileW * tiles.length, height: tileH, channels: 3, background: "#000" },
  })
    .composite(composites)
    .jpeg({ quality: 85 })
    .toFile(outPath);
  return outPath;
}

async function defaultClassifier(args: {
  stepTitle: string;
  language: string;
  candidates: CandidateForLLM[];
  montageImagePath: string | null;
}): Promise<z.infer<typeof StepClassification>> {
  const lines: string[] = [
    `Step title: ${args.stepTitle}`,
    `Number of candidates in this batch: ${args.candidates.length}`,
    args.montageImagePath
      ? `First image is the screen montage. Candidates start at the second image.`
      : `No montage attached. Candidates start at the first image. screenCluster MUST be null for every candidate.`,
    ``,
    `Candidates:`,
  ];
  for (const c of args.candidates) {
    lines.push(
      `- index=${c.index} time=${c.time.toFixed(2)} kindHint=${c.kindHint} screenCluster=${c.screenCluster ?? "null"}`,
    );
  }
  const userText = lines.join("\n");

  const imagePaths: string[] = [];
  if (args.montageImagePath) imagePaths.push(args.montageImagePath);
  for (const c of args.candidates) {
    imagePaths.push(c.beforeMarkedPath, c.afterMarkedPath);
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
  montageImagePath: string | null;
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
      montageImagePath: args.montageImagePath,
    });
    out.push(...result.candidates);
  }
  return out;
}

export async function classifyAndRemap(args: {
  stepTitle: string;
  language: string;
  events: RawEvent[];
  screenClusters: ScreenCluster[];
}): Promise<ClassifiedActionRecord[]> {
  if (args.events.length === 0) return [];

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "classify-"));
  try {
    const candidates: (CandidateForLLM & { event: RawEvent })[] = [];
    for (let i = 0; i < args.events.length; i++) {
      const e = args.events[i];
      const beforeMarkedPath = path.join(tmpDir, `c${i}-before.jpg`);
      const afterMarkedPath = path.join(tmpDir, `c${i}-after.jpg`);
      await markRegion(e.beforeFramePath, e.bbox, beforeMarkedPath);
      await markRegion(e.afterFramePath, e.bbox, afterMarkedPath);

      // When clusters exceed the montage cap, the montage is omitted (see buildMontage).
      // In that case the LLM has no letter→frame mapping to interpret, so every candidate
      // passes screenCluster=null. Spec §3 montage-overflow edge case.
      const overCap = args.screenClusters.length > config.screenshots.screenId.maxMontageClusters;
      const cluster = overCap ? null : nearestCluster(args.screenClusters, e.time);
      candidates.push({
        index: i,
        time: e.time,
        kindHint: e.kindHint,
        beforeMarkedPath,
        afterMarkedPath,
        screenCluster: cluster?.letter ?? null,
        event: e,
      });
    }

    const montagePath = await buildMontage(args.screenClusters, tmpDir, config.screenshots.screenId.maxMontageClusters);

    const classified = await classifyStepWithLLM({
      stepTitle: args.stepTitle,
      language: args.language,
      candidates: candidates.map(c => ({
        index: c.index,
        time: c.time,
        kindHint: c.kindHint,
        beforeMarkedPath: c.beforeMarkedPath,
        afterMarkedPath: c.afterMarkedPath,
        screenCluster: c.screenCluster,
      })),
      montageImagePath: montagePath,
    });

    // Cross-screen guard: if displayFrame === "after" but AFTER is on a different
    // screen than BEFORE (action triggered a page navigation), the AFTER frame is
    // the destination page — useless for illustrating the action. Force BEFORE.
    const beforeHashCache = new Map<string, string>();
    const afterHashCache = new Map<string, string>();
    async function hashOf(p: string, cache: Map<string, string>): Promise<string> {
      const cached = cache.get(p);
      if (cached) return cached;
      const h = await maskedDHash(p);
      cache.set(p, h);
      return h;
    }

    const records: ClassifiedActionRecord[] = [];
    for (const cc of classified) {
      const cand = candidates.find(c => c.index === cc.index);
      if (!cand) {
        logger.warn("pipeline.classifier.unknown_index", { index: cc.index });
        continue;
      }
      let displayFrame = cc.displayFrame;
      if (cc.decision === "action" && displayFrame === "after") {
        const bh = await hashOf(cand.event.beforeFramePath, beforeHashCache);
        const ah = await hashOf(cand.event.afterFramePath, afterHashCache);
        const dist = hammingDistance(bh, ah);
        if (dist > config.screenshots.screenId.hammingThreshold) {
          logger.info("pipeline.classifier.displayframe_overridden", {
            index: cc.index,
            time: cand.time,
            verb: cc.verb,
            llmChoice: "after",
            override: "before",
            hammingDistance: dist,
            reason: "after frame is a different screen (navigation)",
          });
          displayFrame = "before";
        }
      }
      records.push({
        ...cc,
        displayFrame,
        beforeFramePath: cand.event.beforeFramePath,
        afterFramePath: cand.event.afterFramePath,
      });
    }
    return records;
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}

function nearestCluster(clusters: ScreenCluster[], t: number): ScreenCluster | null {
  if (clusters.length === 0) return null;
  let best = clusters[0];
  let bestDelta = Math.abs(clusters[0].representative.t - t);
  for (let i = 1; i < clusters.length; i++) {
    const m = clusters[i].members;
    for (const mm of m) {
      const d = Math.abs(mm.frame.t - t);
      if (d < bestDelta) { bestDelta = d; best = clusters[i]; }
    }
  }
  return best;
}
