/**
 * UI-TARS click-point grounding.
 *
 * UI-TARS is a GUI-grounding model. It does not return a box and does not
 * support structured JSON output — it replies free-form with an absolute-pixel
 * click point. Benchmarking showed that point lands inside the correct element
 * 14/14 times, a median 24px from centre: a rock-solid anchor.
 *
 * This module wraps the raw OpenRouter call and parses the point out.
 */
import fs from "node:fs";
import type { Point } from "./contract";

const API = "https://openrouter.ai/api/v1/chat/completions";
export const DEFAULT_UITARS_MODEL = "bytedance/ui-tars-1.5-7b";

export type UiTarsResult = { point: Point | null; raw: string };

/** Ask UI-TARS where to click for this step; returns a frame-normalized point. */
export async function uiTarsPoint(args: {
  framePath: string;
  intent: string;
  verb: string;
  frameW: number;
  frameH: number;
  model?: string;
}): Promise<UiTarsResult> {
  const { framePath, intent, verb, frameW, frameH } = args;
  const model = args.model ?? DEFAULT_UITARS_MODEL;
  const b64 = (await fs.promises.readFile(framePath)).toString("base64");
  const body = {
    model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "Locate the single UI element the user interacts with for this",
              "step and output the point to click.",
              `Step intent: ${intent}`,
              `Action verb: ${verb}`,
              "Output the click coordinates as (x,y) in absolute pixels.",
            ].join("\n"),
          },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b64}` } },
        ],
      },
    ],
    temperature: 0,
  };
  const res = await fetch(API, {
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

  // UI-TARS returns absolute pixels, e.g. "(965,393)".
  const nums = (raw.match(/-?\d+\.?\d*/g) ?? []).map(Number);
  if (nums.length < 2) return { point: null, raw };
  return {
    point: {
      x: Math.min(1, Math.max(0, nums[0] / frameW)),
      y: Math.min(1, Math.max(0, nums[1] / frameH)),
    },
    raw,
  };
}
