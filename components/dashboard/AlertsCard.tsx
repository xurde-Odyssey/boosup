import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Card } from "@/components/shared/Card";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { type AppLocale, getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type AlertItem = {
  title: string;
  value: string;
  description: string;
  tone: string;
  href: string;
  actionLabel: string;
};

const toneConfig: Record<string, string> = {
  blue: "bg-blue-500",
  amber: "bg-amber-400",
  rose: "bg-rose-500",
  red: "bg-red-500",
  slate: "bg-slate-400",
  green: "bg-emerald-500",
};

export function AlertsCard({
  items,
  locale = "en",
}: {
  items: AlertItem[];
  locale?: AppLocale;
}) {
  const messages = getMessages(locale);

  return (
    <Card className="overflow-hidden border-slate-200/80 xl:col-span-7">
      <SectionHeader
        title={messages.dashboardPage.operationalAlerts}
        description="Important items that need follow-up across collections, supplier dues, expenses, and staff."
      />
      {items.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={AlertCircle}
            title="No active alerts"
            description="Everything looks clear in the selected period."
          />
        </div>
      ) : (
        <div className="p-6">
          <div className="space-y-2">
            {items.map((item, index) => {
              const tone = toneConfig[item.tone] ?? toneConfig.slate;
              return (
                <Link
                  key={`${item.title}-${index}`}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between gap-4 rounded-xl px-3 py-3 transition-colors hover:bg-slate-50",
                    index < items.length - 1 && "border-b border-slate-100",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={cn("h-3.5 w-3.5 shrink-0 rounded-full", tone)} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                      <div className="truncate text-xs text-slate-500">{item.description}</div>
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-bold text-slate-900">{item.value}</div>
                </Link>
              );
            })}
          </div>
          <div className="mt-5">
            <Link
              href={items[0]?.href ?? "/"}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              View All
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}
