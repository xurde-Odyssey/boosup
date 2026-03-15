import React from 'react';

interface HeaderProps {
    title?: string;
    description?: string;
}

export function Header({
    title = "Main Financial Dashboard",
    description = "Real-time business performance overview",
}: HeaderProps) {
    return (
        <div className="mb-8">
            <div className="mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
                    <p className="text-sm text-slate-500">{description}</p>
                </div>
            </div>
        </div>
    );
}
