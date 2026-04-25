import { task, logger } from "@trigger.dev/sdk/v3";
import { ObjectId } from "mongodb";
import { sops, events, type ErrorCode, type SopStatus } from "@/lib/mongo";
import { presignGet } from "@/lib/r2";
import { config } from "@/config";
import { probeDuration } from "./lib/probe";
import { runTranscribe } from "./stages/transcribe";
import { runNormalize } from "./stages/normalize";
import { runContext } from "./stages/context";
import { runExtract } from "./stages/extract";
import { runClip } from "./stages/clip";
import { runKeyframes } from "./stages/keyframes";

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
      // Pre-stage: validate duration
      try {
        const duration = await probeDuration(signedVideo);
        if (duration < config.limits.minVideoDurationSec) return fail(_id, "video_too_short");
        if (duration > config.limits.maxVideoDurationSec) return fail(_id, "video_too_long");
      } catch (e) {
        logger.error("probe failed", { e: String(e) });
        return fail(_id, "unknown");
      }

      // Stage 1
      await setStatus(_id, "transcribing");
      let stage1;
      try {
        stage1 = await runTranscribe(signedVideo);
      } catch (e) {
        const msg = String(e);
        logger.error("transcribe failed", { e: msg });
        if (msg.includes("NO_AUDIO_STREAM")) return fail(_id, "silent_audio");
        return fail(_id, "transcription_failed");
      }
      const { transcript, segments, language } = stage1;
      if (segments.length === 0) return fail(_id, "silent_audio");
      await (await sops()).updateOne({ _id }, { $set: { transcript, segments, language, updatedAt: new Date() } });

      // Stage 2
      await setStatus(_id, "normalizing");
      const segmentsClean = await runNormalize(segments, language);
      await (await sops()).updateOne({ _id }, { $set: { segmentsClean, updatedAt: new Date() } });

      // Stage 3 — always AI-detect category
      await setStatus(_id, "analyzing");
      const { category, domainSummary } = await runContext({
        cleanTranscript: segmentsClean.map(s => s.text).join(" "),
        language,
      });
      await (await sops()).updateOne(
        { _id },
        { $set: { category, domainSummary, updatedAt: new Date() } }
      );

      // Stage 4
      await setStatus(_id, "generating");
      let extracted;
      try {
        extracted = await runExtract({ segmentsClean, category, language });
      } catch (e) {
        logger.error("extract failed", { e: String(e) });
        return fail(_id, "generation_failed");
      }

      // Stage 5
      await setStatus(_id, "clipping", { title: extracted.title });
      let steps;
      let disposeSrc: (() => Promise<void>) | null = null;
      let srcPath: string | null = null;
      try {
        const clipResult = await runClip({
          sopId: _id.toHexString(),
          videoR2Key: doc.videoR2Key,
          rawSegments: segments,
          extractedSteps: extracted.steps,
        });
        steps = clipResult.steps;
        srcPath = clipResult.srcPath;
        disposeSrc = clipResult.disposeSrc;
      } catch (e) {
        logger.error("clip failed", { e: String(e) });
        return fail(_id, "clipping_failed");
      }

      // Stage 5b — extract 3 keyframes per step (non-fatal on failure)
      try {
        steps = await runKeyframes({
          sopId: _id.toHexString(),
          srcPath: srcPath!,
          steps,
        });
      } catch (e) {
        logger.warn("keyframes failed; PDF export will fall back to posters", { e: String(e) });
        steps = steps.map(s => ({ ...s, keyframeR2Keys: [] }));
      } finally {
        if (disposeSrc) {
          try { await disposeSrc(); } catch (e) { logger.warn("failed to dispose source video tmp", { e: String(e) }); }
        }
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
