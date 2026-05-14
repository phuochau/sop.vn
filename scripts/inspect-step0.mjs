import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
const c = new MongoClient(process.env.MONGODB_URI);
await c.connect();
const db = c.db();
const sop = await db.collection("sops").findOne({ _id: new ObjectId("6a04abd616f65270628d088b") });
const s0 = sop.steps[0];
console.log("Step 0 title:", s0.title);
console.log("Step 0 description:\n", s0.description);
console.log("Step 0 time range:", s0.startTime, "-", s0.endTime);
console.log("\nTranscript segments overlapping Step 0:");
const segs = (sop.segmentsClean ?? sop.segments ?? []).filter(seg => {
  const start = seg.start ?? seg.tStart ?? 0;
  return start >= (s0.startTime - 5) && start <= (s0.endTime + 5);
});
for (const seg of segs) {
  console.log(`  [${(seg.start ?? seg.tStart)?.toFixed(1)}-${(seg.end ?? seg.tEnd)?.toFixed(1)}] ${seg.text}`);
}
console.log("\nStep 0 screenshots with R2 keys:");
for (const ss of s0.screenshots ?? []) {
  console.log(`  t=${ss.t.toFixed(2)} desc="${ss.description}"  key=${ss.r2Key}`);
}
await c.close();
