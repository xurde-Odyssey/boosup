import Link from "next/link";
import { LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/shared/Card";
import { cn } from "@/lib/utils";

export function KpiCard({
  title,
  value,
  trend,
  percentage,
  icon: Icon,
  color = "blue",
  href,
}: {
  title: string;
  value: string;
  trend?: "up" | "down" | "neutral";
  percentage?: string;
  icon: LucideIcon;
  color?: "blue" | "emerald" | "rose" | "amber" | "slate";
  href?: string;
}) {
  const toneMap = {
    blue: {
      icon: "bg-blue-50 text-blue-600",
      rail: "bg-blue-500",
      trend: "text-blue-600",
    },
    emerald: {
      icon: "bg-emerald-50 text-emerald-600",
      rail: "bg-emerald-500",
      trend: "text-emerald-600",
    },
    rose: {
      icon: "bg-rose-50 text-rose-600",
      rail: "bg-rose-500",
      trend: "text-rose-600",
    },
    amber: {
      icon: "bg-amber-50 text-amber-600",
      rail: "bg-amber-500",
      trend: "text-amber-600",
    },
    slate: {
      icon: "bg-slate-100 text-slate-700",
      rail: "bg-slate-400",
      trend: "text-slate-600",
    },
  }[color];

  const content = (
    <Card className="h-full border-slate-200/80 p-6 transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
            {title}
          </div>
          {percentage ? (
            <div
              className={cn(
                "mt-2 inline-flex items-center gap-1 text-xs font-semibold",
                trend === "down" ? "text-rose-600" : toneMap.trend,
              )}
            >
              {trend === "up" ? <TrendingUp className="h-3.5 w-3.5" /> : null}
              {trend === "down" ? <TrendingDown className="h-3.5 w-3.5" /> : null}
              {percentage}
            </div>
          ) : null}
        </div>
        <div className={cn("rounded-2xl p-3 ring-1 ring-white/70", toneMap.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-5 flex items-end justify-between gap-4">
        <div className="text-3xl font-black tracking-tight text-slate-950 dark:text-slate-50">
          {value}
        </div>
        <div className={cn("h-12 w-1.5 rounded-full", toneMap.rail)} />
      </div>
    </Card>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
