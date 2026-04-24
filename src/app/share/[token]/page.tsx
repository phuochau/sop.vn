import Link from "next/link";
import { StepCard } from "@/components/StepCard";
import { headers } from "next/headers";

async function getShared(token: string) {
  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const r = await fetch(`${base}/api/share/${token}`, { cache: "no-store" });
  if (!r.ok) return null;
  return r.json();
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sop = await getShared(token);
  if (!sop) return (
    <main className="max-w-lg mx-auto px-6 py-20 text-center space-y-4">
      <h1 className="text-2xl font-bold">Link không còn khả dụng</h1>
      <Link className="underline" href="/">Về trang chủ</Link>
    </main>
  );
  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <div className="bg-muted/50 border rounded-md px-4 py-2 text-sm">SOP được chia sẻ — chỉ xem</div>
      <header>
        <h1 className="text-3xl font-bold">{sop.title}</h1>
        <p className="text-sm text-muted-foreground mt-2">{sop.category} · {new Date(sop.createdAt).toLocaleDateString("vi-VN")}</p>
      </header>
      <section className="space-y-4">
        {sop.steps.map((s: any) => <StepCard key={s.index} {...s} />)}
      </section>
      <footer className="text-center pt-8 text-sm text-muted-foreground">
        Tạo SOP của riêng bạn tại <Link href="/" className="underline">SOP.vn</Link>
      </footer>
    </main>
  );
}
