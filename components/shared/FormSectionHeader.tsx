import { ReactNode } from "react";

export function FormSectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 pb-4">
      <div className="min-w-0">
        <div className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
          {eyebrow}
        </div>
        <h4 className="mt-3 text-base font-bold text-slate-900">{title}</h4>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
