export const config = {
  ai: {
    transcriptionProvider: "fal" as const,
    transcriptionModel: "fal-ai/whisper",
    normalizeModel: "google/gemini-2.5-flash",
    contextModel: "google/gemini-2.5-flash",
    sopModel: "anthropic/claude-sonnet-4.5",
    pdfModel: "google/gemini-2.5-flash",
    visionModel: "google/gemini-2.5-flash",
    maxRetries: 1,
    prompts: {
      // Every system prompt receives the detected language code from Whisper
      // (ISO-ish, e.g. "vi", "en") or the user-selected default for silent
      // videos. Natural-language output MUST be in that language. Technical /
      // industry / brand terms (e.g. "espresso", "tamping", "gel polish") may
      // stay in their original form — do not translate them.
      languageRule: (lang: string) =>
        `LANGUAGE: Output all natural-language text in ${lang}. Match the source transcript's language exactly. Keep technical / industry / brand terms in their original form — do not translate them.`,
      normalizeSystem: (lang: string) =>
        `You clean ASR transcripts. Remove filler words, stutters, and self-corrections. Preserve meaning and the original language of each segment. CRITICAL: return the same segment IDs unchanged — do not merge, split, or renumber.\n\nLANGUAGE: Source language is ${lang}; keep cleaned segments in ${lang}.`,
      contextSystem: (lang: string) =>
        `You classify training videos. Read the transcript and return a short freeform string naming the domain or industry (e.g., "Specialty espresso brewing", "Vietnamese stir-fry cooking", "Manicure prep") plus a 1-2 sentence summary of what the video teaches.\n\nLANGUAGE: Output the summary in ${lang}. Keep technical / industry / brand terms in their original form.`,
      sopSystem: (lang: string) =>
        `You convert narrated training videos into structured SOPs. You receive cleaned, indexed transcript segments. Let the trainer's narration decide where steps begin and end — do NOT impose a preferred number of steps. Each step is a coherent unit the trainer is explaining. Each step has: a short title (≤8 words), a 2-4 sentence description, and a startSegmentId/endSegmentId referencing the input segment IDs. Also produce an overall SOP title.\n\nLANGUAGE: Output the title and every step's title and description in ${lang}. Keep technical / industry / brand terms in their original form (do not translate them).\n\nReturn strict JSON only.`,
      pdfOverviewSystem: (lang: string) =>
        `You are writing the opening of a printed SOP document. The reader cannot watch the source video — they only have your text. Read the full transcript and step list, then produce a concise overview: purpose (2-3 sentences), audience (one sentence), prerequisites (bullets), tools/materials mentioned (bullets), and estimated duration (a short phrase like "~N minutes" / "~N phút" matching the output language). No filler, no speculation beyond what the transcript supports.\n\nLANGUAGE: Output every field in ${lang}. Keep technical / industry / brand terms in their original form (do not translate them).`,
      pdfStepSystem: (lang: string) =>
        `You rewrite a single step of a training SOP for a reader who cannot watch the video. Convert the spoken transcript slice into clear written instructions. Output: 1-3 short paragraphs of prose, an ordered list of discrete actions in imperative voice (subBullets), and any warnings/tips/notes as callouts with kind="warning"|"tip"|"note". Do not invent steps not present in the transcript. If there are no callouts, return an empty array.\n\nLANGUAGE: Output prose, subBullets, and callouts in ${lang}. Keep technical / industry / brand terms in their original form (do not translate them).`,
      visualContextSystem: (lang: string) =>
        `You classify training videos by looking at sampled frames. Identify a short freeform string naming the domain or industry (e.g., "Specialty espresso brewing", "Vietnamese stir-fry cooking", "Manicure prep") and write a 1-2 sentence summary of what the video teaches.\n\nLANGUAGE: Output the summary in ${lang}. Keep technical / industry / brand terms in their original form.`,
      visualSopSystem: (lang: string) =>
        `You convert silent how-to videos into structured SOPs. You receive frames sampled from the video plus the second-offset of each frame, and a freeform "category" + a short "domainSummary" provided in the user prompt. Identify the discrete actions being performed. For each action, write a clear instructional step in the output language. Each step has: a short title (≤8 words), a 3-6 sentence paragraph description describing what to do (instructional, present-tense, imperative voice), and startTime/endTime in seconds within the video duration. Order steps chronologically and do not overlap them. Return at least one step.\n\nLANGUAGE: Output the title and every step's title and description in ${lang}. Keep technical / industry / brand terms in their original form (do not translate them).\n\nReturn strict JSON only.`,
      pdfVisualOverviewSystem: (lang: string) =>
        `You are writing the opening of a printed SOP document for a how-to video that has no spoken audio. You receive a few sampled frames, the SOP title, a freeform category, a short domainSummary, and the list of step titles. Produce a concise overview: purpose (2-3 sentences), audience (one sentence), prerequisites (3-5 bullets), tools/materials visible in the frames or implied by the category (3-8 bullets), and estimated duration (a short phrase like "~N minutes" / "~N phút" matching the output language). Base every claim on the frames or the supplied context — do not invent.\n\nLANGUAGE: Output every field in ${lang}. Keep technical / industry / brand terms in their original form (do not translate them).`,
      pdfVisualStepSystem: (lang: string) =>
        `You rewrite a single step of a silent training SOP for a reader who cannot watch the video. You receive the keyframes for this step, the step's title and short description, the previous step's title (for continuity), the SOP's freeform category, and a domainSummary. Output: 1-3 short paragraphs of prose, an ordered list of discrete actions in imperative voice (subBullets), and any warnings/tips/notes as callouts with kind="warning"|"tip"|"note". Describe only what the keyframes show or what the supplied context warrants — do not invent actions. If there are no callouts, return an empty array.\n\nLANGUAGE: Output prose, subBullets, and callouts in ${lang}. Keep technical / industry / brand terms in their original form (do not translate them).`,
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
};
