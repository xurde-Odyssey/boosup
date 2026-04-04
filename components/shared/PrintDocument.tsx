import Image from "next/image";
import { ReactNode } from "react";
import { CompanySettings, DEFAULT_COMPANY_SETTINGS } from "@/lib/company-settings";

export const PRINT_TABLE_WRAP_CLASS = "overflow-hidden rounded-[22px] border border-slate-200";
export const PRINT_TABLE_HEAD_ROW_CLASS =
  "bg-slate-50 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500";
export const PRINT_TABLE_BODY_CLASS = "divide-y divide-slate-100 text-xs";

export function PrintDocument({
  root,
  children,
}: {
  root: "sales-invoice" | "dashboard-report" | "sales-report" | "supplier-statement";
  children: ReactNode;
}) {
  return (
    <div data-print-root={root} className="hidden print:block">
      <section
        data-print-card={root}
        className="w-full bg-white p-6 shadow-sm print:min-h-[297mm] print:shadow-none"
      >
        {children}
        <PrintClosing />
      </section>
    </div>
  );
}

export function PrintHeader({
  title,
  metaRows,
  company = DEFAULT_COMPANY_SETTINGS,
}: {
  title: string;
  metaRows: Array<{ label: string; value: string }>;
  company?: CompanySettings;
}) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white">
          <Image
            src={company.logoPath}
            alt={`${company.businessName} logo`}
            width={64}
            height={64}
            className="h-full w-full object-contain"
            priority
            unoptimized
          />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            {company.businessName}
          </h1>
          <div className="mt-1 space-y-0.5 text-xs text-slate-600">
            <p>{company.address || "-"}</p>
            <p>{company.email || "-"}</p>
            <p>{company.website || "-"}</p>
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

export function PrintClosing() {
  return (
    <footer className="mt-8 pt-5">
      <div className="flex justify-end">
        <div className="w-72 pt-3 text-center">
          <div className="mb-2 h-12" />
          <div className="border-t border-slate-400 pt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            Seller Signature
          </div>
        </div>
      </div>
      <div className="mt-10 border-t border-slate-300 pt-5">
        <p className="text-center text-[11px] leading-5 text-slate-500">
        This invoice does not represent any legal work; it is computer-generated and used for
        information only.
        </p>
      </div>
    </footer>
  );
}
