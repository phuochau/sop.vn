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
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { filename, sizeBytes, mimeType } = parsed.data;

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
    title: "",           // AI fills in Stage 4
    category: "",        // AI fills in Stage 3
    status: "uploading",
    errorCode: null,
    videoR2Key: key,
    videoExpiresAt,
    transcript: null,
    language: null,
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
