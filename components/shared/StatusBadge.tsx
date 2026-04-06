import { LucideIcon, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const toneStyles: Record<string, string> = {
  success: "border-green-100 bg-green-50 text-green-700 dark:border-green-900/50 dark:bg-green-950/30 dark:text-green-300",
  warning: "border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300",
  danger: "border-red-100 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300",
  info: "border-blue-100 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300",
  neutral: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300",
};

const paymentToneMap: Record<string, "success" | "warning" | "danger" | "info"> = {
  PAID: "success",
  PENDING: "warning",
  PARTIAL: "info",
  OVERDUE: "danger",
};

const paymentIconMap: Record<string, LucideIcon> = {
  PAID: CheckCircle2,
  PENDING: Clock,
  PARTIAL: Clock,
  OVERDUE: AlertTriangle,
};

export function StatusBadge({
  label,
  tone = "neutral",
  icon: Icon,
}: {
  label: string;
  tone?: "success" | "warning" | "danger" | "info" | "neutral";
  icon?: LucideIcon;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.18em]",
        toneStyles[tone],
      )}
    >
      {Icon ? <Icon className="h-3 w-3" /> : null}
      {label}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const tone = paymentToneMap[status] ?? "neutral";
  const Icon = paymentIconMap[status];

  return <StatusBadge label={status} tone={tone} icon={Icon} />;
}
