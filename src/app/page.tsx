import Link from "next/link";
import { ArrowRight, CirclePlay, Shield, ListChecks, Languages, ShieldCheck } from "lucide-react";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export default function Landing() {
  return (
    <>
      <Nav variant="landing" />

      {/* Hero */}
      <section className="bg-white pt-20 pb-10 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col items-center gap-8 text-center">
          {/* Pill */}
          <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3.5 py-1.5 text-[13px] text-gray-700">
            <span className="text-gray-900">✦</span>
            SOP tiếng Việt cho doanh nghiệp
          </span>

          {/* Headline */}
          <div className="max-w-[880px] space-y-5">
            <h1
              className="font-bold text-[#0A0A0A] text-5xl md:text-[64px] leading-[1.05] tracking-[-0.025em]"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Biến video thành SOP tiếng Việt
            </h1>
            <p className="text-[#4B5563] text-lg leading-[1.5] max-w-[640px] mx-auto">
              Tự động phân tích video YouTube, Loom hay bản ghi màn hình rồi xuất ra quy trình thao tác chuẩn (SOP) bằng tiếng Việt — đánh số từng bước, kèm ảnh chụp và mốc thời gian.
            </p>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 rounded-full bg-[#0066FF] text-white font-medium text-[15px] px-[26px] py-[14px] hover:bg-blue-700 transition"
            >
              Tạo SOP miễn phí
              <ArrowRight className="w-4 h-4" strokeWidth={2} />
            </Link>
            <Link
              href="#examples"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white text-[#0A0A0A] font-medium text-[15px] px-[22px] py-[14px] hover:bg-gray-50 transition"
            >
              <CirclePlay className="w-4 h-4" strokeWidth={2} />
              Xem ví dụ
            </Link>
          </div>

          {/* Trust */}
          <div className="flex items-center gap-2 text-[12px] text-[#666666]">
            <Shield className="w-3.5 h-3.5" strokeWidth={2} />
            Riêng tư theo mặc định — chúng tôi không lưu dữ liệu của bạn. Video tự động xóa sau 30 ngày.
          </div>
        </div>

        {/* Cascade preview */}
        <div id="examples" className="max-w-7xl mx-auto relative mt-16 h-[420px] md:h-[520px]">
          {/* Back left, rotated -8deg */}
          <div className="absolute left-1/2 top-8 -ml-[320px] w-[320px] md:w-[380px] h-[360px] md:h-[440px] rounded-3xl border border-gray-200 bg-white shadow-xl p-6 hidden md:block" style={{ transform: "rotate(-8deg)" }}>
            <div className="h-2.5 rounded-full bg-gray-200 w-24 mb-3" />
            <div className="h-4 rounded bg-gray-300 w-3/4 mb-5" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="w-5 h-5 rounded-full bg-[#0066FF] text-white text-[10px] flex items-center justify-center shrink-0 mt-0.5">{i}</span>
                  <div className="flex-1 space-y-1.5">
                    <div className="h-2 rounded bg-gray-200 w-full" />
                    <div className="h-2 rounded bg-gray-100 w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Back right, rotated 8deg */}
          <div className="absolute left-1/2 top-8 -ml-[60px] w-[320px] md:w-[380px] h-[360px] md:h-[440px] rounded-3xl border border-gray-200 bg-white shadow-xl p-6 hidden md:block" style={{ transform: "rotate(8deg)" }}>
            <div className="h-2.5 rounded-full bg-gray-200 w-24 mb-3" />
            <div className="h-4 rounded bg-gray-300 w-2/3 mb-5" />
            <div className="aspect-video bg-gray-100 rounded-xl mb-3 flex items-center justify-center">
              <span className="w-8 h-8 rounded-full bg-white/95 flex items-center justify-center shadow">
                <CirclePlay className="w-4 h-4 text-[#0066FF]" strokeWidth={2} />
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="h-2 rounded bg-gray-200 w-full" />
              <div className="h-2 rounded bg-gray-100 w-2/3" />
            </div>
          </div>

          {/* Front center, bigger */}
          <div className="absolute left-1/2 -ml-[200px] md:-ml-[240px] top-0 w-[400px] md:w-[480px] h-[420px] md:h-[480px] rounded-3xl border border-gray-200 bg-white shadow-2xl p-7 md:p-8">
            <div className="flex items-center gap-2 text-[11px] text-[#0066FF] font-medium mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF]" />
              Đang chạy
            </div>
            <h3 className="font-bold text-lg mb-5 text-[#0A0A0A]" style={{ fontFamily: "var(--font-inter)" }}>
              Thiết lập tài khoản email Google Workspace
            </h3>
            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl mb-5 flex items-center justify-center">
              <span className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center">
                <CirclePlay className="w-5 h-5 text-[#0066FF]" strokeWidth={2} />
              </span>
            </div>
            <div className="space-y-3">
              {[
                "Truy cập trang quản trị Google Workspace",
                "Vào mục Người dùng và chọn Thêm người dùng",
                "Điền thông tin cá nhân của nhân viên",
              ].map((t, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                  <span className="w-5 h-5 rounded-full bg-[#0066FF] text-white text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-[13px] text-gray-700 leading-relaxed">{t}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white py-20 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-[720px] mx-auto text-center space-y-3.5 mb-12">
            <h2
              className="font-bold text-[#0A0A0A] text-3xl md:text-[42px] tracking-[-0.024em]"
              style={{ fontFamily: "var(--font-inter)" }}
            >
              Tính năng nổi bật
            </h2>
            <p className="text-[#4B5563] text-base leading-[1.5]">
              Mọi thứ bạn cần để biến tri thức ẩn trong video thành tài liệu vận hành chuẩn cho cả đội.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                Icon: ListChecks,
                title: "Tự động trích xuất bước",
                desc: "Nhận diện hành động trong video và tách thành các bước thao tác đánh số rõ ràng — không cần xem lại từ đầu.",
              },
              {
                Icon: Languages,
                title: "Dịch & tóm tắt",
                desc: "Hỗ trợ video tiếng Anh, Nhật, Hàn — kết quả luôn được dịch sang tiếng Việt tự nhiên, đúng ngữ cảnh chuyên ngành.",
              },
              {
                Icon: ShieldCheck,
                title: "Riêng tư & tự xóa",
                desc: "Chúng tôi không lưu dữ liệu. Video gốc tự xóa sau 30 ngày — bạn chỉ cần liên kết chia sẻ để giữ SOP.",
              },
            ].map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-[20px] border border-gray-200 bg-white p-8 flex flex-col gap-4"
                style={{ boxShadow: "0 8px 24px -4px rgba(10, 10, 10, 0.06)" }}
              >
                <div className="w-12 h-12 rounded-[14px] bg-[#EFF6FF] flex items-center justify-center">
                  <Icon className="w-6 h-6 text-[#2563EB]" strokeWidth={2} />
                </div>
                <h3
                  className="font-semibold text-xl text-[#0A0A0A]"
                  style={{ fontFamily: "var(--font-inter)" }}
                >
                  {title}
                </h3>
                <p className="text-sm text-[#6B7280] leading-[1.55]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
