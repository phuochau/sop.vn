import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import path from "node:path";
import { sops, events } from "@/lib/mongo";
import { tasks, logger } from "@trigger.dev/sdk/v3";
import { OutputFormatChoice } from "@/lib/schemas";
import { presignGet } from "@/lib/r2";
import { probeSourceFromUrl, type SourceMetadata } from "@/lib/probeSource";

const Body = z.object({
  sopId: z.string().length(24),
  defaultLanguage: z.enum(["vi", "en"]).default("vi"),
  outputFormat: OutputFormatChoice.default("auto"),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const _id = new ObjectId(parsed.data.sopId);

  const col = await sops();
  const before = await col.findOneAndUpdate(
    { _id, status: "uploading" },
    { $set: {
        status: "transcribing",
        defaultLanguage: parsed.data.defaultLanguage,
        outputFormat: parsed.data.outputFormat,
        updatedAt: new Date(),
    } },
    { returnDocument: "before" },
  );
  if (!before) return NextResponse.json({ error: "not_found_or_wrong_state" }, { status: 404 });

  let source: SourceMetadata | undefined;
  if (before.videoR2Key) {
    try {
      const signedUrl = await presignGet(before.videoR2Key);
      const ext = path.extname(before.videoR2Key).replace(/^\./, "").toLowerCase() || "mp4";
      source = await probeSourceFromUrl(signedUrl, ext);
    } catch (e) {
      logger.warn("upload/commit: probeSource failed; continuing without source meta", {
        sopId: parsed.data.sopId, error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  if (source) {
    await col.updateOne(
      { _id },
      { $set: { source, videoSizeBytes: source.sizeBytes, updatedAt: new Date() } },
    );
  }

  await (await events()).insertOne({
    _id: new ObjectId(), type: "upload", sopId: _id, createdAt: new Date(),
  });

  await tasks.trigger("process-sop-screenshots", { sopId: _id.toHexString() });
  return NextResponse.json({ ok: true });
}
