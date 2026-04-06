import { ReactNode } from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";

export function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="mx-auto max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
