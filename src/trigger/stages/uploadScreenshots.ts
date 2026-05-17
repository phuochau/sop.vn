import fs from "node:fs";
import sharp from "sharp";
import { customAlphabet } from "nanoid";
import { logger } from "@trigger.dev/sdk/v3";
import { putObject } from "@/lib/r2";
import { screenshotKey } from "@/lib/utils";
import type { Screenshot } from "@/lib/mongo";
import type { Action } from "@/lib/schemas";

export function rectSvg(
  W: number,
  H: number,
  bbox: { x: number; y: number; w: number; h: number },
): string | null {
  if (bbox.w < 0.005 || bbox.h < 0.005) return null;
  if (bbox.x + bbox.w > 1.05 || bbox.y + bbox.h > 1.05) return null;
  if (bbox.x < -0.05 || bbox.y < -0.05) return null;
  const x = clamp01(bbox.x);
  const y = clamp01(bbox.y);
  const w = Math.min(1 - x, Math.max(0, bbox.w));
  const h = Math.min(1 - y, Math.max(0, bbox.h));
  const stroke = Math.max(4, Math.round(H * 0.005));
  const px = Math.round(x * W) + Math.round(stroke / 2);
  const py = Math.round(y * H) + Math.round(stroke / 2);
  const pw = Math.max(1, Math.round(w * W) - stroke);
  const ph = Math.max(1, Math.round(h * H) - stroke);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" fill="none" stroke="#F5C518" stroke-width="${stroke}" rx="6" ry="6"/></svg>`;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** SVG "click here" marker — soft halo, bold ring, centre dot — at a point. */
export function circleSvg(
  W: number,
  H: number,
  point: { x: number; y: number },
): string {
  const cx = Math.round(clamp01(point.x) * W);
  const cy = Math.round(clamp01(point.y) * H);
  const ring = Math.max(14, Math.round(W * 0.016));
  const halo = Math.round(ring * 1.85);
  const dot = Math.max(4, Math.round(W * 0.004));
  const stroke = Math.max(4, Math.round(H * 0.005));
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">` +
    `<circle cx="${cx}" cy="${cy}" r="${halo}" fill="#F5C518" fill-opacity="0.12" ` +
    `stroke="#F5C518" stroke-width="3" stroke-opacity="0.45"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${ring}" fill="#F5C518" fill-opacity="0.15" ` +
    `stroke="#F5C518" stroke-width="${stroke}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${dot}" fill="#F5C518"/>` +
    `</svg>`
  );
}

export type HighlightGeom =
  | { point: { x: number; y: number } }
  | { bbox: { x: number; y: number; w: number; h: number } }
  | null;

export async function buildBufferWithOptionalHighlight(
  localPath: string,
  geom: HighlightGeom,
): Promise<{ buf: Buffer; error: string | null }> {
  if (!geom) {
    return { buf: await fs.promises.readFile(localPath), error: null };
  }
  try {
    const meta = await sharp(localPath).metadata();
    const W = meta.width ?? 0;
    const H = meta.height ?? 0;
    if (!W || !H) {
      return { buf: await fs.promises.readFile(localPath), error: "missing image metadata" };
    }
    let svg: string | null;
    if ("point" in geom) {
      svg = circleSvg(W, H, geom.point);
    } else {
      svg = rectSvg(W, H, geom.bbox);
      if (!svg) return { buf: await fs.promises.readFile(localPath), error: "bbox out of range" };
    }
    const buf = await sharp(localPath)
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .jpeg({ quality: 85 })
      .toBuffer();
    return { buf, error: null };
  } catch (e) {
    return {
      buf: await fs.promises.readFile(localPath),
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

const newFrameId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 10);

export async function runUploadScreenshots(args: {
  sopId: string;
  byStep: Map<number, Action[]>;
}): Promise<Map<number, Screenshot[]>> {
  const out = new Map<number, Screenshot[]>();

  for (const [stepIndex, actions] of args.byStep.entries()) {
    const records: Screenshot[] = [];
    for (let order = 0; order < actions.length; order++) {
      const action = actions[order];
      const frameId = newFrameId();
      const r2Key = screenshotKey(args.sopId, stepIndex, frameId);
      const h = action.highlight;
      const geom: HighlightGeom = h?.point
        ? { point: h.point }
        : h?.bbox
          ? { bbox: h.bbox }
          : null;
      const { buf, error } = await buildBufferWithOptionalHighlight(action.displayFramePath, geom);
      if (error) {
        logger.warn("uploadScreenshots: highlight draw failed; uploaded un-annotated frame", {
          stepIndex, t: action.time, error,
        });
      }
      await putObject(r2Key, buf, "image/jpeg");
      const rec: Screenshot = {
        frameId,
        r2Key,
        t: action.time,
        order,
        description: action.description,
        verb: action.verb,
        screenName: action.screenName,
        elementCaption: action.elementCaption,
      };
      if (action.highlight && !error) {
        rec.highlight = action.highlight;
      } else if (action.highlight && error) {
        rec.highlightError = error;
      }
      records.push(rec);
    }
    out.set(stepIndex, records);
  }
  return out;
}
