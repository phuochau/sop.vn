import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { sops } from "@/lib/mongo";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: "bad_id" }, { status: 400 });
  const doc = await (await sops()).findOne({ _id: new ObjectId(id) });
  if (!doc || doc.status !== "done") return NextResponse.json({ error: "not_ready" }, { status: 404 });

  const sopId = doc._id.toHexString();

  return NextResponse.json({
    id: sopId,
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
      screenshots: (s.screenshots ?? []).map(ss => ({
        frameId: ss.frameId,
        url: `/api/screenshots/${sopId}/${ss.frameId}.jpg`,
        t: ss.t,
        order: ss.order,
        description: ss.description,
        highlight: ss.highlight,
      })),
      screenshotsError: s.screenshotsError,
    })),
  });
}
