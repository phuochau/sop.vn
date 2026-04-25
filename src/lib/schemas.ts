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
