"use client";

import { Languages } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { AppLocale, getStoredLocale, LANGUAGE_COOKIE, LANGUAGE_KEY } from "@/lib/i18n";

const LANGUAGE_EVENT = "bookkeep-language-change";

const subscribe = (callback: () => void) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => callback();
  window.addEventListener(LANGUAGE_EVENT, handleChange);
  window.addEventListener("storage", handleChange);

  return () => {
    window.removeEventListener(LANGUAGE_EVENT, handleChange);
    window.removeEventListener("storage", handleChange);
  };
};

const getSnapshot = () => {
  if (typeof window === "undefined") {
    return "en" as AppLocale;
  }

  return getStoredLocale();
};

const persistLocale = (nextLocale: AppLocale) => {
  window.localStorage.setItem(LANGUAGE_KEY, nextLocale);
  document.cookie = `${LANGUAGE_COOKIE}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
  window.dispatchEvent(new Event(LANGUAGE_EVENT));
};

export function LanguageSwitcher({
  compact = false,
}: {
  compact?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useSyncExternalStore(subscribe, getSnapshot, () => "en");

  const setLocale = (nextLocale: AppLocale) => {
    if (typeof window === "undefined") return;

    persistLocale(nextLocale);

    const params = new URLSearchParams(searchParams.toString());
    params.set("lang", nextLocale);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    router.refresh();
  };

  if (compact) {
    return (
      <div className="inline-flex items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
        {(["en", "ne"] as AppLocale[]).map((value) => {
          const active = locale === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setLocale(value)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              {value === "en" ? "English" : "नेपाली"}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm transition-all duration-200 dark:border-slate-700 dark:bg-slate-900/90">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        <Languages className="h-4 w-4" />
      </div>
      <div className="text-left">
        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
          Language
        </div>
        <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 p-1 dark:bg-slate-800">
          {(["en", "ne"] as AppLocale[]).map((value) => {
            const active = locale === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setLocale(value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {value === "en" ? "English" : "नेपाली"}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
