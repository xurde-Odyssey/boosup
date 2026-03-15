import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SummaryCardProps {
    title: string;
    value: string;
    trend?: string;
    trendType?: 'positive' | 'negative' | 'neutral';
    icon: LucideIcon;
    iconBgColor: string;
    iconColor: string;
    emphasis?: 'high' | 'normal';
    className?: string;
}

export function SummaryCard({
    title,
    value,
    trend,
    trendType = 'neutral',
    icon: Icon,
    iconBgColor,
    iconColor,
    emphasis = 'normal',
    className
}: SummaryCardProps) {
    const toneClasses =
        trendType === 'positive'
            ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-white"
            : trendType === 'negative'
              ? "border-rose-200/80 bg-gradient-to-br from-rose-50/80 via-white to-white"
              : "border-slate-200 bg-gradient-to-br from-slate-50/80 via-white to-white";

    return (
        <div className={cn(
            "rounded-3xl border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
            toneClasses,
            emphasis === 'high' ? "p-7" : "p-6",
            className
        )}>
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">{title}</div>
                    {trend && (
                        <div className={cn(
                            "mt-2 text-xs font-semibold",
                            trendType === 'positive' && "text-emerald-700",
                            trendType === 'negative' && "text-rose-700",
                            trendType === 'neutral' && "text-slate-600"
                        )}>
                            {trend}
                        </div>
                    )}
                </div>
                <div className={cn(
                    "rounded-2xl border p-3 shadow-sm",
                    iconBgColor,
                    trendType === 'positive' && "border-emerald-100",
                    trendType === 'negative' && "border-rose-100",
                    trendType === 'neutral' && "border-slate-100"
                )}>
                    <Icon className={cn("w-5 h-5", iconColor)} />
                </div>
            </div>

            <div className="flex items-end justify-between gap-4">
                <div className={cn(
                    "font-black tracking-tight text-slate-950",
                    emphasis === 'high' ? "text-4xl" : "text-3xl"
                )}>
                    {value}
                </div>
                <div className={cn(
                    "h-12 w-1.5 rounded-full",
                    trendType === 'positive' && "bg-emerald-500",
                    trendType === 'negative' && "bg-rose-500",
                    trendType === 'neutral' && "bg-slate-300"
                )} />
            </div>
        </div>
    );
}
