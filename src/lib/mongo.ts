import { MongoClient, Db, Collection, ObjectId } from "mongodb";
import type { CostSummary } from "./aiCost";

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
  | "generating" | "building-pool" | "assigning" | "uploading-screenshots"
  | "building-clips" | "uploading-clips"
  | "done" | "failed";

export type ErrorCode =
  | null
  | "video_too_short" | "video_too_long" | "unsupported_format"
  | "file_too_large" | "transcription_failed"
  | "generation_failed"
  | "visual_extract_failed"
  | "frame_sampling_failed" | "video_download_failed"
  | "screenshot_pool_failed"
  | "clip_extract_failed"
  | "not_an_app"           // Stage 0: < 50% of sampled frames show an app UI
  | "analysis_failed"      // Stage 0: the analysis VLM call errored (retryable)
  | "click_detect_failed"
  | "classify_failed"
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
  // Automation metadata: a DOM-agnostic descriptor for a future automation
  // agent. Present only on actionable sub-steps generated after 2026-05-18.
  // Shape mirrors `AutomationMeta` in src/lib/schemas.ts — keep in sync.
  automation?: {
    action: "click" | "type" | "select" | "navigate";
    target: { text: string; role: string; location: string };
    inputValue?: {
      field: string;
      valueType: "text" | "email" | "password" | "number" | "date" | "url" | "selection" | "other";
      example?: string;
    };
    expectedOutcome?: string;
  };
  // Asset metadata captured at upload time; absent on legacy rows.
  sizeBytes?: number;
  width?: number;
  height?: number;
  ext?: string;   // "jpg"
  mime?: string;  // "image/jpeg"
}

export interface Clip {
  clipId: string;        // nanoid(10), unique per clip
  r2Key: string;         // mp4 object key in R2
  posterR2Key: string;   // jpg poster object key in R2
  startTime: number;     // clip start in source video, seconds
  endTime: number;       // clip end in source video, seconds
  order: number;         // display order within the step (0 in v1 — one clip)
  // Asset metadata captured at extract+upload time; absent on legacy rows.
  sizeBytes?: number;
  width?: number;
  height?: number;
  durationSec?: number;
  ext?: string;   // "mp4"
  mime?: string;  // "video/mp4"
  codec?: string; // ffprobe stream.codec_name, e.g. "h264"
  posterSizeBytes?: number;
  posterWidth?: number;
  posterHeight?: number;
  posterMime?: string; // "image/jpeg"
}

export interface Step {
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  screenshots?: Screenshot[];
  screenshotsError?: string;
  clips?: Clip[];
  clipsError?: string;
}

export interface SopDoc {
  _id: ObjectId;
  title: string;                     // AI-generated in Stage 4
  category: string;                  // AI-detected in Stage 3
  inputMode?: "speech" | "silent";
  appType?: "web" | "mobile" | "desktop" | "physical" | "none"; // detected by Stage 0
  industry?: string;                // curated industry enum, detected by Stage 0 (legacy rows lack it)
  outputFormat?: "auto" | "screenshots" | "clips"; // user's choice at upload (legacy rows lack it)
  effectiveOutputFormat?: "screenshots" | "clips"; // resolved after analyze
  outputFormatCoerced?: { from: "screenshots"; to: "clips"; reason: "physical_detected" };
  defaultLanguage?: string;
  sourceType?: "upload" | "loom";   // absent ⇒ "upload" (legacy rows)
  sourceUrl?: string;               // original Loom share URL (sourceType === "loom")
  videoId?: string;                 // Loom video ID (sourceType === "loom")
  videoSizeBytes?: number;          // recorded after successful R2 stream
  source?: {
    sizeBytes: number;
    width: number;
    height: number;
    durationSec: number;
    fps: number;
    ext: string;
    mime: string;
    codec: string;
  };
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
  aiCost?: CostSummary;              // total + per-stage AI cost of the run
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
