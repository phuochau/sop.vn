import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Nav({ variant = "landing" }: { variant?: "landing" | "app" }) {
  return (
    <header className="w-full border-b bg-white/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            S
          </span>
          <span className="font-semibold">SOP.vn</span>
          <span className="text-[10px] font-semibold tracking-wide text-blue-600 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5">
            BETA
          </span>
        </Link>
        {variant === "landing" ? (
          <nav className="flex items-center gap-6 text-sm">
            <Link href="#features" className="hidden md:inline text-gray-600 hover:text-gray-900">Tính năng</Link>
            <Link href="#examples" className="hidden md:inline text-gray-600 hover:text-gray-900">Ví dụ</Link>
            <Link href="/upload">
              <Button size="sm" className="bg-gray-900 hover:bg-gray-800">Bắt đầu</Button>
            </Link>
          </nav>
        ) : (
          <Link href="/upload">
            <Button size="sm" variant="outline">Tạo SOP mới</Button>
          </Link>
        )}
      </div>
    </header>
  );
}
