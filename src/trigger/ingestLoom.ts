import { task, tasks, logger } from "@trigger.dev/sdk/v3";
import { ObjectId } from "mongodb";
import { sops, events, type SopStatus, type ErrorCode } from "@/lib/mongo";
import { resolveLoomMp4, streamLoomToR2, type StreamError } from "@/lib/loom";

export type Decision =
  | { action: "run" }
  | { action: "resume" }
  | { action: "noop" };

export function decideIngest(status: SopStatus, hasR2Object: boolean): Decision {
  if (status === "ingesting") return { action: "run" };
  if (status === "transcribing" && hasR2Object) return { action: "resume" };
  return { action: "noop" };
}

export function mapStreamErrorToCode(e: StreamError): ErrorCode {
  return e === "size_exceeded" ? "file_too_large" : "loom_ingest_failed";
}

async function logIngestError(
  sopId: ObjectId,
  errorCode: string,
  httpStatus?: number,
) {
  await (await events()).insertOne({
    _id: new ObjectId(),
    type: "loom_ingest_error",
    sopId,
    errorCode,
    httpStatus,
    createdAt: new Date(),
  });
}

async function failSop(sopId: ObjectId, errorCode: ErrorCode) {
  await (await sops()).updateOne(
    { _id: sopId },
    { $set: { status: "failed", errorCode, updatedAt: new Date() } },
  );
}

export const ingestLoom = task({
  id: "ingest-loom",
  maxDuration: 60 * 15,
  run: async (payload: { sopId: string }) => {
    const _id = new ObjectId(payload.sopId);
    const col = await sops();
    const doc = await col.findOne({ _id });
    if (!doc) { logger.error("ingestLoom: sop not found", { sopId: payload.sopId }); return; }
    if (!doc.videoId || !doc.videoR2Key) {
      logger.error("ingestLoom: missing videoId or videoR2Key", { sopId: payload.sopId });
      await failSop(_id, "loom_ingest_failed");
      return;
    }

    const decision = decideIngest(doc.status, Boolean(doc.videoSizeBytes));
    if (decision.action === "noop") {
      logger.info("ingestLoom: noop", { status: doc.status });
      return;
    }
    if (decision.action === "resume") {
      logger.info("ingestLoom: resuming process-sop trigger");
      await tasks.trigger(
        "process-sop",
        { sopId: payload.sopId },
        { idempotencyKey: `${payload.sopId}-process-sop` },
      );
      return;
    }

    const resolved = await resolveLoomMp4(doc.videoId);
    if (!resolved.ok) {
      await logIngestError(_id, resolved.error, resolved.httpStatus);
      await failSop(_id, "loom_ingest_failed");
      return;
    }

    const streamed = await streamLoomToR2({ mp4Url: resolved.mp4Url, r2Key: doc.videoR2Key });
    if (!streamed.ok) {
      await logIngestError(_id, streamed.error);
      await failSop(_id, mapStreamErrorToCode(streamed.error));
      return;
    }

    await col.updateOne(
      { _id },
      { $set: { status: "transcribing", videoSizeBytes: streamed.bytes, updatedAt: new Date() } },
    );

    await tasks.trigger(
      "process-sop",
      { sopId: payload.sopId },
      { idempotencyKey: `${payload.sopId}-process-sop` },
    );
  },
});
