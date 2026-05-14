import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";
const SOP_ID = process.env.SOP_ID ?? "6a04abd616f65270628d088b";
const c = new MongoClient(process.env.MONGODB_URI);
await c.connect();
const db = c.db();
const sop = await db.collection("sops").findOne({ _id: new ObjectId(SOP_ID) });
if (!sop) { console.log("NOT FOUND"); process.exit(1); }
console.log("title:", sop.title);
console.log("status:", sop.status, "lang:", sop.language, "default:", sop.defaultLanguage);
console.log("steps:", sop.steps?.length);
const all = [];
sop.steps?.forEach((s, i) => {
  (s.screenshots ?? []).forEach(ss => all.push({ stepIndex: i, stepTitle: s.title, ...ss }));
});
console.log("\n--- all screenshots ---");
for (let i = 0; i < (sop.steps?.length ?? 0); i++) {
  const s = sop.steps[i];
  console.log(`Step ${i}: ${s.title}  [t=${s.startTime?.toFixed(1)}-${s.endTime?.toFixed(1)}]`);
  (s.screenshots ?? []).forEach((ss, j) => {
    console.log(`  #${j} t=${ss.t?.toFixed(2)} order=${ss.order} verb=${ss.verb} bbox=${JSON.stringify(ss.highlight?.bbox)} desc="${ss.description ?? ""}"`);
  });
}
await c.close();
