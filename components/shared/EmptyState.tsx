import { ArrowRight, LucideIcon } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";

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
    <Card className="mx-auto flex max-w-md flex-col items-center border-dashed bg-slate-50/80 px-6 py-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-sm dark:bg-slate-900/80">
        <Icon className="h-6 w-6" />
      </div>
      <h4 className="mt-4 text-base font-bold text-slate-900">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      {actionLabel && actionHref ? (
        <Button href={actionHref} className="mt-5">
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      ) : null}
    </Card>
  );
}
