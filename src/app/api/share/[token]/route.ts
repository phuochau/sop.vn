import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { sops, events } from "@/lib/mongo";

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const doc = await (await sops()).findOne({ shareToken: token, status: "done" });
  if (!doc) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await (await events()).insertOne({
    _id: new ObjectId(), type: "share_view", sopId: doc._id, createdAt: new Date(),
  });

  const sopId = doc._id.toHexString();

  return NextResponse.json({
    title: doc.title,
    category: doc.category,
    createdAt: doc.createdAt,
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
