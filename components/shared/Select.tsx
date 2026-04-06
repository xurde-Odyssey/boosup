import { forwardRef, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const selectClassName =
  "h-[var(--ui-input-h)] w-full rounded-[var(--ui-radius-input)] border border-[color:var(--ui-border-strong)] bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-[color:var(--ui-ring)] focus:bg-white dark:bg-slate-900/60 dark:text-slate-50";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select ref={ref} className={cn(selectClassName, className)} {...props} />
  ),
);

Select.displayName = "Select";
