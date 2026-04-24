import {
  sops
} from "../../../../../chunk-Y4FLPN56.mjs";
import {
  deleteObject
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
import {
  logger,
  schedules_exports
} from "../../../../../chunk-5C4WVIZW.mjs";
import "../../../../../chunk-SZ6GL6S4.mjs";
import "../../../../../chunk-E6JKZSLS.mjs";
import {
  __name,
  init_esm
} from "../../../../../chunk-3VTTNDYQ.mjs";

// src/trigger/cleanupVideos.ts
init_esm();
var cleanupVideos = schedules_exports.task({
  id: "cleanup-videos",
  cron: "0 3 * * *",
  // 03:00 UTC daily
  run: /* @__PURE__ */ __name(async () => {
    const col = await sops();
    const now = /* @__PURE__ */ new Date();
    const expired = await col.find({ videoExpiresAt: { $lt: now }, videoR2Key: { $ne: null } }).toArray();
    for (const d of expired) {
      if (!d.videoR2Key) continue;
      try {
        await deleteObject(d.videoR2Key);
      } catch (e) {
        logger.warn("r2 delete failed", { key: d.videoR2Key, e: String(e) });
      }
      await col.updateOne({ _id: d._id }, { $set: { videoR2Key: null, updatedAt: now } });
    }
    logger.info(`cleanup: processed ${expired.length} sops`);
  }, "run")
});
export {
  cleanupVideos
};
//# sourceMappingURL=cleanupVideos.mjs.map
