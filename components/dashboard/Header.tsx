import React, { ReactNode } from 'react';

interface HeaderProps {
    title?: string;
    description?: string;
    meta?: ReactNode;
    actions?: ReactNode;
}

export function Header({
    title = "Main Financial Dashboard",
    description = "Real-time business performance overview",
    meta,
    actions,
}: HeaderProps) {
    return (
        <div className="mb-8">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{title}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
                    {meta ? <div className="mt-3">{meta}</div> : null}
                </div>
                {actions ? <div className="shrink-0">{actions}</div> : null}
            </div>
        </div>
    );
}
