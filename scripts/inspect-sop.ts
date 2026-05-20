import { ObjectId } from "mongodb";
import { sops } from "/Users/hauvo/Documents/1-active-projects/Stepika/poc/src/lib/mongo";

const id = process.argv[2];
async function main() {
  const col = await sops();
  const doc = await col.findOne({ _id: new ObjectId(id) });
  console.log(JSON.stringify({
    status: doc?.status,
    errorCode: doc?.errorCode,
    outputFormat: doc?.outputFormat,
    effectiveOutputFormat: doc?.effectiveOutputFormat,
    outputFormatCoerced: doc?.outputFormatCoerced,
    appType: doc?.appType,
    industry: doc?.industry,
    stepsCount: doc?.steps?.length,
    firstStepHasClips: doc?.steps?.[0] ? { clipsLen: doc.steps[0].clips?.length ?? 0, clipsError: doc.steps[0].clipsError, screenshotsLen: doc.steps[0].screenshots?.length ?? 0 } : null,
  }, null, 2));
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
