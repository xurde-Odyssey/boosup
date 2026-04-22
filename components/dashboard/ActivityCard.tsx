import { LucideIcon, ReceiptText } from "lucide-react";
import { Card } from "@/components/shared/Card";
import { EmptyState } from "@/components/shared/EmptyState";
import { SectionHeader } from "@/components/shared/SectionHeader";
import { type AppLocale, getMessages } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  amount: string;
  date: string;
  isoDate: string;
  tone: string;
  icon: LucideIcon;
};

const toneClasses: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-600",
  emerald: "bg-green-50 text-green-700",
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-700",
  slate: "bg-slate-100 text-slate-600",
};

const groupActivities = (items: ActivityItem[], todayDate: string, locale: AppLocale) => {
  const messages = getMessages(locale);
  const today = todayDate;
  const yesterdayDate = new Date(`${todayDate}T00:00:00`);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = yesterdayDate.toISOString().slice(0, 10);

  const groups = new Map<string, ActivityItem[]>();
  items.forEach((item) => {
    const day = item.isoDate.slice(0, 10);
    const label =
      day === today
        ? messages.common.today
        : day === yesterday
          ? messages.common.yesterday
          : messages.common.earlier;
    groups.set(label, [...(groups.get(label) ?? []), item]);
  });

  return [messages.common.today, messages.common.yesterday, messages.common.earlier]
    .map((label) => ({ label, items: groups.get(label) ?? [] }))
    .filter((group) => group.items.length > 0);
};

export function ActivityCard({
  items,
  todayDate,
  locale = "en",
}: {
  items: ActivityItem[];
  todayDate: string;
  locale?: AppLocale;
}) {
  const groups = groupActivities(items, todayDate, locale);
  const messages = getMessages(locale);

  return (
    <Card className="overflow-hidden border-slate-200/80 xl:col-span-12">
      <SectionHeader
        title={messages.dashboardPage.recentActivity}
        description="Operational log grouped by recency across sales, purchases, expenses, and staff."
      />
      {items.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={ReceiptText}
            title="No activity recorded"
            description="New business events will appear here as they are recorded."
          />
        </div>
      ) : (
        <div className="p-6">
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  {group.label}
                </div>
                <div className="space-y-3">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-3 shadow-sm shadow-slate-100/60 transition duration-200 hover:shadow-md dark:border-slate-800/60 dark:bg-slate-900/40"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className={cn("rounded-xl p-2.5", toneClasses[item.tone] ?? toneClasses.slate)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">{item.title}</div>
                            <div className="truncate text-xs text-slate-500">{item.description}</div>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-sm font-bold text-slate-900">{item.amount}</div>
                          <div className="text-xs text-slate-500">{item.date}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
