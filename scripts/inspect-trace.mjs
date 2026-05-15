import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";

const SOP_ID = process.env.SOP_ID ?? "6a06b4a20d0fe9177b246c5e";
const STEP = process.env.STEP ? Number(process.env.STEP) : null;

const c = new MongoClient(process.env.MONGODB_URI);
await c.connect();
const db = c.db();

const sop = await db.collection("sops").findOne({ _id: new ObjectId(SOP_ID) });
if (!sop) { console.log("NOT FOUND"); process.exit(1); }

console.log("title:", sop.title);
console.log("steps:", sop.steps?.length);

const traces = await db.collection("sop_pipeline_traces")
  .find({ sopId: SOP_ID, ...(STEP !== null ? { stepIndex: STEP } : {}) })
  .sort({ stepIndex: 1, createdAt: 1 })
  .toArray();

console.log("\n=== STEP PLAN TRACE DOCS ===");
const stepTraces = await db.collection("sop_pipeline_step_traces")
  .find({ sopId: SOP_ID, ...(STEP !== null ? { stepIndex: STEP } : {}) })
  .sort({ stepIndex: 1, createdAt: 1 })
  .toArray();
for (const st of stepTraces) {
  console.log(`\n[step=${st.stepIndex}] "${st.stepTitle}" window=${st.stepWindow.start.toFixed(2)}-${st.stepWindow.end.toFixed(2)} narration=${st.narrationSegmentCount} repairUsed=${st.repairUsed}`);
  console.log(`  CLUSTERS (${st.clusters.length}):`);
  for (const c of st.clusters) {
    console.log(`    ${c.letter}: ${c.start.toFixed(2)}-${c.end.toFixed(2)} repT=${c.representativeT.toFixed(2)} members=${c.memberCount}`);
  }
  console.log(`  RAW PLAN (${st.rawPlan.length} sub-steps):`);
  for (const r of st.rawPlan) {
    const tw = r.timeWindow ? `${r.timeWindow.start.toFixed(2)}-${r.timeWindow.end.toFixed(2)}` : "null";
    console.log(`    [${r.verb} ${r.visualConfidence}] ids=[${r.narrationSegmentIds.join(",")}] tw=${tw} "${r.intent}"`);
  }
  console.log(`  FILTERED PLAN (${st.filteredPlan.length} sub-steps):`);
  for (const r of st.filteredPlan) {
    console.log(`    [${r.verb}] "${r.intent}"`);
  }
  if (st.drops.length > 0) {
    console.log(`  DROPS (${st.drops.length}):`);
    for (const d of st.drops) {
      console.log(`    ${d.reason}: "${d.intent}" droppedIds=[${(d.droppedNarrationIds ?? []).join(",")}]`);
    }
  }
  if (st.rawRepairPlan) {
    console.log(`  INITIAL-BEFORE-REPAIR (${st.rawRepairPlan.length} sub-steps):`);
    for (const r of st.rawRepairPlan) {
      console.log(`    [${r.verb} ${r.visualConfidence}] "${r.intent}"`);
    }
  }
}

console.log("\n=== SUBSTEP TRACE DOCS ===");
console.log("count:", traces.length);

for (const t of traces) {
  console.log(`\n[step=${t.stepIndex}] "${t.intent}"`);
  console.log(`  picked=${t.pickedLetter} runnerUp=${t.runnerUpLetter}`);
  console.log(`  picker: ${t.pickerReasoning}`);
  console.log(`  verify=${t.verifyMatch} — ${t.verifyReasoning}`);
  console.log(`  highlight=${t.highlightOutcome} finalRecorded=${t.finalActionRecorded} droppedAt=${t.droppedAt}`);
}

console.log("\n=== STEPS / SCREENSHOTS ===");
for (let i = 0; i < (sop.steps?.length ?? 0); i++) {
  if (STEP !== null && i !== STEP) continue;
  const s = sop.steps[i];
  console.log(`\nStep ${i}: ${s.title}  [t=${s.startTime?.toFixed(1)}-${s.endTime?.toFixed(1)}]`);
  console.log(`  startSegmentId=${s.startSegmentId} endSegmentId=${s.endSegmentId}`);
  (s.screenshots ?? []).forEach((ss, j) => {
    console.log(`  ss#${j} t=${ss.t?.toFixed(2)} verb=${ss.verb} desc="${ss.description ?? ""}"`);
  });
}

console.log("\n=== ALL NARRATION SEGMENTS ===");
const segments = sop.segments ?? [];
const stepBoundaries = (sop.steps ?? []).map((s, i) => ({ i, start: s.startTime, end: s.endTime, title: s.title }));
for (const seg of segments) {
  const inStep = stepBoundaries.find(s => seg.start >= s.start && seg.start < s.end);
  const tag = inStep ? `step${inStep.i}` : "OUTSIDE_ANY_STEP";
  console.log(`  ${seg.id.toString().padStart(3)} | ${seg.start.toFixed(2).padStart(6)}-${seg.end.toFixed(2).padStart(6)} | [${tag}] | ${seg.text}`);
}

console.log("\n=== STEP BOUNDARIES ===");
for (const sb of stepBoundaries) {
  console.log(`  step${sb.i}: ${sb.start.toFixed(2)}-${sb.end.toFixed(2)} | ${sb.title}`);
}

await c.close();
