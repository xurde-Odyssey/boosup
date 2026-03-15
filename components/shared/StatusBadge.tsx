import { LucideIcon, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const toneStyles: Record<string, string> = {
  success: "border-green-100 bg-green-50 text-green-700",
  warning: "border-amber-100 bg-amber-50 text-amber-700",
  danger: "border-red-100 bg-red-50 text-red-700",
  info: "border-blue-100 bg-blue-50 text-blue-700",
  neutral: "border-slate-200 bg-slate-50 text-slate-700",
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wider",
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
