"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
    <div className="max-w-2xl mx-auto px-6 pt-14 pb-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Tải video lên</h1>
        <p className="text-gray-600 mt-3 max-w-lg mx-auto text-sm md:text-base">
          Chọn nguồn video bạn muốn chuyển thành SOP. Hỗ trợ tệp MP4/MOV và các liên kết YouTube, Loom, Vimeo.
        </p>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm p-5 md:p-6 space-y-4">
        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0] ?? null); }}
          onDragOver={(e) => e.preventDefault()}
          className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 hover:bg-gray-100 transition px-6 py-10 text-center cursor-pointer"
        >
          {file ? (
            <div className="space-y-1">
              <p className="font-medium">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 mx-auto rounded-xl bg-white border flex items-center justify-center mb-3 shadow-sm">
                <svg className="w-6 h-6 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <p className="font-medium text-sm">Kéo thả video vào đây</p>
              <p className="text-xs text-gray-500 mt-1">hoặc dán liên kết YouTube/Loom bên dưới</p>
              <Button size="sm" variant="outline" className="mt-4 rounded-full" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
                <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                Chọn tệp từ máy tính
              </Button>
            </>
          )}
          <input
            ref={inputRef} type="file" className="hidden"
            accept={config.limits.allowedMimeTypes.join(",")}
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <div className="flex-1 h-px bg-gray-200" />
          <span>hoặc dán link</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* URL paste (visual only for MVP) */}
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center rounded-full border bg-white pl-4 pr-1.5 py-1.5">
            <svg className="w-4 h-4 text-gray-400 mr-2 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            <input
              disabled
              placeholder="https://youtube.com/watch?v=..."
              className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400"
            />
            <button disabled className="rounded-full bg-gray-900 text-white text-xs px-4 py-1.5 opacity-50 cursor-not-allowed">Dán</button>
          </div>
        </div>

        {/* Options row */}
        <div className="flex items-center justify-between pt-2 text-sm">
          <div className="flex items-center gap-2 text-gray-700">
            <svg className="w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            <span className="font-medium">Ngôn ngữ nói:</span>
            <span className="rounded-full border px-3 py-1 text-xs font-medium">Tiếng Việt</span>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
            <span className={`w-9 h-5 rounded-full p-0.5 transition ${isPublic ? "bg-blue-600" : "bg-gray-300"}`}>
              <span className={`block w-4 h-4 rounded-full bg-white transition ${isPublic ? "translate-x-4" : ""}`} />
            </span>
            <input type="checkbox" className="hidden" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
            Chia sẻ công khai sau khi hoàn tất SOP
          </label>
        </div>

        {/* Warning note */}
        <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-gray-500">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Video của bạn được xử lý riêng tư và sẽ tự động xóa sau 30 ngày
        </div>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        {uploading && (
          <div className="space-y-1.5">
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-blue-600 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-xs text-gray-500 text-center">Đang tải lên… {progress}%</p>
          </div>
        )}

        {/* CTA */}
        <Button
          disabled={!file || uploading}
          onClick={submit}
          className="w-full rounded-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base"
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Bắt đầu tạo SOP
        </Button>
      </div>

      <p className="text-xs text-gray-500 text-center mt-5">
        Tải từ tệp: 500 MB · Thời lượng tối đa 5 phút · MP4, MOV, WebM
      </p>
    </div>
  );
}
