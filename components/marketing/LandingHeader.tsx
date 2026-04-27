"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { APP_BRAND_LOGO_PATH, APP_BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

const SECTION_LINKS = [
  { id: "features", label: "Features" },
  { id: "how-it-works", label: "How It Works" },
  { id: "faq", label: "FAQ" },
] as const;

export function LandingHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<(typeof SECTION_LINKS)[number]["id"]>("features");

  useEffect(() => {
    const sectionElements = SECTION_LINKS.map((item) => document.getElementById(item.id)).filter(
      (element): element is HTMLElement => Boolean(element),
    );

    if (sectionElements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visibleEntries[0]?.target.id) {
          setActiveSection(visibleEntries[0].target.id as (typeof SECTION_LINKS)[number]["id"]);
        }
      },
      {
        rootMargin: "-30% 0px -55% 0px",
        threshold: [0.2, 0.45, 0.7],
      },
    );

    sectionElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMenuOpen]);

  const handleScrollTo = (sectionId: (typeof SECTION_LINKS)[number]["id"]) => {
    const element = document.getElementById(sectionId);
    if (!element) {
      return;
    }

    const headerHeight = document.querySelector("header")?.getBoundingClientRect().height ?? 0;
    const targetTop = window.scrollY + element.getBoundingClientRect().top - headerHeight - 20;

    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: "smooth",
    });

    setActiveSection(sectionId);
    setIsMenuOpen(false);
  };

  const navLinks = useMemo(
    () =>
      SECTION_LINKS.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => handleScrollTo(item.id)}
          className={cn(
            "relative pb-2 text-sm font-semibold transition-colors after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:rounded-full after:bg-blue-600 after:transition-transform after:duration-200",
            activeSection === item.id
              ? "text-slate-950 after:scale-x-100"
              : "text-slate-500 after:scale-x-0 hover:text-slate-950 hover:after:scale-x-100",
          )}
        >
          {item.label}
        </button>
      )),
    [activeSection],
  );

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/88 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden sm:h-14 sm:w-14">
            <Image
              src={APP_BRAND_LOGO_PATH}
              alt={`${APP_BRAND_NAME} logo`}
              width={56}
              height={56}
              className="h-full w-full object-contain"
              priority
              unoptimized
            />
          </div>
          <div className="min-w-0">
            <div className="truncate text-2xl font-black tracking-tight text-blue-600 sm:text-[2.1rem]">
              {APP_BRAND_NAME}
            </div>
            <div className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Management System
            </div>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">{navLinks}</nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-950"
          >
            Login
          </Link>
          <Link
            href="/login?next=/dashboard"
            className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm shadow-blue-600/25 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700"
          >
            Get Started
          </Link>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <Link
            href="/login?next=/dashboard"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-600/25 transition-colors hover:bg-blue-700"
          >
            Get Started
          </Link>
          <button
            type="button"
            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setIsMenuOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "border-t border-slate-200/70 bg-white/96 transition-all duration-300 md:hidden",
          isMenuOpen ? "pointer-events-auto max-h-96 opacity-100" : "pointer-events-none max-h-0 opacity-0",
        )}
      >
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6">
          {SECTION_LINKS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleScrollTo(item.id)}
              className={cn(
                "rounded-xl px-4 py-3 text-left text-sm font-semibold transition-colors",
                activeSection === item.id
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-700 hover:bg-slate-50 hover:text-slate-950",
              )}
            >
              {item.label}
            </button>
          ))}
          <Link
            href="/login"
            onClick={() => setIsMenuOpen(false)}
            className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950"
          >
            Login
          </Link>
        </div>
      </div>
    </header>
  );
}
