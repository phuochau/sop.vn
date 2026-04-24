"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { config } from "@/config";

type Status =
  | "uploading" | "transcribing" | "normalizing" | "analyzing"
  | "generating" | "clipping" | "done" | "failed";

const STATUS_STEP_INDEX: Record<Status, number> = {
  uploading: 0,
  transcribing: 0,
  normalizing: 1,
  analyzing: 2,
  generating: 3,
  clipping: 4,
  done: 5,
  failed: 0,
};

const STEPS = [
  { label: "Trích xuất âm thanh từ video" },
  { label: "Làm sạch & chuyển thành văn bản" },
  { label: "Phân tích các bước thao tác" },
  { label: "Tạo nội dung từng bước" },
  { label: "Cắt video & hoàn thiện SOP" },
];

const ERROR_MSG: Record<string, string> = {
  video_too_short: "Video quá ngắn. Tải video dài ít nhất 10 giây.",
  video_too_long: "Video quá dài. Giới hạn 5 phút.",
  unsupported_format: "Định dạng không hỗ trợ. Dùng MP4, MOV hoặc WEBM.",
  file_too_large: "File vượt quá 500MB.",
  silent_audio: "Không nghe rõ lời. Hãy thu video có giọng nói rõ ràng.",
  transcription_failed: "Lỗi nhận dạng giọng nói. Vui lòng thử lại.",
  generation_failed: "Lỗi tạo SOP. Vui lòng thử lại.",
  clipping_failed: "Lỗi cắt video. Vui lòng thử lại.",
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
      <Nav variant="app" />
      <main className="max-w-6xl mx-auto px-6 pt-10 pb-8">
        <div className="flex justify-end mb-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 border border-blue-100 px-3 py-1 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            Đang xử lý video của bạn
          </span>
        </div>

        <div className="grid md:grid-cols-5 gap-8 items-start">
          <aside className="md:col-span-2">
            <div className="relative rounded-2xl bg-gray-900 text-white aspect-square p-8 flex flex-col items-center justify-center shadow-xl overflow-hidden">
              <svg className="w-44 h-44 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="44" fill="none"
                  stroke="#3b82f6" strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 44}`}
                  strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress / 100)}`}
                  style={{ transition: "stroke-dashoffset 0.5s ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl font-bold text-blue-400 -mt-8">{progress}%</span>
              </div>
              <p className="mt-4 text-sm text-gray-300 text-center max-w-[14rem]">
                {failed ? "Xử lý không thành công" : STEPS[Math.min(activeIdx, STEPS.length - 1)].label}
              </p>
            </div>
          </aside>

          <section className="md:col-span-3 space-y-6">
            <div className="space-y-2">
              <p className="text-xs font-medium text-blue-600">Bước {Math.min(activeIdx + 1, STEPS.length)}/{STEPS.length}</p>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                {failed ? "Đã có lỗi xảy ra" : "Đang phân tích video…"}
              </h1>
              <p className="text-gray-600 text-sm">
                Hệ thống đang xem từng khung hình và đọc theo các thao tác trên màn hình. Bạn có thể đóng trình duyệt — chúng tôi sẽ giữ kết quả khi xong.
              </p>
            </div>

            {!failed && (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Tiến độ tổng thể</span>
                    <span className="font-semibold">{progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-500">Các bước xử lý</p>
                  <ul className="space-y-1.5">
                    {STEPS.map((s, i) => {
                      const state = i < activeIdx ? "done" : i === activeIdx ? "active" : "pending";
                      return (
                        <li
                          key={i}
                          className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ${
                            state === "active" ? "bg-blue-50 border-blue-200" : "bg-white border-gray-100"
                          }`}
                        >
                          <span
                            className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0 ${
                              state === "done"
                                ? "bg-green-600 text-white"
                                : state === "active"
                                ? "bg-blue-600 text-white"
                                : "bg-gray-200 text-gray-500"
                            }`}
                          >
                            {state === "done" ? "✓" : state === "active" ? (
                              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>
                            ) : i + 1}
                          </span>
                          <span className={state === "pending" ? "text-gray-400" : ""}>{s.label}</span>
                          <span className="ml-auto text-xs text-gray-400">
                            {state === "done" && "Hoàn tất"}
                            {state === "active" && "Đang chạy…"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div className="rounded-xl border bg-gray-50 p-4 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white border flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div>
                      <p className="text-sm font-medium">Đừng đợi ở đây — chúng tôi sẽ gửi email khi xong</p>
                      <p className="text-xs text-gray-500">Nhập email để nhận thông báo ngay khi SOP sẵn sàng.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        disabled
                        type="email"
                        placeholder="email@example.com"
                        className="flex-1 rounded-full border bg-white px-4 py-1.5 text-sm placeholder:text-gray-400 outline-none opacity-60"
                      />
                      <button disabled className="rounded-full bg-blue-600 text-white text-xs px-4 py-2 opacity-60 cursor-not-allowed">
                        Nhận thông báo
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}

            {failed && (
              <div className="space-y-4">
                <p className="text-red-600 text-sm">{ERROR_MSG[errorCode ?? "unknown"]}</p>
                <Link href="/upload">
                  <Button className="rounded-full bg-blue-600 hover:bg-blue-700">Thử lại</Button>
                </Link>
              </div>
            )}

            <div className="text-center pt-4">
              <Link href="/" className="text-xs text-gray-400 hover:text-gray-600">Hủy xử lý</Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
