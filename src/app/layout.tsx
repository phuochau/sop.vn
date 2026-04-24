import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const font = Be_Vietnam_Pro({ subsets: ["latin", "vietnamese"], weight: ["400","500","600","700"] });

export const metadata: Metadata = {
  title: "SOP.vn — Biến video thành hướng dẫn từng bước",
  description: "Tải video — AI tạo SOP — Xong.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={font.className}>{children}</body>
    </html>
  );
}
