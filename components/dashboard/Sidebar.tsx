"use client";

import React from 'react';
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
    <div className="flex flex-col h-screen w-64 bg-white border-r border-zinc-100 p-6">
      <div className="flex items-center gap-3 mb-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
            B
          </div>
          <div>
            <h1 className="font-bold text-slate-900 leading-tight">BookKeep <span className="text-blue-600">Pro</span></h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Management System</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5",
                isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-900"
              )} />
              <span className="font-medium">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-6 bg-blue-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-100">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 mb-4">
          <div className="w-10 h-10 rounded-full bg-orange-200 flex items-center justify-center text-orange-700 font-bold overflow-hidden">
            <div className="w-full h-full bg-gradient-to-br from-orange-200 to-orange-300 flex items-center justify-center">
              AS
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">Alex Sterling</p>
            <p className="text-xs text-slate-500 truncate">Admin Account</p>
          </div>
          <button className="text-slate-400 hover:text-slate-600">
            <Settings className="w-4 h-4" />
          </button>
        </div>
        <button className="flex items-center gap-3 w-full px-4 py-3 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all">
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
