import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { sops, events } from "@/lib/mongo";
import { tasks } from "@trigger.dev/sdk/v3";

const Body = z.object({ sopId: z.string().length(24) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const _id = new ObjectId(parsed.data.sopId);

  const col = await sops();
  const res = await col.updateOne(
    { _id, status: "uploading" },
    { $set: { status: "transcribing", updatedAt: new Date() } }
  );
  if (res.matchedCount === 0) return NextResponse.json({ error: "not_found_or_wrong_state" }, { status: 404 });

  await (await events()).insertOne({
    _id: new ObjectId(), type: "upload", sopId: _id, createdAt: new Date(),
  });

  await tasks.trigger("process-sop", { sopId: _id.toHexString() });
  return NextResponse.json({ ok: true });
}
