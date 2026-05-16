/**
 * Hybrid locator: UI-TARS click point -> LLM grid refine.
 *
 *   UI-TARS  ->  reliable anchor point inside the element (14/14 correct)
 *      |
 *   crop centred on the point  ->  grid refine  ->  zoom  ->  grid refine
 *
 * UI-TARS solves identification — it replaces the old coarse-locate stage,
 * which was the pipeline's least reliable step and a big source of run-to-run
 * instability. The grid refine then boxes the element on a crop that is always
 * well-centred. There is no verify loop, so the path does not branch — it is
 * a fixed two-call sequence, which keeps the output stable.
 *
 * Prototype only — lives in scripts/, benchmarked before any src/ integration.
 */
import path from "node:path";
import fs from "node:fs";
import sharp from "sharp";
import { llmJsonVision } from "../../src/lib/openrouter";
import { buildBufferWithOptionalHighlight } from "../../src/trigger/stages/uploadScreenshots";
import { Box, Point, RefineLocateOutput, refineLocateSystem } from "./contract";
import { cropAroundPoint, cropRegion, cropBoxToFrame } from "./cropZoom";
import { overlayGrid, cellSpanBox, type Grid } from "./grid";
import { uiTarsPoint } from "./uitars";
import type { Verb } from "./locate";

const REFINE_GRID: Grid = { cols: 30, rows: 20 };
const REFINE_MODEL = "google/gemini-2.5-flash";

export type HybridResult = {
  highlight: "yes" | "no";
  bbox: Box | null; // frame-normalized
  point: Point | null;
  reason: string | null;
  trace: { rawPoint?: string; snapped?: boolean };
};

const clampCell = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(v)));

/** One grid refine on a crop: returns the box in crop-normalized coords. */
async function refineOnCrop(
  cropPath: string, gridPath: string, intent: string,
): Promise<Box> {
  await overlayGrid(cropPath, gridPath, REFINE_GRID);
  const r = await llmJsonVision({
    model: REFINE_MODEL,
    system: refineLocateSystem(REFINE_GRID.cols, REFINE_GRID.rows),
    userText: [
      `Element to box: the UI element for this step — ${intent}`,
      "It is at or very near the centre of this crop.",
    ].join("\n"),
    imagePaths: [gridPath],
    schema: RefineLocateOutput,
    schemaName: "refine_locate",
    temperature: 0.0,
  });
  return cellSpanBox(
    clampCell(r.c0, REFINE_GRID.cols - 1), clampCell(r.r0, REFINE_GRID.rows - 1),
    clampCell(r.c1, REFINE_GRID.cols - 1), clampCell(r.r1, REFINE_GRID.rows - 1),
    REFINE_GRID,
  );
}

export async function hybridLocate(args: {
  intent: string;
  verb: Verb;
  framePath: string;
  traceDir: string;
  model?: string;
}): Promise<HybridResult> {
  const { intent, verb, framePath, traceDir, model } = args;
  if (verb === "view") {
    return { highlight: "no", bbox: null, point: null, reason: "view_action", trace: {} };
  }

  const meta = await sharp(framePath).metadata();
  const frameW = meta.width ?? 1920;
  const frameH = meta.height ?? 1080;

  // --- UI-TARS anchor point ---
  const { point, raw } = await uiTarsPoint({
    framePath, intent, verb, frameW, frameH, model,
  });
  if (!point) {
    return { highlight: "no", bbox: null, point: null, reason: "no_point",
      trace: { rawPoint: raw } };
  }

  // --- Pass 1: refine on a wide crop centred on the point ---
  const crop1 = await cropAroundPoint(framePath, point,
    path.join(traceDir, "h_crop1.jpg"),
    { cropWFrac: 0.34, cropHFrac: 0.30, maxAspect: 2.2, targetEdgePx: 1024 });
  const box1Crop = await refineOnCrop(crop1.cropPath,
    path.join(traceDir, "h_grid1.jpg"), intent);
  let frameBox = cropBoxToFrame(box1Crop, crop1.map);

  // --- Pass 2: zoom in on that box and refine again for precision ---
  const crop2 = await cropRegion(framePath, frameBox,
    path.join(traceDir, "h_crop2.jpg"),
    { marginFrac: 0.6, maxAspect: 2.4, targetEdgePx: 1100 });
  const box2Crop = await refineOnCrop(crop2.cropPath,
    path.join(traceDir, "h_grid2.jpg"), intent);
  frameBox = cropBoxToFrame(box2Crop, crop2.map);

  const { buf } = await buildBufferWithOptionalHighlight(framePath, { bbox: frameBox });
  await fs.promises.writeFile(path.join(traceDir, "h_final.jpg"), buf);

  return {
    highlight: "yes",
    bbox: frameBox,
    point,
    reason: null,
    trace: { rawPoint: raw, snapped: false },
  };
}
