import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { sops } from "@/lib/mongo";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });
  const doc = await (await sops()).findOne({ _id: new ObjectId(id) });
  if (!doc || doc.status !== "done") return NextResponse.json({ error: "not_ready" }, { status: 404 });

  return NextResponse.json({
    id: doc._id.toHexString(),
    title: doc.title,
    category: doc.category,
    createdAt: doc.createdAt,
    shareToken: doc.shareToken,
    steps: doc.steps.map((s, i) => ({
      index: i,
      title: s.title,
      description: s.description,
      startTime: s.startTime,
      endTime: s.endTime,
      clipUrl: `/api/clips/${doc._id.toHexString()}/step-${i}.mp4`,
      posterUrl: `/api/clips/${doc._id.toHexString()}/step-${i}.jpg`,
    })),
  });
}
