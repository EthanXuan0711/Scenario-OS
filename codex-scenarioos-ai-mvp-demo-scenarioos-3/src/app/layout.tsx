import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "@xyflow/react/dist/style.css";

export const metadata: Metadata = {
  title: "ScenarioOS | 个人决策大脑",
  description: "基于 Next.js 的 ScenarioOS C 端个人生命路径推演工作台"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
