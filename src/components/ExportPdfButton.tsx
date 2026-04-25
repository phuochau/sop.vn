"use client";
import { useEffect, useState } from "react";
import { FileDown, Loader2, RotateCcw } from "lucide-react";

type PdfState = {
  status: "idle" | "generating" | "ready" | "error";
  url: string | null;
  errorMessage?: string | null;
};

export function ExportPdfButton({ sopId, initial }: { sopId: string; initial: { status: string; url: string | null } }) {
  const [state, setState] = useState<PdfState>({
    status: (initial.status as PdfState["status"]) ?? "idle",
    url: initial.url,
  });
  // Initialize true when the page already loads with a cached "ready" PDF, so we
  // don't auto-download on first mount. start() resets this to false on user click.
  const [autoDownloaded, setAutoDownloaded] = useState(initial.status === "ready");

  // Poll while generating
  useEffect(() => {
    if (state.status !== "generating") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/sop/${sopId}/pdf`, { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (cancelled) return;
        setState({ status: j.status, url: j.url, errorMessage: j.errorMessage });
      } catch {
        // ignore transient errors; will retry
      }
    };
    const id = setInterval(tick, 2000);
    return () => { cancelled = true; clearInterval(id); };
  }, [state.status, sopId]);

  // Auto-trigger download once when status flips to ready (and we kicked off the job this session)
  useEffect(() => {
    if (state.status === "ready" && state.url && !autoDownloaded) {
      const a = document.createElement("a");
      a.href = state.url;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setAutoDownloaded(true);
    }
  }, [state.status, state.url, autoDownloaded]);

  async function start() {
    setAutoDownloaded(false);
    setState(s => ({ ...s, status: "generating" }));
    const r = await fetch(`/api/sop/${sopId}/pdf`, { method: "POST" });
    const j = await r.json();
    if (j.status === "ready") {
      setState({ status: "ready", url: j.url });
    } else if (j.status === "generating") {
      setState({ status: "generating", url: null });
    } else {
      setState({ status: "error", url: null, errorMessage: j.error ?? "unknown" });
    }
  }

  if (state.status === "generating") {
    return (
      <button
        disabled
        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-[#6B7280]"
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
        Đang tạo PDF...
      </button>
    );
  }
  if (state.status === "error") {
    return (
      <button
        onClick={start}
        className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] font-medium text-red-700 hover:bg-red-100 transition"
      >
        <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
        Thử lại
      </button>
    );
  }
  // idle or ready
  return (
    <button
      onClick={start}
      className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-[#0A0A0A] hover:bg-gray-50 transition"
    >
      <FileDown className="w-3.5 h-3.5" strokeWidth={2} />
      Xuất PDF
    </button>
  );
}
