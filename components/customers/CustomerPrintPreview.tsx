"use client";

import { createPortal } from "react-dom";
import { useCallback, useSyncExternalStore } from "react";
import { Printer } from "lucide-react";
import {
  PrintDocument,
  PrintHeader,
  PrintSectionTitle,
  PRINT_TABLE_BODY_CLASS,
  PRINT_TABLE_HEAD_ROW_CLASS,
  PRINT_TABLE_WRAP_CLASS,
} from "@/components/shared/PrintDocument";
import { CompanySettings, DEFAULT_COMPANY_SETTINGS } from "@/lib/company-settings";
import { formatBsDisplayDate } from "@/lib/nepali-date";
import { formatCurrency } from "@/lib/presentation";
import { cn } from "@/lib/utils";

type CustomerInvoice = {
  id: string;
  invoice_number: string;
  sales_date: string | null;
  payment_status: string;
  grand_total: number | null;
  amount_received: number | null;
  remaining_amount: number | null;
};

type PrintableCustomer = {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  totalInvoiced: number;
  totalPaid: number;
  totalDue: number;
  totalInvoices: number;
  lastSaleDate: string | null;
  invoices: CustomerInvoice[];
};

export function CustomerPrintPreview({
  customer,
  label = "Print Statement",
  className,
  company = DEFAULT_COMPANY_SETTINGS,
}: {
  customer: PrintableCustomer;
  label?: string;
  className?: string;
  company?: CompanySettings;
}) {
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const handlePrint = useCallback(() => {
    document.body.classList.add("invoice-print-active");
    const previousTitle = document.title;
    document.title = `${customer.name} Statement`;

    const handleAfterPrint = () => {
      document.body.classList.remove("invoice-print-active");
      document.title = previousTitle;
      window.removeEventListener("afterprint", handleAfterPrint);
    };

    window.addEventListener("afterprint", handleAfterPrint);
    window.print();
  }, [customer.name]);

  return (
    <>
      <button
        type="button"
        onClick={handlePrint}
        title={label}
        aria-label={label}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800",
          className ?? "",
        )}
      >
        <Printer className="h-4 w-4" />
        {label}
      </button>

      {isMounted &&
        createPortal(
          <PrintDocument root="customer-statement">
            <PrintHeader
              title="Customer Statement"
              company={company}
              metaRows={[
                { label: "Customer", value: customer.name },
                { label: "Invoices", value: String(customer.totalInvoices) },
                { label: "Last Sale", value: formatBsDisplayDate(customer.lastSaleDate) },
              ]}
            />

            <div className="grid grid-cols-2 gap-4 border-b border-slate-200 py-4 text-sm">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                  Phone
                </div>
                <div className="mt-1 font-semibold text-slate-900">{customer.phone || "-"}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                  Email
                </div>
                <div className="mt-1 font-semibold text-slate-900">{customer.email || "-"}</div>
              </div>
              <div className="col-span-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                  Address
                </div>
                <div className="mt-1 font-semibold text-slate-900">{customer.address || "-"}</div>
              </div>
            </div>

            <div className="py-4">
              <PrintSectionTitle>Customer Totals</PrintSectionTitle>
              <div className={PRINT_TABLE_WRAP_CLASS}>
                <table className="w-full text-left">
                  <thead>
                    <tr className={PRINT_TABLE_HEAD_ROW_CLASS}>
                      <th className="px-3 py-2">Total Invoiced</th>
                      <th className="px-3 py-2">Total Paid</th>
                      <th className="px-3 py-2">Remaining Due</th>
                      <th className="px-3 py-2">Last Sale</th>
                    </tr>
                  </thead>
                  <tbody className={PRINT_TABLE_BODY_CLASS}>
                    <tr>
                      <td className="px-3 py-2.5 font-semibold text-slate-900">
                        {formatCurrency(customer.totalInvoiced)}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-green-700">
                        {formatCurrency(customer.totalPaid)}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-amber-700">
                        {formatCurrency(customer.totalDue)}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700">
                        {formatBsDisplayDate(customer.lastSaleDate)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-slate-200 py-4">
              <PrintSectionTitle>Invoice History</PrintSectionTitle>
              <div className={PRINT_TABLE_WRAP_CLASS}>
                <table className="w-full text-left">
                  <thead>
                    <tr className={PRINT_TABLE_HEAD_ROW_CLASS}>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Invoice</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-right">Paid</th>
                      <th className="px-3 py-2 text-right">Due</th>
                    </tr>
                  </thead>
                  <tbody className={PRINT_TABLE_BODY_CLASS}>
                    {customer.invoices.length > 0 ? (
                      customer.invoices.map((invoice) => (
                        <tr key={invoice.id}>
                          <td className="px-3 py-2.5 text-slate-700">
                            {formatBsDisplayDate(invoice.sales_date)}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">
                            {invoice.invoice_number}
                          </td>
                          <td className="px-3 py-2.5 text-slate-700">{invoice.payment_status}</td>
                          <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
                            {formatCurrency(invoice.grand_total)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-green-700">
                            {formatCurrency(invoice.amount_received)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-amber-700">
                            {formatCurrency(invoice.remaining_amount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                          No linked invoice history.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </PrintDocument>,
          document.body,
        )}
    </>
  );
}
