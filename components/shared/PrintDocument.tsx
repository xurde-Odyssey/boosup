import Image from "next/image";
import { ReactNode } from "react";
import logo from "@/app/logos/logo.png";

export const PRINT_TABLE_WRAP_CLASS = "overflow-hidden rounded-[22px] border border-slate-200";
export const PRINT_TABLE_HEAD_ROW_CLASS =
  "bg-slate-50 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500";
export const PRINT_TABLE_BODY_CLASS = "divide-y divide-slate-100 text-xs";

export function PrintDocument({
  root,
  children,
}: {
  root: "sales-invoice" | "dashboard-report" | "sales-report";
  children: ReactNode;
}) {
  return (
    <div data-print-root={root} className="hidden print:block">
      <section
        data-print-card={root}
        className="w-full bg-white p-6 shadow-sm print:min-h-[297mm] print:shadow-none"
      >
        {children}
      </section>
    </div>
  );
}

export function PrintHeader({
  title,
  metaRows,
}: {
  title: string;
  metaRows: Array<{ label: string; value: string }>;
}) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white">
          <Image
            src={logo}
            alt="Dipak Suppliers logo"
            className="h-full w-full object-contain"
            priority
          />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Dipak Suppliers</h1>
          <div className="mt-1 space-y-0.5 text-xs text-slate-600">
            <p>Urlabari 07, Nepal</p>
            <p>suppliersdipak@gmail.com</p>
            <p>www.dipaksuppliers.com.np</p>
          </div>
        </div>
      </div>

      <div className="min-w-[220px] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
        <div className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">{title}</div>
        <div className="mt-2 space-y-1 text-xs text-slate-700">
          {metaRows.map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-4">
              <span className="font-semibold text-slate-500">{row.label}</span>
              <span className="text-right font-semibold text-slate-900">{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}

export function PrintSectionTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400 ${className}`.trim()}
    >
      {children}
    </div>
  );
}
