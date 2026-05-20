import { ObjectId } from "mongodb";
import { sops } from "/Users/hauvo/Documents/1-active-projects/Stepika/poc/src/lib/mongo";

const id = process.argv[2];
async function main() {
  const col = await sops();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  if (!doc) { console.log("NOT FOUND"); return; }
  const firstStep = doc.steps?.[0];
  const firstShot = firstStep?.screenshots?.[0];
  const firstClip = firstStep?.clips?.[0];
  console.log(JSON.stringify({
    status: doc.status,
    effectiveOutputFormat: doc.effectiveOutputFormat,
    appType: doc.appType,
    source: doc.source,
    videoSizeBytes: doc.videoSizeBytes,
    stepsCount: doc.steps?.length,
    firstShot: firstShot ? {
      r2Key: firstShot.r2Key,
      sizeBytes: firstShot.sizeBytes,
      width: firstShot.width,
      height: firstShot.height,
      ext: firstShot.ext,
      mime: firstShot.mime,
      highlight: firstShot.highlight,
    } : null,
    firstClip: firstClip ? {
      r2Key: firstClip.r2Key,
      sizeBytes: firstClip.sizeBytes,
      width: firstClip.width,
      height: firstClip.height,
      durationSec: firstClip.durationSec,
      codec: firstClip.codec,
      ext: firstClip.ext,
      mime: firstClip.mime,
      posterSizeBytes: firstClip.posterSizeBytes,
      posterWidth: firstClip.posterWidth,
      posterHeight: firstClip.posterHeight,
      posterMime: firstClip.posterMime,
    } : null,
  }, null, 2));
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
