"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Admin() {
  const [pw, setPw] = useState("");
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setErr(null);
    const r = await fetch("/api/admin/stats", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (!r.ok) { setErr("Sai mật khẩu"); return; }
    setData(await r.json());
  }

  if (!data) return (
    <main className="max-w-sm mx-auto px-6 py-20 space-y-4">
      <h1 className="text-xl font-semibold">Admin</h1>
      <Input type="password" placeholder="Mật khẩu" value={pw} onChange={e => setPw(e.target.value)} />
      {err && <p className="text-sm text-red-600">{err}</p>}
      <Button onClick={load} className="w-full">Đăng nhập</Button>
    </main>
  );

  const Row = ({ label, v }: { label: string; v: any }) => (
    <div className="grid grid-cols-4 gap-4 py-2 border-b text-sm">
      <div className="font-medium">{label}</div>
      <div>Uploads: {v.upload}</div>
      <div>SOPs: {v.sop_completed}</div>
      <div>Shares: {v.share_view}</div>
    </div>
  );
  return (
    <main className="max-w-3xl mx-auto px-6 py-10 space-y-4">
      <h1 className="text-2xl font-bold">Admin</h1>
      <div className="rounded-lg border p-4">
        <Row label="Hôm nay" v={data.today} />
        <Row label="7 ngày" v={data.last7d} />
        <Row label="Tổng" v={data.allTime} />
      </div>
    </main>
  );
}
