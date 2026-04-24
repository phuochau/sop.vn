import { NextResponse } from "next/server";
import { events } from "@/lib/mongo";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const col = await events();
  const now = Date.now();
  const day = new Date(now - 86400_000);
  const week = new Date(now - 7 * 86400_000);

  async function counts(since?: Date) {
    const match = since ? { createdAt: { $gte: since } } : {};
    const agg = await col.aggregate([
      { $match: match },
      { $group: { _id: "$type", n: { $sum: 1 } } },
    ]).toArray();
    const out: Record<string, number> = { upload: 0, sop_completed: 0, share_view: 0 };
    for (const r of agg) out[r._id as string] = r.n as number;
    return out;
  }

  return NextResponse.json({
    today: await counts(day),
    last7d: await counts(week),
    allTime: await counts(),
  });
}
