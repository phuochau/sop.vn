import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StepCard } from "@/components/StepCard";
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
type SharedSop = {
  title: string;
  category: string;
  createdAt: string;
  steps: Step[];
};

async function getShared(token: string): Promise<SharedSop | null> {
  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const r = await fetch(`${base}/api/share/${token}`, { cache: "no-store" });
  if (!r.ok) return null;
  return r.json();
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sop = await getShared(token);

  if (!sop) {
    return (
      <>
        <Nav variant="landing" />
        <main className="max-w-lg mx-auto px-6 py-20 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h1 className="text-2xl font-bold">Link không còn khả dụng</h1>
          <p className="text-sm text-gray-500">SOP này đã bị xóa hoặc hết hạn.</p>
          <Link href="/"><Button className="rounded-full bg-blue-600 hover:bg-blue-700 mt-2">Về trang chủ</Button></Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Nav variant="landing" />
      <main className="max-w-4xl mx-auto px-6 pt-10 pb-8">
        <div className="text-center space-y-6 mb-10">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 text-xs font-medium">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            SOP được chia sẻ
          </span>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight max-w-2xl mx-auto">
            {sop.title}
          </h1>
          <p className="text-sm text-gray-500">
            {sop.category} · {sop.steps.length} bước · {new Date(sop.createdAt).toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" })}
          </p>

          {/* Preview thumbnails row */}
          <div className="flex items-center justify-center gap-3 max-w-2xl mx-auto">
            {sop.steps.slice(0, 3).map((s) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={s.index}
                src={s.posterUrl}
                alt=""
                className="w-32 md:w-40 aspect-video rounded-lg border object-cover shadow-sm"
              />
            ))}
          </div>
        </div>

        <section className="space-y-4">
          {sop.steps.map((s) => <StepCard key={s.index} {...s} />)}
        </section>

        {/* Bottom CTA */}
        <div className="mt-16 rounded-2xl border bg-gradient-to-b from-blue-50 to-white p-8 md:p-10 text-center">
          <h2 className="text-2xl md:text-3xl font-bold">Tạo SOP của riêng bạn trong 60 giây</h2>
          <p className="text-sm text-gray-600 mt-2 max-w-md mx-auto">
            Tải lên bất kỳ video đào tạo nào và để AI biến nó thành SOP từng bước.
          </p>
          <Link href="/" className="inline-block mt-5">
            <Button size="lg" className="rounded-full bg-blue-600 hover:bg-blue-700 text-white px-6">
              Tạo SOP miễn phí ngay
            </Button>
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
