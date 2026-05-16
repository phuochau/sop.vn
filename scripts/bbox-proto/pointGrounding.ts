/**
 * Point grounding via a standard JSON-capable vision model.
 *
 * This is the FALLBACK path for the point highlighter: UI-TARS is the primary
 * grounder, but it is a single ByteDance-hosted model. If it is unavailable we
 * fall back to a general vision model (e.g. Gemini 2.5 Flash, Qwen3-VL) asked
 * for the same thing — the click point of the target element.
 *
 * Unlike UI-TARS, these models support structured JSON output, so we get a
 * clean { found, x, y } back. Coordinates are normalized 0-1000.
 */
import { z } from "zod";
import { llmJsonVision } from "../../src/lib/openrouter";
import type { Point } from "./contract";
import type { Verb } from "./locate";

export const PointOutput = z.object({
  found: z.enum(["yes", "no"]),
  x: z.number().nullable(),
  y: z.number().nullable(),
});
export type PointOutput = z.infer<typeof PointOutput>;

export type PointGroundingResult = { point: Point | null; raw: PointOutput | null };

const pointSystem = (verb: Verb): string =>
  [
    "You locate ONE UI element in an app screenshot and return the point to",
    "click on it.",
    "",
    "You are given the user's intent and the action verb. Find the single",
    "element the user interacts with:",
    "- click  -> the button, tab, menu item, link, or checkbox clicked",
    "- input  -> the text field typed into",
    "- select -> the dropdown option or control chosen",
    "- link   -> the link followed",
    "",
    "Return the click point as x,y in NORMALIZED coordinates on a 0-1000 scale:",
    "x = 0 is the left edge, 1000 the right edge; y = 0 the top, 1000 the bottom.",
    "Aim for the centre of the element.",
    "",
    `verb for this step: ${verb}`,
    "If no specific element matches, return found=no with x=null, y=null.",
  ].join("\n");

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Locate the target element's click point with a standard JSON vision model. */
export async function pointGroundingLocate(args: {
  intent: string;
  verb: Verb;
  framePath: string;
  model: string;
}): Promise<PointGroundingResult> {
  const { intent, verb, framePath, model } = args;
  if (verb === "view") return { point: null, raw: null };

  const out = await llmJsonVision({
    model,
    system: pointSystem(verb),
    userText: `Intent: ${intent}\nVerb: ${verb}`,
    imagePaths: [framePath],
    schema: PointOutput,
    schemaName: "point_grounding",
    temperature: 0.0,
  });
  if (out.found !== "yes" || out.x === null || out.y === null) {
    return { point: null, raw: out };
  }
  return { point: { x: clamp01(out.x / 1000), y: clamp01(out.y / 1000) }, raw: out };
}
