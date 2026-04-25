import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { llmJsonVision } from "@/lib/openrouter";
import { StepRewriteOutput } from "@/lib/schemas";
import { config } from "@/config";
import type { z } from "zod";

export type StepRewrite = z.infer<typeof StepRewriteOutput>;

export async function runVisualStep(args: {
  step: { title: string; description: string; startTime: number; endTime: number };
  imageBuffers: Buffer[];
  prevTitle: string | null;
  category: string;
  domainSummary: string;
  language: string;
}): Promise<StepRewrite> {
  if (args.imageBuffers.length === 0) {
    return { prose: args.step.description, subBullets: [], callouts: [] };
  }

  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sop-vstep-"));
  const paths: string[] = [];
  try {
    for (let i = 0; i < args.imageBuffers.length; i++) {
      const p = path.join(tmpDir, `img-${i}.jpg`);
      await fs.promises.writeFile(p, args.imageBuffers[i]);
      paths.push(p);
    }

    const userText =
      `Step title: ${args.step.title}\n` +
      `Original short description: ${args.step.description}\n` +
      (args.prevTitle ? `Previous step title (for continuity, do not repeat its content): ${args.prevTitle}\n` : "") +
      `Category: ${args.category}\n` +
      `Domain summary: ${args.domainSummary}\n\n` +
      `These ${paths.length} images are the keyframes for this step. ` +
      `Return strict JSON: { "prose", "subBullets": string[], "callouts": [{ "kind": "warning"|"tip"|"note", "text" }] }.`;

    return await llmJsonVision({
      model: config.ai.visionModel,
      system: config.ai.prompts.pdfVisualStepSystem(args.language),
      userText,
      imagePaths: paths,
      schema: StepRewriteOutput,
      schemaName: "pdf_visual_step",
      maxRetries: config.ai.maxRetries,
    });
  } finally {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}
