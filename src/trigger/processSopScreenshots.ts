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
import { runUploadScreenshots } from "./stages/uploadScreenshots";
import { buildScreenClusters } from "@/trigger/lib/screenId";
import { runExtractClickEvents } from "./stages/extractClickEvents";
import { runClassifyAndMergeEvents } from "./stages/classifyAndMergeEvents";
import { classifyAndRemap } from "./stages/classifyStepWithLLM";
import { buildActionsForStep } from "./stages/buildActionsForStep";
import { collapseDuplicateActions } from "./stages/collapseDuplicateActions";
import { highlightActions } from "./stages/highlightActions";
import { runWithCostTracking, withStage, recordCost } from "@/lib/aiCost";
import type { Action } from "@/lib/schemas";

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
    const { summary: aiCost } = await runWithCostTracking(() => runPipeline(_id));

    // Persist + log the AI cost of the run, even if the pipeline failed.
    try {
      await (await sops()).updateOne(
        { _id },
        { $set: { aiCost, updatedAt: new Date() } },
      );
    } catch (e) {
      logger.error("aiCost write failed", { e: String(e) });
    }
    logger.info("pipeline.cost", {
      sopId: _id.toHexString(),
      totalUSD: aiCost.totalUSD,
      exactUSD: aiCost.exactUSD,
      estimatedUSD: aiCost.estimatedUSD,
      callCount: aiCost.callCount,
      byStage: aiCost.byStage,
    });
  },
});

async function runPipeline(_id: ObjectId): Promise<void> {
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
    try {
      stage1 = await withStage("transcribe", async () => {
        const r = await runTranscribe(signedVideo);
        // fal/Whisper returns no cost field — estimate from audio duration.
        // Skip when there is no audio track (runTranscribe returns no
        // segments and nothing was actually transcribed).
        if (r.segments.length > 0) {
          recordCost({
            provider: "fal",
            model: "fal-ai/whisper",
            promptTokens: 0,
            completionTokens: 0,
            costUSD: (durationSec / 60) * config.costs.whisperPerMinuteUSD,
            estimated: true,
          });
        }
        return r;
      });
    }
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

    // The user's selected language on the upload form takes precedence over
    // Whisper's detected language for all natural-language output (titles,
    // step text, captions). Whisper-detected language is still used by
    // normalize so it cleans the transcript in its source language.
    const outputLanguage = doc.defaultLanguage ?? language!;

    // Stage 2: normalize (in source language).
    await setStatus(_id, "normalizing");
    const segmentsClean = await withStage("normalize", () => runNormalize(segments, language!));
    await (await sops()).updateOne({ _id }, { $set: { segmentsClean, updatedAt: new Date() } });

    // Stage 3: context.
    await setStatus(_id, "analyzing");
    const { category, domainSummary } = await withStage("context", () => runContext({
      cleanTranscript: segmentsClean.map(s => s.text).join(" "),
      language: outputLanguage,
    }));
    await (await sops()).updateOne({ _id }, { $set: { category, domainSummary, updatedAt: new Date() } });

    // Stage 4: extract step list.
    await setStatus(_id, "generating");
    let extracted;
    try { extracted = await withStage("extract", () => runExtract({ segmentsClean, category, domainSummary, language: outputLanguage })); }
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

      // Stage 6: detect click events, classify click-vs-input, merge typing.
      await setStatus(_id, "assigning");
      const stepInputs = resolved.map((rs, i) => ({
        stepIndex: i,
        title: rs.title,
        tStart: rs.startTime,
        tEnd: rs.endTime,
      }));

      let eventsByStep;
      try {
        eventsByStep = await runExtractClickEvents({
          steps: stepInputs.map(s => ({ stepIndex: s.stepIndex, tStart: s.tStart, tEnd: s.tEnd })),
          denseFrames: pool!.denseFrames,
          opts: config.screenshots.clickDetect,
          maxCandidatesPerStep: config.screenshots.clickDetect.maxCandidatesPerStep,
        });
      } catch (e) {
        logger.error("click detect failed", { e: String(e) });
        return fail(_id, "screenshot_pool_failed");
      }

      const rawCountByStep = [...eventsByStep.entries()].map(([s, evs]) => ({ stepIndex: s, count: evs.length }));
      logger.info("pipeline.click_events", {
        sopId: _id.toHexString(),
        totalRaw: rawCountByStep.reduce((n, x) => n + x.count, 0),
        byStep: rawCountByStep,
      });

      const merged = runClassifyAndMergeEvents({ byStep: eventsByStep });
      logger.info("pipeline.classify_merge", {
        sopId: _id.toHexString(),
        byStep: [...merged.entries()].map(([s, evs]) => ({
          stepIndex: s,
          count: evs.length,
          inputs: evs.filter(e => e.kindHint === "input").length,
          clicks: evs.filter(e => e.kindHint === "click").length,
        })),
      });

      // Stage 7: per-step LLM classification, dedup + assemble, highlight pass.
      const actionsByStep = new Map<number, Action[]>();
      try {
        for (const step of stepInputs) {
          const stepEvents = merged.get(step.stepIndex) ?? [];
          const clusters = await buildScreenClusters({
            denseFrames: pool!.denseFrames,
            stepStart: step.tStart,
            stepEnd: step.tEnd,
            samplingSec: config.screenshots.screenId.samplingSec,
            hammingThreshold: config.screenshots.screenId.hammingThreshold,
          });
          const classified = await withStage("classify", () => classifyAndRemap({
            stepTitle: step.title,
            language: outputLanguage,
            events: stepEvents,
            denseFrames: pool!.denseFrames,
          }));
          const assembled = buildActionsForStep({
            stepIndex: step.stepIndex,
            classified,
            screenClusters: clusters,
            eventTimes: stepEvents.map(e => e.time),
            viewMinDurationSec: config.screenshots.screenId.viewMinDurationSec,
            language: outputLanguage,
          });
          const actions = await collapseDuplicateActions({
            actions: assembled,
            gapSec: config.screenshots.classify.duplicateGapSec,
            hammingThreshold: config.screenshots.classify.duplicateHammingThreshold,
          });
          await withStage("highlight", () => highlightActions({ actions }));
          actionsByStep.set(step.stepIndex, actions);
        }
      } catch (e) {
        logger.error("screenshot classification failed", {
          e: String(e),
          stack: e instanceof Error ? e.stack : undefined,
        });
        return fail(_id, "generation_failed");
      }

      await setStatus(_id, "uploading-screenshots");
      const screenshotsByStep = await runUploadScreenshots({
        sopId: _id.toHexString(),
        byStep: actionsByStep,
      });

      // Compose step docs.
      const stepsOut: Step[] = resolved.map((rs, i) => {
        const ss = screenshotsByStep.get(i) ?? [];
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
}
