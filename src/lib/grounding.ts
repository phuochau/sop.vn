/**
 * Point grounding clients for the highlight locator.
 *
 * Primary: UI-TARS — a GUI-grounding model. It does NOT support structured
 * JSON output (it ignores response_format and replies in prose), so it is
 * called as a plain chat completion and its free-form "(x,y)" reply — absolute
 * pixels of the image it received — is parsed by regex.
 *
 * Fallback: Qwen3-VL — a standard JSON-capable VLM, used when UI-TARS is
 * unavailable. Coordinates come back on a 0-1000 normalized scale.
 *
 * Both return a frame-normalized point in 0-1, or null when no element is found.
 */
import fs from "node:fs";
import { z } from "zod";
import { llmJsonVision } from "@/lib/openrouter";

export type Point = { x: number; y: number }; // 0-1, normalized to the frame

const OPENROUTER_API = "https://openrouter.ai/api/v1/chat/completions";
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

// --- UI-TARS (primary) ---------------------------------------------------

function uiTarsSystem(verb: string): string {
  return [
    "Locate the single UI element the user interacts with for this step and",
    "output the point to click.",
    `Action verb: ${verb}`,
    "Output ONLY the click coordinates as (x,y) in absolute pixels.",
  ].join("\n");
}

/**
 * Parse a UI-TARS free-form reply (e.g. "(965,393)") into a frame-normalized
 * point. UI-TARS returns ABSOLUTE pixels of the image it was given.
 */
export function parseUiTarsReply(
  raw: string,
  frameW: number,
  frameH: number,
): Point | null {
  const nums = (raw.match(/-?\d+\.?\d*/g) ?? []).map(Number);
  if (nums.length < 2 || frameW <= 0 || frameH <= 0) return null;
  return { x: clamp01(nums[0] / frameW), y: clamp01(nums[1] / frameH) };
}

export async function uiTarsPoint(args: {
  framePath: string;
  intent: string;
  verb: string;
  frameW: number;
  frameH: number;
  model: string;
  fetcher?: typeof fetch;
}): Promise<{ point: Point | null; raw: string }> {
  const fetcher = args.fetcher ?? fetch;
  const b64 = (await fs.promises.readFile(args.framePath)).toString("base64");
  const body = {
    model: args.model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: `${uiTarsSystem(args.verb)}\nStep intent: ${args.intent}` },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } },
        ],
      },
    ],
    temperature: 0,
  };
  const res = await fetcher(OPENROUTER_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY!}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://sop.vn",
      "X-Title": "SOP.vn",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`UI-TARS ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const raw: string = data.choices?.[0]?.message?.content ?? "";
  return { point: parseUiTarsReply(raw, args.frameW, args.frameH), raw };
}

// --- Qwen3-VL (fallback) -------------------------------------------------

export const PointOutput = z.object({
  found: z.enum(["yes", "no"]),
  x: z.number().nullable(),
  y: z.number().nullable(),
});
export type PointOutput = z.infer<typeof PointOutput>;

function qwenSystem(verb: string): string {
  return [
    "You locate ONE UI element in an app screenshot and return the point to",
    "click on it.",
    "Return x,y in NORMALIZED coordinates on a 0-1000 scale (0 = left/top edge,",
    "1000 = right/bottom edge). Aim for the centre of the element.",
    `Action verb: ${verb}`,
    "If no specific element matches, return found=no with x=null, y=null.",
  ].join("\n");
}

/** Convert a Qwen3-VL 0-1000 reply to a frame-normalized point. */
export function qwenToPoint(out: PointOutput): Point | null {
  if (out.found !== "yes" || out.x === null || out.y === null) return null;
  return { x: clamp01(out.x / 1000), y: clamp01(out.y / 1000) };
}

export async function qwenPoint(args: {
  framePath: string;
  intent: string;
  verb: string;
  model: string;
  visionFn?: typeof llmJsonVision;
}): Promise<{ point: Point | null }> {
  const visionFn = args.visionFn ?? llmJsonVision;
  const out = await visionFn({
    model: args.model,
    system: qwenSystem(args.verb),
    userText: `Intent: ${args.intent}\nVerb: ${args.verb}`,
    imagePaths: [args.framePath],
    schema: PointOutput,
    schemaName: "point_grounding",
    temperature: 0.0,
  });
  return { point: qwenToPoint(out) };
}
