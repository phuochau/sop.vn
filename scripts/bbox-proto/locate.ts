/**
 * Approach-C candidate pipeline (prototype): iterative zoom-refine.
 *
 *   coarse locate (grid) -> [ crop tighter -> grid refine -> verify ]*
 *
 * Each pass crops closer around the current box, so the refine grid's cells
 * cover fewer frame pixels every time and the box converges to a tight fit.
 * verify gates the result and its critique feeds the next pass.
 *
 * Lives in scripts/ — proves the approach before any src/ integration.
 */
import fs from "node:fs";
import path from "node:path";
import { llmJsonVision } from "../../src/lib/openrouter";
import { buildBufferWithOptionalHighlight } from "../../src/trigger/stages/uploadScreenshots";
import {
  Box,
  CoarseLocateOutput,
  RefineLocateOutput,
  VerifyOutput,
  coarseLocateSystem,
  refineLocateSystem,
  verifyHighlightSystem,
} from "./contract";
import {
  cropAroundPoint, cropRegion, cropBoxToFrame, frameBoxToCrop, type CropResult,
} from "./cropZoom";
import { overlayGrid, cellCenter, cellSpanBox, type Grid } from "./grid";
import { snapToElement } from "./snap";

export type Verb = "click" | "input" | "select" | "link" | "view";

const COARSE_GRID: Grid = { cols: 16, rows: 10 };
const REFINE_GRID: Grid = { cols: 30, rows: 20 };
const MAX_PASSES = 5;

export type CandidateResult = {
  highlight: "yes" | "no";
  bbox: Box | null; // frame-normalized
  element: string | null;
  verified: boolean | null;
  reason: string | null;
  trace: {
    coarse?: CoarseLocateOutput;
    passes?: {
      pass: number;
      mode: "wide" | "zoom";
      box: Box;
      verify: { correct: boolean; issue: string; reason: string };
    }[];
    snap?: { snapped: boolean; reason: string };
  };
};

async function coarseLocate(
  framePath: string, intent: string, verb: Verb, language: string, traceDir: string,
  model: string,
): Promise<CoarseLocateOutput> {
  const gridPath = path.join(traceDir, "coarse_grid.jpg");
  await overlayGrid(framePath, gridPath, COARSE_GRID);
  return llmJsonVision({
    model,
    system: coarseLocateSystem(language, COARSE_GRID.cols, COARSE_GRID.rows),
    userText: [`Intent: ${intent}`, `Verb: ${verb}`].join("\n"),
    imagePaths: [gridPath],
    schema: CoarseLocateOutput,
    schemaName: "coarse_locate",
    temperature: 0.0,
  });
}

async function refine(
  gridImagePath: string, element: string, intent: string, critique: string | undefined,
  grid: Grid, model: string,
): Promise<RefineLocateOutput> {
  const userText = critique
    ? [
        `Element to box: ${element}`,
        `Step intent: ${intent}`,
        "",
        "Your PREVIOUS box is drawn in yellow on this image. It was REJECTED:",
        `  "${critique}"`,
        "Report a corrected cell range that fixes exactly this problem.",
      ].join("\n")
    : [`Element to box: ${element}`, `Step intent: ${intent}`].join("\n");
  return llmJsonVision({
    model,
    system: refineLocateSystem(grid.cols, grid.rows),
    userText,
    imagePaths: [gridImagePath],
    schema: RefineLocateOutput,
    schemaName: "refine_locate",
    temperature: 0.0,
  });
}

/** Map a refine output's cell span to a crop-normalized box on `grid`. */
function spanToBox(r: RefineLocateOutput, grid: Grid): Box {
  return cellSpanBox(
    clampCell(r.c0, grid.cols - 1), clampCell(r.r0, grid.rows - 1),
    clampCell(r.c1, grid.cols - 1), clampCell(r.r1, grid.rows - 1),
    grid,
  );
}

async function verify(
  imageWithBoxPath: string, element: string, model: string,
): Promise<VerifyOutput> {
  return llmJsonVision({
    model,
    system: verifyHighlightSystem(),
    userText: `The yellow rectangle should enclose: ${element}`,
    imagePaths: [imageWithBoxPath],
    schema: VerifyOutput,
    schemaName: "verify_highlight",
    temperature: 0.0,
  });
}

/** Draw `bbox` on `srcPath` and write it to `outPath`. */
async function drawBox(srcPath: string, bbox: Box, outPath: string): Promise<void> {
  const { buf } = await buildBufferWithOptionalHighlight(srcPath, { bbox });
  await fs.promises.writeFile(outPath, buf);
}

const clampCell = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(v)));

export async function candidateLocate(args: {
  intent: string;
  verb: Verb;
  framePath: string;
  language: string;
  traceDir: string;
  model: string;
}): Promise<CandidateResult> {
  const { intent, verb, framePath, language, traceDir, model } = args;
  const trace: CandidateResult["trace"] = {};
  const log = (s: string) => console.error(`    · ${s}`);

  if (verb === "view") {
    return { highlight: "no", bbox: null, element: null, verified: null,
      reason: "view_action", trace };
  }

  // --- Coarse locate (grid cell) ---
  log("coarse locate…");
  const coarse = await coarseLocate(framePath, intent, verb, language, traceDir, model);
  trace.coarse = coarse;
  if (coarse.found !== "yes" || coarse.col === null || coarse.row === null
      || coarse.element === null) {
    return { highlight: "no", bbox: null, element: null, verified: null,
      reason: "no_specific_target", trace };
  }
  const element = coarse.element;
  const p = cellCenter(
    clampCell(coarse.col, COARSE_GRID.cols - 1),
    clampCell(coarse.row, COARSE_GRID.rows - 1),
    COARSE_GRID,
  );
  await drawBox(framePath, { x: p.x - 0.02, y: p.y - 0.02, w: 0.04, h: 0.04 },
    path.join(traceDir, "coarse.jpg"));
  log(`coarse ok: "${element}" @(${p.x.toFixed(2)},${p.y.toFixed(2)})`);

  // --- Verify-guided refine loop ---
  // `region` null  -> WIDE crop around the coarse point (locate / re-locate).
  // `region` set   -> ZOOM crop tight around the box (tighten precision).
  // verify decides which: wrong_element -> go/stay wide; imprecise -> zoom.
  const passes: NonNullable<CandidateResult["trace"]["passes"]> = [];
  let frameBox: Box | null = null;
  let region: Box | null = null;
  let critique: string | undefined;
  let verified = false;

  for (let pass = 1; pass <= MAX_PASSES; pass++) {
    const mode: "wide" | "zoom" = region ? "zoom" : "wide";
    let crop: CropResult;
    if (region) {
      crop = await cropRegion(framePath, region, path.join(traceDir, `crop_${pass}.jpg`),
        { marginFrac: 0.8, maxAspect: 2.2, targetEdgePx: 1024 });
    } else {
      crop = await cropAroundPoint(framePath, p, path.join(traceDir, `crop_${pass}.jpg`),
        { cropWFrac: 0.42, cropHFrac: 0.36, maxAspect: 2.2, targetEdgePx: 1024 });
    }

    const gridImg = path.join(traceDir, `grid_${pass}.jpg`);
    await overlayGrid(crop.cropPath, gridImg, REFINE_GRID);
    log(`pass ${pass} (${mode}): refine${critique ? " + critique" : ""}…`);
    const r = await refine(gridImg, element, intent, critique, REFINE_GRID, model);
    const boxCrop = spanToBox(r, REFINE_GRID);
    frameBox = cropBoxToFrame(boxCrop, crop.map);

    const verifyImg = path.join(traceDir, `verify_${pass}.jpg`);
    await drawBox(crop.cropPath, boxCrop, verifyImg);
    log(`pass ${pass} (${mode}): verify…`);
    const v = await verify(verifyImg, element, model);
    passes.push({
      pass, mode, box: frameBox,
      verify: { correct: v.correct === "yes", issue: v.issue, reason: v.reason },
    });
    if (v.correct === "yes") {
      verified = true;
      break;
    }
    critique = v.reason;
    // imprecise -> zoom into the box; wrong_element -> drop back to a wide crop.
    region = v.issue === "imprecise" ? frameBox : null;
  }
  trace.passes = passes;

  if (frameBox === null) {
    return { highlight: "no", bbox: null, element, verified: false, reason: "no_box", trace };
  }

  // --- CV pixel-snap: tighten the box to the element's true rectangle ---
  // The grid-located box is quantized and lands loose; snap it to the element's
  // real pixel edges. Snapping self-gates and falls back when uncertain.
  {
    const snapCrop = await cropRegion(framePath, frameBox,
      path.join(traceDir, "snap_crop.jpg"),
      { marginFrac: 0.7, maxAspect: 3.0, targetEdgePx: 1024 });
    const approxCropBox = frameBoxToCrop(frameBox, snapCrop.map);
    const snap = await snapToElement(snapCrop.cropPath, approxCropBox);
    const moved = (Object.keys(snap.edges) as (keyof typeof snap.edges)[])
      .filter((k) => snap.edges[k].moved);
    trace.snap = { snapped: snap.snapped, reason: moved.join(",") || "none" };
    if (snap.snapped) {
      frameBox = cropBoxToFrame(snap.box, snapCrop.map);
      await drawBox(framePath, frameBox, path.join(traceDir, "snapped.jpg"));
      log(`snap: tightened edges [${moved.join(",")}]`);
    } else {
      log("snap: no edge stood out");
    }
  }
  return {
    highlight: "yes",
    bbox: frameBox,
    element,
    verified,
    reason: verified ? null : "verification_failed",
    trace,
  };
}
