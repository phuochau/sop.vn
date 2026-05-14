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

export const Highlight = z.object({
  kind: z.enum(["click", "input"]),
  bbox: BBox,
});

export const ScreenshotPicksOutput = z.object({
  picks: z.array(z.object({
    index: z.number().int().nonnegative(),
    description: z.string().nullable(),
    highlight: Highlight.nullable(),
  })),
});

// New action-pipeline types

export const ClassifiedCandidate = z.object({
  index: z.number(),
  decision: z.enum(["action", "discard"]),
  verb: z.enum(["click", "input", "select", "link"]).nullable(),
  screenName: z.string().nullable(),
  screenCluster: z.string().nullable(),
  elementCaption: z.string().nullable(),
  bbox: BBox.nullable(),
  displayFrame: z.enum(["before", "after"]).nullable(),
  discardReason: z.enum(["transition", "hover", "press_flicker", "animation", "other"]).nullable(),
});

export const StepClassification = z.object({
  candidates: z.array(ClassifiedCandidate),
});

export type ElementAction = {
  verb: "click" | "input" | "select" | "link";
  screenId: string;
  screenName: string;
  elementId: string;
  elementCaption: string;
  bbox: { x: number; y: number; w: number; h: number };
  displayFrame: "before" | "after";
  displayFramePath: string;
  time: number;
};

export type ViewAction = {
  verb: "view";
  screenId: string;
  screenName: string;
  displayFramePath: string;
  caption: string;
  time: number;
  durationSec: number;
};

export type Action = ElementAction | ViewAction;
