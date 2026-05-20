import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";
import { sops } from "@/lib/mongo";
import { newShareToken, videoKey } from "@/lib/utils";
import { config } from "@/config";
import { parseLoomUrl } from "@/lib/loom";
import { OutputFormatChoice } from "@/lib/schemas";

const Body = z.object({
  url: z.string().min(1),
  defaultLanguage: z.enum(["vi", "en"]).default("vi"),
  outputFormat: OutputFormatChoice.default("auto"),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const loom = parseLoomUrl(parsed.data.url);
  if (!loom) return NextResponse.json({ error: "invalid_url" }, { status: 400 });

  const _id = new ObjectId();
  const key = videoKey(_id.toHexString(), "mp4");
  const now = new Date();
  const videoExpiresAt = new Date(now.getTime() + config.retention.videoRetentionDays * 86400_000);

  await (await sops()).insertOne({
    _id,
    title: "",
    category: "",
    status: "ingesting",
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
    defaultLanguage: parsed.data.defaultLanguage,
    outputFormat: parsed.data.outputFormat,
    sourceType: "loom",
    sourceUrl: parsed.data.url,
    videoId: loom.videoId,
    createdAt: now,
    updatedAt: now,
  });

  await tasks.trigger("ingest-loom", { sopId: _id.toHexString() });

  return NextResponse.json({ sopId: _id.toHexString() });
}
