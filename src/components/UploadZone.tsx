"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Link2, Lock, Sparkles, Globe } from "lucide-react";
import { config } from "@/config";

type Source =
  | { kind: "none" }
  | { kind: "file"; file: File }
  | { kind: "url"; url: string };

export function UploadZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<Source>({ kind: "none" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPublic, setIsPublic] = useState(false);
  const [language, setLanguage] = useState<"vi" | "en">("vi");

  function pickFile(f: File | null) {
    setError(null);
    if (!f) { setSource({ kind: "none" }); return; }
    if (f.size > config.limits.maxVideoSizeMB * 1024 * 1024) { setError("File vượt quá 500MB."); return; }
    if (!config.limits.allowedMimeTypes.includes(f.type)) { setError("Định dạng không hỗ trợ. Dùng MP4, MOV, hoặc WEBM."); return; }
    setSource({ kind: "file", file: f });
  }

  function setUrl(u: string) {
    setError(null);
    if (!u) { setSource({ kind: "none" }); return; }
    setSource({ kind: "url", url: u });
  }

  async function submitFile(file: File) {
    const init = await fetch("/api/upload/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename: file.name, sizeBytes: file.size, mimeType: file.type }),
    }).then(r => r.json());
    if (init.error) throw new Error(init.error);

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", init.uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100)); };
      xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`R2 ${xhr.status}`));
      xhr.onerror = () => reject(new Error("network"));
      xhr.send(file);
    });

    const commit = await fetch("/api/upload/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sopId: init.sopId, defaultLanguage: language }),
    });
    if (!commit.ok) throw new Error("commit_failed");
    return init.sopId as string;
  }

  async function submitLoomUrl(url: string) {
    const r = await fetch("/api/ingest/loom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, defaultLanguage: language }),
    });
    const json = await r.json();
    if (!r.ok) {
      if (json.error === "invalid_url") throw new Error("Liên kết Loom không hợp lệ.");
      throw new Error(json.error ?? "ingest_failed");
    }
    return json.sopId as string;
  }

  async function submit() {
    if (source.kind === "none") return;
    setSubmitting(true);
    setError(null);
    try {
      const sopId =
        source.kind === "file"
          ? await submitFile(source.file)
          : await submitLoomUrl(source.url);
      router.push(`/processing/${sopId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      setSubmitting(false);
    }
  }

  const fileDisabled = source.kind === "url";
  const urlDisabled = source.kind === "file";

  return (
    <div className="min-h-[calc(100vh-72px-72px)] bg-[#FAFAFA] flex flex-col items-center justify-center py-10 px-6">
      <div className="w-full max-w-[720px] space-y-6">
        {/* Header */}
        <div className="text-center space-y-2.5">
          <h1
            className="font-bold text-[#0A0A0A] text-3xl md:text-[36px] tracking-[-0.022em]"
            style={{ fontFamily: "var(--font-inter)" }}
          >
            Tải video lên
          </h1>
          <p className="text-[15px] text-[#4B5563] leading-[1.5] max-w-[600px] mx-auto">
            Chọn nguồn video bạn muốn chuyển thành SOP. Hỗ trợ tệp MP4/MOV và liên kết Loom công khai.
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl border border-gray-200 bg-white p-8 space-y-6"
          style={{ boxShadow: "0 16px 48px -8px rgba(10, 10, 10, 0.08)" }}
        >
          {/* Drop zone */}
          <div
            onClick={() => { if (!fileDisabled) inputRef.current?.click(); }}
            onDrop={(e) => { e.preventDefault(); if (!fileDisabled) pickFile(e.dataTransfer.files?.[0] ?? null); }}
            onDragOver={(e) => e.preventDefault()}
            className="rounded-[20px] border-2 border-dashed border-[#D1D5DB] bg-[#FAFAFA] hover:bg-gray-100 transition px-6 py-10 flex flex-col items-center justify-center gap-3.5 cursor-pointer"
            style={{ pointerEvents: fileDisabled ? "none" : undefined, opacity: fileDisabled ? 0.5 : 1 }}
          >
            {source.kind === "file" ? (
              <div className="text-center space-y-1">
                <p className="font-medium text-[#0A0A0A]">{source.file.name}</p>
                <p className="text-xs text-gray-500">{(source.file.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-white border border-gray-200 flex items-center justify-center">
                  <UploadCloud className="w-7 h-7 text-[#0A0A0A]" strokeWidth={1.75} />
                </div>
                <p
                  className="font-semibold text-[18px] text-[#0A0A0A]"
                  style={{ fontFamily: "var(--font-inter)" }}
                >
                  Kéo thả video vào đây
                </p>
                <p className="text-sm text-[#6B7280]">hoặc dán liên kết Loom bên dưới</p>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-[18px] py-[10px] text-sm font-medium hover:bg-gray-50 transition"
                >
                  Chọn tệp từ máy tính
                </button>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={config.limits.allowedMimeTypes.join(",")}
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* OR divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[12px] text-[#9CA3AF] tracking-[0.04em]">hoặc dán liên kết</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* URL input — Loom only for now */}
          <div className={`flex items-center gap-2 rounded-2xl border border-gray-200 bg-white pl-[18px] pr-1.5 py-1.5 ${urlDisabled ? "opacity-50 pointer-events-none" : ""}`}>
            <Link2 className="w-4.5 h-4.5 text-[#9CA3AF] shrink-0" strokeWidth={2} />
            <input
              type="url"
              value={source.kind === "url" ? source.url : ""}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.loom.com/share/..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#9CA3AF] text-[#0A0A0A]"
            />
          </div>
          <p className="text-[12px] text-[#9CA3AF] -mt-3 px-1">
            Chỉ dán liên kết Loom công khai bạn có quyền sử dụng.
          </p>

          {/* Options row */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex flex-col items-start gap-1">
              <div className="inline-flex items-center gap-2.5 rounded-xl border border-gray-200 bg-[#FAFAFA] px-3.5 py-2.5">
                <Globe className="w-4 h-4 text-[#0A0A0A]" strokeWidth={2} />
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as "vi" | "en")}
                  className="bg-transparent text-sm font-medium text-[#0A0A0A] outline-none"
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </div>
              <span className="text-[11px] text-[#9CA3AF] pl-1">
                Chỉ dùng khi video không có người nói.
              </span>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#0066FF] focus:ring-[#0066FF]"
              />
              <span className="text-sm text-[#374151]">Chia sẻ công khai sau khi hoàn tất</span>
            </label>
          </div>

          {/* Privacy note */}
          <div className="flex items-center justify-center gap-1.5 text-[12px] text-[#666666]">
            <Lock className="w-3 h-3" strokeWidth={2} />
            Video của bạn được xử lý riêng tư và tự động xóa sau 30 ngày.
          </div>

          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          {submitting && source.kind === "file" && (
            <div className="space-y-1.5">
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-[#0066FF] transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-gray-500 text-center">Đang tải lên… {progress}%</p>
            </div>
          )}
          {submitting && source.kind === "url" && (
            <p className="text-xs text-gray-500 text-center">Đang tạo SOP…</p>
          )}

          {/* Submit */}
          <button
            disabled={source.kind === "none" || submitting}
            onClick={submit}
            className="w-full inline-flex items-center justify-center gap-2.5 rounded-full bg-[#0066FF] text-white font-medium text-[15px] px-7 py-4 hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4.5 h-4.5" strokeWidth={2} />
            Bắt đầu tạo SOP
          </button>
        </div>

        {/* Helper text */}
        <p className="text-center text-[12px] text-[#9CA3AF]">
          Tệp tối đa 500 MB · Thời lượng tối đa 5 phút · Hỗ trợ MP4, MOV, WEBM
        </p>
      </div>
    </div>
  );
}
