"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function ShareButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    const url = `${location.origin}/share/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <Button size="sm" onClick={copy} className="rounded-full bg-blue-600 hover:bg-blue-700">
      <svg className="w-3.5 h-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
      </svg>
      {copied ? "Đã sao chép!" : "Chia sẻ link"}
    </Button>
  );
}
