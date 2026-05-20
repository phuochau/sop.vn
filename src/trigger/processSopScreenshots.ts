import { task, logger } from "@trigger.dev/sdk/v3";
import { ObjectId } from "mongodb";
import { sops, events, type ErrorCode, type SopStatus, type Step, type Screenshot } from "@/lib/mongo";
import { config } from "@/config";
import { probeDuration } from "./lib/probe";
import { presignGet } from "@/lib/r2";
import { fetchSourceVideo } from "./lib/videoTmp";
import { sampleFrames } from "./lib/sampleFrames";
import { hasUsableSpeech } from "./lib/branchDecision";
import { runAnalyzeVideo, decideAppGate } from "./stages/analyzeVideo";
import { runTranscribe } from "./stages/transcribe";
import { runNormalize } from "./stages/normalize";
import { runExtract } from "./stages/extract";
import { runVisualExtract } from "./stages/visualExtract";
import { resolveTimes } from "./stages/resolveTimes";
import { runBuildFramePool } from "./stages/buildFramePool";
import { runUploadScreenshots } from "./stages/uploadScreenshots";
import { runExtractClips } from "./stages/extractClips";
import { runUploadClips, composeClipSteps } from "./stages/uploadClips";
import { buildScreenClusters } from "@/trigger/lib/screenId";
import { runExtractClickEvents } from "./stages/extractClickEvents";
import { runClassifyAndMergeEvents } from "./stages/classifyAndMergeEvents";
import { classifyAndRemap } from "./stages/classifyStepWithLLM";
import { canonicalizeActions } from "./stages/canonicalizeActions";
import { buildActionsForStep } from "./stages/buildActionsForStep";
import { collapseDuplicateActions } from "./stages/collapseDuplicateActions";
import { highlightActions } from "./stages/highlightActions";
import { runWithCostTracking, withStage, recordCost } from "@/lib/aiCost";
import { resolveOutputFormat, type GatedAppType } from "@/lib/outputFormat";
import type { Action } from "@/lib/schemas";

type ResolvedStep = { title: string; description: string; startTime: number; endTime: number };

async function setStatus(id: ObjectId, status: SopStatus, extra: Record<string, unknown> = {}) {
  await (await sops()).updateOne({ _id: id }, { $set: { status, updatedAt: new Date(), ...extra } });
}
async function fail(id: ObjectId, errorCode: ErrorCode) {
  await (await sops()).updateOne({ _id: id }, { $set: { status: "failed", errorCode, updatedAt: new Date() } });
}

export const processSopScreenshots = task({
  id: "process-sop-screenshots",
  maxDuration: 60 * 40,
  run: async (payload: { sopId: string }) => {
    const _id = new ObjectId(payload.sopId);
    const { summary: aiCost } = await runWithCostTracking(() => runPipeline(_id));

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
  const defaultLanguage = doc.defaultLanguage ?? "vi";

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

    // Download the source video once — Stage 0, the silent head, and the
    // frame pool all read from it.
    let src;
    try { src = await fetchSourceVideo(doc.videoR2Key); }
    catch (e) { logger.error("source download failed", { e: String(e) }); return fail(_id, "video_download_failed"); }

    let pool: Awaited<ReturnType<typeof runBuildFramePool>> | undefined;
      let clipDispose: (() => Promise<void>) | undefined;
    try {
      // Stage 0: analyze video — app-recording gate + category/domainSummary.
      await setStatus(_id, "analyzing");
      let analysis;
      try {
        analysis = await withStage("analyze", () => runAnalyzeVideo({
          srcPath: src.srcPath,
          durationSec,
          language: defaultLanguage,
        }));
      } catch (e) {
        logger.error("analyze failed", { e: String(e) });
        return fail(_id, "analysis_failed");
      }
      if (analysis.appType === "none") {
        logger.info("rejected: not a usable recording", {
          sopId: _id.toHexString(),
          appUIFrameCount: analysis.appUIFrameCount,
          totalFrames: analysis.totalFrames,
        });
        return fail(_id, "not_an_app");
      }
      const isPhysical = analysis.appType === "physical";
      if (!isPhysical && !decideAppGate(analysis.appUIFrameCount, analysis.totalFrames)) {
        logger.info("rejected: not an app recording", {
          sopId: _id.toHexString(),
          appUIFrameCount: analysis.appUIFrameCount,
          totalFrames: analysis.totalFrames,
        });
        return fail(_id, "not_an_app");
      }
      const { category, domainSummary, appType, industry } = analysis;
      const userChoice = doc.outputFormat ?? "auto";
      const { effective: effectiveOutputFormat, coerced: outputFormatCoerced } =
        resolveOutputFormat(userChoice, appType as GatedAppType);
      await (await sops()).updateOne(
        { _id },
        { $set: {
            category, domainSummary, appType, industry,
            effectiveOutputFormat,
            ...(outputFormatCoerced ? { outputFormatCoerced } : {}),
            updatedAt: new Date(),
        } },
      );

      // Stage 1: transcribe (always run).
      await setStatus(_id, "transcribing");
      let stage1;
      try {
        stage1 = await withStage("transcribe", async () => {
          const r = await runTranscribe(signedVideo);
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

      // Branch on usable speech (not on the presence of an audio track —
      // a silent video may still carry music or UI sounds).
      const useSpeech = hasUsableSpeech({ segments, transcript });
      const inputMode: "speech" | "silent" = useSpeech ? "speech" : "silent";
      logger.info("branch chosen", { sopId: _id.toHexString(), inputMode });

      let title: string;
      let resolved: ResolvedStep[];
      let outputLanguage: string;

      if (useSpeech) {
        // Narrated: trust Whisper's detected language for all output.
        outputLanguage = language!;
        await (await sops()).updateOne(
          { _id },
          { $set: { transcript, segments, language, inputMode, updatedAt: new Date() } },
        );

        // Stage 2: normalize (in source language).
        await setStatus(_id, "normalizing");
        const segmentsClean = await withStage("normalize", () => runNormalize(segments, language!));
        await (await sops()).updateOne({ _id }, { $set: { segmentsClean, updatedAt: new Date() } });

        // Stage 3: extract step list from the transcript.
        await setStatus(_id, "generating");
        let extracted;
        try { extracted = await withStage("extract", () => runExtract({ segmentsClean, category, domainSummary, language: outputLanguage })); }
        catch (e) { logger.error("extract failed", { e: String(e) }); return fail(_id, "generation_failed"); }
        title = extracted.title;
        resolved = resolveTimes(segments, extracted.steps, durationSec);
      } else {
        // Silent: no transcript — use the upload-form default language.
        outputLanguage = defaultLanguage;
        await (await sops()).updateOne(
          { _id },
          { $set: { transcript: "", segments: [], language: outputLanguage, inputMode, updatedAt: new Date() } },
        );

        // Stage 3 (silent): extract step list from sampled frames.
        await setStatus(_id, "generating");
        let extFrames: Awaited<ReturnType<typeof sampleFrames>> | null = null;
        try {
          try { extFrames = await sampleFrames(src.srcPath, durationSec, { mode: "density" }); }
          catch (e) { logger.error("frame sampling failed", { e: String(e) }); return fail(_id, "frame_sampling_failed"); }
          let extracted;
          try {
            extracted = await withStage("visual-extract", () => runVisualExtract({
              framePaths: extFrames!.paths,
              frameTimestamps: extFrames!.timestamps,
              durationSec,
              category,
              domainSummary,
              language: outputLanguage,
            }));
          } catch (e) { logger.error("visual extract failed", { e: String(e) }); return fail(_id, "visual_extract_failed"); }
          title = extracted.title;
          resolved = extracted.steps;
        } finally {
          if (extFrames) await extFrames.dispose();
        }
      }

      if (effectiveOutputFormat === "clips") {
        // Physical path: extract one clip per step, upload, compose.
        await setStatus(_id, "building-clips", { title });
        let extracted;
        try {
          extracted = await runExtractClips({
            srcPath: src.srcPath,
            steps: resolved.map(r => ({ startTime: r.startTime, endTime: r.endTime })),
          });
          clipDispose = extracted.dispose;
        } catch (e) {
          logger.error("clip extraction failed", { e: String(e) });
          return fail(_id, "clip_extract_failed");
        }

        await setStatus(_id, "uploading-clips");
        const clipsByStep = await runUploadClips({
          sopId: _id.toHexString(),
          clips: extracted.clips,
        });

        const stepsOut: Step[] = composeClipSteps(resolved, clipsByStep);

        await (await sops()).updateOne(
          { _id },
          { $set: { title, steps: stepsOut, status: "done" as SopStatus, updatedAt: new Date() } },
        );
        await (await events()).insertOne({
          _id: new ObjectId(), type: "sop_completed", sopId: _id, createdAt: new Date(),
        });
      } else {
      // Stage 4: build frame pool.
      await setStatus(_id, "building-pool", { title });
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

      // Stage 5: detect click events, classify click-vs-input, merge typing.
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
          denseFrames: pool.denseFrames,
          opts: config.screenshots.clickDetect,
          maxCandidatesPerStep: config.screenshots.clickDetect.maxCandidatesPerStep,
        });
      } catch (e) {
        logger.error("click detect failed", { e: String(e) });
        return fail(_id, "click_detect_failed");
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

      // Stage 6: per-step LLM classification, dedup + assemble, highlight pass.
      const actionsByStep = new Map<number, Action[]>();
      try {
        for (const step of stepInputs) {
          const stepEvents = merged.get(step.stepIndex) ?? [];
          const clusters = await buildScreenClusters({
            denseFrames: pool.denseFrames,
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
          const canonical = await withStage("canonicalize", () => canonicalizeActions({
            classified,
            language: outputLanguage,
          }));
          const assembled = buildActionsForStep({
            stepIndex: step.stepIndex,
            classified: canonical,
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
          screenshots: ss as Screenshot[],
        };
        return base;
      });

      await (await sops()).updateOne(
        { _id },
        { $set: { title, steps: stepsOut, status: "done" as SopStatus, updatedAt: new Date() } },
      );
      await (await events()).insertOne({
        _id: new ObjectId(), type: "sop_completed", sopId: _id, createdAt: new Date(),
      });
      }
    } finally {
      if (pool) await pool.dispose();
      if (clipDispose) await clipDispose();
      await src.dispose();
    }
  } catch (e) {
    logger.error("processSopScreenshots unhandled", { e: String(e) });
    await fail(_id, "unknown");
  }
}
