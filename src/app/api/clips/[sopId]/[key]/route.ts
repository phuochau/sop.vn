import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { sops } from "@/lib/mongo";
import { presignGet } from "@/lib/r2";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sopId: string; key: string }> }
) {
  const { sopId, key } = await params;
  if (!ObjectId.isValid(sopId)) return NextResponse.json({ error: "bad_id" }, { status: 400 });
  if (!/^(step-\d+\.(mp4|jpg)|source\.mp4)$/.test(key)) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Only serve files owned by this sop, under sops/{sopId}/
  const fullKey = `sops/${sopId}/${key}`;
  const exists = await (await sops()).findOne(
    { _id: new ObjectId(sopId), status: "done" },
    { projection: { _id: 1 } }
  );
  if (!exists) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const url = await presignGet(fullKey, 600); // 10 min
  return NextResponse.redirect(url, 302);
}
