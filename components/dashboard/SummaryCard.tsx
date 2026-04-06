import React from 'react';
import Link from "next/link";
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
    href?: string;
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
    className,
    href
}: SummaryCardProps) {
    const toneClasses =
        trendType === 'positive'
            ? "border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 via-white to-white dark:border-emerald-900/60 dark:from-emerald-950/50 dark:via-slate-900 dark:to-slate-900"
            : trendType === 'negative'
              ? "border-rose-200/80 bg-gradient-to-br from-rose-50/80 via-white to-white dark:border-rose-900/60 dark:from-rose-950/50 dark:via-slate-900 dark:to-slate-900"
              : "border-slate-200 bg-gradient-to-br from-slate-50/80 via-white to-white dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950";

    const cardContent = (
        <div className={cn(
            "rounded-3xl border shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:shadow-slate-950/30",
            href && "cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
            toneClasses,
            emphasis === 'high' ? "p-7" : "p-6",
            className
        )}>
            <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">{title}</div>
                    {trend && (
                        <div className={cn(
                            "mt-2 text-xs font-semibold",
                            trendType === 'positive' && "text-emerald-700 dark:text-emerald-300",
                            trendType === 'negative' && "text-rose-700 dark:text-rose-300",
                            trendType === 'neutral' && "text-slate-600 dark:text-slate-400"
                        )}>
                            {trend}
                        </div>
                    )}
                </div>
                <div className={cn(
                    "rounded-2xl border p-3 shadow-sm",
                    iconBgColor,
                    trendType === 'positive' && "border-emerald-100 dark:border-emerald-900/50",
                    trendType === 'negative' && "border-rose-100 dark:border-rose-900/50",
                    trendType === 'neutral' && "border-slate-100 dark:border-slate-800"
                )}>
                    <Icon className={cn("w-5 h-5", iconColor)} />
                </div>
            </div>

            <div className="flex items-end justify-between gap-4">
                <div className={cn(
                    "font-black tracking-tight text-slate-950 dark:text-slate-50",
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

    if (href) {
        return (
            <Link href={href} className="block">
                {cardContent}
            </Link>
        );
    }

    return cardContent;
}
