"use client";

import { createPortal } from "react-dom";
import { useMemo } from "react";
import { Printer } from "lucide-react";
import {
  PrintDocument,
  PrintHeader,
  PrintSectionTitle,
  PRINT_TABLE_BODY_CLASS,
  PRINT_TABLE_HEAD_ROW_CLASS,
  PRINT_TABLE_WRAP_CLASS,
} from "@/components/shared/PrintDocument";
import { formatCurrency, formatDate } from "@/lib/presentation";

type SalesItem = {
  product_name: string;
  quantity: number | null;
  rate: number | null;
  taxable?: boolean | null;
  tax_amount?: number | null;
};

type SalesPayment = {
  id: string;
  payment_date: string;
  amount: number;
  created_at?: string;
};

type PrintableSale = {
  id: string;
  invoice_number: string;
  customer_name: string;
  sales_date: string;
  payment_status: string;
  subtotal: number | null;
  discount: number | null;
  tax: number | null;
  amount_received: number | null;
  remaining_amount: number | null;
  notes: string | null;
  sales_items: SalesItem[];
  sales_payments: SalesPayment[];
};

export function SalesPrintPreview({ sale }: { sale: PrintableSale }) {
  const canUseDOM = typeof window !== "undefined" && typeof document !== "undefined";
  const paymentHistory = useMemo(
    () =>
      [...(sale.sales_payments ?? [])].sort((left, right) =>
        left.payment_date < right.payment_date ? 1 : -1,
      ),
    [sale.sales_payments],
  );
  const salesItems = useMemo(() => {
    if (sale.sales_items?.length) {
      return sale.sales_items.map((item) => {
        const quantity = Number(item.quantity ?? 0);
        const rate = Number(item.rate ?? 0);
        const amount = quantity * rate;
        const taxAmount =
          typeof item.tax_amount === "number"
            ? item.tax_amount
            : item.taxable
              ? amount * 0.13
              : 0;

        return {
          ...item,
          amount,
          taxAmount,
        };
      });
    }

    return [
      {
        product_name: "Saved sales item",
        quantity: 1,
        rate: Number(sale.subtotal ?? 0),
        taxable: Number(sale.tax ?? 0) > 0,
        amount: Number(sale.subtotal ?? 0),
        taxAmount: Number(sale.tax ?? 0),
      },
    ];
  }, [sale]);

  const subtotal = Number(sale.subtotal ?? 0);
  const tax = Number(sale.tax ?? 0);
  const discount = Number(sale.discount ?? 0);
  const grandTotal = Math.max(subtotal - discount + tax, 0);
  const remainingAmount = Number(sale.remaining_amount ?? 0);

  const handlePrint = () => {
    document.body.classList.add("invoice-print-active");
    const previousTitle = document.title;
    document.title = `${sale.customer_name} - ${sale.invoice_number}`;

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
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
      >
        <Printer className="h-4 w-4" />
        Print Invoice
      </button>

      {canUseDOM &&
        createPortal(
          <PrintDocument root="sales-invoice">
            <PrintHeader
              title="Sales Invoice"
              metaRows={[
                { label: "Invoice", value: sale.invoice_number },
                { label: "Date", value: formatDate(sale.sales_date) },
                { label: "Status", value: sale.payment_status },
              ]}
            />

            <div className="overflow-hidden border-b border-slate-200 py-4">
              <table className="w-full text-left text-sm">
                <tbody>
                  <tr className="bg-slate-50">
                    <td className="w-32 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Customer Name
                    </td>
                    <td className="px-3 py-2 font-semibold text-slate-900">
                      {sale.customer_name}
                    </td>
                    <td className="w-28 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Sales Date
                    </td>
                    <td className="w-36 px-3 py-2 font-semibold text-slate-900">
                      {formatDate(sale.sales_date)}
                    </td>
                    <td className="w-24 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Status
                    </td>
                    <td className="w-28 px-3 py-2 font-semibold text-slate-900">
                      {sale.payment_status}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="py-4">
              <PrintSectionTitle>Sales Items</PrintSectionTitle>
              <div className={PRINT_TABLE_WRAP_CLASS}>
                <table className="w-full text-left">
                  <thead>
                    <tr className={PRINT_TABLE_HEAD_ROW_CLASS}>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2 text-right">Unit Price</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className={PRINT_TABLE_BODY_CLASS}>
                    {salesItems.map((item, index) => (
                      <tr key={`${item.product_name}-${index}`}>
                        <td className="px-3 py-2.5 text-slate-700">{item.product_name}</td>
                        <td className="px-3 py-2.5 text-right text-slate-700">
                          {formatCurrency(item.rate)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-700">{item.quantity}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-900">
                          {formatCurrency(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-t border-slate-200 py-4">
              <div className="ml-auto max-w-[320px] rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Subtotal</span>
                    <span className="font-bold text-slate-900">{formatCurrency(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Discount</span>
                      <span className="font-semibold text-slate-900">
                        {formatCurrency(discount)}
                      </span>
                    </div>
                  )}
                  {tax > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Tax</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(tax)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                    <span className="font-semibold text-slate-900">Total</span>
                    <span className="text-base font-bold text-slate-900">
                      {formatCurrency(grandTotal)}
                    </span>
                  </div>
                  {remainingAmount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Remaining Amount</span>
                      <span className="font-bold text-amber-700">
                        {formatCurrency(remainingAmount)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <PrintSectionTitle>Payment History</PrintSectionTitle>
                <div className={PRINT_TABLE_WRAP_CLASS}>
                  <table className="w-full text-left">
                    <thead>
                      <tr className={PRINT_TABLE_HEAD_ROW_CLASS}>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className={PRINT_TABLE_BODY_CLASS}>
                      {paymentHistory.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-3 py-2.5 text-slate-700">
                            {formatDate(payment.payment_date)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold text-green-600">
                            {formatCurrency(payment.amount)}
                          </td>
                        </tr>
                      ))}
                      {paymentHistory.length === 0 && (
                        <tr>
                          <td colSpan={2} className="px-4 py-6 text-center text-slate-500">
                            No payment transactions yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {sale.notes && (
              <div className="border-t border-slate-200 pt-4">
                <PrintSectionTitle>Notes</PrintSectionTitle>
                <p className="mt-2 text-sm leading-6 text-slate-600">{sale.notes}</p>
              </div>
            )}

            <footer className="mt-6 border-t border-slate-200 pt-4 text-[11px] leading-5 text-slate-500">
              This invoice does not represent any legal work; it is computer-generated and used for
              information only.
            </footer>
          </PrintDocument>,
          document.body,
        )}
    </>
  );
}
