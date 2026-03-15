import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/shared/SiteFooter";
import siteIcon from "./logos/icon.png";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BookKeep Pro",
  description: "Bookkeeping system for sales, purchases, vendors, products, and staff.",
  icons: {
    icon: siteIcon.src,
    shortcut: siteIcon.src,
    apple: siteIcon.src,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <div className="shrink-0">
            <SiteFooter />
          </div>
        </div>
      </body>
    </html>
  );
}
