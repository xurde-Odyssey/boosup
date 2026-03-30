"use client";

import { Printer } from "lucide-react";
import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  PrintDocument,
  PrintHeader,
  PrintSectionTitle,
  PRINT_TABLE_BODY_CLASS,
  PRINT_TABLE_HEAD_ROW_CLASS,
  PRINT_TABLE_WRAP_CLASS,
} from "@/components/shared/PrintDocument";
import { CompanySettings, DEFAULT_COMPANY_SETTINGS } from "@/lib/company-settings";

type SummaryMetric = {
  title: string;
  value: string;
};

type SalesInvoiceRow = {
  invoiceNumber: string;
  customer: string;
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  status: string;
  date: string;
};

export function SalesReportPrintButton({
  generatedDate,
  selectedPeriod,
  metrics,
  invoices,
  company = DEFAULT_COMPANY_SETTINGS,
}: {
  generatedDate: string;
  selectedPeriod: string;
  metrics: SummaryMetric[];
  invoices: SalesInvoiceRow[];
  company?: CompanySettings;
}) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const handlePrint = () => {
    document.body.classList.add("invoice-print-active");
    const previousTitle = document.title;
    document.title = `Sales Summary Report - ${generatedDate}`;

    const handleAfterPrint = () => {
      document.body.classList.remove("invoice-print-active");
      document.title = previousTitle;
      window.removeEventListener("afterprint", handleAfterPrint);
    };

    window.addEventListener("afterprint", handleAfterPrint);
    window.print();
  };

  return (
    <>
      <button
        type="button"
        onClick={handlePrint}
        className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
      >
        <span className="inline-flex items-center gap-2">
          <Printer className="h-4 w-4" />
          Generate Report
        </span>
      </button>

      {isMounted &&
        createPortal(
          <PrintDocument root="sales-report">
            <PrintHeader
              title="Sales Summary Report"
              company={company}
              metaRows={[
                { label: "Generated", value: generatedDate },
                { label: "Period", value: selectedPeriod },
              ]}
            />

            <section className="py-5">
              <PrintSectionTitle>Sales Metrics</PrintSectionTitle>
              <div className="grid grid-cols-2 gap-4">
                {metrics.map((metric) => (
                  <div
                    key={metric.title}
                    className="rounded-[22px] border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      {metric.title}
                    </div>
                    <div className="mt-2 text-xl font-black text-slate-900">{metric.value}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="border-t border-slate-200 py-5">
              <PrintSectionTitle>Sales Invoices</PrintSectionTitle>
              <div className={PRINT_TABLE_WRAP_CLASS}>
                <table className="w-full text-left">
                  <thead>
                    <tr className={PRINT_TABLE_HEAD_ROW_CLASS}>
                      <th className="px-3 py-2">Invoice</th>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-right">Paid</th>
                      <th className="px-3 py-2 text-right">Remaining</th>
                      <th className="px-3 py-2 text-right">Status</th>
                      <th className="px-3 py-2 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className={PRINT_TABLE_BODY_CLASS}>
                    {invoices.map((invoice) => (
                      <tr key={`${invoice.invoiceNumber}-${invoice.customer}`}>
                        <td className="px-3 py-2.5 font-semibold text-slate-900">
                          {invoice.invoiceNumber}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">{invoice.customer}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
                          {invoice.totalAmount}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-green-700">
                          {invoice.paidAmount}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-amber-700">
                          {invoice.remainingAmount}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-700">
                          {invoice.status}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-500">{invoice.date}</td>
                      </tr>
                    ))}
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                          No sales invoices found for this report.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </PrintDocument>,
          document.body,
        )}
    </>
  );
}
