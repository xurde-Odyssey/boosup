import React from 'react';
import {
    Calendar,
    ChevronDown,
    Users,
    UserCircle2,
    Download,
    Bell,
    Plus
} from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
    title?: string;
    description?: string;
    primaryActionLabel?: string;
    primaryActionHref?: string;
}

export function Header({
    title = "Main Financial Dashboard",
    description = "Real-time business performance overview",
    primaryActionLabel = "Generate Report",
    primaryActionHref
}: HeaderProps) {
    return (
        <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
                    <p className="text-sm text-slate-500">{description}</p>
                </div>
                <div className="flex items-center gap-3">
                    {primaryActionHref ? (
                        <Link
                            href={primaryActionHref}
                            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            {primaryActionLabel}
                        </Link>
                    ) : (
                        <button className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-sm">
                            <Download className="w-4 h-4" />
                            {primaryActionLabel}
                        </button>
                    )}
                    <button className="p-2.5 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-slate-600 transition-colors shadow-sm">
                        <Bell className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap gap-4">
                <div className="flex h-11 items-center gap-2 px-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-600 text-sm font-medium">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span className="uppercase text-[10px] tracking-wider text-slate-400 font-bold">Date:</span>
                    <span>Last 30 Days</span>
                    <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
                </div>

                <div className="flex h-11 items-center gap-2 px-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-600 text-sm font-medium">
                    <UserCircle2 className="w-4 h-4 text-slate-400" />
                    <span className="uppercase text-[10px] tracking-wider text-slate-400 font-bold">Staff:</span>
                    <span>All Staff</span>
                    <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
                </div>

                <div className="flex h-11 items-center gap-2 px-4 bg-slate-50 border border-slate-100 rounded-xl text-slate-600 text-sm font-medium">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="uppercase text-[10px] tracking-wider text-slate-400 font-bold">Customer:</span>
                    <span>All Customers</span>
                    <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
                </div>
            </div>
        </div>
    );
}
