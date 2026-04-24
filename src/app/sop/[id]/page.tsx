import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StepCard } from "@/components/StepCard";
import { ShareButton } from "@/components/ShareButton";
import { headers } from "next/headers";

async function getSop(id: string) {
  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const r = await fetch(`${base}/api/sop/${id}`, { cache: "no-store" });
  if (!r.ok) return null;
  return r.json();
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sop = await getSop(id);
  if (!sop) return notFound();
  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold">{sop.title}</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="rounded-full bg-muted px-3 py-1">{sop.category}</span>
          <span>{new Date(sop.createdAt).toLocaleDateString("vi-VN")}</span>
        </div>
        <div className="flex gap-3 pt-2">
          <ShareButton token={sop.shareToken} />
          <Link href="/upload"><Button variant="outline">Tạo SOP khác</Button></Link>
        </div>
      </header>
      <section className="space-y-4">
        {sop.steps.map((s: any) => <StepCard key={s.index} {...s} />)}
      </section>
    </main>
  );
}
