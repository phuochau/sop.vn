"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { UploadCloud, Link2, Lock, Sparkles, Globe } from "lucide-react";
import { config } from "@/config";

export function UploadZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isPublic, setIsPublic] = useState(false);

  function pick(f: File | null) {
    setError(null);
    if (!f) { setFile(null); return; }
    if (f.size > config.limits.maxVideoSizeMB * 1024 * 1024) { setError("File vượt quá 500MB."); return; }
    if (!config.limits.allowedMimeTypes.includes(f.type)) { setError("Định dạng không hỗ trợ. Dùng MP4, MOV, hoặc WEBM."); return; }
    setFile(f);
  }

  async function submit() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const init = await fetch("/api/upload/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          sizeBytes: file.size,
          mimeType: file.type,
        }),
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
        body: JSON.stringify({ sopId: init.sopId }),
      });
      if (!commit.ok) throw new Error("commit_failed");

      router.push(`/processing/${init.sopId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      setUploading(false);
    }
  }

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
            Chọn nguồn video bạn muốn chuyển thành SOP. Hỗ trợ tệp MP4/MOV và liên kết YouTube, Loom, Vimeo.
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl border border-gray-200 bg-white p-8 space-y-6"
          style={{ boxShadow: "0 16px 48px -8px rgba(10, 10, 10, 0.08)" }}
        >
          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0] ?? null); }}
            onDragOver={(e) => e.preventDefault()}
            className="rounded-[20px] border-2 border-dashed border-[#D1D5DB] bg-[#FAFAFA] hover:bg-gray-100 transition px-6 py-10 flex flex-col items-center justify-center gap-3.5 cursor-pointer"
          >
            {file ? (
              <div className="text-center space-y-1">
                <p className="font-medium text-[#0A0A0A]">{file.name}</p>
                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
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
                <p className="text-sm text-[#6B7280]">hoặc dán liên kết YouTube/Loom bên dưới</p>
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
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
            />
          </div>

          {/* OR divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[12px] text-[#9CA3AF] tracking-[0.04em]">hoặc dán liên kết</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* URL input (visual only) */}
          <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white pl-[18px] pr-1.5 py-1.5">
            <Link2 className="w-4.5 h-4.5 text-[#9CA3AF] shrink-0" strokeWidth={2} />
            <input
              disabled
              placeholder="https://youtube.com/watch?v=..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-[#9CA3AF] text-[#0A0A0A] disabled:cursor-not-allowed"
            />
            <button
              disabled
              className="rounded-full bg-[#0A0A0A] text-white text-sm font-medium px-[18px] py-[10px] opacity-50 cursor-not-allowed"
            >
              Dán
            </button>
          </div>

          {/* Options row */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="inline-flex items-center gap-2.5 rounded-xl border border-gray-200 bg-[#FAFAFA] px-3.5 py-2.5">
              <Globe className="w-4 h-4 text-[#0A0A0A]" strokeWidth={2} />
              <span className="text-sm font-medium text-[#0A0A0A]">Tiếng Việt</span>
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
          {uploading && (
            <div className="space-y-1.5">
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full bg-[#0066FF] transition-all" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-gray-500 text-center">Đang tải lên… {progress}%</p>
            </div>
          )}

          {/* Submit */}
          <button
            disabled={!file || uploading}
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
