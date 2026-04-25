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
  | "uploading" | "transcribing" | "normalizing" | "analyzing"
  | "generating" | "clipping" | "done" | "failed";

export type ErrorCode =
  | null
  | "video_too_short" | "video_too_long" | "unsupported_format"
  | "file_too_large" | "transcription_failed"
  | "generation_failed" | "clipping_failed"
  | "visual_context_failed" | "visual_extract_failed"
  | "frame_sampling_failed" | "video_download_failed"
  | "unknown";

export interface Segment { id: number; start: number; end: number; text: string; }
export interface CleanSegment { id: number; text: string; }

export interface Step {
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  clipR2Key: string;
  posterR2Key: string;
  keyframeR2Keys: string[]; // 3 keyframes evenly spaced across [startTime, endTime]
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
  defaultLanguage?: string;
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
  type: "upload" | "sop_completed" | "share_view";
  sopId: ObjectId | null;
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
