import { z } from "zod";

export const NormalizeOutput = z.object({
  segments: z.array(z.object({ id: z.number().int(), text: z.string() })),
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

export type AutomationAction = "click" | "type" | "select" | "navigate";

/**
 * Maps a sub-step's `verb` to its automation `action`. `view` is never passed —
 * `view` sub-steps are non-actionable and carry no automation metadata.
 */
export function verbToAutomationAction(
  verb: "click" | "input" | "select" | "link",
): AutomationAction {
  switch (verb) {
    case "click": return "click";
    case "input": return "type";
    case "select": return "select";
    case "link": return "navigate";
  }
}

/**
 * VLM-emitted portion of the automation descriptor (no `action` — that is
 * derived in code by `buildActionsForStep`). `inputValue` is present only for
 * `input`/`select` candidates; the schema cannot express that, so it is
 * `.nullish()` and the invariant is enforced by the classifier prompt and by
 * `buildActionsForStep`.
 */
export const AutomationFields = z.object({
  target: z.object({
    text: z.string(),
    role: z.string(),
    location: z.string(),
  }),
  inputValue: z.object({
    field: z.string(),
    valueType: z.enum(["text", "email", "password", "number", "date", "url", "selection", "other"]),
    example: z.string().nullish(),
  }).nullish(),
  expectedOutcome: z.string().nullish(),
});

/** Full automation descriptor stored on `Action` / `Screenshot` (includes `action`). */
export type AutomationMeta = {
  action: AutomationAction;
  target: { text: string; role: string; location: string };
  inputValue?: {
    field: string;
    valueType: "text" | "email" | "password" | "number" | "date" | "url" | "selection" | "other";
    example?: string;
  };
  expectedOutcome?: string;
};

export const ClassifiedCandidate = z.object({
  index: z.number(),
  decision: z.enum(["action", "discard"]),
  verb: z.enum(["click", "input", "select", "link"]).nullable(),
  screenName: z.string().nullable(),
  elementCaption: z.string().nullable(),
  displayFrameIndex: z.number().int().nullable(),
  discardReason: z.enum(["transition", "hover", "press_flicker", "animation", "not_a_ui", "other"]).nullable(),
  automation: AutomationFields.nullish(),
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

export const CanonicalizationOutput = z.object({
  actions: z.array(z.object({
    index: z.number().int(),
    screenName: z.string(),
    elementCaption: z.string(),
  })),
});

export const VideoAnalysisOutput = z.object({
  appUIFrameCount: z.number().int().nonnegative(),
  totalFrames: z.number().int().nonnegative(),
  appType: z.enum(["web", "mobile", "desktop", "none"]),
  category: z.string(),
  domainSummary: z.string(),
});

export const SubStepPlan = z.object({
  intent: z.string(),
  verb: z.enum(["click", "input", "select", "link", "view"]),
  narrationSegmentIds: z.array(z.number().int()).min(0),
  timeWindow: z.object({ start: z.number(), end: z.number() }).nullable(),
  visualConfidence: z.enum(["high", "low"]),
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
  screenName: string;
  elementCaption: string;
  displayFramePath: string;
  time: number;
  highlight?: {
    kind: "click" | "input";
    bbox?: { x: number; y: number; w: number; h: number };
    point?: { x: number; y: number };
  };
  automation?: AutomationMeta;
};
