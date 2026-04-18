import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "FC KUMANO 管理",
  description: "LINE LIFF based FC KUMANO schedule and score management app",
  icons: {
    icon: "/fc-kumano-logo.png",
    shortcut: "/fc-kumano-logo.png",
    apple: "/fc-kumano-logo.png"
  },
  appleWebApp: {
    capable: true,
    title: "FC KUMANO"
  },
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
