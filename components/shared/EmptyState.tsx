import Link from "next/link";
import { ArrowRight, LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionHref,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-[26px] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm">
        <Icon className="h-6 w-6" />
      </div>
      <h4 className="mt-4 text-base font-bold text-slate-900">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      {actionLabel && actionHref ? (
        <Link
          href={actionHref}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}
