import { ReactNode } from "react";
import { Card } from "@/components/shared/Card";
import { SectionHeader } from "@/components/shared/SectionHeader";

export function TableWrapper({
  title,
  description,
  countLabel,
  filters,
  children,
}: {
  title: string;
  description?: string;
  countLabel?: string;
  filters?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <SectionHeader
        title={title}
        description={description}
        actions={
          countLabel ? (
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 dark:bg-slate-800/70 dark:text-slate-300">
              {countLabel}
            </div>
          ) : undefined
        }
      />
      {filters ? <div className="border-b border-[color:var(--ui-border-soft)] p-6">{filters}</div> : null}
      {children}
    </Card>
  );
}
