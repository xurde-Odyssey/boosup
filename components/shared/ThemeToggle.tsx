"use client";

import { Moon, SunMedium } from "lucide-react";
import { useSyncExternalStore } from "react";

const THEME_KEY = "bookkeep-theme";
const THEME_EVENT = "bookkeep-theme-change";

const getResolvedTheme = () => {
  if (typeof window === "undefined") {
    return "light";
  }

  const storedTheme = window.localStorage.getItem(THEME_KEY);
  if (storedTheme === "dark" || storedTheme === "light") {
    return storedTheme;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const subscribe = (callback: () => void) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handleChange = () => callback();
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  window.addEventListener(THEME_EVENT, handleChange);
  window.addEventListener("storage", handleChange);
  mediaQuery.addEventListener("change", handleChange);

  return () => {
    window.removeEventListener(THEME_EVENT, handleChange);
    window.removeEventListener("storage", handleChange);
    mediaQuery.removeEventListener("change", handleChange);
  };
};

const getThemeSnapshot = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return getResolvedTheme() === "dark";
};

export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getThemeSnapshot, () => false);

  const toggleTheme = () => {
    if (typeof document === "undefined" || typeof window === "undefined") {
      return;
    }

    const nextIsDark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", nextIsDark);
    document.documentElement.style.colorScheme = nextIsDark ? "dark" : "light";
    window.localStorage.setItem(THEME_KEY, nextIsDark ? "dark" : "light");
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-[var(--ui-button-h-lg)] items-center rounded-[var(--ui-radius-button)] border border-[color:var(--ui-border-strong)] bg-white px-4 shadow-sm transition-all duration-200 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/90 dark:hover:bg-slate-800"
      aria-pressed={isDark}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <div
        className={`relative flex h-10 w-[74px] items-center rounded-full px-1 transition-colors ${
          isDark ? "bg-slate-800" : "bg-slate-100"
        }`}
      >
        <div
          className={`absolute top-1 h-8 w-8 rounded-full shadow-sm transition-all duration-200 ${
            isDark
              ? "translate-x-[34px] bg-slate-950"
              : "translate-x-0 bg-white"
          }`}
        />
        <div className="relative z-10 flex w-full items-center justify-between px-1.5">
          <SunMedium
            className={`h-4 w-4 transition-colors ${
              isDark ? "text-slate-500" : "text-amber-500"
            }`}
          />
          <Moon
            className={`h-4 w-4 transition-colors ${
              isDark ? "text-cyan-300" : "text-slate-400"
            }`}
          />
        </div>
      </div>
    </button>
  );
}
