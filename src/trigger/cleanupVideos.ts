import { schedules, logger } from "@trigger.dev/sdk/v3";
import { sops } from "@/lib/mongo";
import { deleteObject } from "@/lib/r2";

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

    // Sweep stuck-"ingesting" SOPs older than 30 minutes.
    // Threshold > task maxDuration (15 min) so in-flight tasks are not affected.
    const stuckBefore = new Date(now.getTime() - 30 * 60 * 1000);
    const stuck = await col.find({
      status: "ingesting",
      createdAt: { $lt: stuckBefore },
    }).toArray();
    for (const d of stuck) {
      if (d.videoR2Key) {
        try { await deleteObject(d.videoR2Key); }
        catch (e) { logger.warn("r2 delete stuck-ingest failed", { key: d.videoR2Key, e: String(e) }); }
      }
      await col.updateOne(
        { _id: d._id, status: "ingesting" },
        { $set: { status: "failed", errorCode: "loom_ingest_failed", videoR2Key: null, updatedAt: now } },
      );
    }

    logger.info(`cleanup: videos=${expired.length} stuckIngest=${stuck.length}`);
  },
});
