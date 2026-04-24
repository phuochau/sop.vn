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
  return <Button variant="secondary" onClick={copy}>{copied ? "Đã sao chép!" : "Chia sẻ link"}</Button>;
}
