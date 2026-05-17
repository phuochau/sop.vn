import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { llmJsonVision } from "@/lib/openrouter";
import { GroundingCheck } from "@/lib/schemas";
import { config } from "@/config";
import { buildBufferWithOptionalHighlight } from "./uploadScreenshots";
import type { Point } from "@/lib/grounding";

/**
 * Grounding verifier (the "critic" of the reflection loop).
 *
 * Renders the yellow circle at `point` onto the frame and asks a cheap VLM
 * whether the circle's centre is on the named element. Returns true = on the
 * element (accept the point), false = mis-placed (caller should retry).
 *
 * Fail-open: any failure — the circle could not be composited, or the verifier
 * call threw / failed to parse — returns true. The critic must never cost the
 * pipeline a highlight; a missing verification just degrades to the old
 * no-verification behaviour.
 *
 * Verification runs on the same (downscaled) frame the grounder scored. The
 * point is frame-normalized (0-1), so the circle's CENTRE — which the prompt
 * tells the model to judge — sits on the identical element at any resolution;
 * verifying in the grounder's own coordinate space keeps the check consistent
 * with what was grounded, and the smaller frame is cheaper to send.
 */
export type VerifyVisionFn = (opts: {
  model: string;
  system: string;
  userText: string;
  imagePaths: string[];
  schema: typeof GroundingCheck;
  schemaName: string;
  maxRetries: number;
}) => Promise<{ onElement: "yes" | "no" }>;

// Checked binding: tsc validates that the real `llmJsonVision` satisfies
// `VerifyVisionFn` (no `as unknown as` escape hatch). If the signature ever
// drifts, this line fails to compile.
const realVisionFn: VerifyVisionFn = llmJsonVision;

export async function verifyGroundedPoint(args: {
  framePath: string;
  point: Point;
  caption: string;
  model: string;
  /** Injectable for tests; defaults to the real `llmJsonVision`. */
  visionFn?: VerifyVisionFn;
}): Promise<boolean> {
  const { framePath, point, caption, model } = args;
  const visionFn = args.visionFn ?? realVisionFn;

  let tmpDir: string | null = null;
  try {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "highlight-verify-"));

    const { buf, error } = await buildBufferWithOptionalHighlight(framePath, { point });
    // error !== null ⇒ buf is the un-annotated original (no circle drawn) —
    // do not ask the critic to judge a circle-less image; fail open.
    if (error !== null) return true;

    const imgPath = path.join(tmpDir, "verify.jpg");
    await fs.promises.writeFile(imgPath, buf);

    const out = await visionFn({
      model,
      system: config.ai.prompts.verifyHighlightSystem,
      userText:
        `Target element: "${caption}". A yellow circle has been drawn on the screenshot.\n` +
        `Is the centre of that circle on the target element? Answer strict JSON.`,
      imagePaths: [imgPath],
      schema: GroundingCheck,
      schemaName: "grounding_check",
      maxRetries: config.ai.maxRetries,
    });
    return out.onElement === "yes";
  } catch {
    return true; // fail-open on any failure (incl. mkdtemp)
  } finally {
    if (tmpDir) await fs.promises.rm(tmpDir, { recursive: true, force: true });
  }
}
