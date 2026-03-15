"use client";

import Link from "next/link";
import { CalendarRange, Check } from "lucide-react";
import { ReactNode, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const getTodayDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
  }).format(new Date());

const getDefaultRange = (range: string, today: string) => {
  const current = new Date(`${today}T00:00:00`);

  if (range === "week") {
    const day = current.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const start = new Date(current);
    start.setDate(current.getDate() - diff);
    return {
      from: start.toISOString().slice(0, 10),
      to: today,
    };
  }

  if (range === "year") {
    return {
      from: `${current.getFullYear()}-01-01`,
      to: today,
    };
  }

  if (range === "custom") {
    return {
      from: today,
      to: today,
    };
  }

  return {
    from: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-01`,
    to: today,
  };
};

export function ReportToolbar({
  actionPath,
  selectedRange = "month",
  fromDate,
  toDate,
  reportButton,
}: {
  actionPath: string;
  selectedRange?: string;
  fromDate?: string;
  toDate?: string;
  reportButton?: ReactNode;
}) {
  const today = getTodayDate();
  const formRef = useRef<HTMLFormElement>(null);
  const [range, setRange] = useState(selectedRange);
  const defaults = getDefaultRange(range, today);
  const showCustomDates = range === "custom";
  const rangeOptions = [
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "year", label: "Year" },
    { value: "custom", label: "Custom" },
  ];

  const handleRangeChange = (nextRange: string) => {
    setRange(nextRange);

    if (nextRange !== "custom") {
      requestAnimationFrame(() => formRef.current?.requestSubmit());
    }
  };

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm">
      <form ref={formRef} action={actionPath} className="space-y-3">
        <input type="hidden" name="range" value={range} />

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-500">
                <CalendarRange className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  Report Range
                </div>
                <div className="text-sm font-semibold text-slate-800">Filter the visible report view</div>
              </div>
            </div>

            <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
              {rangeOptions.map((option) => {
                const isActive = range === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleRangeChange(option.value)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-all",
                      isActive
                        ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-200"
                        : "text-slate-500 hover:text-slate-900",
                    )}
                  >
                    {isActive && <Check className="h-3.5 w-3.5 text-blue-600" />}
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {showCustomDates && (
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
              >
                Apply
              </button>
            )}
            <Link
              href={actionPath}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Reset
            </Link>
            {reportButton ?? (
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                Generate Report
              </button>
            )}
          </div>
        </div>

        {showCustomDates && (
          <div className="grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 md:grid-cols-[minmax(0,190px)_minmax(0,190px)]">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Date From
              </label>
              <input
                name="from"
                type="date"
                defaultValue={fromDate ?? defaults.from}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Date To
              </label>
              <input
                name="to"
                type="date"
                defaultValue={toDate ?? defaults.to}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>
        )}
      </form>
    </section>
  );
}
