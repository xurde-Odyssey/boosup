import { ReactNode } from "react";
import { Card } from "@/components/shared/Card";
import { SectionHeader } from "@/components/shared/SectionHeader";

export function ChartCard({
  title,
  subtitle,
  summary,
  insight,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  summary?: ReactNode;
  insight?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <SectionHeader title={title} description={subtitle} actions={summary} />
      <div className="p-6 pt-5">
        {children}
        {insight ? (
          <div className="mt-5 rounded-2xl bg-slate-50/80 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-100 dark:bg-slate-900/40 dark:ring-slate-800/70">
            {insight}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
