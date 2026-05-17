import Link from "next/link";
import { Eye, FileText, Link as LinkIcon, Users, ListOrdered, Timer, Calendar, Shield, ArrowRight } from "lucide-react";
import { Footer } from "@/components/Footer";
import { StepCardScreenshots, type ScreenshotItem } from "@/components/StepCardScreenshots";
import { headers } from "next/headers";

type Step = {
  index: number;
  title: string;
  description: string;
  startTime?: number;
  endTime?: number;
  screenshots: ScreenshotItem[];
  screenshotsError?: string;
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

function estReadMinutes(steps: Step[]) {
  const words = steps.reduce((n, s) => n + s.description.split(/\s+/).length + s.title.split(/\s+/).length, 0);
  return Math.max(1, Math.round(words / 180));
}
function fmtDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sop = await getShared(token);

  if (!sop) {
    return (
      <>
        <TopBanner />
        <SimpleNav />
        <main className="max-w-lg mx-auto px-6 py-20 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-gray-100 flex items-center justify-center">
            <Shield className="w-6 h-6 text-gray-400" strokeWidth={2} />
          </div>
          <h1 className="text-2xl font-bold">Liên kết không còn khả dụng</h1>
          <p className="text-sm text-gray-500">SOP này đã bị xóa hoặc hết hạn.</p>
          <Link href="/" className="inline-block mt-2 rounded-full bg-[#0066FF] text-white text-sm font-medium px-5 py-2.5 hover:bg-blue-700">
            Về trang chủ
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const readMin = estReadMinutes(sop.steps);

  return (
    <>
      <TopBanner />
      <SimpleNav />

      <main className="bg-white">
        {/* Header */}
        <section className="max-w-[840px] mx-auto px-6 md:px-12 pt-16 pb-10 text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F5F5F5] px-3 py-1.5 text-[12px] text-[#666666]">
            <Users className="w-3 h-3" strokeWidth={2} />
            Chia sẻ bởi SOP.vn
          </span>
          <h1
            className="font-semibold text-[#1A1A1A] text-3xl md:text-[40px] leading-[1.2]"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            {sop.title}
          </h1>
          <p className="text-[17px] text-[#666666] leading-[1.5] max-w-2xl mx-auto">
            Hướng dẫn từng bước được tạo tự động từ video — gồm ảnh chụp màn hình kèm mô tả cho từng thao tác.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-[#666666] pt-1">
            <span className="inline-flex items-center gap-1.5">
              <ListOrdered className="w-3.5 h-3.5" strokeWidth={2} />
              {sop.steps.length} bước
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5" strokeWidth={2} />
              {readMin} phút đọc
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
              Cập nhật {fmtDate(sop.createdAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" strokeWidth={2} />
              Chỉ xem — không chỉnh sửa
            </span>
          </div>
        </section>

        {/* Steps list */}
        <section className="max-w-[840px] mx-auto px-6 md:px-12 py-10 space-y-5">
          {sop.steps.map((s) => (
            <StepCardScreenshots
              key={s.index}
              index={s.index}
              title={s.title}
              description={s.description}
              screenshots={s.screenshots}
              screenshotsError={s.screenshotsError}
            />
          ))}
        </section>

        {/* Footer CTA */}
        <section className="max-w-[840px] mx-auto px-6 md:px-12 pb-16">
          <div className="rounded-xl bg-[#F8F8F8] p-10 md:p-12 text-center space-y-5">
            <h2
              className="font-semibold text-[#1A1A1A] text-2xl md:text-[28px]"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Tạo SOP của riêng bạn trong 60 giây
            </h2>
            <p className="text-[16px] text-[#666666]">
              Dán liên kết video — chúng tôi sẽ tự động tạo hướng dẫn tiếng Việt đầy đủ.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full bg-[#0066FF] text-white text-base font-semibold px-8 py-4 hover:bg-blue-700 transition"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Tạo SOP miễn phí tại SOP.vn
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function TopBanner() {
  return (
    <div className="w-full h-12 bg-[#EEF4FF] flex items-center justify-center gap-2.5">
      <Eye className="w-4 h-4 text-[#0066FF]" strokeWidth={2} />
      <span className="text-[13px] font-medium text-[#0066FF]">SOP được chia sẻ — chỉ xem</span>
    </div>
  );
}

function SimpleNav() {
  return (
    <header className="w-full bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 md:px-12 h-[72px] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-[#1A1A1A]" strokeWidth={2} />
          <span className="font-semibold text-[18px] text-[#1A1A1A]" style={{ fontFamily: "var(--font-inter)" }}>
            SOP.vn
          </span>
          <span className="rounded-full bg-[#EEF4FF] text-[#0066FF] text-[11px] font-semibold tracking-[0.04em] px-2 py-0.5">
            BETA
          </span>
        </Link>
        <button className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-[#1A1A1A] hover:bg-gray-50 transition">
          <LinkIcon className="w-3.5 h-3.5" strokeWidth={2} />
          Sao chép liên kết
        </button>
      </div>
    </header>
  );
}
