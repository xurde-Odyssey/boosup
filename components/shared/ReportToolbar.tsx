"use client";

import Link from "next/link";
import { CalendarRange, Check } from "lucide-react";
import { ReactNode, useRef, useState } from "react";
import { NepaliDateInput } from "@/components/shared/NepaliDateInput";
import { adToBs, bsToAd } from "@/lib/nepali-date";
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
  selectedRange = "year",
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
  const [fromBs, setFromBs] = useState(adToBs(fromDate ?? defaults.from));
  const [toBs, setToBs] = useState(adToBs(toDate ?? defaults.to));
  const showCustomDates = range === "custom";
  const rangeOptions = [
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "year", label: "Year" },
    { value: "custom", label: "Custom" },
  ];

  const handleRangeChange = (nextRange: string) => {
    setRange(nextRange);
    const nextDefaults = getDefaultRange(nextRange, today);

    if (nextRange === "custom") {
      setFromBs(adToBs(fromDate ?? nextDefaults.from));
      setToBs(adToBs(toDate ?? nextDefaults.to));
    } else {
      setFromBs(adToBs(nextDefaults.from));
      setToBs(adToBs(nextDefaults.to));
    }

    if (nextRange !== "custom") {
      requestAnimationFrame(() => formRef.current?.requestSubmit());
    }
  };

  return (
    <section className="mb-6 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm">
      <form ref={formRef} action={actionPath} className="space-y-3">
        <input type="hidden" name="range" value={range} />
        <input type="hidden" name="from" value={bsToAd(fromBs)} />
        <input type="hidden" name="to" value={bsToAd(toBs)} />

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
          <div className="border-t border-slate-100 pt-4">
            <div className="grid grid-cols-1 gap-4 xl:max-w-[860px] xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:items-end">
              <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Date From
              </label>
                <NepaliDateInput
                  value={fromBs}
                  onChange={setFromBs}
                  className="w-full"
                  inputClassName="min-h-[50px] bg-slate-50 px-4 py-3.5 focus:bg-white"
                />
              </div>
              <div className="hidden xl:flex xl:h-[50px] xl:items-center xl:justify-center xl:px-2">
                <div className="text-sm font-semibold text-slate-400">to</div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Date To
                </label>
                <NepaliDateInput
                  value={toBs}
                  onChange={setToBs}
                  className="w-full"
                  inputClassName="min-h-[50px] bg-slate-50 px-4 py-3.5 focus:bg-white"
                />
              </div>
            </div>
          </div>
        )}
      </form>
    </section>
  );
}
