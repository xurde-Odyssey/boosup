import Link from "next/link";
import { ReactNode } from "react";
import { Card } from "@/components/shared/Card";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { ReceiptText } from "lucide-react";

type Column<T> = {
  key: keyof T | string;
  label: string;
  render?: (row: T) => ReactNode;
  className?: string;
};

export function TableCard<T extends { id?: string | number }>({
  title,
  subtitle,
  columns,
  rows,
  actionLabel,
  actionHref,
}: {
  title: string;
  subtitle?: string;
  columns: Column<T>[];
  rows: T[];
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <Card className="overflow-hidden border-slate-200/80">
      <SectionHeader
        title={title}
        description={subtitle}
        actions={
          actionLabel && actionHref ? (
            <Link
              href={actionHref}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
            >
              {actionLabel}
            </Link>
          ) : undefined
        }
      />
      {rows.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={ReceiptText}
            title={`No ${title.toLowerCase()} yet`}
            description="This section will fill automatically from your stored records."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                {columns.map((column) => (
                  <th
                    key={String(column.key)}
                    className={`border-b border-slate-100 bg-slate-50/80 px-6 py-3 backdrop-blur dark:border-slate-800/70 ${column.className ?? ""}`}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {rows.map((row, index) => (
                <tr
                  key={String(row.id ?? index)}
                  className={index % 2 === 0 ? "bg-white" : "bg-slate-50/20"}
                >
                  {columns.map((column) => (
                    <td
                      key={String(column.key)}
                      className={`px-6 py-4 text-sm text-slate-600 ${column.className ?? ""}`}
                    >
                      {column.render
                        ? column.render(row)
                        : String((row as Record<string, unknown>)[String(column.key)] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
