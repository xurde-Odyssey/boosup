"use client";

import { useEffect, useState } from "react";
import { Languages, MonitorCog, Moon, Rows3, SunMedium, TimerReset } from "lucide-react";
import { cn } from "@/lib/utils";

type ThemeMode = "light" | "dark";
type PaginationSize = "10" | "25" | "50";
type DashboardRange = "week" | "month" | "year";
type AppLanguage = "eng" | "nep";

const THEME_KEY = "bookkeep-theme";
const LANGUAGE_KEY = "bookkeep-language";
const PAGE_SIZE_KEY = "bookkeep-page-size";
const DASHBOARD_RANGE_KEY = "bookkeep-dashboard-range";
const TIMEZONE_KEY = "bookkeep-timezone";

const preferenceButtonClass = (active: boolean) =>
  cn(
    "rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
    active
      ? "border-blue-200 bg-blue-50 text-blue-700"
      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
  );

export function SystemPreferencesPanel() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "light";
    const savedTheme = localStorage.getItem(THEME_KEY);
    return savedTheme === "dark" || savedTheme === "light" ? savedTheme : "light";
  });
  const [language, setLanguage] = useState<AppLanguage>(() => {
    if (typeof window === "undefined") return "eng";
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
    return savedLanguage === "eng" || savedLanguage === "nep" ? savedLanguage : "eng";
  });
  const [pageSize, setPageSize] = useState<PaginationSize>(() => {
    if (typeof window === "undefined") return "10";
    const savedPageSize = localStorage.getItem(PAGE_SIZE_KEY);
    return savedPageSize === "10" || savedPageSize === "25" || savedPageSize === "50"
      ? savedPageSize
      : "10";
  });
  const [dashboardRange, setDashboardRange] = useState<DashboardRange>(() => {
    if (typeof window === "undefined") return "year";
    const savedDashboardRange = localStorage.getItem(DASHBOARD_RANGE_KEY);
    return savedDashboardRange === "week" ||
      savedDashboardRange === "month" ||
      savedDashboardRange === "year"
      ? savedDashboardRange
      : "year";
  });
  const [timezone, setTimezone] = useState(() => {
    if (typeof window === "undefined") return "Asia/Kathmandu";
    return localStorage.getItem(TIMEZONE_KEY) || "Asia/Kathmandu";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const updateTheme = (value: ThemeMode) => {
    setTheme(value);
    localStorage.setItem(THEME_KEY, value);
    document.documentElement.classList.toggle("dark", value === "dark");
    window.dispatchEvent(new Event("bookkeep-theme-change"));
  };

  const updateLanguage = (value: AppLanguage) => {
    setLanguage(value);
    localStorage.setItem(LANGUAGE_KEY, value);
  };

  const updatePageSize = (value: PaginationSize) => {
    setPageSize(value);
    localStorage.setItem(PAGE_SIZE_KEY, value);
  };

  const updateDashboardRange = (value: DashboardRange) => {
    setDashboardRange(value);
    localStorage.setItem(DASHBOARD_RANGE_KEY, value);
  };

  const updateTimezone = (value: string) => {
    setTimezone(value);
    localStorage.setItem(TIMEZONE_KEY, value);
  };

  return (
    <div className="mt-5 space-y-4">
      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <MonitorCog className="h-4 w-4 text-slate-500" />
          Theme
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => updateTheme("light")} className={preferenceButtonClass(theme === "light")}>
            <span className="inline-flex items-center gap-2">
              <SunMedium className="h-4 w-4" />
              Light
            </span>
          </button>
          <button type="button" onClick={() => updateTheme("dark")} className={preferenceButtonClass(theme === "dark")}>
            <span className="inline-flex items-center gap-2">
              <Moon className="h-4 w-4" />
              Dark
            </span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Languages className="h-4 w-4 text-slate-500" />
          Language
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => updateLanguage("eng")} className={preferenceButtonClass(language === "eng")}>
            Eng
          </button>
          <button type="button" onClick={() => updateLanguage("nep")} className={preferenceButtonClass(language === "nep")}>
            Nep
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Rows3 className="h-4 w-4 text-slate-500" />
          Default Pagination Size
        </div>
        <div className="flex flex-wrap gap-2">
          {(["10", "25", "50"] as PaginationSize[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => updatePageSize(value)}
              className={preferenceButtonClass(pageSize === value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <TimerReset className="h-4 w-4 text-slate-500" />
          Default Dashboard Range
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            ["week", "Week"],
            ["month", "Month"],
            ["year", "Year"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => updateDashboardRange(value)}
              className={preferenceButtonClass(dashboardRange === value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
        <div className="mb-3 text-sm font-semibold text-slate-800">Timezone</div>
        <div className="flex flex-wrap gap-2">
          {[
            "Asia/Kathmandu",
            "Asia/Kolkata",
            "UTC",
          ].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => updateTimezone(value)}
              className={preferenceButtonClass(timezone === value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
