import { task, logger } from "@trigger.dev/sdk/v3";
import { ObjectId } from "mongodb";
import { sops, events, type ErrorCode, type SopStatus, type Step, type Screenshot } from "@/lib/mongo";
import { config } from "@/config";
import { probeDuration } from "./lib/probe";
import { presignGet } from "@/lib/r2";
import { fetchSourceVideo } from "./lib/videoTmp";
import { hasUsableSpeech } from "./lib/branchDecision";
import { runTranscribe } from "./stages/transcribe";
import { runNormalize } from "./stages/normalize";
import { runContext } from "./stages/context";
import { runExtract } from "./stages/extract";
import { resolveTimes } from "./stages/clip";
import { runBuildFramePool } from "./stages/buildFramePool";
import { runAssignScreenshots, type StepInput } from "./stages/assignScreenshots";
import { runUploadScreenshots } from "./stages/uploadScreenshots";

async function setStatus(id: ObjectId, status: SopStatus, extra: Record<string, unknown> = {}) {
  await (await sops()).updateOne({ _id: id }, { $set: { status, updatedAt: new Date(), ...extra } });
}
async function fail(id: ObjectId, errorCode: ErrorCode) {
  await (await sops()).updateOne({ _id: id }, { $set: { status: "failed", errorCode, updatedAt: new Date() } });
}

export const processSopScreenshots = task({
  id: "process-sop-screenshots",
  maxDuration: 60 * 15,
  run: async (payload: { sopId: string }) => {
    const _id = new ObjectId(payload.sopId);
    const doc = await (await sops()).findOne({ _id });
    if (!doc || !doc.videoR2Key) { logger.error("sop not found"); return; }

    const signedVideo = await presignGet(doc.videoR2Key, 3600);

    try {
      // Pre-stage: duration probe.
      let durationSec: number;
      try {
        durationSec = await probeDuration(signedVideo);
        if (durationSec < config.limits.minVideoDurationSec) return fail(_id, "video_too_short");
        if (durationSec > config.limits.maxVideoDurationSec) return fail(_id, "video_too_long");
      } catch (e) {
        logger.error("probe failed", { e: String(e) });
        return fail(_id, "unknown");
      }

      // Stage 1: transcribe.
      await setStatus(_id, "transcribing");
      let stage1;
      try { stage1 = await runTranscribe(signedVideo); }
      catch (e) { logger.error("transcribe failed", { e: String(e) }); return fail(_id, "transcription_failed"); }
      const { transcript, segments, language } = stage1;

      // POC scope: speech-path only.
      if (!hasUsableSpeech({ segments, transcript })) {
        logger.error("screenshot pipeline: silent path not supported in POC");
        return fail(_id, "transcription_failed");
      }
      const inputMode = "speech" as const;
      await (await sops()).updateOne(
        { _id },
        { $set: { transcript, segments, language, inputMode, updatedAt: new Date() } },
      );

      // Stage 2: normalize.
      await setStatus(_id, "normalizing");
      const segmentsClean = await runNormalize(segments, language!);
      await (await sops()).updateOne({ _id }, { $set: { segmentsClean, updatedAt: new Date() } });

      // Stage 3: context.
      await setStatus(_id, "analyzing");
      const { category, domainSummary } = await runContext({
        cleanTranscript: segmentsClean.map(s => s.text).join(" "),
        language: language!,
      });
      await (await sops()).updateOne({ _id }, { $set: { category, domainSummary, updatedAt: new Date() } });

      // Stage 4: extract step list.
      await setStatus(_id, "generating");
      let extracted;
      try { extracted = await runExtract({ segmentsClean, category, domainSummary, language: language! }); }
      catch (e) { logger.error("extract failed", { e: String(e) }); return fail(_id, "generation_failed"); }

      const resolved = resolveTimes(segments, extracted.steps, durationSec);

      // Stage 5: build frame pool.
      await setStatus(_id, "building-pool", { title: extracted.title });
      let src;
      try { src = await fetchSourceVideo(doc.videoR2Key); }
      catch (e) { logger.error("source download failed", { e: String(e) }); return fail(_id, "video_download_failed"); }

      let pool;
      try {
        try {
          pool = await runBuildFramePool({
            srcPath: src.srcPath,
            sampleFps: config.screenshots.sampleFps,
            filter: {
              motionHammingThreshold: config.screenshots.motionHammingThreshold,
              dedupHammingThreshold: config.screenshots.dedupHammingThreshold,
              dedupWindowSeconds: config.screenshots.dedupWindowSeconds,
              maxPoolSize: config.screenshots.maxPoolSize,
            },
          });
        } catch (e) {
          logger.error("frame pool failed", { e: String(e) });
          return fail(_id, "screenshot_pool_failed");
        }

        // Stage 6: assign per step (LLM).
        await setStatus(_id, "assigning");
        const stepInputs: StepInput[] = resolved.map((rs, i) => ({
          stepIndex: i,
          title: rs.title,
          narration: rs.description,
          tStart: rs.startTime,
          tEnd: rs.endTime,
        }));
        const assignment = await runAssignScreenshots({
          steps: stepInputs,
          pool: pool.frames,
          language: language!,
        });

        // Stage 7: upload selected frames to R2.
        await setStatus(_id, "uploading-screenshots");
        const screenshotsByStep = await runUploadScreenshots({
          sopId: _id.toHexString(),
          byStep: assignment.byStep,
          pool: pool.frames,
        });

        // Compose step docs. Clip-mode fields populated with empty placeholders.
        const stepsOut: Step[] = resolved.map((rs, i) => {
          const ss = screenshotsByStep.get(i) ?? [];
          const errMsg = assignment.errors.get(i);
          const base: Step = {
            title: rs.title,
            description: rs.description,
            startTime: rs.startTime,
            endTime: rs.endTime,
            clipR2Key: "",
            posterR2Key: "",
            keyframeR2Keys: [],
            screenshots: ss as Screenshot[],
          };
          if (errMsg) base.screenshotsError = errMsg;
          return base;
        });

        await (await sops()).updateOne(
          { _id },
          { $set: { title: extracted.title, steps: stepsOut, mode: "screenshots", status: "done" as SopStatus, updatedAt: new Date() } },
        );
        await (await events()).insertOne({
          _id: new ObjectId(), type: "sop_completed", sopId: _id, createdAt: new Date(),
        });
      } finally {
        if (pool) await pool.dispose();
        await src.dispose();
      }
    } catch (e) {
      logger.error("processSopScreenshots unhandled", { e: String(e) });
      await fail(_id, "unknown");
    }
  },
});
