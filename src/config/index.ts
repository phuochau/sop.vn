export const CATEGORIES = [
  "Coffee & Drinks",
  "Food & Cooking",
  "Spa & Beauty",
  "Nail",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

const DOMAIN_TERMINOLOGY: Record<Category, string> = {
  "Coffee & Drinks": "chiết xuất, pha, định lượng, xay, tamping, crema",
  "Food & Cooking":  "xào, hầm, nêm, luộc, ướp, gia vị",
  "Spa & Beauty":    "tẩy tế bào chết, ủ, massage, mặt nạ, dưỡng",
  "Nail":            "giũa, sơn gel, đắp, phủ bóng, dũa móng",
  "Other":           "",
};

export const config = {
  ai: {
    transcriptionProvider: "fal" as const,
    transcriptionModel: "fal-ai/whisper",
    normalizeModel: "google/gemini-2.5-flash",
    contextModel: "google/gemini-2.5-flash",
    sopModel: "anthropic/claude-sonnet-4.5",
    pdfModel: "google/gemini-2.5-flash",
    maxRetries: 1,
    domainTerminology: DOMAIN_TERMINOLOGY,
    prompts: {
      normalizeSystem:
        `You clean Vietnamese ASR transcripts. Remove filler words ("ờ","à","ừm","thì","là" used as filler), stutters, and self-corrections. Preserve meaning. CRITICAL: return the same segment IDs unchanged — do not merge, split, or renumber.`,
      contextSystem:
        `You classify Vietnamese training videos. Read the transcript and return the single best-fit category plus a 1-2 sentence Vietnamese summary of what the video teaches.`,
      sopSystem: (domainHint: string) =>
        `You convert Vietnamese-narrated training videos into structured SOPs. You receive cleaned, indexed transcript segments. Let the trainer's narration decide where steps begin and end — do NOT impose a preferred number of steps. Each step is a coherent unit the trainer is explaining. Each step has: a short Vietnamese title (≤8 words), a 2-4 sentence Vietnamese description, and a startSegmentId/endSegmentId referencing the input segment IDs. Also produce an overall Vietnamese SOP title.${
          domainHint ? `\n\nDomain vocabulary to prefer when relevant: ${domainHint}` : ""
        }\n\nReturn strict JSON only.`,
      pdfOverviewSystem:
        `You are writing the opening of a printed Vietnamese SOP document. The reader cannot watch the source video — they only have your text. Read the full transcript and step list, then produce a concise overview: purpose (2-3 sentences), audience (one sentence), prerequisites (bullets), tools/materials mentioned (bullets), and estimated duration ("~N phút"). Vietnamese output. No filler, no speculation beyond what the transcript supports.`,
      pdfStepSystem:
        `You rewrite a single step of a Vietnamese training SOP for a reader who cannot watch the video. Convert spoken Vietnamese (transcript slice) into clear written instructions. Output: 1-3 short paragraphs of prose, an ordered list of discrete actions in imperative voice (subBullets), and any warnings/tips/notes as callouts with kind="warning"|"tip"|"note". Do not invent steps not present in the transcript. If there are no callouts, return an empty array.`,
    },
  },
  limits: {
    maxVideoSizeMB: 500,
    maxVideoDurationSec: 60 * 60,
    minVideoDurationSec: 10,
    allowedMimeTypes: [
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "video/x-msvideo",
    ],
  },
  retention: { videoRetentionDays: 30 },
  app: { shareTokenLength: 16, pollIntervalMs: 2000 },
  categories: CATEGORIES,
};
