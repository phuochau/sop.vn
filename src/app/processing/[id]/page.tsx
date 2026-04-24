"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { config } from "@/config";

const STEP_MAP: Record<string, 1 | 2 | 3> = {
  uploading: 1, transcribing: 2, normalizing: 2, analyzing: 2,
  generating: 3, clipping: 3, done: 3, failed: 3,
};

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
  const [status, setStatus] = useState("transcribing");
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

  const step = STEP_MAP[status] ?? 1;
  const failed = status === "failed";

  return (
    <main className="max-w-lg mx-auto px-6 py-16 space-y-8 text-center">
      <h1 className="text-2xl font-semibold">Đang xử lý video của bạn</h1>
      <ol className="space-y-3 text-left">
        {[
          [1, "Đang tải video…"],
          [2, "Đang nhận dạng âm thanh…"],
          [3, "Đang tạo SOP…"],
        ].map(([n, label]) => {
          const n2 = n as number;
          const state = failed ? "wait" : n2 < step ? "done" : n2 === step ? "active" : "wait";
          return (
            <li key={n2} className="flex items-center gap-3">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold
                ${state === "done" ? "bg-green-600 text-white" : state === "active" ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"}`}>
                {state === "done" ? "✓" : n2}
              </span>
              <span className={state === "active" ? "font-medium" : ""}>{label}</span>
            </li>
          );
        })}
      </ol>
      {!failed && <p className="text-sm text-muted-foreground">Thường mất 1–3 phút.</p>}
      {failed && (
        <div className="space-y-4">
          <p className="text-red-600">{ERROR_MSG[errorCode ?? "unknown"]}</p>
          <Link href="/upload"><Button>Thử lại</Button></Link>
        </div>
      )}
    </main>
  );
}
