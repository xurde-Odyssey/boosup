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
import { type AppLocale, getMessages } from "@/lib/i18n";

type SummaryMetric = {
  title: string;
  value: string;
};

type PurchaseBillRow = {
  id: string;
  purchaseNumber: string;
  supplier: string;
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  status: string;
  date: string;
};

type PurchasePaymentRow = {
  id: string;
  date: string;
  supplier: string;
  bill: string;
  method: string;
  amount: string;
};

type PurchaseExpenseRow = {
  id: string;
  date: string;
  title: string;
  amount: string;
  notes: string;
};

export function PurchaseReportPrintButton({
  generatedDate,
  selectedPeriod,
  metrics,
  purchases,
  payments,
  expenses,
  company = DEFAULT_COMPANY_SETTINGS,
  locale = "en",
}: {
  generatedDate: string;
  selectedPeriod: string;
  metrics: SummaryMetric[];
  purchases: PurchaseBillRow[];
  payments: PurchasePaymentRow[];
  expenses: PurchaseExpenseRow[];
  company?: CompanySettings;
  locale?: AppLocale;
}) {
  const messages = getMessages(locale);
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const handlePrint = () => {
    document.body.classList.add("invoice-print-active");
    const previousTitle = document.title;
    document.title = `Purchase Summary Report - ${generatedDate}`;

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
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
      >
        <span className="inline-flex items-center gap-2">
          <Printer className="h-4 w-4" />
          {messages.reportToolbar.generateReport}
        </span>
      </button>

      {isMounted &&
        createPortal(
          <PrintDocument root="purchase-report" locale={locale}>
            <PrintHeader
              title="Purchase Summary Report"
              company={company}
              metaRows={[
                { label: messages.print.generated, value: generatedDate },
                { label: messages.print.period, value: selectedPeriod },
              ]}
            />

            <section className="py-5">
              <PrintSectionTitle>{messages.print.summaryMetrics}</PrintSectionTitle>
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
              <PrintSectionTitle>{messages.print.bills}</PrintSectionTitle>
              <div className={PRINT_TABLE_WRAP_CLASS}>
                <table className="w-full text-left">
                  <thead>
                    <tr className={PRINT_TABLE_HEAD_ROW_CLASS}>
                      <th className="px-3 py-2">{messages.print.bill}</th>
                      <th className="px-3 py-2">{messages.print.supplier}</th>
                      <th className="px-3 py-2 text-right">{messages.print.totalPurchase}</th>
                      <th className="px-3 py-2 text-right">{messages.print.totalPaid}</th>
                      <th className="px-3 py-2 text-right">{messages.print.remainingToPay}</th>
                      <th className="px-3 py-2 text-right">{messages.print.status}</th>
                      <th className="px-3 py-2 text-right">{messages.print.date}</th>
                    </tr>
                  </thead>
                  <tbody className={PRINT_TABLE_BODY_CLASS}>
                    {purchases.map((purchase) => (
                      <tr key={purchase.id}>
                        <td className="px-3 py-2.5 font-semibold text-slate-900">
                          {purchase.purchaseNumber}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">{purchase.supplier}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
                          {purchase.totalAmount}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-green-700">
                          {purchase.paidAmount}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-amber-700">
                          {purchase.remainingAmount}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-700">
                          {purchase.status}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-500">{purchase.date}</td>
                      </tr>
                    ))}
                    {purchases.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                          No purchase bills found for this report.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-5 border-t border-slate-200 py-5">
              <div>
                <PrintSectionTitle>{messages.print.paymentHistory}</PrintSectionTitle>
                <div className={PRINT_TABLE_WRAP_CLASS}>
                  <table className="w-full text-left">
                    <thead>
                      <tr className={PRINT_TABLE_HEAD_ROW_CLASS}>
                        <th className="px-3 py-2">{messages.print.date}</th>
                        <th className="px-3 py-2">{messages.print.supplier}</th>
                        <th className="px-3 py-2">{messages.print.bill}</th>
                        <th className="px-3 py-2 text-right">{messages.print.method}</th>
                        <th className="px-3 py-2 text-right">{messages.print.amount}</th>
                      </tr>
                    </thead>
                    <tbody className={PRINT_TABLE_BODY_CLASS}>
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-3 py-2.5 text-slate-700">{payment.date}</td>
                          <td className="px-3 py-2.5 text-slate-700">{payment.supplier}</td>
                          <td className="px-3 py-2.5 font-semibold text-slate-900">
                            {payment.bill}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-700">
                            {payment.method}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-green-700">
                            {payment.amount}
                          </td>
                        </tr>
                      ))}
                      {payments.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                            {messages.print.noPaymentHistory}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <PrintSectionTitle>Purchase Expenses</PrintSectionTitle>
                <div className={PRINT_TABLE_WRAP_CLASS}>
                  <table className="w-full text-left">
                    <thead>
                      <tr className={PRINT_TABLE_HEAD_ROW_CLASS}>
                        <th className="px-3 py-2">{messages.print.date}</th>
                        <th className="px-3 py-2">Expense</th>
                        <th className="px-3 py-2 text-right">{messages.print.amount}</th>
                        <th className="px-3 py-2 text-right">{messages.print.description}</th>
                      </tr>
                    </thead>
                    <tbody className={PRINT_TABLE_BODY_CLASS}>
                      {expenses.map((expense) => (
                        <tr key={expense.id}>
                          <td className="px-3 py-2.5 text-slate-700">{expense.date}</td>
                          <td className="px-3 py-2.5 font-semibold text-slate-900">
                            {expense.title}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
                            {expense.amount}
                          </td>
                          <td className="px-3 py-2.5 text-right text-slate-500">
                            {expense.notes}
                          </td>
                        </tr>
                      ))}
                      {expenses.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                            No purchase expenses found for this report.
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
