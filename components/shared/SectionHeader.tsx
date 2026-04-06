import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 border-b border-slate-100 p-6 sm:flex-row sm:items-start sm:justify-between dark:border-slate-800/70",
        className,
      )}
    >
      <div>
        <h3 className="text-[var(--ui-text-xl)] font-semibold text-slate-900 dark:text-slate-50">
          {title}
        </h3>
        {description ? (
          <p className="mt-1 text-[var(--ui-text-sm)] text-slate-500 dark:text-slate-400">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
