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
}

export function SummaryCard({
    title,
    value,
    trend,
    trendType = 'neutral',
    icon: Icon,
    iconBgColor,
    iconColor
}: SummaryCardProps) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-slate-500">{title}</h3>
                <div className={cn("p-2 rounded-lg", iconBgColor)}>
                    <Icon className={cn("w-5 h-5", iconColor)} />
                </div>
            </div>
            <div>
                <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>
                {trend && (
                    <div className={cn(
                        "text-xs font-semibold",
                        trendType === 'positive' && "text-green-600",
                        trendType === 'negative' && "text-red-600",
                        trendType === 'neutral' && "text-blue-600"
                    )}>
                        {trend}
                    </div>
                )}
            </div>
        </div>
    );
}
