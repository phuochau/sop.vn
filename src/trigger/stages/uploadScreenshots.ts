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

export async function buildBufferWithOptionalHighlight(
  localPath: string,
  bbox: { x: number; y: number; w: number; h: number } | null,
): Promise<{ buf: Buffer; error: string | null }> {
  if (!bbox) {
    return { buf: await fs.promises.readFile(localPath), error: null };
  }
  try {
    const meta = await sharp(localPath).metadata();
    const W = meta.width ?? 0;
    const H = meta.height ?? 0;
    if (!W || !H) return { buf: await fs.promises.readFile(localPath), error: "missing image metadata" };
    const svg = rectSvg(W, H, bbox);
    if (!svg) return { buf: await fs.promises.readFile(localPath), error: "bbox out of range" };
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

// Localized templates for the composed description. Falls back to English.
const DESCRIPTION_TEMPLATES: Record<string, { click: (s: string, e: string) => string; input: (s: string, e: string) => string }> = {
  en: {
    click: (s, e) => `On the "${s}" screen, click the ${e}.`,
    input: (s, e) => `On the "${s}" screen, enter text in the ${e}.`,
  },
  vi: {
    click: (s, e) => `Trên màn hình "${s}", nhấp vào ${e}.`,
    input: (s, e) => `Trên màn hình "${s}", nhập văn bản vào ${e}.`,
  },
};

function composeDescription(action: Action, language: string): string {
  if (action.verb === "view") return action.caption;
  const tpl = DESCRIPTION_TEMPLATES[language] ?? DESCRIPTION_TEMPLATES.en;
  const fn = action.verb === "input" ? tpl.input : tpl.click;
  return fn(action.screenName, action.elementCaption);
}

function coerceHighlightKind(verb: "click" | "input" | "select" | "link"): "click" | "input" {
  return verb === "input" ? "input" : "click";
}

export async function runUploadScreenshots(args: {
  sopId: string;
  byStep: Map<number, Action[]>;
  language: string;
}): Promise<Map<number, Screenshot[]>> {
  const out = new Map<number, Screenshot[]>();

  for (const [stepIndex, actions] of args.byStep.entries()) {
    const records: Screenshot[] = [];
    for (let order = 0; order < actions.length; order++) {
      const action = actions[order];
      const frameId = newFrameId();
      const r2Key = screenshotKey(args.sopId, stepIndex, frameId);
      const description = composeDescription(action, args.language);
      const bboxForOverlay = action.verb === "view" ? null : action.bbox;
      const { buf, error } = await buildBufferWithOptionalHighlight(action.displayFramePath, bboxForOverlay);
      if (error) {
        logger.warn("uploadScreenshots: highlight draw failed; uploaded un-annotated frame", {
          stepIndex,
          t: action.time,
          error,
        });
      }
      await putObject(r2Key, buf, "image/jpeg");
      const rec: Screenshot = {
        frameId,
        r2Key,
        t: action.time,
        order,
        description,
        verb: action.verb,
      };
      if (action.verb !== "view") {
        rec.screenName = action.screenName;
        rec.elementCaption = action.elementCaption;
        if (!error) {
          rec.highlight = { kind: coerceHighlightKind(action.verb), bbox: action.bbox };
        } else {
          rec.highlightError = error;
        }
      } else {
        rec.screenName = action.screenName;
      }
      records.push(rec);
    }
    out.set(stepIndex, records);
  }
  return out;
}
