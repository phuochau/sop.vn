import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { sops } from "@/lib/mongo";
import { presignGet } from "@/lib/r2";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });
  const doc = await (await sops()).findOne(
    { _id: new ObjectId(id) },
    { projection: { pdf: 1, title: 1 } }
  );
  if (!doc?.pdf?.r2Key || doc.pdf.status !== "ready") {
    return NextResponse.json({ error: "not_ready" }, { status: 404 });
  }
  const url = await presignGet(doc.pdf.r2Key, 600); // 10 min
  return NextResponse.redirect(url, 302);
}
