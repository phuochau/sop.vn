import Link from "next/link";

export function Nav({ variant = "landing" }: { variant?: "landing" | "app" }) {
  return (
    <header className="w-full bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-6 md:px-12 h-[72px] flex items-center justify-between">
        {/* Left: logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-[#0A0A0A] text-white flex items-center justify-center font-bold text-sm">
            S
          </span>
          <span className="font-bold text-[18px] text-[#0A0A0A]" style={{ fontFamily: "var(--font-inter)" }}>
            SOP.vn
          </span>
          <span className="rounded-full bg-[#0066FF] text-white text-[10px] font-semibold tracking-wide px-2.5 py-[3px]">
            BETA
          </span>
        </Link>

        {variant === "landing" ? (
          <>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-gray-700 hover:text-gray-900">Tính năng</Link>
              <Link href="#examples" className="text-sm text-gray-700 hover:text-gray-900">Ví dụ</Link>
            </nav>
            <Link
              href="/upload"
              className="rounded-full bg-[#0A0A0A] text-white text-sm font-medium px-[18px] py-[10px] hover:bg-[#1a1a1a] transition"
            >
              Bắt đầu
            </Link>
          </>
        ) : (
          <Link
            href="/upload"
            className="rounded-full border border-gray-200 text-sm font-medium text-[#0A0A0A] px-[18px] py-[10px] hover:bg-gray-50 transition"
          >
            Tạo SOP mới
          </Link>
        )}
      </div>
    </header>
  );
}
