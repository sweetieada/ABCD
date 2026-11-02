import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/firebase/auth-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "MemoCard 智慧閃卡",
  description: "整理牌組，開始有效率的間隔複習。",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-Hant-TW">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
