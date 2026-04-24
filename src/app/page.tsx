import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 gap-8 text-center">
      <h1 className="text-4xl md:text-5xl font-bold max-w-3xl leading-tight">
        Biến mọi video đào tạo thành SOP từng bước trong 2 phút
      </h1>
      <p className="text-lg text-muted-foreground max-w-xl">
        Tải lên video. AI tạo SOP. Xong.
      </p>
      <Link href="/upload">
        <Button size="lg" className="text-base">Tải video lên</Button>
      </Link>
      <div className="flex flex-wrap gap-3 justify-center mt-4 text-sm text-muted-foreground">
        <span>Công thức pha chế</span>·<span>Quy trình bếp</span>·<span>Quy trình spa</span>
      </div>
      <section className="mt-16 grid md:grid-cols-3 gap-6 max-w-4xl">
        {[
          ["1. Tải lên", "Chọn video đào tạo của bạn."],
          ["2. AI trích xuất bước", "AI nghe và hiểu từng bước."],
          ["3. Nhận SOP", "Chia sẻ link hoặc in PDF."],
        ].map(([h, p]) => (
          <div key={h} className="rounded-lg border p-6 text-left">
            <h3 className="font-semibold">{h}</h3>
            <p className="text-sm text-muted-foreground mt-2">{p}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
