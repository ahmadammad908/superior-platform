import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#6C1C74",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Superior Connection | Anonymous University Platform",
  description:
    "High-performance, completely anonymous university community platform. Share thoughts, campus news, photos, and short videos without signing up or creating an account.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-[#6C1C74]/20 selection:text-[#6C1C74]">
        {children}
      </body>
    </html>
  );
}
