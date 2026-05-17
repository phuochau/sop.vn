import type { z } from "zod";
import type { Action, HighlightDecision } from "@/lib/schemas";
import { runLocateHighlight } from "./locateHighlight";

type Decision = z.infer<typeof HighlightDecision>;

export type HighlightFn = (args: {
  intent: string;
  verb: Action["verb"];
  framePath: string;
}) => Promise<Decision>;

function highlightKind(verb: Action["verb"]): "click" | "input" {
  return verb === "input" ? "input" : "click";
}

/**
 * Highlight pass: for each non-view action, ground a yellow-circle "click here"
 * point via runLocateHighlight and write it into action.highlight. Runs on the
 * deduplicated Action[] so the UI-TARS call count is bounded by final actions.
 */
export async function highlightActions(args: {
  actions: Action[];
  highlighter?: HighlightFn;
}): Promise<Action[]> {
  const highlighter: HighlightFn = args.highlighter ?? runLocateHighlight;
  for (const action of args.actions) {
    if (action.verb === "view") continue;
    const decision = await highlighter({
      intent: action.description,
      verb: action.verb,
      framePath: action.displayFramePath,
    });
    if (decision.highlight === "yes" && decision.point) {
      action.highlight = {
        kind: highlightKind(action.verb),
        point: { x: decision.point.x, y: decision.point.y },
      };
    }
  }
  return args.actions;
}
