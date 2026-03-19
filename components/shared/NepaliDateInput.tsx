"use client";

import { NepaliDatePicker } from "nepali-datepicker-reactjs";
import { normalizeBsDate } from "@/lib/nepali-date";
import { cn } from "@/lib/utils";

type NepaliDateInputProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  inputClassName?: string;
};

export function NepaliDateInput({
  value,
  onChange,
  className,
  inputClassName,
}: NepaliDateInputProps) {
  return (
    <NepaliDatePicker
      className={cn("block w-full", className)}
      inputClassName={cn(
        "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500",
        inputClassName,
      )}
      value={normalizeBsDate(value)}
      onChange={(nextValue) => onChange(normalizeBsDate(nextValue))}
      options={{ calenderLocale: "en", valueLocale: "en" }}
      todayIfEmpty={false}
    />
  );
}
