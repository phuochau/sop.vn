import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { sops } from "@/lib/mongo";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });
  const col = await sops();
  const doc = await col.findOne(
    { _id: new ObjectId(id) },
    { projection: { status: 1, errorCode: 1, title: 1, steps: 1 } }
  );
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({
    status: doc.status,
    errorCode: doc.errorCode,
    title: doc.title,
    hasSteps: (doc.steps?.length ?? 0) > 0,
  });
}
