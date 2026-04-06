import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const inputClassName =
  "h-[var(--ui-input-h)] w-full rounded-[var(--ui-radius-input)] border border-[color:var(--ui-border-strong)] bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-[color:var(--ui-ring)] focus:bg-white dark:bg-slate-900/60 dark:text-slate-50 dark:hover:bg-slate-900/80";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(inputClassName, className)} {...props} />
  ),
);

Input.displayName = "Input";
