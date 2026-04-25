import { task, logger } from "@trigger.dev/sdk/v3";
import { ObjectId } from "mongodb";
import { sops, type SopDoc } from "@/lib/mongo";
import { presignGet, putObject, deleteObject } from "@/lib/r2";
import { pdfKey } from "@/lib/utils";
import { runSynthesizeOverview, type Overview } from "./stages/synthesizeOverview";
import { runSynthesizeStep, sliceTranscriptByTime, type StepRewrite } from "./stages/synthesizeStep";
import { runVisualOverview } from "./stages/visualOverview";
import { runVisualStep } from "./stages/visualStep";
import { fetchSourceVideo } from "./lib/videoTmp";
import { renderSopPdf, type RenderInput } from "./stages/renderPdf";

async function fetchR2Buffer(key: string): Promise<Buffer> {
  const url = await presignGet(key, 600);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${key}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function setPdfState(id: ObjectId, patch: Record<string, unknown>) {
  const $set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) $set[`pdf.${k}`] = v;
  await (await sops()).updateOne({ _id: id }, { $set });
}

async function loadOverviewSafely(doc: SopDoc): Promise<Overview | null> {
  if (!doc.transcript) return null;
  try {
    return await runSynthesizeOverview({
      title: doc.title,
      category: doc.category,
      transcript: doc.transcript,
      stepTitles: doc.steps.map(s => s.title),
      language: doc.language ?? "vi",
    });
  } catch (e) {
    logger.warn("overview synth failed; rendering without overview", { e: String(e) });
    return null;
  }
}

async function loadStepRewriteSafely(doc: SopDoc, stepIndex: number): Promise<StepRewrite | null> {
  const step = doc.steps[stepIndex];
  const slice = sliceTranscriptByTime(doc.segments, step.startTime, step.endTime);
  if (!slice) {
    logger.info("step has no transcript slice; using fallback", { stepIndex });
    return { prose: step.description, subBullets: [], callouts: [] };
  }
  const prevTitle = stepIndex > 0 ? doc.steps[stepIndex - 1].title : null;
  try {
    return await runSynthesizeStep({
      step,
      segments: doc.segments,
      prevTitle,
      language: doc.language ?? "vi",
    });
  } catch (e) {
    logger.warn("step rewrite failed; using fallback", { stepIndex, e: String(e) });
    return { prose: step.description, subBullets: [], callouts: [] };
  }
}

async function loadVisualOverviewSafely(doc: SopDoc, srcPath: string, durationSec: number): Promise<Overview | null> {
  try {
    return await runVisualOverview({
      srcPath,
      durationSec,
      title: doc.title,
      category: doc.category,
      domainSummary: doc.domainSummary ?? "",
      stepTitles: doc.steps.map(s => s.title),
      language: doc.language ?? doc.defaultLanguage ?? "vi",
    });
  } catch (e) {
    logger.warn("visual overview synth failed; rendering without overview", { e: String(e) });
    return null;
  }
}

async function loadVisualStepRewriteSafely(doc: SopDoc, stepIndex: number, imageBuffers: Buffer[]): Promise<StepRewrite> {
  const step = doc.steps[stepIndex];
  const prevTitle = stepIndex > 0 ? doc.steps[stepIndex - 1].title : null;
  try {
    return await runVisualStep({
      step,
      imageBuffers,
      prevTitle,
      category: doc.category,
      domainSummary: doc.domainSummary ?? "",
      language: doc.language ?? doc.defaultLanguage ?? "vi",
    });
  } catch (e) {
    logger.warn("visual step rewrite failed; using fallback", { stepIndex, e: String(e) });
    return { prose: step.description, subBullets: [], callouts: [] };
  }
}

async function loadStepImages(doc: SopDoc, stepIndex: number): Promise<{ keyframes: Buffer[]; posterImage: Buffer | null }> {
  const step = doc.steps[stepIndex];
  const keyframes: Buffer[] = [];
  for (const k of step.keyframeR2Keys ?? []) {
    try { keyframes.push(await fetchR2Buffer(k)); }
    catch (e) { logger.warn("keyframe fetch failed", { k, e: String(e) }); }
  }
  let posterImage: Buffer | null = null;
  if (keyframes.length === 0 && step.posterR2Key) {
    try { posterImage = await fetchR2Buffer(step.posterR2Key); }
    catch (e) { logger.warn("poster fetch failed", { e: String(e) }); }
  }
  return { keyframes, posterImage };
}

export const generateSopPdf = task({
  id: "generate-sop-pdf",
  maxDuration: 60 * 5,
  run: async (payload: { sopId: string }) => {
    const _id = new ObjectId(payload.sopId);
    const doc = await (await sops()).findOne({ _id });
    if (!doc || doc.status !== "done") {
      logger.error("sop not ready for pdf", { sopId: payload.sopId });
      await setPdfState(_id, { status: "error", errorMessage: "SOP not ready" });
      return;
    }

    try {
      const isSilent = doc.inputMode === "silent";

      // Load step images once — both the renderer and the silent step synth need them.
      const stepImagesArr = await Promise.all(doc.steps.map((_, i) => loadStepImages(doc, i)));

      let overview: Overview | null;
      let stepRewrites: (StepRewrite | null)[];

      if (isSilent) {
        const durationSec = doc.steps.length > 0
          ? Math.max(...doc.steps.map(s => s.endTime))
          : 0;
        if (!doc.videoR2Key) throw new Error("silent SOP missing videoR2Key");

        const src = await fetchSourceVideo(doc.videoR2Key);
        try {
          [overview, stepRewrites] = await Promise.all([
            loadVisualOverviewSafely(doc, src.srcPath, durationSec),
            Promise.all(doc.steps.map((_, i) => {
              const imgs = stepImagesArr[i];
              const buffers = imgs.keyframes.length > 0 ? imgs.keyframes : (imgs.posterImage ? [imgs.posterImage] : []);
              return loadVisualStepRewriteSafely(doc, i, buffers);
            })),
          ]);
        } finally {
          await src.dispose();
        }
      } else {
        [overview, stepRewrites] = await Promise.all([
          loadOverviewSafely(doc),
          Promise.all(doc.steps.map((_, i) => loadStepRewriteSafely(doc, i))),
        ]);
      }

      const input: RenderInput = {
        title: doc.title,
        category: doc.category,
        createdAt: doc.createdAt,
        overview,
        steps: doc.steps.map((step, i) => ({
          index: i,
          title: step.title,
          startTime: step.startTime,
          endTime: step.endTime,
          rewrite: stepRewrites[i],
          keyframes: stepImagesArr[i].keyframes,
          posterImage: stepImagesArr[i].posterImage,
        })),
      };
      const buf = await renderSopPdf(input);

      const ts = Date.now();
      const key = pdfKey(payload.sopId, ts);
      await putObject(key, buf, "application/pdf");

      const previousKey = doc.pdf?.r2Key;
      await setPdfState(_id, {
        status: "ready",
        r2Key: key,
        generatedAt: new Date(),
        errorMessage: null,
      });
      if (previousKey && previousKey !== key) {
        try { await deleteObject(previousKey); }
        catch (e) { logger.warn("failed to delete previous pdf object", { previousKey, e: String(e) }); }
      }
      logger.info("pdf ready", { sopId: payload.sopId, key, bytes: buf.length });
    } catch (e) {
      const msg = String(e);
      logger.error("generateSopPdf failed", { e: msg });
      await setPdfState(_id, { status: "error", errorMessage: msg });
    }
  },
});
