import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo";
import { logger } from "@trigger.dev/sdk/v3";

export type GateOutcome = "skipped" | "no_match" | "yes" | "partially" | "no";

export type PipelineTraceDoc = {
  _id: ObjectId;
  sopId: string;
  stepIndex: number;
  intent: string;
  pickedLetter: string | null;
  runnerUpLetter: string | null;
  pickerReasoning: string;
  verifyMatch: GateOutcome;
  verifyReasoning: string;
  highlightOutcome: "yes" | "no" | "skipped";
  finalActionRecorded: boolean;
  droppedAt: "none" | "pick" | "verify" | "highlight";
  createdAt: Date;
};

export function traceEnabled(): boolean {
  return process.env.SOP_PIPELINE_DEBUG === "1";
}

export function makeTrace(args: Omit<PipelineTraceDoc, "_id" | "createdAt">): PipelineTraceDoc {
  return {
    _id: new ObjectId(),
    createdAt: new Date(),
    ...args,
  };
}

export async function persistTrace(doc: PipelineTraceDoc): Promise<void> {
  if (!traceEnabled()) return;
  try {
    const db = await getDb();
    await db.collection<PipelineTraceDoc>("sop_pipeline_traces").insertOne(doc);
  } catch (e) {
    logger.warn("pipeline.trace.persist_failed", { sopId: doc.sopId, stepIndex: doc.stepIndex, error: String(e) });
  }
}

export type RawSubStepSnapshot = {
  intent: string;
  verb: string;
  visualConfidence: string;
  narrationSegmentIds: number[];
  timeWindow: { start: number; end: number } | null;
};

export type PlanDrop = {
  intent: string;
  reason: "low_confidence" | "no_temporal_anchor";
  droppedNarrationIds?: number[];
};

export type ClusterSnapshot = {
  letter: string;
  start: number;
  end: number;
  representativeT: number;
  memberCount: number;
};

export type StepPlanTraceDoc = {
  _id: ObjectId;
  sopId: string;
  stepIndex: number;
  stepTitle: string;
  stepWindow: { start: number; end: number };
  narrationSegmentCount: number;
  clusters: ClusterSnapshot[];
  rawPlan: RawSubStepSnapshot[];
  filteredPlan: RawSubStepSnapshot[];
  drops: PlanDrop[];
  repairUsed: boolean;
  rawRepairPlan: RawSubStepSnapshot[] | null;
  createdAt: Date;
};

export function makeStepPlanTrace(args: Omit<StepPlanTraceDoc, "_id" | "createdAt">): StepPlanTraceDoc {
  return { _id: new ObjectId(), createdAt: new Date(), ...args };
}

export async function persistStepPlanTrace(doc: StepPlanTraceDoc): Promise<void> {
  if (!traceEnabled()) return;
  try {
    const db = await getDb();
    await db.collection<StepPlanTraceDoc>("sop_pipeline_step_traces").insertOne(doc);
  } catch (e) {
    logger.warn("pipeline.step_trace.persist_failed", { sopId: doc.sopId, stepIndex: doc.stepIndex, error: String(e) });
  }
}
