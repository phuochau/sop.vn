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
      screenshotPickSystem: (lang: string) =>
        `You select screenshots from a training video to illustrate one specific step, AND write a short caption or instruction for each picked frame, AND mark where the user is clicking/tapping/typing if the frame shows a UI interaction.

You receive: the step's title and the trainer's narration, plus a list of candidate frames each labeled with a bucket-local index and a timestamp.

Pick the frames a reader would need to actually perform this step — relevant UI before the action, during the action, and the resulting state after the action. Skip redundant frames showing the same UI state. Return an empty array if no frames are useful for this step.

For each picked frame, write a "description":
- If the frame shows an action moment, write a short imperative instruction ("Cut the bell pepper into thirds").
- If the frame shows a state/result, write a brief observation ("Sauce is well combined and uniformly red").
- If the image is self-explanatory and no caption would help the reader, return null.
- Keep descriptions concise. Match the length to the value added — one short line is usually right, but you may go longer when needed.

For each picked frame, return a "highlight" identifying the specific UI element the user is interacting with at that moment, ONLY when a cursor is visibly resting on an interactive element:
- If the user is clicking/tapping a button, link, tab, menu item, or icon, return { "kind": "click", "bbox": { x, y, w, h } } tightly bounding that element.
- If the user is typing in a text field, textarea, or search box, return { "kind": "input", "bbox": { ... } } bounding the field.
- Otherwise (no cursor visible, cursor on whitespace, cursor on body text, or target element unclear), return "highlight": null.

A separate cursor-detection step will verify your bbox against the actual cursor position in the image. If your bbox doesn't contain the detected cursor, the highlight will be discarded — so be precise, and prefer null over a guess.

Coordinates are normalized 0..1 against the image you see in this prompt (not the original video resolution). For the bbox, x and y are the top-left.

LANGUAGE: Write every description in ${lang}. Keep technical / industry / brand terms in their original form.

Return strict JSON only.`,
      groundEventSystem: (lang: string) =>
        `You are a precise visual locator for a how-to screen recording. You receive a BEFORE crop and an AFTER crop of the same screen region around a moment where the user performed one action. A diff bounding box (normalized 0..1 in the crop) tells you roughly where pixels changed.

Ground every answer in the PIXELS YOU CAN SEE in the two crops. Do not infer or guess based on the step title.

Return a bounding box that wraps the WHOLE interactive UI element the user acted on — the entire container, not the text or icon inside it.

CRITICAL RULES:
- For a click (button, link, icon, tab, menu item, row, dropdown, card): bbox the FULL clickable element — its background fill, its border, and its inner padding. If a button labeled "Next" has padding around the label, bbox the entire button shape, NOT just the word "Next". If a link is a row in a list, bbox the entire row, NOT just the text.
- For an input (text field, textarea, search box): bbox the ENTIRE field — its background, border, and padding. NOT just the typed text glyphs inside.
- For an icon-only button: bbox the entire clickable hit area around the icon, NOT just the icon glyph.
- NEVER return a bbox that hugs only the text content. The user wants to see the full element they should focus on, not the label inside it.
- Do NOT bbox the mouse cursor or include it as a separate element. Ignore the cursor entirely; locate the UI element only.
- If the source element is not visible in the crop (e.g. the click triggered a full-page nav and the source button is gone), fall back to the diff bbox region.

Write a short imperative caption in ${lang} describing what the user did, based ONLY on what is visible in the crops. One sentence (e.g., "Click the Sign in button.", "Enter your email address."). Do NOT invent an element name that is not visibly present in either crop.

Return caption: null ONLY when the change is not a user action at all — e.g., a carousel auto-scrolling, a video playing, an ad rotating, a notification toast appearing on its own, a loading spinner animating, a background animation. When caption is null the event will be DISCARDED entirely (the screenshot will not be shown), so use null whenever the change is not something the reader needs to do. Do NOT return null just because you are unsure of the exact element label — make your best caption call.

Classify the kind: "input" if a text field is receiving text, "click" otherwise. The kind hint in the user message is a guess — override it if wrong.

Pick "displayFrame" — which crop best illustrates the action to a reader who will see ONE screenshot:
- "before" — the source element (button, link, field) is clearly visible in the BEFORE crop and the action is "click this thing". This is the common case for clicks that navigate away or submit.
- "after" — the action REVEALED new UI that did not exist in the BEFORE crop (flyout, dropdown, modal, expanded menu, autocomplete), AND the revealed UI is what the reader needs to see. Also pick "after" for typing/input events, where the typed text only appears in the AFTER crop.
Default to "before" for clicks unless the AFTER crop is materially more informative.

Coordinates are normalized 0..1 against the CROP (top-left origin). The bbox MUST be valid in whichever frame you picked as displayFrame.

LANGUAGE: Caption in ${lang}. Keep technical / industry / brand terms in their original form.

Return strict JSON only.`,
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
  screenshots: {
    sampleFps: 2,
    motionHammingThreshold: 8,    // <=8/64 between consecutive frames ⇒ stable
    dedupHammingThreshold: 5,     // <=5/64 within window ⇒ duplicate
    dedupWindowSeconds: 10,
    maxPoolSize: 200,
    overlapBufferSeconds: 2,
    downscaleMaxEdgePx: 1280,
    jpegQuality: 85,
    clickDetect: {
      diffThreshold: 25,
      minAreaFrac: 0.003,
      maxAreaFrac: 0.20,
      minDensity: 0.20,
      steadinessThreshold: 0.30,
      mergeWindowSec: 1.5,
      mergeIouMin: 0.30,
      maxEventsPerVideo: 60,
      diffMaxEdge: 640,
    },
    ground: {
      cropMultiplier: 3,
      cropMinPx: 400,
      cropMaxFrac: 0.50,
      perStepConcurrency: 5,
      bboxPadPx: 8,
    },
  },
};
