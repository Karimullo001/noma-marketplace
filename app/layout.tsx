import type { Metadata } from "next";
import "./globals.css";
import { APP_CONFIG } from "@/lib/config";

export const metadata: Metadata = {
  title: `${APP_CONFIG.brandName} — ${APP_CONFIG.defaultCity} Moda Marketpleysi`,
  description: `${APP_CONFIG.defaultCity} shahridagi kiyim-kechak, poyabzal va aksessuar do'konlarining onlayn marketpleysi.`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uz">
      <body className="min-h-screen flex flex-col font-sans bg-background text-foreground antialiased selection:bg-accent/15 selection:text-accent">
        {children}
      </body>
    </html>
  );
}
