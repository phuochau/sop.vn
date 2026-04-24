import {
  __name,
  init_esm
} from "./chunk-3VTTNDYQ.mjs";

// src/config/index.ts
init_esm();
var CATEGORIES = [
  "Coffee & Drinks",
  "Food & Cooking",
  "Spa & Beauty",
  "Nail",
  "Other"
];
var DOMAIN_TERMINOLOGY = {
  "Coffee & Drinks": "chiết xuất, pha, định lượng, xay, tamping, crema",
  "Food & Cooking": "xào, hầm, nêm, luộc, ướp, gia vị",
  "Spa & Beauty": "tẩy tế bào chết, ủ, massage, mặt nạ, dưỡng",
  "Nail": "giũa, sơn gel, đắp, phủ bóng, dũa móng",
  "Other": ""
};
var config = {
  ai: {
    transcriptionProvider: "fal",
    transcriptionModel: "fal-ai/whisper",
    normalizeModel: "google/gemini-2.5-flash",
    contextModel: "google/gemini-2.5-flash",
    sopModel: "anthropic/claude-sonnet-4.5",
    maxRetries: 1,
    domainTerminology: DOMAIN_TERMINOLOGY,
    prompts: {
      normalizeSystem: `You clean Vietnamese ASR transcripts. Remove filler words ("ờ","à","ừm","thì","là" used as filler), stutters, and self-corrections. Preserve meaning. CRITICAL: return the same segment IDs unchanged — do not merge, split, or renumber.`,
      contextSystem: `You classify Vietnamese training videos. Read the transcript and return the single best-fit category plus a 1-2 sentence Vietnamese summary of what the video teaches.`,
      sopSystem: /* @__PURE__ */ __name((domainHint) => `You convert Vietnamese-narrated training videos into structured SOPs. You receive cleaned, indexed transcript segments. Let the trainer's narration decide where steps begin and end — do NOT impose a preferred number of steps. Each step is a coherent unit the trainer is explaining. Each step has: a short Vietnamese title (≤8 words), a 2-4 sentence Vietnamese description, and a startSegmentId/endSegmentId referencing the input segment IDs. Also produce an overall Vietnamese SOP title.${domainHint ? `

Domain vocabulary to prefer when relevant: ${domainHint}` : ""}

Return strict JSON only.`, "sopSystem")
    }
  },
  limits: {
    maxVideoSizeMB: 500,
    maxVideoDurationSec: 300,
    minVideoDurationSec: 10,
    allowedMimeTypes: [
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "video/x-msvideo"
    ]
  },
  retention: { videoRetentionDays: 30 },
  app: { shareTokenLength: 16, pollIntervalMs: 2e3 },
  categories: CATEGORIES
};

export {
  config
};
//# sourceMappingURL=chunk-REM3KCND.mjs.map
