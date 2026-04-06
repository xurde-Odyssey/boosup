"use client";

import { ReactNode, createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";

const TabsContext = createContext<{
  value: string;
  setValue: (value: string) => void;
} | null>(null);

export function Tabs({
  defaultValue,
  children,
}: {
  defaultValue: string;
  children: ReactNode;
}) {
  const [value, setValue] = useState(defaultValue);
  return <TabsContext.Provider value={{ value, setValue }}>{children}</TabsContext.Provider>;
}

export function TabList({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex rounded-2xl border border-slate-200/80 bg-slate-50/80 p-1 shadow-sm">
      {children}
    </div>
  );
}

export function Tab({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  const context = useContext(TabsContext);
  if (!context) return null;
  const active = context.value === value;
  return (
    <button
      type="button"
      onClick={() => context.setValue(value)}
      className={cn(
        "rounded-xl px-4 py-2 text-sm font-semibold transition-colors",
        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900",
      )}
    >
      {children}
    </button>
  );
}

export function TabPanel({
  value,
  children,
}: {
  value: string;
  children: ReactNode;
}) {
  const context = useContext(TabsContext);
  if (!context || context.value !== value) return null;
  return <div className="mt-6">{children}</div>;
}
