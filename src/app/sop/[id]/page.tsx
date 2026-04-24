import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StepCard } from "@/components/StepCard";
import { ShareButton } from "@/components/ShareButton";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { headers } from "next/headers";

type Step = {
  index: number;
  title: string;
  description: string;
  clipUrl: string;
  posterUrl: string;
};
type Sop = {
  id: string;
  title: string;
  category: string;
  createdAt: string;
  shareToken: string;
  steps: Step[];
};

async function getSop(id: string): Promise<Sop | null> {
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
    <>
      <Nav variant="app" />
      <main className="max-w-6xl mx-auto px-6 pt-10 pb-8">
        {/* Header */}
        <header className="space-y-4 mb-6">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">SOP: {sop.title}</h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-gray-200" />
              <span>Bạn</span>
            </span>
            <span>{new Date(sop.createdAt).toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" })}</span>
            <span>•</span>
            <span>{sop.category}</span>
            <span>•</span>
            <span>{sop.steps.length} bước</span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <ShareButton token={sop.shareToken} />
            <Button variant="outline" size="sm" className="rounded-full">
              <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Lưu bản sao
            </Button>
            <Link href="/upload">
              <Button variant="outline" size="sm" className="rounded-full">
                <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Tạo SOP khác
              </Button>
            </Link>
          </div>
        </header>

        <div className="grid md:grid-cols-[1fr_240px] gap-8">
          {/* Main column */}
          <div className="min-w-0 space-y-4">
            {sop.steps.map((s) => <StepCard key={s.index} {...s} />)}

            {/* CTA footer */}
            <div className="mt-10 py-10 text-center border-t">
              <p className="text-gray-600 mb-4 text-sm">Bạn cũng có thể tạo SOP từ video của mình.</p>
              <Link href="/upload">
                <Button size="lg" className="rounded-full bg-blue-600 hover:bg-blue-700">
                  Tạo SOP của mình
                </Button>
              </Link>
            </div>
          </div>

          {/* Sidebar TOC */}
          <aside className="hidden md:block">
            <div className="sticky top-20 rounded-xl border bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Mục lục</p>
              <ol className="space-y-1.5 text-sm">
                {sop.steps.map((s) => (
                  <li key={s.index}>
                    <a
                      href={`#step-${s.index + 1}`}
                      className="flex gap-2 py-1 hover:text-blue-600 text-gray-700"
                    >
                      <span className="text-gray-400 font-medium shrink-0">{String(s.index + 1).padStart(2, "0")}</span>
                      <span className="line-clamp-2">{s.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </main>
      <Footer />
    </>
  );
}
