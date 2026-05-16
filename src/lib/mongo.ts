import { MongoClient, Db, Collection, ObjectId } from "mongodb";

let client: MongoClient | null = null;
let db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (db) return db;
  const uri = process.env.MONGODB_URI!;
  client = new MongoClient(uri);
  await client.connect();
  db = client.db();
  await ensureIndexes(db);
  return db;
}

export type SopStatus =
  | "uploading" | "ingesting" | "transcribing" | "normalizing" | "analyzing"
  | "generating" | "clipping" | "building-pool" | "assigning" | "uploading-screenshots"
  | "done" | "failed";

export type ErrorCode =
  | null
  | "video_too_short" | "video_too_long" | "unsupported_format"
  | "file_too_large" | "transcription_failed"
  | "generation_failed" | "clipping_failed"
  | "visual_context_failed" | "visual_extract_failed"
  | "frame_sampling_failed" | "video_download_failed"
  | "screenshot_pool_failed"
  | "click_detect_failed"
  | "classify_failed"
  | "plan_failed"          // top-down pipeline: planStep retries exhausted
  | "frame_pick_failed"    // top-down pipeline: pickFrame retries exhausted (rare; per-sub-step retries-exhausted normally just drop the sub-step)
  | "verify_failed"        // reserved; current policy drops sub-step on no-match rather than failing SOP
  | "highlight_failed"     // reserved; same policy as verify_failed
  | "loom_ingest_failed"
  | "unknown";

export interface Segment { id: number; start: number; end: number; text: string; }
export interface CleanSegment { id: number; text: string; }

export interface Screenshot {
  frameId: string;
  r2Key: string;
  t: number;        // timestamp in source video, seconds
  order: number;    // display order within the step
  description?: string;  // optional LLM-written caption/instruction
  // New: present from the action-pipeline rework onward. Old SOPs lack these fields.
  verb?: "click" | "input" | "select" | "link" | "view";
  screenName?: string;
  elementCaption?: string;
  // highlight.kind stays narrow ("click" | "input") so the existing UI renderer continues
  // to work without changes. The upload adapter (Task 9) coerces select/link verbs → "click"
  // when populating highlight.kind. The full verb is captured in the new top-level `verb` field.
  highlight?: {          // optional highlight target, baked into the JPEG
    kind: "click" | "input";
    bbox?: { x: number; y: number; w: number; h: number };
    point?: { x: number; y: number };
  };
  highlightError?: string; // set when rectangle drawing failed; un-annotated JPEG was uploaded instead
}

export interface Step {
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  // Clip-mode (existing — present when SopDoc.mode === "clips" or absent):
  clipR2Key: string;
  posterR2Key: string;
  keyframeR2Keys: string[]; // 3 keyframes evenly spaced across [startTime, endTime]
  // Screenshot-mode (new — present when SopDoc.mode === "screenshots"):
  screenshots?: Screenshot[];
  screenshotsError?: string;
}

export type PdfStatus = "idle" | "generating" | "ready" | "error";

export interface SopPdfState {
  status: PdfStatus;
  r2Key?: string;        // R2 key of the latest generated PDF
  generatedAt?: Date;    // when status flipped to "ready"
  startedAt?: Date;      // when status flipped to "generating"; used for staleness
  errorMessage?: string;
  runId?: string;        // current Trigger.dev run id, for dedupe
}

export interface SopDoc {
  _id: ObjectId;
  title: string;                     // AI-generated in Stage 4
  category: string;                  // AI-detected in Stage 3
  inputMode?: "speech" | "silent";
  mode?: "clips" | "screenshots"; // NEW — set at upload time; absent ⇒ "clips"
  defaultLanguage?: string;
  sourceType?: "upload" | "loom";   // absent ⇒ "upload" (legacy rows)
  sourceUrl?: string;               // original Loom share URL (sourceType === "loom")
  videoId?: string;                 // Loom video ID (sourceType === "loom")
  videoSizeBytes?: number;          // recorded after successful R2 stream
  status: SopStatus;
  errorCode: ErrorCode;
  videoR2Key: string | null;
  videoExpiresAt: Date;
  transcript: string | null;
  language: string | null;          // ISO-ish code from Whisper, e.g. "vi", "en"
  segments: Segment[];
  segmentsClean: CleanSegment[] | null;
  domainSummary: string | null;
  steps: Step[];
  shareToken: string;
  pdf?: SopPdfState;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventDoc {
  _id: ObjectId;
  type: "upload" | "sop_completed" | "share_view" | "loom_ingest_error";
  sopId: ObjectId | null;
  // Diagnostic fields used by "loom_ingest_error" only. Free-form on purpose:
  // the SopDoc.errorCode union is strict; this field is just for logs.
  errorCode?: string;
  httpStatus?: number;
  createdAt: Date;
}

export async function sops(): Promise<Collection<SopDoc>> {
  return (await getDb()).collection<SopDoc>("sops");
}
export async function events(): Promise<Collection<EventDoc>> {
  return (await getDb()).collection<EventDoc>("events");
}

async function ensureIndexes(db: Db) {
  await db.collection("sops").createIndex({ shareToken: 1 }, { unique: true });
  await db.collection("sops").createIndex({ videoExpiresAt: 1 });
  await db.collection("events").createIndex({ type: 1, createdAt: -1 });
}
