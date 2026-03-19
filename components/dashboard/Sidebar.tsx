"use client";

import Image from 'next/image';
import {
  LayoutDashboard,
  ShoppingBag,
  ShoppingCart,
  Users,
  Truck,
  BarChart3,
  Settings,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import appIcon from '@/app/logos/icon.png';
import { logoutAdmin } from '@/app/actions';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: ShoppingBag, label: 'Sales', href: '/sales' },
  { icon: ShoppingCart, label: 'Purchases', href: '/purchases' },
  { icon: Users, label: 'Staff', href: '/staff' },
  { icon: Truck, label: 'Vendors', href: '/vendors' },
  { icon: BarChart3, label: 'Your Products', href: '/products' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-950">
      <div className="mb-8 flex items-center gap-3 px-2">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900">
            <Image
              src={appIcon}
              alt="BookKeep Pro icon"
              width={40}
              height={40}
              className="h-full w-full object-cover"
              priority
            />
          </div>
          <div>
            <h1 className="leading-tight font-bold text-slate-900 dark:text-slate-50">BookKeep <span className="text-blue-600 dark:text-cyan-400">Pro</span></h1>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Management System</p>
          </div>
        </Link>
      </div>

      <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-all duration-200",
                isActive
                  ? "border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 text-slate-950 shadow-sm dark:border-cyan-900/70 dark:from-slate-900 dark:to-cyan-950/60 dark:text-slate-50"
                  : "border border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-50"
              )}
            >
              <item.icon className={cn(
                "h-4.5 w-4.5 shrink-0",
                isActive ? "text-blue-600 dark:text-cyan-300" : "text-slate-400 group-hover:text-slate-900 dark:text-slate-500 dark:group-hover:text-slate-100"
              )} />
              <span className={cn("text-sm font-medium", isActive ? "text-slate-950 dark:text-slate-50" : "")}>{item.label}</span>
              {isActive && (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600 dark:text-cyan-300">
                    Open
                  </span>
                  <div className="h-7 w-1.5 rounded-full bg-blue-600 dark:bg-cyan-300" />
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto shrink-0 border-t border-slate-100 pt-5 dark:border-slate-800">
        <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-orange-100 to-orange-200 text-sm font-bold text-orange-700">
              AS
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-50">Alex Sterling</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">Admin Account</p>
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Link
            href="/settings"
            className={cn(
              "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
              pathname === "/settings"
                ? "border border-blue-100 bg-gradient-to-r from-blue-50 to-cyan-50 text-slate-950 shadow-sm dark:border-cyan-900/70 dark:from-slate-900 dark:to-cyan-950/60 dark:text-slate-50"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-50",
            )}
          >
            <Settings className="h-4.5 w-4.5" />
            <span>Settings</span>
          </Link>
          <form action={logoutAdmin}>
            <button className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-all hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-950/40 dark:hover:text-rose-300">
              <LogOut className="h-4.5 w-4.5" />
              <span>Logout</span>
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
