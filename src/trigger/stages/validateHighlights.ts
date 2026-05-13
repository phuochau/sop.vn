import { logger } from "@trigger.dev/sdk/v3";
import { llmJsonVision } from "@/lib/openrouter";
import { FocusedCursorOutput, type Cursor } from "@/lib/schemas";
import { config } from "@/config";
import { verifyCursorInWindow as defaultVerify } from "@/trigger/lib/cursorDetect";
import { bboxContainsCursor, type Pick } from "./assignScreenshots";

type ValidateInput = {
  pickIndex: number; // index into picks[]
  bucketIndex: number; // index referenced in LLM prompt
  framePath: string; // downscaled image
  timestampSec: number;
};

export type FocusedCursorCaller = (input: {
  framePaths: string[];
  bucketIndices: number[];
  timestamps: number[];
}) => Promise<{ cursors: Array<{ index: number; cursor: Cursor | null }> }>;

export type CursorVerifier = (
  framePath: string,
  cx: number,
  cy: number,
) => Promise<{ x: number; y: number } | null>;

const defaultFocusedCursor: FocusedCursorCaller = async ({ framePaths, bucketIndices, timestamps }) => {
  const userText = [
    `Find the mouse cursor in each image. Bucket indices and timestamps:`,
    ...bucketIndices.map((bi, i) => `${bi} : ${timestamps[i].toFixed(2)}s`),
    ``,
    `Return JSON: { "cursors": [{ "index": <bucket index>, "cursor": { "x": <0..1>, "y": <0..1> } | null }] }`,
  ].join("\n");
  return llmJsonVision({
    model: config.ai.visionModel,
    system: config.ai.prompts.focusedCursorSystem(),
    userText,
    imagePaths: framePaths,
    schema: FocusedCursorOutput,
    schemaName: "focused_cursor",
    maxRetries: config.ai.maxRetries,
  });
};

/**
 * Two-signal cursor validation:
 *   1. Focused-cursor LLM call (separate prompt context from the bbox call) proposes cursor (x, y).
 *   2. CV detector in a narrow window around the proposed point verifies a cursor is actually rendered.
 * Both must agree on cursor location, and the bbox must contain the corroborated cursor.
 *
 * Returns picks with surviving highlights kept and failed highlights set to null.
 * Throws if the focused-cursor LLM call fails — caller is expected to catch and drop highlights at step level.
 */
export async function validateHighlights(args: {
  picks: Pick[];
  inputs: ValidateInput[];
  stepIndex: number;
  focusedCursor?: FocusedCursorCaller;
  verifyCursor?: CursorVerifier;
}): Promise<Pick[]> {
  if (args.inputs.length === 0) return args.picks;

  const focusedCursor = args.focusedCursor ?? defaultFocusedCursor;
  const verifyCursor = args.verifyCursor ?? defaultVerify;

  const result = await focusedCursor({
    framePaths: args.inputs.map(i => i.framePath),
    bucketIndices: args.inputs.map(i => i.bucketIndex),
    timestamps: args.inputs.map(i => i.timestampSec),
  });

  const cursorByBucket = new Map<number, Cursor | null>();
  for (const c of result.cursors) {
    if (!cursorByBucket.has(c.index)) cursorByBucket.set(c.index, c.cursor);
  }

  // CV-verify each claimed cursor in parallel
  const verifications = await Promise.all(
    args.inputs.map(async (inp) => {
      const claim = cursorByBucket.get(inp.bucketIndex);
      if (!claim) return { pickIndex: inp.pickIndex, cv: null as Cursor | null };
      const cv = await verifyCursor(inp.framePath, claim.x, claim.y);
      return { pickIndex: inp.pickIndex, cv: cv ? { x: cv.x, y: cv.y } : null };
    }),
  );
  const cvByPick = new Map<number, Cursor | null>(verifications.map(v => [v.pickIndex, v.cv]));

  return args.picks.map((p, pi) => {
    if (!p.highlight) return p;
    const inWindow = args.inputs.find(i => i.pickIndex === pi);
    if (!inWindow) return p; // not in validation set; leave unchanged (shouldn't happen)
    const claim = cursorByBucket.get(inWindow.bucketIndex);
    if (!claim) {
      logger.debug("dropping highlight: focused-cursor returned null/missing", { stepIndex: args.stepIndex });
      return { ...p, highlight: null };
    }
    const cv = cvByPick.get(pi) ?? null;
    if (!cv) {
      logger.debug("dropping highlight: CV did not corroborate LLM cursor", { stepIndex: args.stepIndex, claim });
      return { ...p, highlight: null };
    }
    if (!bboxContainsCursor(p.highlight.bbox, cv)) {
      logger.debug("dropping highlight: bbox does not contain verified cursor", {
        stepIndex: args.stepIndex,
        cv,
        bbox: p.highlight.bbox,
      });
      return { ...p, highlight: null };
    }
    return p;
  });
}
