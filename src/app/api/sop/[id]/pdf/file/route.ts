import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { sops } from "@/lib/mongo";
import { presignGetAttachment } from "@/lib/r2";

function slugify(s: string): string {
  // Vietnamese-aware: keep diacritics out of the filename by stripping them, replace spaces with hyphens
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "sop";
}

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
  const filename = `${slugify(doc.title ?? "sop")}.pdf`;
  const url = await presignGetAttachment(doc.pdf.r2Key, filename, 600);
  return NextResponse.redirect(url, 302);
}
