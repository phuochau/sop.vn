/**
 * LLM contract for the Approach-C bbox prototype: schemas + prompts for the
 * three vision calls (coarse locate, refine, verify). Kept in scripts/ so the
 * prototype never touches src/ until it is proven.
 *
 * All boxes are normalized 0-1 relative to the image the call was given.
 */
import { z } from "zod";

export const Box = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});
export type Box = z.infer<typeof Box>;

/** A normalized 0-1 point. */
export const Point = z.object({ x: z.number(), y: z.number() });
export type Point = z.infer<typeof Point>;

/** Call 1 — coarse locate, on the grid-overlaid full frame. Returns the GRID
 * CELL containing the target, not coordinates: LLMs pick a labelled cell far
 * more reliably than they emit numbers. */
export const CoarseLocateOutput = z.object({
  found: z.enum(["yes", "no"]),
  col: z.number().nullable(),
  row: z.number().nullable(),
  element: z.string().nullable(),
});
export type CoarseLocateOutput = z.infer<typeof CoarseLocateOutput>;

/** Call 2 — refine, on the grid-overlaid crop. Returns the inclusive cell span
 * the element occupies: top-left cell (c0,r0) .. bottom-right cell (c1,r1). */
export const RefineLocateOutput = z.object({
  c0: z.number(),
  r0: z.number(),
  c1: z.number(),
  r1: z.number(),
});
export type RefineLocateOutput = z.infer<typeof RefineLocateOutput>;

/** Call 3 — verify, on the crop with the candidate box drawn.
 * `issue` classifies WHY a box is wrong so the loop knows how to react:
 *  - wrong_element: the box is on a different element / empty space → re-locate
 *  - imprecise: the right element, but the box is loose/tight/cut-off → zoom in
 *  - none: the box is correct */
export const VerifyOutput = z.object({
  correct: z.enum(["yes", "no"]),
  issue: z.enum(["none", "wrong_element", "imprecise"]),
  reason: z.string(),
});
export type VerifyOutput = z.infer<typeof VerifyOutput>;

export const coarseLocateSystem = (
  language: string,
  cols: number,
  rows: number,
): string =>
  [
    "You locate a single UI element in an app screenshot.",
    "A magenta numbered GRID is overlaid on the image:",
    `- columns numbered 0 to ${cols - 1}, left to right (labels along the top)`,
    `- rows numbered 0 to ${rows - 1}, top to bottom (labels down the left edge)`,
    "",
    "You are given the user's intent and the action verb.",
    "Find the ONE UI element the user interacts with for this step:",
    "- click  -> the button, tab, menu item, link, or checkbox being clicked",
    "- input  -> the text field being typed into (the field box, not its label)",
    "- select -> the dropdown option or control being chosen",
    "- link   -> the link being followed",
    "",
    "Return the grid cell that contains the CENTER of that element:",
    "`col` = its column number, `row` = its row number.",
    "",
    'If no specific UI element matches the intent, or the intent is too vague',
    "to point at one element, return found=no with col=null, row=null, element=null.",
    "",
    "element: a short description of the target (e.g. 'red Create button',",
    "'Company name text field', 'Subscriber dropdown option').",
    `Write the element description in ${language}.`,
  ].join("\n");

export const refineLocateSystem = (cols: number, rows: number): string =>
  [
    "This is a zoomed-in crop with a magenta numbered GRID overlaid.",
    `Columns are numbered 0 to ${cols - 1} (labels along the top edge).`,
    `Rows are numbered 0 to ${rows - 1} (labels down the left edge).`,
    "You are told which element to box.",
    "",
    "Report the inclusive range of grid cells the element occupies:",
    "- c0,r0 = column,row of the TOP-LEFT cell the element touches",
    "- c1,r1 = column,row of the BOTTOM-RIGHT cell the element touches",
    "",
    "Rules:",
    "- A button: the whole rounded/filled button shape, edge to edge.",
    "- A text field: the whole input rectangle (not its label above it).",
    "- A list row, dropdown option, or menu item: box its VISIBLE CONTENT",
    "  tightly — the text label plus any leading checkbox, avatar or icon — and",
    "  NOT the empty full-width band the row spans. The box wraps the content,",
    "  not the whole row strip.",
    "- A checkbox row: include the checkbox AND its label, tight to both.",
    "- Pick the cells whose edges sit closest to the content's true bounds.",
    "- Do NOT extend the cell range into neighbouring elements or empty space.",
  ].join("\n");

/** Call 2b — row expand. Widens a content-tight box to the full clickable row. */
export const rowExpandSystem = (cols: number, rows: number): string =>
  [
    "This is a zoomed-in crop with a magenta numbered GRID overlaid.",
    `Columns are numbered 0 to ${cols - 1} (labels along the top edge).`,
    `Rows are numbered 0 to ${rows - 1} (labels down the left edge).`,
    "",
    "A yellow rectangle is already drawn on a list row / dropdown option / menu",
    "item. It currently hugs only the row's TEXT. Your job: report the cell span",
    "of the WHOLE clickable row, which is larger than the text:",
    "- LEFT and RIGHT edges = the inner edges of the list / panel / menu that the",
    "  row sits inside (the row is full-width within its container — that is the",
    "  region that highlights when you hover the row).",
    "- TOP and BOTTOM edges = the full row height: the even vertical slot the row",
    "  occupies, including the padding above and below the text, halfway to the",
    "  neighbouring rows. Not just the glyph height.",
    "",
    "Return c0,r0 = top-left cell and c1,r1 = bottom-right cell of the full row.",
    "Do not extend into the rows above or below.",
  ].join("\n");

export const verifyHighlightSystem = (): string =>
  [
    "An image has a yellow rectangle drawn on it. You are told which UI element",
    "the rectangle is supposed to enclose.",
    "",
    "Answer correct=yes ONLY if ALL of these hold:",
    "- the rectangle covers the whole target element,",
    "- with only a small margin (it is tight, not loose),",
    "- and it does not substantially enclose other, unrelated elements.",
    "",
    "Otherwise answer correct=no and classify the `issue`:",
    "- 'wrong_element': the rectangle is mostly on a DIFFERENT element, on empty",
    "  space, or — when several similar items are present (e.g. list rows) — on",
    "  the wrong one. Read any labels/text to judge identity.",
    "- 'imprecise': the rectangle IS on the right element, but the fit is off —",
    "  too loose, too tight, or one side is cut off.",
    "When correct=yes, set issue='none'.",
    "",
    "reason: one short sentence. If the issue is wrong_element, say WHICH element",
    "the rectangle landed on and how it differs from the target.",
  ].join("\n");
