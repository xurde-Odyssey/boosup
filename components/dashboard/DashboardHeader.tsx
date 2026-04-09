import { ReactNode } from "react";
import { Card } from "@/components/shared/Card";
import { type AppLocale, getMessages } from "@/lib/i18n";

export function DashboardHeader({
  title,
  subtitle,
  actions,
  meta,
  locale = "en",
}: {
  title: string;
  subtitle: string;
  actions?: ReactNode;
  meta?: ReactNode;
  locale?: AppLocale;
}) {
  const messages = getMessages(locale);

  return (
    <Card className="sticky top-4 z-20 mb-8 overflow-hidden border-slate-200/80 bg-white/95 shadow-sm shadow-slate-200/50 backdrop-blur">
      <div className="border-b border-slate-100 p-6 dark:border-slate-800/70">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
              {messages.common.dashboard}
            </div>
            <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-slate-950 dark:text-slate-50">
              {title}
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
        </div>
      </div>
      {meta ? <div className="p-6">{meta}</div> : null}
    </Card>
  );
}
