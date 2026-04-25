import { schedules, logger } from "@trigger.dev/sdk/v3";
import { sops } from "@/lib/mongo";
import { deleteObject } from "@/lib/r2";

const PDF_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const cleanupVideos = schedules.task({
  id: "cleanup-videos",
  cron: "0 3 * * *", // 03:00 UTC daily
  run: async () => {
    const col = await sops();
    const now = new Date();

    // Sweep expired source videos (existing behavior)
    const expired = await col.find({ videoExpiresAt: { $lt: now }, videoR2Key: { $ne: null } }).toArray();
    for (const d of expired) {
      if (!d.videoR2Key) continue;
      try { await deleteObject(d.videoR2Key); }
      catch (e) { logger.warn("r2 delete failed", { key: d.videoR2Key, e: String(e) }); }
      await col.updateOne({ _id: d._id }, { $set: { videoR2Key: null, updatedAt: now } });
    }

    // Sweep stale PDFs: status=ready and generatedAt older than TTL.
    // Reset pdf state so the next click regenerates rather than 404ing on a deleted object.
    const stalePdfBefore = new Date(now.getTime() - PDF_TTL_MS);
    const stalePdfs = await col.find({
      "pdf.status": "ready",
      "pdf.generatedAt": { $lt: stalePdfBefore },
    }).toArray();
    for (const d of stalePdfs) {
      const key = d.pdf?.r2Key;
      if (key) {
        try { await deleteObject(key); }
        catch (e) { logger.warn("r2 delete pdf failed", { key, e: String(e) }); }
      }
      await col.updateOne(
        { _id: d._id },
        {
          $set: {
            "pdf.status": "idle",
            "pdf.r2Key": null,
            "pdf.generatedAt": null,
            "pdf.runId": null,
            "pdf.startedAt": null,
            updatedAt: now,
          },
        }
      );
    }

    logger.info(`cleanup: videos=${expired.length} pdfs=${stalePdfs.length}`);
  },
});
