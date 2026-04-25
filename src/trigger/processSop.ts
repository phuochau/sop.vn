import { task, logger } from "@trigger.dev/sdk/v3";
import { ObjectId } from "mongodb";
import { sops, events, type ErrorCode, type SopStatus } from "@/lib/mongo";
import { config, type Category } from "@/config";
import { probeDuration } from "./lib/probe";
import { presignGet } from "@/lib/r2";
import { fetchSourceVideo } from "./lib/videoTmp";
import { hasUsableSpeech } from "./lib/branchDecision";
import { runTranscribe } from "./stages/transcribe";
import { runNormalize } from "./stages/normalize";
import { runContext } from "./stages/context";
import { runExtract } from "./stages/extract";
import { resolveTimes, runClip } from "./stages/clip";
import { runKeyframes } from "./stages/keyframes";
import { sampleFrames } from "./lib/sampleFrames";
import { runVisualContext } from "./stages/visualContext";
import { runVisualExtract } from "./stages/visualExtract";

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
    const defaultLanguage = doc.defaultLanguage ?? "vi";

    try {
      // Pre-stage: validate duration. Capture for downstream reuse.
      let durationSec: number;
      try {
        durationSec = await probeDuration(signedVideo);
        if (durationSec < config.limits.minVideoDurationSec) return fail(_id, "video_too_short");
        if (durationSec > config.limits.maxVideoDurationSec) return fail(_id, "video_too_long");
      } catch (e) {
        logger.error("probe failed", { e: String(e) });
        return fail(_id, "unknown");
      }

      // Stage 1: transcribe (non-fatal on no-audio / empty result)
      await setStatus(_id, "transcribing");
      let stage1;
      try {
        stage1 = await runTranscribe(signedVideo);
      } catch (e) {
        logger.error("transcribe failed", { e: String(e) });
        return fail(_id, "transcription_failed");
      }
      const { transcript, segments, language } = stage1;

      // Branch
      const useSpeech = hasUsableSpeech({ segments, transcript });
      const inputMode: "speech" | "silent" = useSpeech ? "speech" : "silent";
      logger.info("branch chosen", { inputMode });

      if (useSpeech) {
        // Invariant: hasUsableSpeech requires segments.length > 0, and fal.ts only returns
        // language: null when segments.length === 0. So language is non-null here.
        await (await sops()).updateOne(
          { _id },
          { $set: { transcript, segments, language, inputMode, updatedAt: new Date() } }
        );

        // Stage 2: normalize
        await setStatus(_id, "normalizing");
        const segmentsClean = await runNormalize(segments, language!);
        await (await sops()).updateOne({ _id }, { $set: { segmentsClean, updatedAt: new Date() } });

        // Stage 3: context
        await setStatus(_id, "analyzing");
        const { category, domainSummary } = await runContext({
          cleanTranscript: segmentsClean.map(s => s.text).join(" "),
          language: language!,
        });
        await (await sops()).updateOne(
          { _id },
          { $set: { category, domainSummary, updatedAt: new Date() } }
        );

        // Stage 4: extract
        await setStatus(_id, "generating");
        let extracted;
        try {
          extracted = await runExtract({ segmentsClean, category, language: language! });
        } catch (e) {
          logger.error("extract failed", { e: String(e) });
          return fail(_id, "generation_failed");
        }

        // Stage 5: clip + keyframes (caller owns srcPath)
        await setStatus(_id, "clipping", { title: extracted.title });
        let src;
        try { src = await fetchSourceVideo(doc.videoR2Key); }
        catch (e) { logger.error("source download failed", { e: String(e) }); return fail(_id, "video_download_failed"); }
        try {
          const resolved = resolveTimes(segments, extracted.steps, durationSec);
          let stepsOut;
          try {
            stepsOut = (await runClip({ sopId: _id.toHexString(), srcPath: src.srcPath, resolvedSteps: resolved })).steps;
          } catch (e) {
            logger.error("clip failed", { e: String(e) });
            return fail(_id, "clipping_failed");
          }
          try {
            stepsOut = await runKeyframes({ sopId: _id.toHexString(), srcPath: src.srcPath, steps: stepsOut });
          } catch (e) {
            logger.warn("keyframes failed; PDF export will fall back to posters", { e: String(e) });
            stepsOut = stepsOut.map(s => ({ ...s, keyframeR2Keys: [] }));
          }
          await (await sops()).updateOne(
            { _id },
            { $set: { steps: stepsOut, status: "done" as SopStatus, updatedAt: new Date() } }
          );
        } finally { await src.dispose(); }

        await (await events()).insertOne({
          _id: new ObjectId(), type: "sop_completed", sopId: _id, createdAt: new Date(),
        });
        return;
      }

      // ── Silent path ─────────────────────────────────────────────────────
      const tag = { inputMode };
      await (await sops()).updateOne(
        { _id },
        { $set: { transcript: "", segments: [], language: defaultLanguage, inputMode, updatedAt: new Date() } }
      );

      let src;
      try { src = await fetchSourceVideo(doc.videoR2Key); }
      catch (e) { logger.error("source download failed", { ...tag, e: String(e) }); return fail(_id, "video_download_failed"); }

      let ctxFrames: Awaited<ReturnType<typeof sampleFrames>> | null = null;
      let extFrames: Awaited<ReturnType<typeof sampleFrames>> | null = null;
      try {
        // Stage 3 (silent): visual context
        await setStatus(_id, "analyzing");
        try { ctxFrames = await sampleFrames(src.srcPath, durationSec, { mode: "fixed" }); }
        catch (e) { logger.error("frame sampling (context) failed", { ...tag, e: String(e) }); return fail(_id, "frame_sampling_failed"); }

        let category!: Category;
        let domainSummary!: string;
        try {
          const ctx = await runVisualContext({ framePaths: ctxFrames.paths, language: defaultLanguage });
          category = ctx.category;
          domainSummary = ctx.domainSummary;
        } catch (e) {
          logger.error("visual context failed", { ...tag, e: String(e) });
          return fail(_id, "visual_context_failed");
        }
        await (await sops()).updateOne(
          { _id },
          { $set: { category, domainSummary, updatedAt: new Date() } }
        );

        // Stage 4 (silent): visual extract
        await setStatus(_id, "generating");
        try { extFrames = await sampleFrames(src.srcPath, durationSec, { mode: "density" }); }
        catch (e) { logger.error("frame sampling (extract) failed", { ...tag, e: String(e) }); return fail(_id, "frame_sampling_failed"); }

        let extracted!: Awaited<ReturnType<typeof runVisualExtract>>;
        try {
          extracted = await runVisualExtract({
            framePaths: extFrames.paths,
            frameTimestamps: extFrames.timestamps,
            durationSec,
            category,
            language: defaultLanguage,
          });
        } catch (e) {
          logger.error("visual extract failed", { ...tag, e: String(e) });
          return fail(_id, "visual_extract_failed");
        }

        // Stage 5: clip + keyframes
        await setStatus(_id, "clipping", { title: extracted.title });
        let stepsOut!: Awaited<ReturnType<typeof runKeyframes>>;
        try {
          stepsOut = (await runClip({
            sopId: _id.toHexString(),
            srcPath: src.srcPath,
            resolvedSteps: extracted.steps,
          })).steps;
        } catch (e) {
          logger.error("clip failed", { ...tag, e: String(e) });
          return fail(_id, "clipping_failed");
        }
        try {
          stepsOut = await runKeyframes({ sopId: _id.toHexString(), srcPath: src.srcPath, steps: stepsOut });
        } catch (e) {
          logger.warn("keyframes failed; PDF export will fall back to posters", { ...tag, e: String(e) });
          stepsOut = stepsOut.map(s => ({ ...s, keyframeR2Keys: [] }));
        }
        await (await sops()).updateOne(
          { _id },
          { $set: { steps: stepsOut, status: "done" as SopStatus, updatedAt: new Date() } }
        );
        await (await events()).insertOne({
          _id: new ObjectId(), type: "sop_completed", sopId: _id, createdAt: new Date(),
        });
      } finally {
        if (ctxFrames) await ctxFrames.dispose();
        if (extFrames) await extFrames.dispose();
        await src.dispose();
      }
    } catch (e) {
      logger.error("processSop unhandled", { e: String(e) });
      await fail(_id, "unknown");
    }
  },
});
