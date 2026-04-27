import type { Metadata } from "next";
import { cookies } from "next/headers";
import "nepali-datepicker-reactjs/dist/index.css";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { SonnerToaster } from "@/components/shared/SonnerToaster";
import { APP_BRAND_DESCRIPTION, APP_BRAND_NAME } from "@/lib/brand";
import { LANGUAGE_COOKIE, resolveLocale } from "@/lib/i18n";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: APP_BRAND_NAME,
    description: APP_BRAND_DESCRIPTION,
    icons: {
      icon: "/logos/book.ico",
      shortcut: "/logos/book.ico",
      apple: "/logos/book.ico",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const htmlLang = resolveLocale(cookieStore.get(LANGUAGE_COOKIE)?.value);

  return (
    <html lang={htmlLang} suppressHydrationWarning>
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
                  document.documentElement.style.colorScheme = shouldUseDark ? 'dark' : 'light';
                } catch (error) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
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
