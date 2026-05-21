import type { Metadata } from "next";
import { Kulim_Park, Gloria_Hallelujah } from "next/font/google";
import "./globals.css";

const kulimPark = Kulim_Park({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  variable: "--font-kulim",
});

const gloriaHallelujah = Gloria_Hallelujah({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-gloria",
});

export const metadata: Metadata = {
  title: "What's Cookin', Good Lookin'?",
  description: "Your personal recipe repository",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${kulimPark.variable} ${gloriaHallelujah.variable}`}>
      <body className="min-h-screen bg-[#f8f0eb] text-[#3e260f] antialiased font-[family-name:var(--font-kulim)]">
        {children}
      </body>
    </html>
  );
}
