import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";

export default function Landing() {
  return (
    <>
      <Nav variant="landing" />
      <main className="max-w-6xl mx-auto px-6 pt-16 pb-8">
        {/* Hero */}
        <section className="flex flex-col items-center text-center gap-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs text-gray-600 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            SOP chuẩn — không chỉ là ghi chú quy trình
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-[1.1] tracking-tight">
            Biến video thành SOP<br />
            tiếng Việt
          </h1>
          <p className="text-gray-600 text-base md:text-lg leading-relaxed max-w-xl">
            Tự động trích xuất SOP từ video YouTube, Loom hay bản ghi màn hình. AI xuất ra quy trình thao tác chuẩn (SOP) bằng tiếng Việt — đánh số từng bước, kèm ảnh chụp và mô tả thao tác.
          </p>
          <div className="flex items-center gap-4 pt-2">
            <Link href="/upload">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6">
                Tạo SOP miễn phí
              </Button>
            </Link>
            <Link href="#examples" className="text-sm font-medium hover:underline">
              Xem ví dụ →
            </Link>
          </div>
          <p className="text-xs text-gray-500 flex items-center gap-2 pt-1">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Đang sử dụng Gemini 2.5 — chúng tôi không lưu thông tin đăng nhập Google
          </p>
        </section>

        {/* Tilted preview */}
        <section id="examples" className="mt-20 relative h-80 md:h-96 flex items-center justify-center">
          <div className="absolute left-1/2 -translate-x-[95%] -rotate-[8deg] w-56 md:w-64 rounded-xl border bg-white shadow-xl p-4">
            <div className="text-[10px] text-gray-400 mb-2">SOP #1</div>
            <div className="font-semibold text-sm mb-3">Báo cáo hàng tháng</div>
            <div className="space-y-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex gap-2 text-[10px]">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">{i}</span>
                  <div className="flex-1 space-y-1">
                    <div className="h-1.5 bg-gray-200 rounded w-full" />
                    <div className="h-1.5 bg-gray-100 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute left-1/2 -translate-x-1/2 rotate-0 z-10 w-64 md:w-72 rounded-xl border bg-white shadow-2xl p-4">
            <div className="text-[10px] text-blue-600 mb-2">● Đang chạy</div>
            <div className="font-semibold text-sm mb-3">Thiết lập tài khoản email Google Workspace</div>
            <div className="bg-gray-100 rounded aspect-video mb-3 flex items-center justify-center">
              <span className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">▶</span>
            </div>
            <div className="space-y-1">
              <div className="h-2 bg-gray-200 rounded w-full" />
              <div className="h-2 bg-gray-100 rounded w-2/3" />
            </div>
          </div>
          <div className="absolute left-1/2 rotate-[8deg] w-56 md:w-64 rounded-xl border bg-white shadow-xl p-4" style={{ transform: "translateX(-5%) rotate(8deg)" }}>
            <div className="text-[10px] text-gray-400 mb-2">SOP #3</div>
            <div className="font-semibold text-sm mb-3">Quy trình pha chế</div>
            <div className="space-y-2">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex gap-2 text-[10px]">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">{i}</span>
                  <div className="flex-1 space-y-1">
                    <div className="h-1.5 bg-gray-200 rounded w-full" />
                    <div className="h-1.5 bg-gray-100 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mt-24 text-center">
          <h2 className="text-3xl md:text-4xl font-bold">Tính năng nổi bật</h2>
          <p className="text-gray-600 mt-3 max-w-xl mx-auto">
            Mọi thứ bạn cần để biến video thành tài liệu đào tạo chuẩn cho cả đội.
          </p>
          <div className="grid md:grid-cols-3 gap-5 mt-10 text-left">
            {[
              {
                icon: "⚡",
                title: "Tự động trích xuất bước",
                desc: "Nhận diện từng thao tác trong video và xuất thành SOP có đánh số thứ tự — không phải dàn ý mơ hồ.",
              },
              {
                icon: "📝",
                title: "Dịch & tóm tắt",
                desc: "Hỗ trợ tiếng Việt, tiếng Anh và nhiều ngôn ngữ khác. Gom gọn nội dung dài thành bước ngắn gọn.",
              },
              {
                icon: "🔒",
                title: "Riêng tư & tự sửa",
                desc: "Video không được dùng để huấn luyện AI. Hiển thị bước nào cần, bạn có thể sửa tự do ngay trên SOP.",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border bg-white p-6 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-lg mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
