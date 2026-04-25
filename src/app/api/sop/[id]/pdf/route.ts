import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { tasks } from "@trigger.dev/sdk/v3";
import { sops } from "@/lib/mongo";

const STALE_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  const _id = new ObjectId(id);
  const col = await sops();
  const doc = await col.findOne({ _id });
  if (!doc || doc.status !== "done") return NextResponse.json({ error: "not_ready" }, { status: 404 });

  const pdf = doc.pdf;
  const now = new Date();

  // Cache hit: ready and SOP unchanged since
  if (pdf?.status === "ready" && pdf.generatedAt && doc.updatedAt <= pdf.generatedAt) {
    return NextResponse.json({ status: "ready", url: `/api/sop/${id}/pdf/file` });
  }

  // Already generating, not stale → return existing runId
  if (pdf?.status === "generating" && pdf.startedAt && now.getTime() - new Date(pdf.startedAt).getTime() < STALE_MS) {
    return NextResponse.json({ status: "generating", runId: pdf.runId });
  }

  // Trigger fresh run (atomic: set generating + startedAt + runId)
  const handle = await tasks.trigger("generate-sop-pdf", { sopId: id });
  await col.updateOne(
    { _id },
    {
      $set: {
        "pdf.status": "generating",
        "pdf.startedAt": now,
        "pdf.runId": handle.id,
        "pdf.errorMessage": null,
        updatedAt: now,
      },
    }
  );
  return NextResponse.json({ status: "generating", runId: handle.id });
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });
  const doc = await (await sops()).findOne(
    { _id: new ObjectId(id) },
    { projection: { pdf: 1, updatedAt: 1 } }
  );
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const pdf = doc.pdf ?? { status: "idle" };
  return NextResponse.json({
    status: pdf.status,
    url: pdf.status === "ready" ? `/api/sop/${id}/pdf/file` : null,
    errorMessage: pdf.errorMessage ?? null,
    runId: pdf.runId ?? null,
  });
}
