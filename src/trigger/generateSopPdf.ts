import { task, logger } from "@trigger.dev/sdk/v3";
import { ObjectId } from "mongodb";
import { sops, type SopDoc } from "@/lib/mongo";
import { presignGet, putObject, deleteObject } from "@/lib/r2";
import { pdfKey } from "@/lib/utils";
import { runSynthesizeOverview, type Overview } from "./stages/synthesizeOverview";
import { runSynthesizeStep, sliceTranscriptByTime, type StepRewrite } from "./stages/synthesizeStep";
import { renderSopPdf, type RenderInput } from "./stages/renderPdf";

async function fetchR2Buffer(key: string): Promise<Buffer> {
  const url = await presignGet(key, 600);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${key}: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function setPdfState(id: ObjectId, patch: Record<string, unknown>) {
  // Mongo dot-notation set, only the changed pdf.* sub-fields
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
    // No transcript content for this step — skip the LLM call and return the fallback shape directly.
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
    // Fallback: synthesize a minimal rewrite from the existing description
    return {
      prose: step.description,
      subBullets: [],
      callouts: [],
    };
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
      // Stage 2 + 3 in parallel: Overview synthesis + per-step rewrites
      const [overview, stepRewrites, stepImagesArr] = await Promise.all([
        loadOverviewSafely(doc),
        Promise.all(doc.steps.map((_, i) => loadStepRewriteSafely(doc, i))),
        Promise.all(doc.steps.map((_, i) => loadStepImages(doc, i))),
      ]);

      // Stage 4: render
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

      // Stage 5: upload
      const ts = Date.now();
      const key = pdfKey(payload.sopId, ts);
      await putObject(key, buf, "application/pdf");

      // Stage 6: finalize
      const previousKey = doc.pdf?.r2Key;
      await setPdfState(_id, {
        status: "ready",
        r2Key: key,
        generatedAt: new Date(),
        errorMessage: null,
      });
      // Best-effort cleanup of the previous PDF object now that the doc points elsewhere.
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
