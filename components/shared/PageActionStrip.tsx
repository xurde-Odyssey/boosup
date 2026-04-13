import { Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { type AppLocale, getMessages } from "@/lib/i18n";

type ActionItem = {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: LucideIcon;
};

export function PageActionStrip({
  actions,
  extra,
  locale = "en",
}: {
  actions: ActionItem[];
  extra?: ReactNode;
  locale?: AppLocale;
}) {
  if (actions.length === 0 && !extra) return null;
  const messages = getMessages(locale);

  return (
    <Card className="sticky top-4 z-20 mb-8 bg-white/95 p-3 shadow-lg shadow-slate-200/35 backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 md:flex-1 md:pr-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
            {messages.common.quickActions}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {messages.common.quickActionsDescription}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap md:ml-auto md:flex-nowrap md:items-center md:justify-end">
          {actions.map((action) => {
            const Icon = action.icon ?? Plus;

            return (
              <Button
                key={`${action.href}-${action.label}`}
                href={action.href}
                variant={action.variant ?? "primary"}
                size="lg"
                className="w-full shrink-0 whitespace-nowrap sm:w-auto md:min-w-fit"
              >
                <Icon className="h-[var(--ui-icon-sm)] w-[var(--ui-icon-sm)]" />
                {action.label}
              </Button>
            );
          })}
          {extra}
        </div>
      </div>
    </Card>
  );
}
