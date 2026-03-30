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

type ReportCustomer = {
  name: string;
  revenue: string;
  lastTransaction: string;
};

type ReportItem = {
  name: string;
  quantitySold: string;
  salesAmount: string;
};

export function DashboardReportPrintButton({
  generatedDate,
  selectedPeriod,
  metrics,
  customers,
  items,
  company = DEFAULT_COMPANY_SETTINGS,
}: {
  generatedDate: string;
  selectedPeriod: string;
  metrics: SummaryMetric[];
  customers: ReportCustomer[];
  items: ReportItem[];
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
    document.title = `Business Summary Report - ${generatedDate}`;

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
          <PrintDocument root="dashboard-report">
            <PrintHeader
              title="Business Summary Report"
              company={company}
              metaRows={[
                { label: "Generated", value: generatedDate },
                { label: "Period", value: selectedPeriod },
              ]}
            />

            <section className="py-5">
              <PrintSectionTitle>Summary Metrics</PrintSectionTitle>
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

            <section className="grid grid-cols-2 gap-5 border-t border-slate-200 py-5">
              <div>
                <PrintSectionTitle>Top Customers</PrintSectionTitle>
                <div className={PRINT_TABLE_WRAP_CLASS}>
                  <table className="w-full text-left">
                    <thead>
                      <tr className={PRINT_TABLE_HEAD_ROW_CLASS}>
                        <th className="px-3 py-2">Customer</th>
                        <th className="px-3 py-2 text-right">Revenue</th>
                        <th className="px-3 py-2 text-right">Last</th>
                      </tr>
                    </thead>
                    <tbody className={PRINT_TABLE_BODY_CLASS}>
                      {customers.map((customer) => (
                        <tr key={customer.name}>
                          <td className="px-3 py-2.5 text-slate-700">{customer.name}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
                            {customer.revenue}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-500">
                            {customer.lastTransaction}
                          </td>
                        </tr>
                      ))}
                      {customers.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                            No customer activity in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <PrintSectionTitle>Top Sales Items</PrintSectionTitle>
                <div className={PRINT_TABLE_WRAP_CLASS}>
                  <table className="w-full text-left">
                    <thead>
                      <tr className={PRINT_TABLE_HEAD_ROW_CLASS}>
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2 text-right">Qty</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className={PRINT_TABLE_BODY_CLASS}>
                      {items.map((item) => (
                        <tr key={item.name}>
                          <td className="px-3 py-2.5 text-slate-700">{item.name}</td>
                          <td className="px-3 py-2.5 text-right text-slate-600">
                            {item.quantitySold}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
                            {item.salesAmount}
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                            No sales items in this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </PrintDocument>,
          document.body,
        )}
    </>
  );
}
