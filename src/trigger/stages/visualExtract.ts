import { llmJsonVision } from "@/lib/openrouter";
import { VisualSopExtractOutput } from "@/lib/schemas";
import { config } from "@/config";

export async function runVisualExtract(args: {
  framePaths: string[];
  frameTimestamps: number[];
  durationSec: number;
  category: string;
  domainSummary: string;
  language: string;
}): Promise<{ title: string; steps: { title: string; description: string; startTime: number; endTime: number }[] }> {
  const frameLines = args.frameTimestamps
    .map((t, i) => `Frame ${i + 1}: ${t.toFixed(2)}s`)
    .join("\n");

  const userText =
    `Video duration: ${args.durationSec.toFixed(2)} seconds.\n` +
    `Category: ${args.category}\n` +
    `Domain summary: ${args.domainSummary}\n` +
    `Frame timestamps (frames are attached in this order):\n${frameLines}\n\n` +
    `Return { "title": string, "steps": [{ "title", "description", "startTime", "endTime" }] }. ` +
    `Each step description must be a 3-6 sentence instructional paragraph. ` +
    `Steps must be ordered chronologically, non-overlapping, with timestamps within [0, ${args.durationSec.toFixed(2)}]. ` +
    `Return at least one step.`;

  // We do retries here (not inside llmJsonVision) so that post-parse
  // timestamp assertions can also trigger a retry.
  const attempts = config.ai.maxRetries + 1;
  let lastErr: unknown = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const out = await llmJsonVision({
        model: config.ai.visionModel,
        system: config.ai.prompts.visualSopSystem(args.language),
        userText,
        imagePaths: args.framePaths,
        schema: VisualSopExtractOutput,
        schemaName: "visual_sop_extract",
        maxRetries: 0,
      });
      // Normalize timestamps before validating. The vision LLM routinely
      // rounds endTime slightly past the true duration; clamping is more
      // useful than rejecting. Hard violations (negative, non-monotonic,
      // or end <= start) still throw so a retry can recover.
      let prevEnd = 0;
      for (const s of out.steps) {
        if (s.startTime < 0) throw new Error("step startTime is negative");
        if (s.startTime < prevEnd) throw new Error("steps not chronologically ordered");
        if (s.endTime > args.durationSec) s.endTime = args.durationSec;
        if (s.endTime <= s.startTime) throw new Error("step endTime <= startTime");
        prevEnd = s.endTime;
      }
      return out;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("visualExtract failed");
}
