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
import { buildScreenClusters, clusterFor, selectInClusterFrame } from "@/trigger/lib/screenId";
import { assembleStepNarration, silentStepFallback, hasLocalizedViewCaption } from "@/trigger/lib/narration";
import { runPlanStep } from "./stages/planStep";
import { runPickFrame, computeSearchWindow } from "./stages/pickFrame";
import { runVerifyFrame } from "./stages/verifyFrame";
import { runLocateHighlight } from "./stages/locateHighlight";
import { buildAction } from "./stages/buildAction";
import { runWithConcurrency } from "@/lib/concurrency";
import { traceEnabled, persistTrace, makeTrace, persistStepPlanTrace, makeStepPlanTrace, type ClusterSnapshot, type RawSubStepSnapshot } from "@/lib/pipelineTrace";
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

      // The user's selected language on the upload form takes precedence over
      // Whisper's detected language for all natural-language output (titles,
      // step text, captions). Whisper-detected language is still used by
      // normalize so it cleans the transcript in its source language.
      const outputLanguage = doc.defaultLanguage ?? language!;

      // Stage 2: normalize (in source language).
      await setStatus(_id, "normalizing");
      const segmentsClean = await runNormalize(segments, language!);
      await (await sops()).updateOne({ _id }, { $set: { segmentsClean, updatedAt: new Date() } });

      // Stage 3: context.
      await setStatus(_id, "analyzing");
      const { category, domainSummary } = await runContext({
        cleanTranscript: segmentsClean.map(s => s.text).join(" "),
        language: outputLanguage,
      });
      await (await sops()).updateOne({ _id }, { $set: { category, domainSummary, updatedAt: new Date() } });

      // Stage 4: extract step list.
      await setStatus(_id, "generating");
      let extracted;
      try { extracted = await runExtract({ segmentsClean, category, domainSummary, language: outputLanguage }); }
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

        await setStatus(_id, "assigning");
        // `resolved` (from resolveTimes) only carries times. The original segment IDs
        // are on `extracted.steps[i]`. Pair them by index.
        const stepInputs = resolved.map((rs, i) => {
          const src = extracted.steps[i];
          const narration = assembleStepNarration(
            { startSegmentId: src.startSegmentId, endSegmentId: src.endSegmentId },
            segments,
            segmentsClean,
          );
          const tStart = narration.length > 0 ? Math.min(...narration.map(n => n.start)) : rs.startTime;
          const tEnd = narration.length > 0 ? Math.max(...narration.map(n => n.end)) : rs.endTime;
          return {
            stepIndex: i,
            title: rs.title,
            description: rs.description,
            tStart,
            tEnd,
            narration,
          };
        });

        const actionsByStep = new Map<number, Action[]>();
        const perStepConcurrency = config.screenshots.classify.perStepConcurrency;

        try {
          await runWithConcurrency(stepInputs, perStepConcurrency, async (step) => {
            const clusters = await buildScreenClusters({
              denseFrames: pool!.denseFrames,
              stepStart: step.tStart,
              stepEnd: step.tEnd,
              samplingSec: config.screenshots.screenId.samplingSec,
              hammingThreshold: config.screenshots.screenId.hammingThreshold,
            });

            let plan;
            if (step.narration.length === 0) {
              if (!hasLocalizedViewCaption(outputLanguage)) {
                logger.warn("pipeline.silent_step.unlocalized_caption", { stepIndex: step.stepIndex, language: outputLanguage });
              }
              plan = silentStepFallback(clusters, { stepIndex: step.stepIndex }, config.screenshots.screenId.viewMinDurationSec, outputLanguage);
            } else {
              try {
                plan = await runPlanStep({
                  stepIndex: step.stepIndex,
                  stepTitle: step.title,
                  stepDescription: step.description,
                  narration: step.narration,
                  clusters,
                  language: outputLanguage,
                  onTrace: traceEnabled() ? async (info) => {
                    const clusterSnapshots: ClusterSnapshot[] = clusters.map(c => ({
                      letter: c.letter,
                      start: c.timeSpan.start,
                      end: c.timeSpan.end,
                      representativeT: c.representative.t,
                      memberCount: c.members.length,
                    }));
                    const toSnap = (p: typeof info.rawPlan): RawSubStepSnapshot[] => p.subSteps.map(s => ({
                      intent: s.intent,
                      verb: s.verb,
                      visualConfidence: s.visualConfidence,
                      narrationSegmentIds: [...s.narrationSegmentIds],
                      timeWindow: s.timeWindow,
                    }));
                    await persistStepPlanTrace(makeStepPlanTrace({
                      sopId: _id.toHexString(),
                      stepIndex: step.stepIndex,
                      stepTitle: step.title,
                      stepWindow: { start: step.tStart, end: step.tEnd },
                      narrationSegmentCount: step.narration.length,
                      clusters: clusterSnapshots,
                      rawPlan: toSnap(info.rawPlan),
                      filteredPlan: toSnap(info.filteredPlan),
                      drops: info.drops,
                      repairUsed: info.repairUsed,
                      rawRepairPlan: info.rawRepairPlan ? toSnap(info.rawRepairPlan) : null,
                    }));
                  } : undefined,
                });
              } catch (e) {
                logger.error("plan failed", { stepIndex: step.stepIndex, e: String(e) });
                throw new Error("plan_failed");
              }
            }

            const actions: Action[] = [];
            for (const subStep of plan.subSteps) {
              const { pick, shortlist } = await runPickFrame({
                subStep,
                narration: step.narration,
                step: { stepIndex: step.stepIndex, tStart: step.tStart, tEnd: step.tEnd },
                clusters,
                language: outputLanguage,
              });
              if (pick.picked === null) {
                if (traceEnabled()) {
                  await persistTrace(makeTrace({
                    sopId: _id.toHexString(),
                    stepIndex: step.stepIndex,
                    intent: subStep.intent,
                    pickedLetter: null,
                    runnerUpLetter: pick.runnerUp,
                    pickerReasoning: pick.reasoning,
                    verifyMatch: "skipped",
                    verifyReasoning: "",
                    highlightOutcome: "skipped",
                    finalActionRecorded: false,
                    droppedAt: "pick",
                  }));
                }
                continue;
              }

              const pickedCluster = clusterFor(pick.picked, shortlist);
              const runnerCluster = clusterFor(pick.runnerUp, shortlist);
              if (!pickedCluster) continue;

              const window = computeSearchWindow(subStep, step.narration, step);
              const pickedFrame = selectInClusterFrame(pickedCluster, window);
              const runnerFrame = runnerCluster ? selectInClusterFrame(runnerCluster, window) : null;

              const { verify, finalFramePath } = await runVerifyFrame({
                intent: subStep.intent,
                verb: subStep.verb,
                pickedFramePath: pickedFrame.localPath,
                runnerUpFramePath: runnerFrame?.localPath ?? null,
                pickerReasoning: pick.reasoning,
                language: outputLanguage,
                stepIndex: step.stepIndex,
              });
              if (finalFramePath === null) {
                if (traceEnabled()) {
                  await persistTrace(makeTrace({
                    sopId: _id.toHexString(),
                    stepIndex: step.stepIndex,
                    intent: subStep.intent,
                    pickedLetter: pick.picked,
                    runnerUpLetter: pick.runnerUp,
                    pickerReasoning: pick.reasoning,
                    verifyMatch: verify.match,
                    verifyReasoning: verify.reasoning,
                    highlightOutcome: "skipped",
                    finalActionRecorded: false,
                    droppedAt: "verify",
                  }));
                }
                continue;
              }

              const finalFrameTime = finalFramePath === runnerFrame?.localPath ? runnerFrame.t : pickedFrame.t;

              const highlight = await runLocateHighlight({
                intent: subStep.intent,
                verb: subStep.verb,
                framePath: finalFramePath,
                language: outputLanguage,
              });

              if (traceEnabled()) {
                await persistTrace(makeTrace({
                  sopId: _id.toHexString(),
                  stepIndex: step.stepIndex,
                  intent: subStep.intent,
                  pickedLetter: pick.picked,
                  runnerUpLetter: pick.runnerUp,
                  pickerReasoning: pick.reasoning,
                  verifyMatch: verify.match,
                  verifyReasoning: verify.reasoning,
                  highlightOutcome: highlight.highlight,
                  finalActionRecorded: true,
                  droppedAt: "none",
                }));
              }

              actions.push(buildAction({
                stepIndex: step.stepIndex,
                order: actions.length,
                subStep,
                verify,
                highlight,
                framePath: finalFramePath,
                frameTime: finalFrameTime,
                pickedClusterLetter: pick.picked,
              }));
            }
            actionsByStep.set(step.stepIndex, actions);
          });
        } catch (e) {
          if (e instanceof Error && e.message === "plan_failed") return fail(_id, "plan_failed");
          logger.error("screenshot pipeline failed", { e: String(e) });
          return fail(_id, "unknown");
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
  },
});
