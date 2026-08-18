import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "服装跟单智能工作台",
  description: "云端跟单资料库 + AI 智能助手：款式、面料、辅料、大货单、产前版一站式管理",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
