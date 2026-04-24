# SOP.vn MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Vietnamese video-to-SOP MVP end-to-end: user uploads video → staged AI pipeline produces step-by-step Vietnamese SOP with a clip per step → shareable via link.

**Spec:** `docs/superpowers/specs/2026-04-24-sopvn-mvp-design.md`

**Architecture:** Next.js on Vercel. Client uploads video directly to Cloudflare R2 via presigned URL. Next.js API persists metadata in MongoDB and kicks off a Trigger.dev job that runs a 5-stage AI pipeline (fal.ai ASR → normalize LLM → context LLM → extract LLM → ffmpeg clip). Client polls status, then renders step cards with inline video clips served via signed-URL proxy.

**Tech Stack:** Next.js 15 (App Router, TypeScript) · Tailwind · shadcn/ui · MongoDB Atlas · Cloudflare R2 (S3 SDK) · Trigger.dev v3 (ffmpeg extension) · fal.ai Whisper · OpenRouter (Gemini Flash + Claude Sonnet) · Zod.

**Quality bar:** MVP, "just works." No unit tests for UI/glue code. Light smoke tests only for the timestamp-resolution function (Stage 5) because a bug there produces bad clips. Commits are frequent so rollback is easy.

---

## File Structure

```
/
├── .env.local.example                  # template of required env vars
├── .env.local                           # secrets (gitignored)
├── next.config.ts
├── tailwind.config.ts
├── package.json
├── tsconfig.json
├── trigger.config.ts                    # Trigger.dev config (ffmpeg extension)
├── src/
│   ├── config/
│   │   └── index.ts                     # all tunables
│   ├── lib/
│   │   ├── mongo.ts                     # Mongo client + collections
│   │   ├── r2.ts                        # R2 client + presign/put/get/delete
│   │   ├── openrouter.ts                # OpenRouter wrapper w/ Zod + retry
│   │   ├── fal.ts                       # fal.ai Whisper wrapper
│   │   ├── schemas.ts                   # Zod schemas for AI stages
│   │   └── utils.ts                     # shareToken, ids, small helpers
│   ├── trigger/
│   │   ├── processSop.ts                # Trigger.dev task (5 stages)
│   │   ├── stages/
│   │   │   ├── transcribe.ts            # Stage 1
│   │   │   ├── normalize.ts             # Stage 2
│   │   │   ├── context.ts               # Stage 3
│   │   │   ├── extract.ts               # Stage 4
│   │   │   └── clip.ts                  # Stage 5 (ffmpeg)
│   │   └── cleanupVideos.ts             # scheduled cleanup
│   ├── components/
│   │   ├── ui/                          # shadcn generated
│   │   ├── StepCard.tsx
│   │   ├── UploadZone.tsx
│   │   ├── ProgressStepper.tsx
│   │   └── ShareButton.tsx
│   └── app/
│       ├── layout.tsx                   # root, Vietnamese font
│       ├── globals.css
│       ├── page.tsx                     # S1
│       ├── upload/page.tsx              # S2
│       ├── processing/[id]/page.tsx     # S3
│       ├── sop/[id]/page.tsx            # S4
│       ├── share/[token]/page.tsx       # S6
│       ├── admin/page.tsx               # S7
│       └── api/
│           ├── upload/
│           │   ├── init/route.ts
│           │   └── commit/route.ts
│           ├── sop/[id]/
│           │   ├── route.ts             # full SOP
│           │   └── status/route.ts      # poll
│           ├── share/[token]/route.ts
│           ├── clips/[sopId]/[key]/route.ts
│           └── admin/
│               └── stats/route.ts
└── docs/
    └── superpowers/
        ├── specs/2026-04-24-sopvn-mvp-design.md
        └── plans/2026-04-24-sopvn-mvp-plan.md
```

---

## Phase 0 — Foundation

### Task 0.1: Scaffold Next.js + Tailwind + shadcn

**Files:**
- Create: entire Next.js skeleton in current repo

- [ ] **Step 1: Scaffold Next.js into current repo**

Run (non-interactive):
```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-eslint --no-turbopack --use-npm --yes
```
Expected: creates `src/app`, `package.json`, `tailwind.config.ts`, etc. If it complains about non-empty dir, create a fresh sibling and move files, or use `--force`.

- [ ] **Step 2: Install runtime deps**

```bash
npm i mongodb @aws-sdk/client-s3 @aws-sdk/s3-request-presigner zod @trigger.dev/sdk@latest nanoid
npm i -D @trigger.dev/build
```

- [ ] **Step 3: Init shadcn/ui**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button card input label progress toast dialog badge
```
Accept defaults (New York style, zinc base, CSS variables).

- [ ] **Step 4: Quick boot check**

```bash
npm run build
```
Expected: clean build, no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + Tailwind + shadcn/ui"
```

---

### Task 0.2: Env template + config file

**Files:**
- Create: `.env.local.example`, `src/config/index.ts`

- [ ] **Step 1: Create `.env.local.example`**

```
# MongoDB
MONGODB_URI=mongodb+srv://...

# Cloudflare R2
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=sopvn-mvp

# fal.ai
FAL_API_KEY=

# OpenRouter
OPENROUTER_API_KEY=

# Trigger.dev
TRIGGER_SECRET_KEY=

# Admin
ADMIN_PASSWORD=change-me

# Public base URL (for OpenRouter Referer header, nice-to-have)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 2: Create `src/config/index.ts`**

```ts
export const config = {
  ai: {
    transcriptionProvider: "fal" as const,
    transcriptionModel: "fal-ai/whisper",
    normalizeModel: "google/gemini-2.5-flash",
    contextModel: "google/gemini-2.5-flash",
    sopModel: "anthropic/claude-sonnet-4.5",
    maxRetries: 1,
    domainTerminology: {
      "Coffee & Drinks": "chiết xuất, pha, định lượng, xay, tamping, crema",
      "Food & Cooking":  "xào, hầm, nêm, luộc, ướp, gia vị",
      "Spa & Beauty":    "tẩy tế bào chết, ủ, massage, mặt nạ, dưỡng",
      "Nail":            "giũa, sơn gel, đắp, phủ bóng, dũa móng",
      "Other":           "",
    } as Record<Category, string>,
    prompts: {
      normalizeSystem:
        `You clean Vietnamese ASR transcripts. Remove filler words ("ờ","à","ừm","thì","là" used as filler), stutters, and self-corrections. Preserve meaning. CRITICAL: return the same segment IDs unchanged — do not merge, split, or renumber.`,
      contextSystem:
        `You classify Vietnamese training videos. Read the transcript and return the single best-fit category plus a 1-2 sentence Vietnamese summary of what the video teaches.`,
      sopSystem: (domainHint: string) =>
        `You convert Vietnamese-narrated training videos into structured SOPs. You receive cleaned, indexed transcript segments. Let the trainer's narration decide where steps begin and end — do NOT impose a preferred number of steps. Each step is a coherent unit the trainer is explaining. Each step has: a short Vietnamese title (≤8 words), a 2-4 sentence Vietnamese description, and a startSegmentId/endSegmentId referencing the input segment IDs. Also produce an overall Vietnamese SOP title.${
          domainHint ? `\n\nDomain vocabulary to prefer when relevant: ${domainHint}` : ""
        }\n\nReturn strict JSON only.`,
    },
  },
  limits: {
    maxVideoSizeMB: 500,
    maxVideoDurationSec: 300,
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
  categories: [
    "Coffee & Drinks",
    "Food & Cooking",
    "Spa & Beauty",
    "Nail",
    "Other",
  ] as const,
} as const;

export type Category = (typeof config.categories)[number];
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: add env template and central config"
```

---

### Task 0.3: MongoDB client + collections

**Files:**
- Create: `src/lib/mongo.ts`

- [ ] **Step 1: Create `src/lib/mongo.ts`**

```ts
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
  | "file_too_large" | "silent_audio" | "transcription_failed"
  | "generation_failed" | "clipping_failed" | "unknown";

export interface Segment { id: number; start: number; end: number; text: string; }
export interface CleanSegment { id: number; text: string; }

export interface Step {
  title: string;
  description: string;
  startTime: number;
  endTime: number;
  clipR2Key: string;
  posterR2Key: string;
}

export interface SopDoc {
  _id: ObjectId;
  title: string;
  category: string;
  userProvidedCategory: boolean;    // true if user picked on S2 (skip Stage 3)
  status: SopStatus;
  errorCode: ErrorCode;
  videoR2Key: string | null;
  videoExpiresAt: Date;
  transcript: string | null;
  segments: Segment[];
  segmentsClean: CleanSegment[] | null;
  domainSummary: string | null;
  steps: Step[];
  shareToken: string;
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
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: Mongo client, schemas, indexes"
```

---

### Task 0.4: R2 client

**Files:**
- Create: `src/lib/r2.ts`

- [ ] **Step 1: Create `src/lib/r2.ts`**

```ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID!;
const bucket = process.env.R2_BUCKET!;

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const R2_BUCKET = bucket;

export async function presignPut(key: string, contentType: string, expiresIn = 900) {
  return getSignedUrl(
    r2,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn }
  );
}

export async function presignGet(key: string, expiresIn = 3600) {
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  await r2.send(new PutObjectCommand({
    Bucket: bucket, Key: key, Body: body, ContentType: contentType,
  }));
}

export async function deleteObject(key: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: R2 client with presigned URL helpers"
```

---

### Task 0.5: OpenRouter wrapper + Zod schemas

**Files:**
- Create: `src/lib/openrouter.ts`, `src/lib/schemas.ts`

- [ ] **Step 1: Create `src/lib/schemas.ts`**

```ts
import { z } from "zod";

export const NormalizeOutput = z.object({
  segments: z.array(z.object({ id: z.number().int(), text: z.string() })),
});

export const ContextOutput = z.object({
  category: z.enum([
    "Coffee & Drinks",
    "Food & Cooking",
    "Spa & Beauty",
    "Nail",
    "Other",
  ]),
  domainSummary: z.string(),
});

export const SopExtractOutput = z.object({
  title: z.string(),
  steps: z.array(z.object({
    title: z.string(),
    description: z.string(),
    startSegmentId: z.number().int().nonnegative(),
    endSegmentId: z.number().int().nonnegative(),
  })).min(1),
});
```

- [ ] **Step 2: Create `src/lib/openrouter.ts`**

```ts
import { z, type ZodTypeAny } from "zod";

const API = "https://openrouter.ai/api/v1/chat/completions";

export async function llmJson<T extends ZodTypeAny>(opts: {
  model: string;
  system: string;
  user: string;
  schema: T;
  schemaName: string;
  maxRetries: number;
}): Promise<z.infer<T>> {
  const body = {
    model: opts.model,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: opts.schemaName,
        strict: true,
        schema: zodToJsonSchemaLike(opts.schema),
      },
    },
    temperature: 0.2,
  };

  let lastErr: unknown = null;
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY!}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://sop.vn",
          "X-Title": "SOP.vn",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty content");
      const parsed = JSON.parse(content);
      return opts.schema.parse(parsed);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("LLM failed");
}

/**
 * Minimal Zod → JSON Schema conversion sufficient for our 3 schemas.
 * If schemas grow, switch to `zod-to-json-schema` npm package.
 */
function zodToJsonSchemaLike(schema: ZodTypeAny): unknown {
  const def: any = (schema as any)._def;
  switch (def.typeName) {
    case "ZodObject": {
      const shape = def.shape();
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const [k, v] of Object.entries(shape)) {
        properties[k] = zodToJsonSchemaLike(v as ZodTypeAny);
        required.push(k);
      }
      return { type: "object", properties, required, additionalProperties: false };
    }
    case "ZodArray":
      return { type: "array", items: zodToJsonSchemaLike(def.type) };
    case "ZodString": return { type: "string" };
    case "ZodNumber": return { type: "number" };
    case "ZodEnum":   return { type: "string", enum: def.values };
    default:
      throw new Error(`Unsupported Zod type: ${def.typeName}`);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: OpenRouter wrapper with strict JSON schemas and retry"
```

---

### Task 0.6: fal.ai Whisper wrapper

**Files:**
- Create: `src/lib/fal.ts`

- [ ] **Step 1: Install fal client**

```bash
npm i @fal-ai/serverless-client
```

- [ ] **Step 2: Create `src/lib/fal.ts`**

```ts
import { fal } from "@fal-ai/serverless-client";
import type { Segment } from "./mongo";

fal.config({ credentials: process.env.FAL_API_KEY });

/**
 * Runs fal.ai Whisper on an R2 signed URL. Returns indexed segments
 * matching our Mongo Segment type.
 */
export async function transcribeVideo(signedUrl: string): Promise<{
  transcript: string;
  segments: Segment[];
}> {
  const result: any = await fal.subscribe("fal-ai/whisper", {
    input: {
      audio_url: signedUrl,
      task: "transcribe",
      language: "vi",
      chunk_level: "segment",
      version: "3",
    },
  });

  const rawSegments: any[] = result?.chunks ?? result?.segments ?? [];
  const segments: Segment[] = rawSegments.map((s: any, i: number) => ({
    id: i,
    start: Number(s.timestamp?.[0] ?? s.start ?? 0),
    end:   Number(s.timestamp?.[1] ?? s.end   ?? 0),
    text:  String(s.text ?? "").trim(),
  })).filter(s => s.text.length > 0);

  const transcript = segments.map(s => s.text).join(" ");
  return { transcript, segments };
}
```

Note: fal.ai's exact response shape differs slightly by model version. This wrapper tolerates both `chunks` (with `timestamp: [start, end]`) and `segments`. Test on real data in Phase 4 and tweak.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat: fal.ai Whisper wrapper"
```

---

### Task 0.7: Trigger.dev init + ffmpeg extension

**Files:**
- Create: `trigger.config.ts`

- [ ] **Step 1: Init Trigger.dev**

```bash
npx trigger.dev@latest init
```
Follow prompts; choose this project. Accept default dirs. When it writes `trigger.config.ts`, continue.

- [ ] **Step 2: Install ffmpeg build extension**

```bash
npm i -D @trigger.dev/build
npm i fluent-ffmpeg @types/fluent-ffmpeg
```

- [ ] **Step 3: Edit `trigger.config.ts` to add ffmpeg**

```ts
import { defineConfig } from "@trigger.dev/sdk/v3";
import { ffmpeg } from "@trigger.dev/build/extensions/core";

export default defineConfig({
  project: "<project-ref-set-by-init>",
  runtime: "node",
  logLevel: "info",
  retries: {
    enabledInDev: true,
    default: { maxAttempts: 1, minTimeoutInMs: 1000, maxTimeoutInMs: 10000, factor: 2, randomize: true },
  },
  dirs: ["./src/trigger"],
  build: { extensions: [ffmpeg()] },
});
```

- [ ] **Step 4: Start dev server to validate**

```bash
npx trigger.dev@latest dev
```
Expected: connects to project, shows `[trigger.dev] Watching ...`. Leave running in another terminal or kill after verifying.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Trigger.dev setup with ffmpeg build extension"
```

---

### Task 0.8: Utility helpers

**Files:**
- Create: `src/lib/utils.ts`

- [ ] **Step 1: Create `src/lib/utils.ts`**

```ts
import { customAlphabet } from "nanoid";
import { config } from "@/config";

const alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
export const newShareToken = customAlphabet(alphabet, config.app.shareTokenLength);

export function videoKey(sopId: string, ext: string) {
  return `sops/${sopId}/source.${ext}`;
}
export function clipKey(sopId: string, i: number) {
  return `sops/${sopId}/step-${i}.mp4`;
}
export function posterKey(sopId: string, i: number) {
  return `sops/${sopId}/step-${i}.jpg`;
}

export function extFromMime(mime: string): string {
  return { "video/mp4":"mp4","video/quicktime":"mov","video/webm":"webm","video/x-msvideo":"avi" }[mime] ?? "mp4";
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: share-token and R2 key helpers"
```

---

## Phase 1 — API Endpoints (Track A)

All routes are Next.js App Router `route.ts` handlers. All return JSON.

### Task 1.1: POST `/api/upload/init`

**Files:**
- Create: `src/app/api/upload/init/route.ts`

- [ ] **Step 1: Create route**

```ts
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { sops } from "@/lib/mongo";
import { presignPut } from "@/lib/r2";
import { newShareToken, videoKey, extFromMime } from "@/lib/utils";
import { config } from "@/config";

const Body = z.object({
  filename: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  mimeType: z.string(),
  userTitle: z.string().optional(),
  userCategory: z.enum(config.categories as unknown as [string, ...string[]]).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { filename, sizeBytes, mimeType, userTitle, userCategory } = parsed.data;

  if (sizeBytes > config.limits.maxVideoSizeMB * 1024 * 1024)
    return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  if (!config.limits.allowedMimeTypes.includes(mimeType))
    return NextResponse.json({ error: "unsupported_format" }, { status: 400 });

  const _id = new ObjectId();
  const ext = extFromMime(mimeType);
  const key = videoKey(_id.toHexString(), ext);
  const now = new Date();
  const videoExpiresAt = new Date(now.getTime() + config.retention.videoRetentionDays * 86400_000);

  await (await sops()).insertOne({
    _id,
    title: userTitle ?? "",
    category: userCategory ?? "",
    userProvidedCategory: Boolean(userCategory),
    status: "uploading",
    errorCode: null,
    videoR2Key: key,
    videoExpiresAt,
    transcript: null,
    segments: [],
    segmentsClean: null,
    domainSummary: null,
    steps: [],
    shareToken: newShareToken(),
    createdAt: now,
    updatedAt: now,
  });

  const uploadUrl = await presignPut(key, mimeType);
  return NextResponse.json({ sopId: _id.toHexString(), uploadUrl, videoKey: key, filename });
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(api): /api/upload/init creates sop + presigned PUT URL"
```

---

### Task 1.2: POST `/api/upload/commit`

**Files:**
- Create: `src/app/api/upload/commit/route.ts`

- [ ] **Step 1: Create route**

```ts
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { sops, events } from "@/lib/mongo";
import { tasks } from "@trigger.dev/sdk/v3";

const Body = z.object({ sopId: z.string().length(24) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const _id = new ObjectId(parsed.data.sopId);

  const col = await sops();
  const res = await col.updateOne(
    { _id, status: "uploading" },
    { $set: { status: "transcribing", updatedAt: new Date() } }
  );
  if (res.matchedCount === 0) return NextResponse.json({ error: "not_found_or_wrong_state" }, { status: 404 });

  await (await events()).insertOne({
    _id: new ObjectId(), type: "upload", sopId: _id, createdAt: new Date(),
  });

  await tasks.trigger("process-sop", { sopId: _id.toHexString() });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(api): /api/upload/commit triggers Trigger.dev job"
```

---

### Task 1.3: GET `/api/sop/[id]/status`

**Files:**
- Create: `src/app/api/sop/[id]/status/route.ts`

- [ ] **Step 1: Create route**

```ts
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { sops } from "@/lib/mongo";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });
  const col = await sops();
  const doc = await col.findOne(
    { _id: new ObjectId(id) },
    { projection: { status: 1, errorCode: 1, title: 1, steps: 1 } }
  );
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({
    status: doc.status,
    errorCode: doc.errorCode,
    title: doc.title,
    hasSteps: (doc.steps?.length ?? 0) > 0,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(api): /api/sop/:id/status for S3 polling"
```

---

### Task 1.4: GET `/api/sop/[id]`

**Files:**
- Create: `src/app/api/sop/[id]/route.ts`

- [ ] **Step 1: Create route**

```ts
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { sops } from "@/lib/mongo";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });
  const doc = await (await sops()).findOne({ _id: new ObjectId(id) });
  if (!doc || doc.status !== "done") return NextResponse.json({ error: "not_ready" }, { status: 404 });

  return NextResponse.json({
    id: doc._id.toHexString(),
    title: doc.title,
    category: doc.category,
    createdAt: doc.createdAt,
    shareToken: doc.shareToken,
    steps: doc.steps.map((s, i) => ({
      index: i,
      title: s.title,
      description: s.description,
      clipUrl: `/api/clips/${doc._id.toHexString()}/step-${i}.mp4`,
      posterUrl: `/api/clips/${doc._id.toHexString()}/step-${i}.jpg`,
    })),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(api): /api/sop/:id full SOP response"
```

---

### Task 1.5: GET `/api/share/[token]`

**Files:**
- Create: `src/app/api/share/[token]/route.ts`

- [ ] **Step 1: Create route**

```ts
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { sops, events } from "@/lib/mongo";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const doc = await (await sops()).findOne({ shareToken: token, status: "done" });
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await (await events()).insertOne({
    _id: new ObjectId(), type: "share_view", sopId: doc._id, createdAt: new Date(),
  });

  return NextResponse.json({
    title: doc.title,
    category: doc.category,
    createdAt: doc.createdAt,
    steps: doc.steps.map((s, i) => ({
      index: i,
      title: s.title,
      description: s.description,
      clipUrl: `/api/clips/${doc._id.toHexString()}/step-${i}.mp4`,
      posterUrl: `/api/clips/${doc._id.toHexString()}/step-${i}.jpg`,
    })),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(api): /api/share/:token read-only SOP"
```

---

### Task 1.6: GET `/api/clips/[sopId]/[key]`

**Files:**
- Create: `src/app/api/clips/[sopId]/[key]/route.ts`

Redirect to short-lived signed R2 URL so clips can be served via public-ish URLs without exposing creds or making bucket public.

- [ ] **Step 1: Create route**

```ts
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { sops } from "@/lib/mongo";
import { presignGet } from "@/lib/r2";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sopId: string; key: string }> }
) {
  const { sopId, key } = await params;
  if (!ObjectId.isValid(sopId)) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  // Only serve files owned by this sop, under sops/{sopId}/
  const fullKey = `sops/${sopId}/${key}`;
  const exists = await (await sops()).findOne(
    { _id: new ObjectId(sopId), status: "done" },
    { projection: { _id: 1 } }
  );
  if (!exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const url = await presignGet(fullKey, 600); // 10 min
  return NextResponse.redirect(url, 302);
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(api): signed-URL proxy for R2 clip assets"
```

---

### Task 1.7: GET `/api/admin/stats`

**Files:**
- Create: `src/app/api/admin/stats/route.ts`

- [ ] **Step 1: Create route**

```ts
import { NextResponse } from "next/server";
import { events } from "@/lib/mongo";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const col = await events();
  const now = Date.now();
  const day = new Date(now - 86400_000);
  const week = new Date(now - 7 * 86400_000);

  async function counts(since?: Date) {
    const match = since ? { createdAt: { $gte: since } } : {};
    const agg = await col.aggregate([
      { $match: match },
      { $group: { _id: "$type", n: { $sum: 1 } } },
    ]).toArray();
    const out: Record<string, number> = { upload: 0, sop_completed: 0, share_view: 0 };
    for (const r of agg) out[r._id as string] = r.n as number;
    return out;
  }

  return NextResponse.json({
    today: await counts(day),
    last7d: await counts(week),
    allTime: await counts(),
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(api): admin stats endpoint with password gate"
```

---

## Phase 2 — Trigger.dev Pipeline (Track B, parallelizable with Phase 1)

### Task 2.1: `processSop` task skeleton

**Files:**
- Create: `src/trigger/processSop.ts`

- [ ] **Step 1: Create task skeleton**

```ts
import { task, logger } from "@trigger.dev/sdk/v3";
import { ObjectId } from "mongodb";
import { sops, events, type ErrorCode, type SopStatus } from "@/lib/mongo";
import { presignGet } from "@/lib/r2";
import { runTranscribe } from "./stages/transcribe";
import { runNormalize } from "./stages/normalize";
import { runContext } from "./stages/context";
import { runExtract } from "./stages/extract";
import { runClip } from "./stages/clip";

async function setStatus(id: ObjectId, status: SopStatus, extra: Record<string, unknown> = {}) {
  await (await sops()).updateOne({ _id: id }, { $set: { status, updatedAt: new Date(), ...extra } });
}
async function fail(id: ObjectId, errorCode: ErrorCode) {
  await (await sops()).updateOne({ _id: id }, { $set: { status: "failed", errorCode, updatedAt: new Date() } });
}

export const processSop = task({
  id: "process-sop",
  maxDuration: 60 * 15,
  run: async (payload: { sopId: string }) => {
    const _id = new ObjectId(payload.sopId);
    const doc = await (await sops()).findOne({ _id });
    if (!doc || !doc.videoR2Key) { logger.error("sop not found"); return; }

    const signedVideo = await presignGet(doc.videoR2Key, 3600);

    try {
      // Stage 1
      await setStatus(_id, "transcribing");
      const { transcript, segments } = await runTranscribe(signedVideo);
      if (segments.length === 0) return fail(_id, "silent_audio");
      await (await sops()).updateOne({ _id }, { $set: { transcript, segments, updatedAt: new Date() } });

      // Stage 2
      await setStatus(_id, "normalizing");
      const segmentsClean = await runNormalize(segments);
      await (await sops()).updateOne({ _id }, { $set: { segmentsClean, updatedAt: new Date() } });

      // Stage 3
      await setStatus(_id, "analyzing");
      const { category, domainSummary } = await runContext({
        userCategory: doc.userProvidedCategory ? doc.category : null,
        cleanTranscript: segmentsClean.map(s => s.text).join(" "),
      });
      await (await sops()).updateOne(
        { _id },
        {
          $set: {
            category: doc.userProvidedCategory ? doc.category : category,
            domainSummary, updatedAt: new Date(),
          },
        }
      );

      // Stage 4
      await setStatus(_id, "generating");
      let extracted;
      try {
        extracted = await runExtract({ segmentsClean, category });
      } catch (e) {
        logger.error("extract failed", { e: String(e) });
        return fail(_id, "generation_failed");
      }

      // Title: user wins over AI
      const finalTitle = (doc.title && doc.title.trim().length > 0) ? doc.title : extracted.title;

      // Stage 5
      await setStatus(_id, "clipping", { title: finalTitle });
      let steps;
      try {
        steps = await runClip({
          sopId: _id.toHexString(),
          videoR2Key: doc.videoR2Key,
          rawSegments: segments,
          extractedSteps: extracted.steps,
        });
      } catch (e) {
        logger.error("clip failed", { e: String(e) });
        return fail(_id, "clipping_failed");
      }

      await (await sops()).updateOne(
        { _id },
        { $set: { steps, status: "done" as SopStatus, updatedAt: new Date() } }
      );
      await (await events()).insertOne({
        _id: new ObjectId(), type: "sop_completed", sopId: _id, createdAt: new Date(),
      });
    } catch (e) {
      logger.error("processSop unhandled", { e: String(e) });
      await fail(_id, "unknown");
    }
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(trigger): processSop orchestrator with status transitions"
```

---

### Task 2.2: Stage 1 — transcribe

**Files:**
- Create: `src/trigger/stages/transcribe.ts`

- [ ] **Step 1: Create**

```ts
import { transcribeVideo } from "@/lib/fal";
export async function runTranscribe(signedVideoUrl: string) {
  return transcribeVideo(signedVideoUrl);
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(trigger): stage 1 transcribe"
```

---

### Task 2.3: Stage 2 — normalize

**Files:**
- Create: `src/trigger/stages/normalize.ts`

- [ ] **Step 1: Create**

```ts
import { llmJson } from "@/lib/openrouter";
import { NormalizeOutput } from "@/lib/schemas";
import { config } from "@/config";
import type { Segment, CleanSegment } from "@/lib/mongo";
import { logger } from "@trigger.dev/sdk/v3";

export async function runNormalize(segments: Segment[]): Promise<CleanSegment[]> {
  try {
    const out = await llmJson({
      model: config.ai.normalizeModel,
      system: config.ai.prompts.normalizeSystem,
      user: `Segments (JSON):\n${JSON.stringify(segments.map(s => ({ id: s.id, text: s.text })))}\n\nReturn { "segments": [{ id, text }] } with SAME ids.`,
      schema: NormalizeOutput,
      schemaName: "normalize",
      maxRetries: config.ai.maxRetries,
    });

    // Defensive: ensure IDs align 1:1 with input; if not, fall through to raw.
    const inIds = new Set(segments.map(s => s.id));
    const outIds = new Set(out.segments.map(s => s.id));
    const sameSet = inIds.size === outIds.size && [...inIds].every(id => outIds.has(id));
    if (!sameSet) {
      logger.warn("normalize ID mismatch — falling back to raw segments");
      return segments.map(s => ({ id: s.id, text: s.text }));
    }
    return out.segments;
  } catch (e) {
    logger.warn("normalize failed — falling back to raw segments", { e: String(e) });
    return segments.map(s => ({ id: s.id, text: s.text }));
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(trigger): stage 2 normalize with raw-segment fallback"
```

---

### Task 2.4: Stage 3 — context

**Files:**
- Create: `src/trigger/stages/context.ts`

- [ ] **Step 1: Create**

```ts
import { llmJson } from "@/lib/openrouter";
import { ContextOutput } from "@/lib/schemas";
import { config } from "@/config";
import { logger } from "@trigger.dev/sdk/v3";
import type { Category } from "@/config";

export async function runContext(args: {
  userCategory: string | null;
  cleanTranscript: string;
}): Promise<{ category: Category; domainSummary: string }> {
  if (args.userCategory) {
    return { category: args.userCategory as Category, domainSummary: "" };
  }
  try {
    const out = await llmJson({
      model: config.ai.contextModel,
      system: config.ai.prompts.contextSystem,
      user: `Transcript:\n${args.cleanTranscript}\n\nReturn { "category": <enum>, "domainSummary": string }.`,
      schema: ContextOutput,
      schemaName: "context",
      maxRetries: 0,
    });
    return out;
  } catch (e) {
    logger.warn("context detect failed — defaulting to Other", { e: String(e) });
    return { category: "Other", domainSummary: "" };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(trigger): stage 3 context detect with user-override + Other fallback"
```

---

### Task 2.5: Stage 4 — extract steps

**Files:**
- Create: `src/trigger/stages/extract.ts`

- [ ] **Step 1: Create**

```ts
import { llmJson } from "@/lib/openrouter";
import { SopExtractOutput } from "@/lib/schemas";
import { config, type Category } from "@/config";
import type { CleanSegment } from "@/lib/mongo";

export async function runExtract(args: {
  segmentsClean: CleanSegment[];
  category: Category;
}) {
  const domainHint = config.ai.domainTerminology[args.category] ?? "";
  const out = await llmJson({
    model: config.ai.sopModel,
    system: config.ai.prompts.sopSystem(domainHint),
    user: `Segments (JSON, use ids to reference):\n${JSON.stringify(args.segmentsClean)}\n\nReturn { "title": string, "steps": [{ "title", "description", "startSegmentId", "endSegmentId" }] }.`,
    schema: SopExtractOutput,
    schemaName: "sop_extract",
    maxRetries: config.ai.maxRetries,
  });
  return out;
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(trigger): stage 4 step extraction with domain hint"
```

---

### Task 2.6: Stage 5 — resolve timestamps + ffmpeg clip

**Files:**
- Create: `src/trigger/stages/clip.ts`

- [ ] **Step 1: Create**

```ts
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import ffmpeg from "fluent-ffmpeg";
import { logger } from "@trigger.dev/sdk/v3";
import { presignGet, putObject } from "@/lib/r2";
import { clipKey, posterKey } from "@/lib/utils";
import type { Segment, Step } from "@/lib/mongo";

export function resolveTimes(
  rawSegments: Segment[],
  extractedSteps: { title: string; description: string; startSegmentId: number; endSegmentId: number }[],
  videoDurationSec: number
): { title: string; description: string; startTime: number; endTime: number }[] {
  const byId = new Map(rawSegments.map(s => [s.id, s]));
  const resolved: { title: string; description: string; startTime: number; endTime: number }[] = [];
  let prevEnd = 0;
  for (const s of extractedSteps) {
    const a = byId.get(s.startSegmentId);
    const b = byId.get(s.endSegmentId);
    if (!a || !b) continue;
    let start = Math.max(0, Math.min(a.start, videoDurationSec));
    let end   = Math.max(0, Math.min(b.end,   videoDurationSec));
    if (end <= start) continue;
    if (start < prevEnd) start = prevEnd; // keep monotonic
    if (end <= start) continue;
    prevEnd = end;
    resolved.push({ title: s.title, description: s.description, startTime: start, endTime: end });
  }
  return resolved;
}

async function downloadTo(tmpPath: string, url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.promises.writeFile(tmpPath, buf);
}

function ffprobeDuration(file: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, data) => {
      if (err) return reject(err);
      resolve(Number(data.format.duration ?? 0));
    });
  });
}

function cutClip(input: string, out: string, start: number, end: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .setStartTime(start)
      .duration(end - start)
      .outputOptions(["-c copy", "-movflags +faststart"])
      .on("end", () => resolve())
      .on("error", reject)
      .save(out);
  });
}

function grabFrame(input: string, out: string, atSec: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .screenshots({ timestamps: [atSec], filename: path.basename(out), folder: path.dirname(out), size: "640x?" })
      .on("end", () => resolve())
      .on("error", reject);
  });
}

export async function runClip(args: {
  sopId: string;
  videoR2Key: string;
  rawSegments: Segment[];
  extractedSteps: { title: string; description: string; startSegmentId: number; endSegmentId: number }[];
}): Promise<Step[]> {
  const tmp = await fs.promises.mkdtemp(path.join(os.tmpdir(), "sop-"));
  const srcUrl = await presignGet(args.videoR2Key, 3600);
  const srcPath = path.join(tmp, "src.mp4");
  await downloadTo(srcPath, srcUrl);
  const duration = await ffprobeDuration(srcPath);

  const resolved = resolveTimes(args.rawSegments, args.extractedSteps, duration);
  const steps: Step[] = [];
  for (let i = 0; i < resolved.length; i++) {
    const r = resolved[i];
    const clipPath = path.join(tmp, `step-${i}.mp4`);
    const posterPath = path.join(tmp, `step-${i}.jpg`);
    try {
      await cutClip(srcPath, clipPath, r.startTime, r.endTime);
      await grabFrame(srcPath, posterPath, r.startTime + (r.endTime - r.startTime) / 2);
    } catch (e) {
      logger.warn("ffmpeg failed for step, skipping", { i, e: String(e) });
      continue;
    }
    const clipBuf = await fs.promises.readFile(clipPath);
    const posterBuf = await fs.promises.readFile(posterPath);
    const ck = clipKey(args.sopId, i);
    const pk = posterKey(args.sopId, i);
    await putObject(ck, clipBuf, "video/mp4");
    await putObject(pk, posterBuf, "image/jpeg");
    steps.push({
      title: r.title, description: r.description,
      startTime: r.startTime, endTime: r.endTime,
      clipR2Key: ck, posterR2Key: pk,
    });
  }
  await fs.promises.rm(tmp, { recursive: true, force: true });
  if (steps.length === 0) throw new Error("no clips produced");
  return steps;
}
```

- [ ] **Step 2: Smoke test `resolveTimes`**

Create `src/trigger/stages/clip.test.ts`:
```ts
import { test } from "node:test";
import assert from "node:assert";
import { resolveTimes } from "./clip";

test("resolveTimes clamps, orders, drops invalid", () => {
  const segs = [
    { id: 0, start: 0, end: 5, text: "a" },
    { id: 1, start: 5, end: 10, text: "b" },
    { id: 2, start: 10, end: 15, text: "c" },
  ];
  const extracted = [
    { title: "A", description: "", startSegmentId: 0, endSegmentId: 1 },
    { title: "B", description: "", startSegmentId: 2, endSegmentId: 2 },
    { title: "Bad", description: "", startSegmentId: 99, endSegmentId: 100 },
  ];
  const out = resolveTimes(segs, extracted, 15);
  assert.equal(out.length, 2);
  assert.equal(out[0].startTime, 0);
  assert.equal(out[0].endTime, 10);
  assert.equal(out[1].startTime, 10);
  assert.equal(out[1].endTime, 15);
});
```

Run: `node --import tsx --test src/trigger/stages/clip.test.ts`
(Install `tsx` first if missing: `npm i -D tsx`)

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(trigger): stage 5 ffmpeg clip + poster + R2 upload, with smoke test"
```

---

## Phase 3 — UI

### Task 3.1: Root layout + globals + Vietnamese font

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/globals.css`

- [ ] **Step 1: Edit `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const font = Be_Vietnam_Pro({ subsets: ["latin", "vietnamese"], weight: ["400","500","600","700"] });

export const metadata: Metadata = {
  title: "SOP.vn — Biến video thành hướng dẫn từng bước",
  description: "Tải video — AI tạo SOP — Xong.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={font.className}>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(ui): Vietnamese font + metadata on root layout"
```

---

### Task 3.2: S1 Landing

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Open mvp.pen to pull visual details**

In a separate terminal or session, view pen file S1 via Pencil MCP:
```
mcp__pencil__batch_get filePath=/Users/hauvo/Documents/1-active-projects/document-to-sop/mvp.pen nodeIds=["aMQP1"] readDepth=3
```
Note colors, hero copy, CTA text, layout.

- [ ] **Step 2: Rewrite `src/app/page.tsx`**

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 gap-8 text-center">
      <h1 className="text-4xl md:text-5xl font-bold max-w-3xl leading-tight">
        Biến mọi video đào tạo thành SOP từng bước trong 2 phút
      </h1>
      <p className="text-lg text-muted-foreground max-w-xl">
        Tải lên video. AI tạo SOP. Xong.
      </p>
      <Link href="/upload">
        <Button size="lg" className="text-base">Tải video lên</Button>
      </Link>
      <div className="flex flex-wrap gap-3 justify-center mt-4 text-sm text-muted-foreground">
        <span>Công thức pha chế</span>·<span>Quy trình bếp</span>·<span>Quy trình spa</span>
      </div>
      <section className="mt-16 grid md:grid-cols-3 gap-6 max-w-4xl">
        {[
          ["1. Tải lên", "Chọn video đào tạo của bạn."],
          ["2. AI trích xuất bước", "AI nghe và hiểu từng bước."],
          ["3. Nhận SOP", "Chia sẻ link hoặc in PDF."],
        ].map(([h, p]) => (
          <div key={h} className="rounded-lg border p-6 text-left">
            <h3 className="font-semibold">{h}</h3>
            <p className="text-sm text-muted-foreground mt-2">{p}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): S1 landing page"
```

---

### Task 3.3: S2 Upload

**Files:**
- Create: `src/app/upload/page.tsx`, `src/components/UploadZone.tsx`

- [ ] **Step 1: Create `src/components/UploadZone.tsx`**

```tsx
"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { config } from "@/config";

const CATEGORIES = config.categories;

export function UploadZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  function pick(f: File | null) {
    setError(null);
    if (!f) { setFile(null); return; }
    if (f.size > config.limits.maxVideoSizeMB * 1024 * 1024) { setError("File vượt quá 500MB."); return; }
    if (!config.limits.allowedMimeTypes.includes(f.type)) { setError("Định dạng không hỗ trợ. Dùng MP4, MOV, hoặc WEBM."); return; }
    setFile(f);
  }

  async function submit() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const init = await fetch("/api/upload/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          sizeBytes: file.size,
          mimeType: file.type,
          userTitle: title || undefined,
          userCategory: category || undefined,
        }),
      }).then(r => r.json());
      if (init.error) throw new Error(init.error);

      // PUT to R2
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", init.uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100)); };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`R2 ${xhr.status}`));
        xhr.onerror = () => reject(new Error("network"));
        xhr.send(file);
      });

      await fetch("/api/upload/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sopId: init.sopId }),
      });

      router.push(`/processing/${init.sopId}`);
    } catch (e: any) {
      setError(e.message ?? "Có lỗi xảy ra");
      setUploading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Tải video lên</h1>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0] ?? null); }}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:bg-muted/50"
      >
        {file ? (
          <div className="space-y-1">
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
        ) : (
          <p className="text-muted-foreground">Kéo & thả video vào đây, hoặc bấm để chọn</p>
        )}
        <input
          ref={inputRef} type="file" className="hidden"
          accept={config.limits.allowedMimeTypes.join(",")}
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Tiêu đề (tuỳ chọn)</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ví dụ: Pha cà phê đen đá" />
        </div>
        <div className="space-y-1">
          <Label>Danh mục (tuỳ chọn)</Label>
          <select className="w-full border rounded-md h-10 px-3 bg-background"
                  value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">— Để AI tự chọn —</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {uploading && <p className="text-sm text-muted-foreground">Đang tải lên… {progress}%</p>}

      <Button disabled={!file || uploading} onClick={submit} className="w-full">
        Tạo SOP
      </Button>
      <p className="text-xs text-muted-foreground text-center">Quá trình xử lý mất 1–3 phút. Video tối đa 5 phút, 500 MB.</p>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/upload/page.tsx`**

```tsx
import { UploadZone } from "@/components/UploadZone";
export default function Page() { return <UploadZone />; }
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(ui): S2 upload page with direct-to-R2 upload"
```

---

### Task 3.4: S3 Processing

**Files:**
- Create: `src/app/processing/[id]/page.tsx`

- [ ] **Step 1: Create page**

```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { config } from "@/config";

const STEP_MAP: Record<string, 1 | 2 | 3> = {
  uploading: 1, transcribing: 2, normalizing: 2, analyzing: 2,
  generating: 3, clipping: 3, done: 3, failed: 3,
};

const ERROR_MSG: Record<string, string> = {
  video_too_short: "Video quá ngắn. Tải video dài ít nhất 10 giây.",
  video_too_long: "Video quá dài. Giới hạn 5 phút.",
  unsupported_format: "Định dạng không hỗ trợ. Dùng MP4, MOV hoặc WEBM.",
  file_too_large: "File vượt quá 500MB.",
  silent_audio: "Không nghe rõ lời. Hãy thu video có giọng nói rõ ràng.",
  transcription_failed: "Lỗi nhận dạng giọng nói. Vui lòng thử lại.",
  generation_failed: "Lỗi tạo SOP. Vui lòng thử lại.",
  clipping_failed: "Lỗi cắt video. Vui lòng thử lại.",
  unknown: "Đã xảy ra lỗi. Vui lòng thử lại.",
};

export default function Processing({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string>("");
  const [status, setStatus] = useState("transcribing");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => { params.then(p => setId(p.id)); }, [params]);

  useEffect(() => {
    if (!id) return;
    const iv = setInterval(async () => {
      const r = await fetch(`/api/sop/${id}/status`).then(r => r.json()).catch(() => null);
      if (!r) return;
      setStatus(r.status);
      setErrorCode(r.errorCode);
      if (r.status === "done") { clearInterval(iv); router.push(`/sop/${id}`); }
      if (r.status === "failed") clearInterval(iv);
    }, config.app.pollIntervalMs);
    return () => clearInterval(iv);
  }, [id, router]);

  const step = STEP_MAP[status] ?? 1;
  const failed = status === "failed";

  return (
    <main className="max-w-lg mx-auto px-6 py-16 space-y-8 text-center">
      <h1 className="text-2xl font-semibold">Đang xử lý video của bạn</h1>
      <ol className="space-y-3 text-left">
        {[
          [1, "Đang tải video…"],
          [2, "Đang nhận dạng âm thanh…"],
          [3, "Đang tạo SOP…"],
        ].map(([n, label]) => {
          const n2 = n as number;
          const state = failed ? "wait" : n2 < step ? "done" : n2 === step ? "active" : "wait";
          return (
            <li key={n2} className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold
                ${state === "done" ? "bg-green-600 text-white" : state === "active" ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"}`}>
                {state === "done" ? "✓" : n2}
              </span>
              <span className={state === "active" ? "font-medium" : ""}>{label}</span>
            </li>
          );
        })}
      </ol>
      {!failed && <p className="text-sm text-muted-foreground">Thường mất 1–3 phút.</p>}
      {failed && (
        <div className="space-y-4">
          <p className="text-red-600">{ERROR_MSG[errorCode ?? "unknown"]}</p>
          <Link href="/upload"><Button>Thử lại</Button></Link>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(ui): S3 processing with 3-step stepper and error fallback"
```

---

### Task 3.5: S4 SOP Result

**Files:**
- Create: `src/app/sop/[id]/page.tsx`, `src/components/StepCard.tsx`, `src/components/ShareButton.tsx`

- [ ] **Step 1: Create `src/components/StepCard.tsx`**

```tsx
export function StepCard({ index, title, description, clipUrl, posterUrl }: {
  index: number; title: string; description: string; clipUrl: string; posterUrl: string;
}) {
  return (
    <article className="rounded-lg border p-4 md:p-6 space-y-4">
      <header className="flex items-start gap-3">
        <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold">
          {index + 1}
        </span>
        <h3 className="text-lg font-semibold flex-1">{title}</h3>
      </header>
      <video src={clipUrl} poster={posterUrl} controls preload="metadata" className="w-full rounded-md bg-black" />
      <p className="text-sm leading-relaxed whitespace-pre-line">{description}</p>
    </article>
  );
}
```

- [ ] **Step 2: Create `src/components/ShareButton.tsx`**

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export function ShareButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const url = `${location.origin}/share/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return <Button variant="secondary" onClick={copy}>{copied ? "Đã sao chép!" : "Chia sẻ link"}</Button>;
}
```

- [ ] **Step 3: Create `src/app/sop/[id]/page.tsx`**

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StepCard } from "@/components/StepCard";
import { ShareButton } from "@/components/ShareButton";
import { headers } from "next/headers";

async function getSop(id: string) {
  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const r = await fetch(`${base}/api/sop/${id}`, { cache: "no-store" });
  if (!r.ok) return null;
  return r.json();
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sop = await getSop(id);
  if (!sop) return notFound();
  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">{sop.title}</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="rounded-full bg-muted px-3 py-1">{sop.category}</span>
          <span>{new Date(sop.createdAt).toLocaleDateString("vi-VN")}</span>
        </div>
        <div className="flex gap-3 pt-2">
          <ShareButton token={sop.shareToken} />
          <Link href="/upload"><Button variant="outline">Tạo SOP khác</Button></Link>
        </div>
      </header>
      <section className="space-y-4">
        {sop.steps.map((s: any) => <StepCard key={s.index} {...s} />)}
      </section>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(ui): S4 SOP result with video-per-step cards and share button"
```

---

### Task 3.6: S6 Shared view

**Files:**
- Create: `src/app/share/[token]/page.tsx`

- [ ] **Step 1: Create**

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { StepCard } from "@/components/StepCard";
import { headers } from "next/headers";

async function getShared(token: string) {
  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const r = await fetch(`${base}/api/share/${token}`, { cache: "no-store" });
  if (!r.ok) return null;
  return r.json();
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sop = await getShared(token);
  if (!sop) return (
    <main className="max-w-lg mx-auto px-6 py-20 text-center space-y-4">
      <h1 className="text-2xl font-bold">Link không còn khả dụng</h1>
      <Link className="underline" href="/">Về trang chủ</Link>
    </main>
  );
  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div className="bg-muted/50 border rounded-md px-4 py-2 text-sm">SOP được chia sẻ — chỉ xem</div>
      <header>
        <h1 className="text-3xl font-bold">{sop.title}</h1>
        <p className="text-sm text-muted-foreground mt-2">{sop.category} · {new Date(sop.createdAt).toLocaleDateString("vi-VN")}</p>
      </header>
      <section className="space-y-4">
        {sop.steps.map((s: any) => <StepCard key={s.index} {...s} />)}
      </section>
      <footer className="text-center pt-8 text-sm text-muted-foreground">
        Tạo SOP của riêng bạn tại <Link href="/" className="underline">SOP.vn</Link>
      </footer>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(ui): S6 shared SOP view"
```

---

### Task 3.7: S7 Admin

**Files:**
- Create: `src/app/admin/page.tsx`

- [ ] **Step 1: Create**

```tsx
"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Admin() {
  const [pw, setPw] = useState("");
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    const r = await fetch("/api/admin/stats", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (!r.ok) { setErr("Sai mật khẩu"); return; }
    setData(await r.json());
  }

  if (!data) return (
    <main className="max-w-sm mx-auto px-6 py-20 space-y-4">
      <h1 className="text-xl font-semibold">Admin</h1>
      <Input type="password" placeholder="Mật khẩu" value={pw} onChange={e => setPw(e.target.value)} />
      {err && <p className="text-sm text-red-600">{err}</p>}
      <Button onClick={load} className="w-full">Đăng nhập</Button>
    </main>
  );

  const Row = ({ label, v }: { label: string; v: any }) => (
    <div className="grid grid-cols-4 gap-4 py-2 border-b text-sm">
      <div className="font-medium">{label}</div>
      <div>Uploads: {v.upload}</div>
      <div>SOPs: {v.sop_completed}</div>
      <div>Shares: {v.share_view}</div>
    </div>
  );
  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-4">
      <h1 className="text-2xl font-bold">Admin</h1>
      <div className="rounded-lg border p-4">
        <Row label="Hôm nay" v={data.today} />
        <Row label="7 ngày" v={data.last7d} />
        <Row label="Tổng" v={data.allTime} />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat(ui): S7 admin stats page with password gate"
```

---

## Phase 4 — Integration & Deploy

### Task 4.1: Deploy to Vercel

- [ ] **Step 1: Push to GitHub**

```bash
git remote -v
git push origin master
```

- [ ] **Step 2: Create Vercel project**

In Vercel dashboard: import repo, set all env vars from `.env.local.example` (fill real values). Deploy. Expected: first deploy succeeds.

- [ ] **Step 3: Deploy Trigger.dev**

```bash
npx trigger.dev@latest deploy
```
Expected: deploys the `process-sop` task.

---

### Task 4.2: End-to-end smoke test

- [ ] **Step 1: Record 1-minute Vietnamese video**

Phone-record a short coffee-making or cooking demo, narrate each step, export as MP4.

- [ ] **Step 2: Upload through live site**

Navigate to the Vercel URL → `/upload` → select video → submit. Expected: redirect to `/processing/:id`, stepper advances, then redirect to `/sop/:id` with ≥2 step cards, each with a playable clip.

- [ ] **Step 3: Test share**

Click "Chia sẻ link", open copied URL in incognito. Expected: `/share/:token` shows read-only view.

- [ ] **Step 4: Fix whatever broke**

Common first-run issues: fal.ai response shape mismatch (tweak `src/lib/fal.ts` mapping based on actual `result`), OpenRouter model id typo, R2 CORS on presigned PUT (add browser origin to bucket CORS).

- [ ] **Step 5: Commit fixes**

```bash
git add -A
git commit -m "fix: smoke-test adjustments"
git push
```

---

## Phase 5 — Cleanup Cron

### Task 5.1: Scheduled video-deletion task

**Files:**
- Create: `src/trigger/cleanupVideos.ts`

- [ ] **Step 1: Create**

```ts
import { schedules, logger } from "@trigger.dev/sdk/v3";
import { sops } from "@/lib/mongo";
import { deleteObject } from "@/lib/r2";

export const cleanupVideos = schedules.task({
  id: "cleanup-videos",
  cron: "0 3 * * *", // 03:00 UTC daily
  run: async () => {
    const col = await sops();
    const now = new Date();
    const expired = await col.find({ videoExpiresAt: { $lt: now }, videoR2Key: { $ne: null } }).toArray();
    for (const d of expired) {
      if (!d.videoR2Key) continue;
      try { await deleteObject(d.videoR2Key); }
      catch (e) { logger.warn("r2 delete failed", { key: d.videoR2Key, e: String(e) }); }
      await col.updateOne({ _id: d._id }, { $set: { videoR2Key: null, updatedAt: now } });
    }
    logger.info(`cleanup: processed ${expired.length} sops`);
  },
});
```

- [ ] **Step 2: Redeploy Trigger.dev**

```bash
npx trigger.dev@latest deploy
```

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(trigger): daily R2 video cleanup for expired sops"
git push
```

---

## Self-Review Checklist

After executing, verify every spec section is covered:

- ✅ S1–S4, S6, S7 screens — Tasks 3.2–3.7
- ✅ Data model (sops, events) — Tasks 0.3, 1.1 (insert shape), 2.1 (update shape)
- ✅ 5-stage AI pipeline — Tasks 2.1–2.6
- ✅ Timestamp-ID-only + code-resolved timestamps — `resolveTimes` in 2.6
- ✅ Structured output + one-retry — `llmJson` in 0.5, used by stages 2 & 4
- ✅ User-category-override skips Stage 3 — Task 2.4
- ✅ User-title-override — Task 2.1 (`finalTitle` selection)
- ✅ Signed-URL clip access — Task 1.6
- ✅ Video cap enforcement — Task 1.1 (size/mime), `resolveTimes` clamps to actual duration
- ✅ Retention cleanup — Task 5.1
- ✅ Analytics events — Tasks 1.2, 1.5, 2.1
- ✅ Admin password gate — Tasks 1.7, 3.7
- ✅ Central config — Task 0.2

---

## Execution Handoff

**Plan saved to** `docs/superpowers/plans/2026-04-24-sopvn-mvp-plan.md`.

**Two execution options:**

1. **Subagent-driven (recommended for autonomous run)** — fresh subagent per task, inter-task review. Fast, isolates failures.
2. **Inline execution** — run tasks here with batched checkpoints.

Given the user's "autonomous with a team" preference, option 1 maps best: spawn one subagent per task or per phase-track, gating on test/build success between batches.
