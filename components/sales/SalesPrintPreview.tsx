"use client";

import Image from "next/image";
import { createPortal } from "react-dom";
import { useMemo } from "react";
import { Printer } from "lucide-react";
import logo from "@/app/logos/logo.png";
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
          <div data-print-root="sales-invoice" className="hidden print:block">
            <section
              data-print-card="sales-invoice"
              className="w-full bg-white p-6 shadow-sm print:min-h-[297mm] print:shadow-none"
            >
          <header className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
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
                <h1 className="text-2xl font-black tracking-tight text-slate-900">
                  Dipak Suppliers
                </h1>
                <div className="mt-1 space-y-0.5 text-xs text-slate-600">
                  <p>Urlabari 07, Nepal</p>
                  <p>suppliersdipak@gmail.com</p>
                  <p>www.dipaksuppliers.com.np</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-900 px-4 py-3 text-right text-white">
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-slate-300">
                Sales Invoice
              </div>
              <div className="mt-1 text-xl font-black">{sale.invoice_number}</div>
            </div>
          </header>

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
            <div className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Sales Items
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 text-right">Unit Price</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {salesItems.map((item, index) => (
                    <tr key={`${item.product_name}-${index}`} className="text-xs">
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
            <div className="ml-auto max-w-[280px] rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Payment History
              </div>
              <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
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

            {sale.notes && (
              <div className="mt-4">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Notes
                </div>
                <p className="mt-2 rounded-2xl bg-slate-50 p-3 text-xs text-slate-600">
                  {sale.notes}
                </p>
              </div>
            )}
          </div>

          <footer className="border-t border-slate-200 pt-4 text-center text-[11px] text-slate-500">
            Note: This invoice doesn&apos;t represent any legal work; it is computer-generated and used for information only.
          </footer>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
