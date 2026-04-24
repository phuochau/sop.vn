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
