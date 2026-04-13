import React, { ReactNode } from 'react';
import { Button } from "@/components/shared/Button";

interface HeaderProps {
    title?: string;
    description?: string;
    meta?: ReactNode;
    actions?: ReactNode;
    primaryActionLabel?: string;
    primaryActionHref?: string;
}

export function Header({
    title = "Main Financial Dashboard",
    description = "Real-time business performance overview",
    meta,
    actions,
    primaryActionLabel,
    primaryActionHref,
}: HeaderProps) {
    return (
        <div className="mb-8">
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                    <h2 className="text-[var(--ui-text-xl)] font-semibold text-slate-900 dark:text-slate-50 sm:text-[28px]">{title}</h2>
                    <p className="mt-1 text-[var(--ui-text-sm)] text-slate-500 dark:text-slate-400">{description}</p>
                    {meta ? <div className="mt-3">{meta}</div> : null}
                </div>
                <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-start">
                    {primaryActionLabel && primaryActionHref ? (
                        <Button href={primaryActionHref} variant="secondary" className="w-full sm:w-auto">
                            {primaryActionLabel}
                        </Button>
                    ) : null}
                    {actions ? <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">{actions}</div> : null}
                </div>
            </div>
        </div>
    );
}
