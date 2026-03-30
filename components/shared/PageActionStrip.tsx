import Link from "next/link";
import { Plus } from "lucide-react";
import type { ReactNode } from "react";

type ActionItem = {
  label: string;
  href: string;
  variant?: "primary" | "secondary";
};

export function PageActionStrip({
  actions,
  extra,
}: {
  actions: ActionItem[];
  extra?: ReactNode;
}) {
  if (actions.length === 0 && !extra) return null;

  return (
    <div className="sticky top-4 z-20 mb-8 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg shadow-slate-200/40 backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
            Quick Actions
          </div>
          <p className="mt-1 text-sm text-slate-500">Create and manage records without hunting through the page.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {actions.map((action) => (
            <Link
              key={`${action.href}-${action.label}`}
              href={action.href}
              className={`inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors ${
                action.variant === "secondary"
                  ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              <Plus className="h-4 w-4" />
              {action.label}
            </Link>
          ))}
          {extra}
        </div>
      </div>
    </div>
  );
}
