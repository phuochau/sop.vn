"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { config } from "@/config";

const CATEGORIES = config.categories;

export function UploadZone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

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
          userTitle: title || undefined,
          userCategory: category || undefined,
        }),
      }).then(r => r.json());
      if (init.error) throw new Error(init.error);

      // PUT to R2
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
    } catch (e: any) {
      setError(e.message ?? "Có lỗi xảy ra");
      setUploading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-2xl font-bold">Tải video lên</h1>
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0] ?? null); }}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer hover:bg-muted/50"
      >
        {file ? (
          <div className="space-y-1">
            <p className="font-medium">{file.name}</p>
            <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
        ) : (
          <p className="text-muted-foreground">Kéo & thả video vào đây, hoặc bấm để chọn</p>
        )}
        <input
          ref={inputRef} type="file" className="hidden"
          accept={config.limits.allowedMimeTypes.join(",")}
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label>Tiêu đề (tuỳ chọn)</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ví dụ: Pha cà phê đen đá" />
        </div>
        <div className="space-y-1">
          <Label>Danh mục (tuỳ chọn)</Label>
          <select className="w-full border rounded-md h-10 px-3 bg-background"
                  value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">— Để AI tự chọn —</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {uploading && <p className="text-sm text-muted-foreground">Đang tải lên… {progress}%</p>}

      <Button disabled={!file || uploading} onClick={submit} className="w-full">
        Tạo SOP
      </Button>
      <p className="text-xs text-muted-foreground text-center">Quá trình xử lý mất 1–3 phút. Video tối đa 5 phút, 500 MB.</p>
    </div>
  );
}
