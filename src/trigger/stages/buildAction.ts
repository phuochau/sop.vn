import type { z } from "zod";
import type {
  SubStepPlan,
  FrameVerification,
  HighlightDecision,
  TopDownAction,
} from "@/lib/schemas";

type SubStep = z.infer<typeof SubStepPlan>;

function coerceHighlightKind(verb: SubStep["verb"]): "click" | "input" {
  return verb === "input" ? "input" : "click";
}

export function buildAction(args: {
  stepIndex: number;
  order: number;
  subStep: SubStep;
  verify: z.infer<typeof FrameVerification>;
  highlight: z.infer<typeof HighlightDecision>;
  framePath: string;
  frameTime: number;
  pickedClusterLetter: string;
}): TopDownAction {
  const base: TopDownAction = {
    stepIndex: args.stepIndex,
    order: args.order,
    verb: args.subStep.verb,
    description: args.subStep.intent,
    displayFramePath: args.framePath,
    time: args.frameTime,
    verifyMatch: args.verify.match === "yes" ? "yes" : "partially",
    pickedClusterLetter: args.pickedClusterLetter,
  };
  if (args.highlight.highlight === "yes" && args.highlight.bbox && args.subStep.verb !== "view") {
    base.highlight = {
      kind: coerceHighlightKind(args.subStep.verb),
      bbox: args.highlight.bbox,
    };
  }
  return base;
}
