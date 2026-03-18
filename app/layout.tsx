import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Junior Soccer Score Memo",
  description: "LINE LIFF based junior soccer score memo app"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
