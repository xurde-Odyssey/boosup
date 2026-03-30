import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "nepali-datepicker-reactjs/dist/index.css";
import { getCompanySettings } from "@/lib/company-settings-server";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { SonnerToaster } from "@/components/shared/SonnerToaster";
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

export async function generateMetadata(): Promise<Metadata> {
  const company = await getCompanySettings();
  const faviconPath = company.faviconPath || siteIcon.src;

  return {
    title: "BookKeep Pro",
    description: "Bookkeeping system for sales, purchases, suppliers, products, and staff.",
    icons: {
      icon: faviconPath,
      shortcut: faviconPath,
      apple: faviconPath,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var storedTheme = localStorage.getItem('bookkeep-theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var shouldUseDark = storedTheme ? storedTheme === 'dark' : prefersDark;
                  document.documentElement.classList.toggle('dark', shouldUseDark);
                } catch (error) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="flex min-h-screen flex-col">
          <SonnerToaster />
          <div className="flex-1">{children}</div>
          <div className="shrink-0">
            <SiteFooter />
          </div>
        </div>
      </body>
    </html>
  );
}
