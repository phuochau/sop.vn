import { z } from "zod";

export const NormalizeOutput = z.object({
  segments: z.array(z.object({ id: z.number().int(), text: z.string() })),
});

export const ContextOutput = z.object({
  category: z.string(),
  domainSummary: z.string(),
});

export const SopExtractOutput = z.object({
  title: z.string(),
  steps: z.array(z.object({
    title: z.string(),
    description: z.string(),
    startSegmentId: z.number().int().nonnegative(),
    endSegmentId: z.number().int().nonnegative(),
  })).min(1),
});

export const OverviewOutput = z.object({
  purpose: z.string(),
  audience: z.string(),
  prerequisites: z.array(z.string()),
  toolsMaterials: z.array(z.string()),
  estimatedDuration: z.string(),
});

export const StepRewriteOutput = z.object({
  prose: z.string(),
  subBullets: z.array(z.string()),
  callouts: z.array(z.object({
    kind: z.enum(["warning", "tip", "note"]),
    text: z.string(),
  })),
});

export const VisualSopExtractOutput = z.object({
  title: z.string(),
  steps: z.array(z.object({
    title: z.string(),
    description: z.string(),
    startTime: z.number(),
    endTime: z.number(),
  })).min(1),
});

export const BBox = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

export const Point = z.object({
  x: z.number(),
  y: z.number(),
});

export const Highlight = z.object({
  kind: z.enum(["click", "input"]),
  bbox: BBox,
});

export const ClassifiedCandidate = z.object({
  index: z.number(),
  decision: z.enum(["action", "discard"]),
  verb: z.enum(["click", "input", "select", "link"]).nullable(),
  screenName: z.string().nullable(),
  screenCluster: z.string().nullable(),
  elementCaption: z.string().nullable(),
  bbox: BBox.nullable(),
  displayFrame: z.enum(["before", "after"]).nullable(),
  discardReason: z.enum(["transition", "hover", "press_flicker", "animation", "not_a_ui", "other"]).nullable(),
});

export const StepClassification = z.object({
  candidates: z.array(ClassifiedCandidate),
});

export const ScreenshotPicksOutput = z.object({
  picks: z.array(z.object({
    index: z.number().int().nonnegative(),
    description: z.string().nullable(),
    highlight: Highlight.nullable(),
  })),
});

// Top-down pipeline schemas

export const SubStepPlan = z.object({
  intent: z.string(),
  verb: z.enum(["click", "input", "select", "link", "view"]),
  narrationSegmentIds: z.array(z.number().int()).min(0),
  timeWindow: z.object({ start: z.number(), end: z.number() }).nullable(),
  visualConfidence: z.enum(["high", "low"]),
});

export const StepPlan = z.object({
  subSteps: z.array(SubStepPlan),
});

export const FramePick = z.object({
  picked: z.string().nullable(),
  runnerUp: z.string().nullable(),
  reasoning: z.string(),
});

export const FrameVerification = z.object({
  match: z.enum(["yes", "partially", "no"]),
  reasoning: z.string(),
});

export const HighlightDecision = z.object({
  highlight: z.enum(["yes", "no"]),
  point: Point.nullable().optional(),   // primary geometry — set by the new locator
  bbox: BBox.nullable(),                // deprecated; kept so old records validate
  noHighlightReason: z
    .enum(["view_action", "no_specific_target", "non_ui_frame", "grounding_unavailable"])
    .nullable(),
});

export type Action = {
  stepIndex: number;
  order: number;
  verb: "click" | "input" | "select" | "link" | "view";
  description: string;
  displayFramePath: string;
  time: number;
  highlight?: {
    kind: "click" | "input";
    bbox?: { x: number; y: number; w: number; h: number };
    point?: { x: number; y: number };
  };
};
