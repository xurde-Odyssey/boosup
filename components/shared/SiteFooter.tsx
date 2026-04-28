"use client";

import Link from "next/link";
import { Globe, AtSign, ShieldCheck } from "lucide-react";
import { usePathname } from "next/navigation";
import { APP_BRAND_NAME } from "@/lib/brand";

export function SiteFooter() {
  const pathname = usePathname();

  if (pathname === "/") {
    return (
      <footer className="border-t border-slate-200/80 bg-white/82 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,_#0f172a_0%,_#1d4ed8_88%)] text-white shadow-[0_34px_100px_-34px_rgba(15,23,42,0.5)]">
            <div className="relative px-6 py-12 text-center sm:px-10 sm:py-14">
              <div className="absolute -left-4 bottom-0 h-20 w-20 rounded-tr-[28px] bg-white/5" />
              <div className="absolute right-0 top-0 h-36 w-36 rounded-bl-[28px] bg-white/5" />
              <h3 className="text-3xl font-black tracking-tight sm:text-4xl">
                Ready to simplify your business records?
              </h3>
              <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-blue-50/90 sm:text-lg">
                Join Nepali businesses using one system for billing, purchases, supplier records, salary tracking, and daily reporting.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/login?next=/dashboard"
                  className="inline-flex min-w-[190px] items-center justify-center rounded-2xl bg-white px-6 py-4 text-base font-semibold text-slate-950 shadow-sm transition-colors hover:bg-slate-100"
                >
                  Start Free Trial
                </Link>
                <a
                  href="#demo"
                  className="inline-flex min-w-[190px] items-center justify-center rounded-2xl border border-white/20 bg-transparent px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-white/8"
                >
                  Book a Demo
                </a>
              </div>
            </div>
          </div>

          <div className="mt-14 grid gap-10 border-b border-slate-200 pb-10 md:grid-cols-4">
            <div>
              <div className="text-3xl font-black tracking-tight text-slate-950">{APP_BRAND_NAME}</div>
              <p className="mt-4 max-w-xs text-base leading-8 text-slate-500">
                Smart bookkeeping for Nepali businesses with practical daily control over sales, purchases, staff, and supplier records.
              </p>
            </div>

            <div>
              <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-950">Product</div>
              <div className="mt-4 space-y-3 text-base text-slate-500">
                <a href="#features" className="block transition-colors hover:text-slate-950">Features</a>
                <a href="#how-it-works" className="block transition-colors hover:text-slate-950">How It Works</a>
                <a href="#faq" className="block transition-colors hover:text-slate-950">FAQ</a>
              </div>
            </div>

            <div>
              <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-950">Support</div>
              <div className="mt-4 space-y-3 text-base text-slate-500">
                <Link href="/login" className="block transition-colors hover:text-slate-950">Login</Link>
                <Link href="/login?next=/dashboard" className="block transition-colors hover:text-slate-950">Request Demo</Link>
                <a href="#faq" className="block transition-colors hover:text-slate-950">Security</a>
              </div>
            </div>

            <div>
              <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-950">Legal</div>
              <div className="mt-4 space-y-3 text-base text-slate-500">
                <span className="block">Privacy Policy</span>
                <span className="block">Terms of Service</span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 text-slate-500 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Secure</span>
              <span className="inline-flex items-center gap-2"><AtSign className="h-4 w-4" /> Contact Ready</span>
              <span className="inline-flex items-center gap-2"><Globe className="h-4 w-4" /> Nepal Focused</span>
            </div>
            <div className="text-sm">Made for daily business operations in Nepal</div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 text-sm text-slate-500 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{APP_BRAND_NAME}</span>{" "}
          <span>for bookkeeping, purchases, sales, suppliers, products, and staff.</span>
        </div>
        <div className="text-slate-400 dark:text-slate-500">Built for daily operations</div>
      </div>
    </footer>
  );
}
