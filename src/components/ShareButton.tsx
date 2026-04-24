"use client";
import { useState } from "react";
import { Share2, Link as LinkIcon, Check } from "lucide-react";

export function ShareButton({ token, variant = "primary" }: { token: string; variant?: "primary" | "outline" }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const url = `${location.origin}/share/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  if (variant === "outline") {
    return (
      <button
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-medium text-[#0A0A0A] hover:bg-gray-50 transition"
      >
        {copied ? <Check className="w-3.5 h-3.5" strokeWidth={2} /> : <Share2 className="w-3.5 h-3.5" strokeWidth={2} />}
        {copied ? "Đã sao chép!" : "Chia sẻ"}
      </button>
    );
  }
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-full bg-[#0066FF] text-white text-[13px] font-medium px-4 py-2.5 hover:bg-blue-700 transition"
    >
      {copied ? <Check className="w-3.5 h-3.5" strokeWidth={2} /> : <LinkIcon className="w-3.5 h-3.5" strokeWidth={2} />}
      {copied ? "Đã sao chép!" : "Sao chép link"}
    </button>
  );
}
