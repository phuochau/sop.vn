export const config = {
  ai: {
    transcriptionProvider: "fal" as const,
    transcriptionModel: "fal-ai/whisper",
    normalizeModel: "google/gemini-2.5-flash",
    contextModel: "google/gemini-2.5-flash",
    canonicalizeModel: "google/gemini-2.5-flash",
    verifyModel: "google/gemini-2.5-flash",
    sopModel: "anthropic/claude-sonnet-4.5",
    pdfModel: "google/gemini-2.5-flash",
    visionModel: "google/gemini-2.5-flash",
    pointPrimaryModel: "bytedance/ui-tars-1.5-7b",
    pointFallbackModel: "qwen/qwen3-vl-32b-instruct",
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
        `You convert narrated training videos into structured SOPs. You receive cleaned, indexed transcript segments. Let the trainer's narration decide where steps begin and end — do NOT impose a preferred number of steps. Each step is a coherent unit the trainer is explaining. Each step has: a short title (≤8 words), a 2-4 sentence description, and a startSegmentId/endSegmentId referencing the input segment IDs. Also produce an overall SOP title.

GRANULARITY:
- Aim for one step per 60-180 seconds of narration.
- A typical 15-minute training video produces 5-12 steps.
- Combine micro-actions within a single goal into one step (e.g., do not split "fill out form" into "click first field", "type first name", "click second field", ... — that's one step).
- Do not split a single workflow across multiple steps.

NARRATED ALTERNATIVES:
- If the trainer mentions an alternative path they don't demonstrate (e.g., "You can sign in with Google or enter your email"), include that alternative in the step's description as a brief note.
- Do not invent alternatives — only include what the trainer actually says.

LANGUAGE: Output the title and every step's title and description in ${lang}. Keep technical / industry / brand terms in their original form (do not translate them).

Return strict JSON only.`,
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
      classifyStepSystem: (lang: string) =>
        `You classify candidate user actions from a screen recording into structured records, discard candidates that are not real user actions, and pick which frame best illustrates each action.

You receive:
- The step's title.
- The images for all candidates in this batch, supplied as ONE FLAT ORDERED LIST, grouped per candidate in index order: candidate 0's window frames come first, then candidate 1's, and so on. The user text lists, per candidate, its index and its window length, so you know exactly which images belong to which candidate.
- Each candidate's images are an ORDERED SERIES of full window frames covering a short time span around the action (earliest first). On every frame the detected change region is outlined with a MAGENTA rectangle.

The magenta box is an APPROXIMATE motion hint only. During fast screen transitions it may be inaccurate — it can land on heading text or on empty space, especially on window frames away from the action moment. Do not trust it blindly: trust the cursor position and what visibly changes across the window frames.

For each candidate, decide:

1) decision = "action" OR "discard".

2) If "action":
   - verb: "click" (button, link, tab, menu item, icon, row, card, checkbox, radio), "input" (typing into a text field, textarea, search), "select" (picking an option from an open dropdown / autocomplete), or "link" (clicking a hyperlink that navigates).
   - screenName: the visible page/screen identifier — usually the page heading text or modal title of the screen the action happens on. If no heading is visible, give a short functional name ("Signup form", "Contacts list"). Lower-case, trimmed, normalize whitespace.
   - elementCaption: a SHORT REUSABLE element name — NOT a sentence. Examples: "Verify email button", "verification code input", "Companies link", "Search field". Name the element the user interacted with. For two candidates targeting the same element, the elementCaption MUST be identical.
   - displayFrameIndex: a 0-based index into THIS candidate's OWN window (range 0 .. windowLength-1, NOT the flat image list). Pick the frame that clearly shows the screen the action happened on, is NOT mid-transition / NOT a loading screen, and shows the target element. For "input" / "select", pick the frame showing the RESULT (typed text visible, dropdown open). For "click" / "link", pick the frame showing the SOURCE screen with the element present.

3) If "discard":
   - discardReason: "transition" (large-area pixel change, page navigation, OR a frame caught mid-transition / fade while the screen is animating between two states), "hover" (state-only change with no click target), "press_flicker" (second event in a tiny window after a click on the same element — animation by-product), "animation" (repeating motion in same region — spinner, loader, progress screen, or a loading / "setting up..." page with no user control), "not_a_ui" (the marked region is NOT a real interactive UI element the user deliberately operated — e.g., a person on camera / webcam talking-head, a presenter holding props or illustrative icons, a title slide, an intro/outro animation, a generic stock graphic, a logo bug, OR incidental product chrome such as a chat-widget bubble, a cookie / consent banner, or a notification toast), "other".
   - All "action" fields must be null.

You see a whole window of full frames, so a loading screen or mid-transition frame within the window is unambiguous. DISCARD aggressively when the candidate is:
- incidental product chrome — chat-widget bubbles, cookie / consent banners, notification toasts (discardReason: "not_a_ui");
- a loading / progress screen — spinners, progress bars, "setting up..." pages with no control the user can act on (discardReason: "animation");
- a mid-transition / fade — the window only shows the screen visibly animating between two states, with no stable frame of a real interface (discardReason: "transition").
Only emit verb: "click" / "input" / "select" / "link" when at least one window frame clearly shows an application interface and the marked region is an element the user deliberately interacted with.

IMPORTANT: Many training videos open with a presenter on camera or an animated intro before any real application screen is shown. Icons or graphics appearing in those segments are NOT clickable UI elements and MUST be discarded with discardReason: "not_a_ui".

Coordinates are normalized 0..1 (top-left origin).

LANGUAGE: Output every screenName and elementCaption in ${lang}. Keep technical / industry / brand terms in their original form.

Return strict JSON only.`,

      canonicalizeSystem: (lang: string) =>
        `You reconcile a list of UI action labels extracted from ONE step of a screen recording.

Each action was labelled independently, so the same element can appear under different wording, casing, or language. Your job is to make the labels consistent.

You receive a JSON array of actions, each with: index, screenName, elementCaption, verb. (verb is context only — do not output it.)

For EACH input action, return: index, screenName, elementCaption.

Rules:
- Output every screenName and elementCaption in ${lang}. Keep brand, product, and technical terms (e.g. "HubSpot", "CRM", "CSV", "URL") in their original form.
- When two or more actions clearly refer to the SAME element, output an IDENTICAL screenName and elementCaption for all of them.
- Do NOT merge labels for elements that are genuinely different, even if their wording is similar.
- Keep elementCaption a SHORT reusable element name — not a sentence.
- Normalize casing and whitespace.
- Return exactly one entry per input index. Do not add, drop, or renumber indices.

Return strict JSON only.`,

      verifyHighlightSystem:
        `You are shown an app screenshot with a yellow circle drawn on it. Judge whether the CENTRE of that circle lands on the specific UI element named in the user message — the element the circle is meant to mark.

Answer "yes" only if the circle's centre is clearly on, or within, that element. If the centre is on a different element, on empty space, or you cannot tell, answer "no".

Return strict JSON: { "onElement": "yes" | "no" }.`,

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
  costs: {
    // fal-ai/whisper has no cost field in its response, so its cost is
    // estimated as audioMinutes * this rate. Adjust to your fal plan's rate.
    whisperPerMinuteUSD: 0.0001,
  },
  screenshots: {
    sampleFps: 4,   // dense frames feed the classifier window + click-event timing;
                    // 4fps is needed to capture sub-1.5s onboarding-wizard screens

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
      maxAreaFrac: 0.12,
      minDensity: 0.20,
      mergeWindowSec: 4.0,
      mergeIouMin: 0.20,
      maxEventsPerVideo: 200,
      diffMaxEdge: 640,
      maxCandidatesPerStep: 25,
    },
    screenId: {
      samplingSec: 1.5,
      hammingThreshold: 10,
      viewMinDurationSec: 4.0,
    },
    classify: {
      // One candidate per LLM call. Batching multiple candidates concatenates
      // every candidate's window frames into one flat image list, and the model
      // mis-maps which images belong to which candidate (caused wrong
      // screenName/elementCaption on fast wizard screens). One call = one
      // window = no cross-candidate confusion.
      maxCandidatesPerCall: 1,
      maxWindowFrames: 9,
      windowPreSec: 1.5,
      windowPostSec: 0.5,        // input/select: small reach past the typed-result frame
      windowPostClickSec: 0.0,   // click/link: window ends AT the event — event.time is
                                 // the last pre-click frame, so the whole window is the
                                 // source screen; the LLM cannot pick a destination frame
      windowMaxSpanSec: 6.0,
      duplicateGapSec: 5.0,           // collapse CV multi-fires within this gap
      duplicateHammingThreshold: 6,   // ...when display frames are near-identical
    },
  },
};
