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
