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
                <div>
                    <h2 className="text-[var(--ui-text-xl)] font-semibold text-slate-900 dark:text-slate-50 sm:text-[28px]">{title}</h2>
                    <p className="mt-1 text-[var(--ui-text-sm)] text-slate-500 dark:text-slate-400">{description}</p>
                    {meta ? <div className="mt-3">{meta}</div> : null}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-3">
                    {primaryActionLabel && primaryActionHref ? (
                        <Button href={primaryActionHref} variant="secondary">
                            {primaryActionLabel}
                        </Button>
                    ) : null}
                    {actions ? <div className="shrink-0">{actions}</div> : null}
                </div>
            </div>
        </div>
    );
}
