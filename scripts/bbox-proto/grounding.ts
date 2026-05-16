/**
 * Grounding locator — direct UI element bounding-box grounding.
 *
 * Instead of the grid-cell hack, this asks a vision model trained for GUI
 * grounding (e.g. Qwen2.5-VL) for the target element's pixel rectangle
 * directly. Such models output coordinates in the input image's own pixel
 * space, so we send the full frame, ask for [x1,y1,x2,y2] in pixels, and
 * normalize by the frame size.
 *
 * Lives in scripts/ — a benchmark candidate, not yet wired into src/.
 */
import { z } from "zod";
import { llmJsonVision } from "../../src/lib/openrouter";
import type { Box } from "./contract";
import type { Verb } from "./locate";

export const GroundingOutput = z.object({
  found: z.enum(["yes", "no"]),
  element: z.string().nullable(),
  x1: z.number().nullable(),
  y1: z.number().nullable(),
  x2: z.number().nullable(),
  y2: z.number().nullable(),
});
export type GroundingOutput = z.infer<typeof GroundingOutput>;

export type GroundingResult = {
  highlight: "yes" | "no";
  bbox: Box | null; // frame-normalized
  element: string | null;
  raw: GroundingOutput | null;
  reason: string | null;
};

function groundingSystem(verb: Verb): string {
  return [
    "You locate ONE UI element in an app screenshot and return its bounding box.",
    "",
    "You are given the user's intent and the action verb. Find the single",
    "element the user interacts with:",
    "- click  -> the button, tab, menu item, link, or checkbox clicked",
    "- input  -> the text field typed into (the field box, not its label)",
    "- select -> the dropdown option or control chosen",
    "- link   -> the link followed",
    "",
    "Return the box as [x1,y1] top-left and [x2,y2] bottom-right, in NORMALIZED",
    "coordinates on a 0-1000 scale: x = 0 is the left edge, 1000 the right edge;",
    "y = 0 is the top edge, 1000 the bottom edge.",
    "The box must be tight: edges sit exactly on the element's edges, covering",
    "the whole element with no background margin and nothing of a neighbour.",
    "",
    `verb for this step: ${verb}`,
    "If no specific element matches, return found=no with null coordinates.",
  ].join("\n");
}

const COORD_SCALE = 1000;

/** Locate the target element with a grounding model. */
export async function groundingLocate(args: {
  intent: string;
  verb: Verb;
  framePath: string;
  model: string;
}): Promise<GroundingResult> {
  const { intent, verb, framePath, model } = args;
  if (verb === "view") {
    return { highlight: "no", bbox: null, element: null, raw: null, reason: "view_action" };
  }
  const out = await llmJsonVision({
    model,
    system: groundingSystem(verb),
    userText: `Intent: ${intent}\nVerb: ${verb}`,
    imagePaths: [framePath],
    schema: GroundingOutput,
    schemaName: "grounding",
    temperature: 0.0,
  });

  if (out.found !== "yes" || out.x1 === null || out.y1 === null
      || out.x2 === null || out.y2 === null) {
    return { highlight: "no", bbox: null, element: out.element, raw: out,
      reason: "no_target" };
  }
  const x1 = Math.min(out.x1, out.x2) / COORD_SCALE;
  const x2 = Math.max(out.x1, out.x2) / COORD_SCALE;
  const y1 = Math.min(out.y1, out.y2) / COORD_SCALE;
  const y2 = Math.max(out.y1, out.y2) / COORD_SCALE;
  const bbox: Box = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  return { highlight: "yes", bbox, element: out.element, raw: out, reason: null };
}
