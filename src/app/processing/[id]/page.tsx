"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, Mail, AtSign, ArrowRight, X, Lock } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { config } from "@/config";

type Status =
  | "uploading" | "ingesting" | "analyzing" | "transcribing" | "normalizing"
  | "generating" | "building-pool" | "assigning" | "uploading-screenshots"
  | "done" | "failed";

const STEPS = [
  "Kiểm tra video",
  "Chuyển giọng nói thành văn bản",
  "Chuẩn hóa nội dung",
  "Phân tích các bước",
  "Tạo ảnh chụp màn hình",
];

const STATUS_STEP_INDEX: Record<Status, number> = {
  uploading: 0, ingesting: 0, analyzing: 0,
  transcribing: 1,
  normalizing: 2,
  generating: 3,
  "building-pool": 4, "assigning": 4, "uploading-screenshots": 4,
  done: 5, failed: 0,
};

const ERROR_MSG: Record<string, string> = {
  video_too_short: "Video quá ngắn. Tải video dài ít nhất 10 giây.",
  video_too_long: "Video quá dài. Giới hạn 5 phút.",
  unsupported_format: "Định dạng không hỗ trợ. Dùng MP4, MOV hoặc WEBM.",
  file_too_large: "File vượt quá 500MB.",
  silent_audio: "Không nghe rõ lời. Hãy thu video có giọng nói rõ ràng.",
  transcription_failed: "Lỗi nhận dạng giọng nói. Vui lòng thử lại.",
  generation_failed: "Lỗi tạo SOP. Vui lòng thử lại.",
  not_an_app: "Video không phải bản ghi ứng dụng. Vui lòng tải video quay màn hình một ứng dụng web, di động hoặc máy tính.",
  screenshot_pool_failed: "Lỗi tạo ảnh chụp màn hình. Vui lòng thử lại.",
  loom_ingest_failed: "Không thể tải video Loom. Hãy đảm bảo liên kết đã đặt 'Anyone with the link can view' rồi thử lại.",
  unknown: "Đã xảy ra lỗi. Vui lòng thử lại.",
};

export default function Processing({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string>("");
  const [status, setStatus] = useState<Status>("transcribing");
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => { params.then(p => setId(p.id)); }, [params]);

  useEffect(() => {
    if (!id) return;
    const iv = setInterval(async () => {
      const r = await fetch(`/api/sop/${id}/status`).then(r => r.json()).catch(() => null);
      if (!r) return;
      setStatus(r.status);
      setErrorCode(r.errorCode);
      if (r.status === "done") { clearInterval(iv); router.push(`/sop/${id}`); }
      if (r.status === "failed") clearInterval(iv);
    }, config.app.pollIntervalMs);
    return () => clearInterval(iv);
  }, [id, router]);

  const failed = status === "failed";
  const activeIdx = STATUS_STEP_INDEX[status];
  const progress = failed ? 0 : Math.min(100, Math.round(((activeIdx + 0.5) / STEPS.length) * 100));

  return (
    <>
      {/* Nav with processing badge in the middle */}
      <header className="w-full bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 md:px-12 h-[72px] flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#0A0A0A] text-white flex items-center justify-center font-bold text-sm">S</span>
            <span className="font-bold text-[18px]" style={{ fontFamily: "var(--font-inter)" }}>SOP.vn</span>
          </Link>
          <span className="inline-flex items-center gap-2.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8] px-3.5 py-1.5 text-[13px] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse" />
            Đang xử lý video của bạn
          </span>
          <div className="w-[100px]" />
        </div>
      </header>

      <main className="min-h-[calc(100vh-72px-72px)] bg-[#FAFAFA] px-6 md:px-12 py-10">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[480px_1fr] gap-10 lg:gap-16 items-start justify-center">
          {/* Cascade */}
          <aside className="relative h-[480px] mx-auto w-full max-w-[480px] hidden md:block">
            {/* Back left */}
            <div
              className="absolute left-[30px] top-[60px] w-[300px] h-[360px] rounded-3xl border border-gray-200 bg-white p-5 overflow-hidden"
              style={{ transform: "rotate(-9deg)", boxShadow: "0 24px 48px -8px rgba(10, 10, 10, 0.08)" }}
            >
              <p className="text-[11px] text-[#9CA3AF] mb-2.5">Bản ghi âm</p>
              <div className="space-y-2.5">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-1.5 rounded-full bg-gray-200" />)}
              </div>
            </div>
            {/* Back right */}
            <div
              className="absolute left-[170px] top-[60px] w-[300px] h-[360px] rounded-3xl border border-gray-200 bg-white p-5 overflow-hidden"
              style={{ transform: "rotate(9deg)", boxShadow: "0 24px 48px -8px rgba(10, 10, 10, 0.08)" }}
            >
              <p className="text-[11px] text-[#9CA3AF] mb-2.5">Văn bản đã trích xuất</p>
              <div className="space-y-2.5">
                {[1, 2, 3].map(i => <div key={i} className="h-1.5 rounded-full bg-gray-200" />)}
              </div>
            </div>
            {/* Front dark */}
            <div
              className="absolute left-[80px] top-[30px] w-[340px] h-[420px] rounded-[28px] bg-[#0A0A0A] p-7 flex flex-col items-center justify-center gap-4 overflow-hidden"
              style={{ boxShadow: "0 32px 64px -12px rgba(10, 10, 10, 0.2)" }}
            >
              <div className="relative w-24 h-24">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                  <circle
                    cx="50" cy="50" r="44" fill="none"
                    stroke="#3b82f6" strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 44}`}
                    strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                  />
                </svg>
              </div>
              <span className="text-white text-[32px] font-bold" style={{ fontFamily: "var(--font-inter)" }}>{progress}%</span>
              <p className="text-[13px] text-[#9CA3AF] leading-[1.45] text-center max-w-[240px]">
                {failed ? "Xử lý không thành công" : `Đang ${STEPS[Math.min(activeIdx, STEPS.length - 1)].toLowerCase()} trong video...`}
              </p>
            </div>
          </aside>

          {/* Right column */}
          <section className="w-full max-w-[560px] space-y-6">
            {/* Header */}
            <div className="space-y-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF6FF] text-[#1D4ED8] px-3 py-1.5 text-[12px] font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
                Bước {Math.min(activeIdx + 1, STEPS.length)} / {STEPS.length}
              </span>
              <h1
                className="font-bold text-[#0A0A0A] text-3xl md:text-[36px] tracking-[-0.022em]"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                {failed ? "Đã có lỗi xảy ra" : "Đang phân tích video..."}
              </h1>
              <p className="text-sm text-[#4B5563] leading-[1.55]">
                Hệ thống đang xem từng khung hình và ghi lại các thao tác trên màn hình. Bạn có thể đóng tab — chúng tôi sẽ gửi email khi xong.
              </p>
            </div>

            {!failed && (
              <>
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[#374151]">Tiến độ tổng thể</span>
                    <span
                      className="text-[13px] font-semibold text-[#0A0A0A]"
                      style={{ fontFamily: "var(--font-inter)" }}
                    >
                      {progress}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#E5E7EB] overflow-hidden">
                    <div className="h-full bg-[#2563EB] transition-all" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-[12px] text-[#6B7280]">Còn lại khoảng 2 phút</p>
                </div>

                {/* Steps */}
                <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-1.5">
                  {STEPS.map((label, i) => {
                    const state = i < activeIdx ? "done" : i === activeIdx ? "active" : "pending";
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-3 p-3 rounded-xl ${state === "active" ? "bg-[#EFF6FF]" : ""}`}
                      >
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                            state === "done"
                              ? "bg-[#0A0A0A] text-white"
                              : state === "active"
                              ? "bg-[#2563EB] text-white"
                              : "bg-white border border-[#D1D5DB]"
                          }`}
                        >
                          {state === "done" && <Check className="w-3.5 h-3.5" strokeWidth={2.5} />}
                          {state === "active" && <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.5} />}
                        </span>
                        <span
                          className={`flex-1 text-sm ${
                            state === "pending" ? "text-[#9CA3AF] font-normal" :
                            state === "active" ? "text-[#0A0A0A] font-semibold" :
                            "text-[#0A0A0A] font-medium"
                          }`}
                        >
                          {label}
                        </span>
                        <span
                          className={`text-[12px] ${
                            state === "active" ? "text-[#2563EB] font-medium" :
                            state === "pending" ? "text-[#9CA3AF]" :
                            "text-[#9CA3AF]"
                          }`}
                          style={state === "done" ? { fontFamily: "var(--font-inter)" } : {}}
                        >
                          {state === "done" && "xong"}
                          {state === "active" && "đang chạy..."}
                          {state === "pending" && "chờ"}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Email notify card */}
                <div
                  className="rounded-2xl border border-gray-200 bg-white p-6 space-y-3.5"
                  style={{ boxShadow: "0 16px 48px -8px rgba(10, 10, 10, 0.08)" }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-[10px] bg-[#EFF6FF] flex items-center justify-center">
                      <Mail className="w-4.5 h-4.5 text-[#0066FF]" strokeWidth={2} />
                    </div>
                    <h3
                      className="font-semibold text-[17px] text-[#0A0A0A] leading-[1.3]"
                      style={{ fontFamily: "var(--font-inter)" }}
                    >
                      Đừng đợi ở đây — chúng tôi sẽ gửi email khi xong
                    </h3>
                  </div>
                  <p className="text-sm text-[#4B5563] leading-[1.55]">
                    Video có thể mất vài phút để xử lý. Hãy để lại email, chúng tôi sẽ gửi SOP hoàn chỉnh ngay khi sẵn sàng.
                  </p>
                  <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-[#FAFAFA] pl-4 pr-1.5 py-1.5">
                    <AtSign className="w-4 h-4 text-[#9CA3AF] shrink-0" strokeWidth={2} />
                    <input
                      disabled
                      type="email"
                      placeholder="email@congty.com"
                      className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#9CA3AF] text-[#0A0A0A] disabled:cursor-not-allowed"
                    />
                    <button
                      disabled
                      className="inline-flex items-center gap-2 rounded-full bg-[#0066FF] text-white text-[13px] font-medium px-[18px] py-2.5 opacity-60 cursor-not-allowed"
                    >
                      Nhận thông báo qua email
                      <ArrowRight className="w-3.5 h-3.5" strokeWidth={2} />
                    </button>
                  </div>
                  <p className="text-[12px] text-[#9CA3AF]">Bạn có thể đóng tab này, chúng tôi sẽ liên hệ khi SOP sẵn sàng.</p>
                </div>

                {/* Cancel */}
                <div className="flex items-center justify-center gap-1.5 pt-1">
                  <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-[#0A0A0A]">
                    <X className="w-3.5 h-3.5" strokeWidth={2} />
                    Hủy xử lý
                  </Link>
                </div>
              </>
            )}

            {failed && (
              <div className="space-y-4">
                <p className="text-red-600 text-sm">{ERROR_MSG[errorCode ?? "unknown"]}</p>
                <Link href="/upload">
                  <Button className="rounded-full bg-[#0066FF] hover:bg-blue-700 text-white">Thử lại</Button>
                </Link>
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 pt-1 text-[12px] text-[#9CA3AF]">
              <Lock className="w-3 h-3" strokeWidth={2} />
              Video và SOP của bạn được mã hóa và sẽ tự xóa sau 30 ngày.
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
