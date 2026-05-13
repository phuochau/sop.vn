import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { sops } from "@/lib/mongo";
import { presignGet } from "@/lib/r2";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sopId: string; key: string }> },
) {
  const { sopId, key } = await params;
  if (!ObjectId.isValid(sopId)) return NextResponse.json({ error: "bad_id" }, { status: 400 });

  // key is the bare filename: "<frameId>.jpg" — validate shape.
  const m = key.match(/^([a-z0-9]{6,16})\.jpg$/);
  if (!m) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const frameId = m[1];

  const doc = await (await sops()).findOne(
    { _id: new ObjectId(sopId), status: "done" },
    { projection: { mode: 1, steps: 1 } },
  );
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (doc.mode !== "screenshots") return NextResponse.json({ error: "not_found" }, { status: 404 });

  let r2Key: string | null = null;
  for (const step of doc.steps) {
    const hit = (step.screenshots ?? []).find(ss => ss.frameId === frameId);
    if (hit) { r2Key = hit.r2Key; break; }
  }
  if (!r2Key) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const url = await presignGet(r2Key, 600);
  return NextResponse.redirect(url, 302);
}
