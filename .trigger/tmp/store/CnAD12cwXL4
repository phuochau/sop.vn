import {
  runExtract
} from "../../../../../chunk-CRMM6R3R.mjs";
import {
  runNormalize
} from "../../../../../chunk-EY4E5DY7.mjs";
import {
  runTranscribe
} from "../../../../../chunk-C4GD475K.mjs";
import {
  events,
  require_lib,
  sops
} from "../../../../../chunk-Y4FLPN56.mjs";
import {
  probeDuration
} from "../../../../../chunk-RKMXS35V.mjs";
import {
  runClip
} from "../../../../../chunk-7IVCLV3L.mjs";
import {
  presignGet
} from "../../../../../chunk-2G47M4IK.mjs";
import "../../../../../chunk-LZMIKRF7.mjs";
import "../../../../../chunk-QGEXMNHO.mjs";
import "../../../../../chunk-TYTCKKP3.mjs";
import "../../../../../chunk-AJILZ5WZ.mjs";
import "../../../../../chunk-TPR7ISAF.mjs";
import "../../../../../chunk-NKFPF6YF.mjs";
import "../../../../../chunk-IAJ5C443.mjs";
import "../../../../../chunk-HVKOIMR6.mjs";
import "../../../../../chunk-Q4T5MCLT.mjs";
import "../../../../../chunk-IIMKTLY7.mjs";
import "../../../../../chunk-YPLDPGBH.mjs";
import "../../../../../chunk-RIFC2BQV.mjs";
import "../../../../../chunk-DHWRD2SK.mjs";
import {
  runContext
} from "../../../../../chunk-XSAM7OVK.mjs";
import "../../../../../chunk-R7I5DQXF.mjs";
import {
  config
} from "../../../../../chunk-REM3KCND.mjs";
import {
  logger,
  task
} from "../../../../../chunk-5C4WVIZW.mjs";
import "../../../../../chunk-SZ6GL6S4.mjs";
import "../../../../../chunk-E6JKZSLS.mjs";
import {
  __name,
  __toESM,
  init_esm
} from "../../../../../chunk-3VTTNDYQ.mjs";

// src/trigger/processSop.ts
init_esm();
var import_mongodb = __toESM(require_lib());
async function setStatus(id, status, extra = {}) {
  await (await sops()).updateOne({ _id: id }, { $set: { status, updatedAt: /* @__PURE__ */ new Date(), ...extra } });
}
__name(setStatus, "setStatus");
async function fail(id, errorCode) {
  await (await sops()).updateOne({ _id: id }, { $set: { status: "failed", errorCode, updatedAt: /* @__PURE__ */ new Date() } });
}
__name(fail, "fail");
var processSop = task({
  id: "process-sop",
  maxDuration: 60 * 15,
  run: /* @__PURE__ */ __name(async (payload) => {
    const _id = new import_mongodb.ObjectId(payload.sopId);
    const doc = await (await sops()).findOne({ _id });
    if (!doc || !doc.videoR2Key) {
      logger.error("sop not found");
      return;
    }
    const signedVideo = await presignGet(doc.videoR2Key, 3600);
    try {
      try {
        const duration = await probeDuration(signedVideo);
        if (duration < config.limits.minVideoDurationSec) return fail(_id, "video_too_short");
        if (duration > config.limits.maxVideoDurationSec) return fail(_id, "video_too_long");
      } catch (e) {
        logger.error("probe failed", { e: String(e) });
        return fail(_id, "unknown");
      }
      await setStatus(_id, "transcribing");
      let stage1;
      try {
        stage1 = await runTranscribe(signedVideo);
      } catch (e) {
        logger.error("transcribe failed", { e: String(e) });
        return fail(_id, "transcription_failed");
      }
      const { transcript, segments } = stage1;
      if (segments.length === 0) return fail(_id, "silent_audio");
      await (await sops()).updateOne({ _id }, { $set: { transcript, segments, updatedAt: /* @__PURE__ */ new Date() } });
      await setStatus(_id, "normalizing");
      const segmentsClean = await runNormalize(segments);
      await (await sops()).updateOne({ _id }, { $set: { segmentsClean, updatedAt: /* @__PURE__ */ new Date() } });
      await setStatus(_id, "analyzing");
      const { category, domainSummary } = await runContext({
        userCategory: doc.userProvidedCategory ? doc.category : null,
        cleanTranscript: segmentsClean.map((s) => s.text).join(" ")
      });
      await (await sops()).updateOne(
        { _id },
        {
          $set: {
            category: doc.userProvidedCategory ? doc.category : category,
            domainSummary,
            updatedAt: /* @__PURE__ */ new Date()
          }
        }
      );
      await setStatus(_id, "generating");
      let extracted;
      try {
        extracted = await runExtract({ segmentsClean, category });
      } catch (e) {
        logger.error("extract failed", { e: String(e) });
        return fail(_id, "generation_failed");
      }
      const finalTitle = doc.title && doc.title.trim().length > 0 ? doc.title : extracted.title;
      await setStatus(_id, "clipping", { title: finalTitle });
      let steps;
      try {
        steps = await runClip({
          sopId: _id.toHexString(),
          videoR2Key: doc.videoR2Key,
          rawSegments: segments,
          extractedSteps: extracted.steps
        });
      } catch (e) {
        logger.error("clip failed", { e: String(e) });
        return fail(_id, "clipping_failed");
      }
      await (await sops()).updateOne(
        { _id },
        { $set: { steps, status: "done", updatedAt: /* @__PURE__ */ new Date() } }
      );
      await (await events()).insertOne({
        _id: new import_mongodb.ObjectId(),
        type: "sop_completed",
        sopId: _id,
        createdAt: /* @__PURE__ */ new Date()
      });
    } catch (e) {
      logger.error("processSop unhandled", { e: String(e) });
      await fail(_id, "unknown");
    }
  }, "run")
});
export {
  processSop
};
//# sourceMappingURL=processSop.mjs.map
