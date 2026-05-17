import { notFound } from "next/navigation";
import Link from "next/link";
import { Calendar, Clock3, List, Pencil, Info, Plus, ThumbsUp, ThumbsDown } from "lucide-react";
import { StepCardScreenshots, type ScreenshotItem } from "@/components/StepCardScreenshots";
import { ShareButton } from "@/components/ShareButton";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
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

function totalDuration(steps: Step[]) {
  if (steps.length === 0) return 0;
  const last = steps[steps.length - 1];
  return typeof last.endTime === "number" ? Math.round(last.endTime) : 0;
}
function fmtDur(s: number) {
  if (s <= 0) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m} phút ${String(sec).padStart(2, "0")} giây`;
}
function fmtDateTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sop = await getSop(id);
  if (!sop) return notFound();

  const duration = totalDuration(sop.steps);

  return (
    <>
      <Nav variant="app" />

      {/* Header */}
      <section className="bg-white px-6 md:px-12 pt-10 pb-6 border-b border-gray-100">
        <div className="max-w-6xl mx-auto space-y-3">
          <h1
            className="font-bold text-[#0A0A0A] text-3xl md:text-[40px] leading-[1.15] tracking-[-0.022em] max-w-4xl"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            SOP: {sop.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[#6B7280]">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
              Tạo lúc {fmtDateTime(sop.createdAt)}
            </span>
            {duration > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Clock3 className="w-3.5 h-3.5" strokeWidth={2} />
                Video gốc · {fmtDur(duration)}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <List className="w-3.5 h-3.5" strokeWidth={2} />
              {sop.steps.length} bước
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <ShareButton token={sop.shareToken} variant="outline" />
            <ShareButton token={sop.shareToken} variant="primary" />
            <button className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-[#0A0A0A] hover:bg-gray-50 transition">
              <Pencil className="w-3.5 h-3.5" strokeWidth={2} />
              Chỉnh sửa
            </button>
            <Link
              href="/upload"
              className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-[#0A0A0A] hover:bg-gray-50 transition"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              Tạo SOP khác
            </Link>
          </div>
        </div>
      </section>

      {/* Body */}
      <main className="bg-[#FAFAFA] px-6 md:px-12 py-10 pb-20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_280px] gap-8">
          {/* Main column */}
          <div className="min-w-0 space-y-5">
            <div className="flex items-center gap-2.5 rounded-xl bg-[#F3F4F6] px-4 py-3">
              <Info className="w-3.5 h-3.5 text-[#666666] shrink-0" strokeWidth={2} />
              <p className="text-[12px] text-[#666666]">
                Lưu ý: Video gốc sẽ tự xóa sau 30 ngày. Hãy sao chép liên kết chia sẻ để giữ SOP này.
              </p>
            </div>

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

            {/* Feedback card */}
            <div className="rounded-[20px] border border-gray-200 bg-white px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <h3
                  className="font-semibold text-[#0A0A0A] text-base"
                  style={{ fontFamily: "var(--font-inter)" }}
                >
                  SOP này có hữu ích?
                </h3>
                <p className="text-[13px] text-[#6B7280] mt-1">Phản hồi giúp chúng tôi tạo SOP tốt hơn cho lần sau.</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-[#0A0A0A] hover:bg-gray-50 transition">
                  <ThumbsUp className="w-3.5 h-3.5" strokeWidth={2} />
                  Có, rất hữu ích
                </button>
                <button className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-[#0A0A0A] hover:bg-gray-50 transition">
                  <ThumbsDown className="w-3.5 h-3.5" strokeWidth={2} />
                  Chưa hiệu quả
                </button>
              </div>
            </div>
          </div>

          {/* TOC */}
          <aside className="hidden md:block">
            <div
              className="sticky top-6 rounded-[20px] border border-gray-200 bg-white p-6"
              style={{ boxShadow: "0 6px 18px -4px rgba(10, 10, 10, 0.04)" }}
            >
              <div className="flex items-center gap-2 mb-3">
                <List className="w-3.5 h-3.5 text-[#0A0A0A]" strokeWidth={2} />
                <span
                  className="text-sm font-semibold text-[#0A0A0A] tracking-[0.04em]"
                  style={{ fontFamily: "var(--font-inter)" }}
                >
                  Mục lục
                </span>
              </div>
              <div className="h-px bg-gray-200 -mx-6 mb-3" />
              <ol className="space-y-0.5">
                {sop.steps.map((s, i) => (
                  <li key={s.index}>
                    <a
                      href={`#step-${s.index + 1}`}
                      className={`flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 ${i === 0 ? "bg-[#F3F4F6]" : "hover:bg-gray-50"}`}
                    >
                      <span
                        className={`text-[12px] font-medium ${i === 0 ? "text-[#2563EB]" : "text-[#9CA3AF]"}`}
                        style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" }}
                      >
                        {String(s.index + 1).padStart(2, "0")}
                      </span>
                      <span className={`text-[13px] leading-snug line-clamp-2 ${i === 0 ? "text-[#0A0A0A]" : "text-[#374151]"}`}>
                        {s.title}
                      </span>
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
