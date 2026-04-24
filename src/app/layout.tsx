import type { Metadata } from "next";
import { Inter, Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});
const body = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SOP.vn — Biến video thành SOP tiếng Việt",
  description: "Tự động phân tích video YouTube, Loom hay bản ghi màn hình rồi xuất ra SOP bằng tiếng Việt.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${inter.variable} ${body.variable}`}>
      <body className={body.className}>{children}</body>
    </html>
  );
}
