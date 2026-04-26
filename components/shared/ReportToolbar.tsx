"use client";

import Link from "next/link";
import { CalendarRange, Check } from "lucide-react";
import { ReactNode, useRef, useState } from "react";
import { NepaliDateInput } from "@/components/shared/NepaliDateInput";
import { type AppLocale, getMessages } from "@/lib/i18n";
import { adToBs, bsToAd } from "@/lib/nepali-date";
import { getReportRangeSelection, type ReportRangeKey } from "@/lib/report-range";
import { cn } from "@/lib/utils";

const getTodayDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
  }).format(new Date());

export function ReportToolbar({
  actionPath,
  selectedRange = "year",
  fromDate,
  toDate,
  reportButton,
  locale = "en",
}: {
  actionPath: string;
  selectedRange?: string;
  fromDate?: string;
  toDate?: string;
  reportButton?: ReactNode;
  locale?: AppLocale;
}) {
  const messages = getMessages(locale);
  const toolbarMessages = messages.reportToolbar;
  const today = getTodayDate();
  const formRef = useRef<HTMLFormElement>(null);
  const committedSelection = getReportRangeSelection(selectedRange, {
    todayIso: today,
    fromIso: fromDate,
    toIso: toDate,
  });
  const [range, setRange] = useState(committedSelection.selectedRange);
  const [fromBs, setFromBs] = useState(adToBs(committedSelection.startDateISO));
  const [toBs, setToBs] = useState(adToBs(committedSelection.endDateISOInclusive));
  const showCustomDates = range === "custom";
  const isDirty =
    range !== committedSelection.selectedRange ||
    fromBs !== adToBs(committedSelection.startDateISO) ||
    toBs !== adToBs(committedSelection.endDateISOInclusive);
  const rangeOptions: Array<{ value: ReportRangeKey; label: string }> = [
    { value: "week", label: toolbarMessages.week },
    { value: "month", label: toolbarMessages.month },
    { value: "year", label: toolbarMessages.year },
    { value: "custom", label: toolbarMessages.custom },
  ];

  const handleRangeChange = (nextRange: ReportRangeKey) => {
    setRange(nextRange);
    const nextSelection = getReportRangeSelection(nextRange, {
      todayIso: today,
      fromIso: fromDate,
      toIso: toDate,
    });

    if (nextRange === "custom") {
      setFromBs(adToBs(committedSelection.startDateISO));
      setToBs(adToBs(committedSelection.endDateISOInclusive));
    } else {
      setFromBs(adToBs(nextSelection.startDateISO));
      setToBs(adToBs(nextSelection.endDateISOInclusive));
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
          <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <div className="rounded-xl bg-slate-100 p-2 text-slate-500">
                <CalendarRange className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  {toolbarMessages.reportRange}
                </div>
                <div className="text-sm font-semibold text-slate-800">
                  {toolbarMessages.filterVisibleReportView}
                </div>
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

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            {showCustomDates && (
              <button
                type="submit"
                className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 sm:w-auto"
              >
                {toolbarMessages.apply}
              </button>
            )}
            <Link
              href={actionPath}
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
            >
              {toolbarMessages.reset}
            </Link>
            <div className={cn(isDirty && "pointer-events-none opacity-50")}>
              {reportButton ?? (
                <button
                  type="button"
                  disabled={isDirty}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed sm:w-auto"
                >
                  {toolbarMessages.generateReport}
                </button>
              )}
            </div>
          </div>
        </div>

        {showCustomDates && (
          <div className="border-t border-slate-100 pt-4">
            <div className="grid grid-cols-1 gap-4 xl:max-w-[860px] xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:items-end">
              <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                {toolbarMessages.dateFrom}
              </label>
                <NepaliDateInput
                  value={fromBs}
                  onChange={setFromBs}
                  className="w-full"
                  inputClassName="min-h-[50px] bg-slate-50 px-4 py-3.5 focus:bg-white"
                />
              </div>
              <div className="hidden xl:flex xl:h-[50px] xl:items-center xl:justify-center xl:px-2">
                <div className="text-sm font-semibold text-slate-400">{toolbarMessages.to}</div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  {toolbarMessages.dateTo}
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
