import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { getSiteOrigin } from "@/lib/site-origin";
import { DEFAULT_OG_IMAGE } from "@/lib/og";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const DESCRIPTION =
  "遊戲雜誌目錄索引網站，支援 AI 圖片辨識自動擷取目錄、多人協作編輯、標籤系統";

export const metadata: Metadata = {
  // 沒有這個，相對路徑的 OG 圖不會被展開成絕對網址，而抓取端只認絕對網址。
  metadataBase: new URL(getSiteOrigin()),
  title: {
    default: "TOCR - 雜誌目錄索引系統",
    template: "%s | TOCR",
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: "TOCR",
    locale: "zh_TW",
    title: "TOCR - 雜誌目錄索引系統",
    description: DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: { card: "summary_large_image" },
  // Search Console 的「HTML 標記」驗證。與 public/google*.html 那個檔案是兩條
  // 各自獨立的驗證方式，都留著：任一條斷了（換 DNS 供應商、檔案被清掉）還有
  // 別的撐著。驗證方式撤掉就會失效，所以這串不能當成沒用的字刪掉。
  verification: { google: "A9S8mqH8pKatJNUsiC8H3s-Ha3r8dpAfeGrMtQjP6nQ" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
