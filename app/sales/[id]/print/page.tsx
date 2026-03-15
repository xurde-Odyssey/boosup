import Image from "next/image";
import Link from "next/link";
import logo from "@/app/logos/logo.png";
import { AutoPrint } from "@/components/shared/AutoPrint";
import { PrintAgainButton } from "@/components/shared/PrintAgainButton";
import { formatCurrency, formatDate } from "@/lib/presentation";
import { getSupabaseClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

export default async function SalesPrintPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await getSupabaseClient();

  const [{ data: sale }, itemsResponse, paymentsResponse] = await Promise.all([
    supabase
      .from("sales")
      .select(
        "id, invoice_number, customer_name, sales_date, payment_status, subtotal, discount, tax, amount_received, remaining_amount, notes",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("sales_items")
      .select("product_name, quantity, rate, taxable")
      .eq("sale_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("sales_payments")
      .select("id, payment_date, amount, created_at")
      .eq("sale_id", id)
      .order("payment_date", { ascending: false }),
  ]);

  if (!sale) {
    return (
      <main className="min-h-screen bg-slate-100 p-8">
        <div className="mx-auto max-w-4xl rounded-3xl bg-white p-10 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Invoice not found</h1>
          <p className="mt-2 text-sm text-slate-500">This sales invoice could not be loaded.</p>
          <Link
            href="/sales"
            className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
          >
            Back To Sales
          </Link>
        </div>
      </main>
    );
  }

  const salesItems =
    itemsResponse.data?.length
      ? itemsResponse.data.map((item) => {
          const quantity = Number(item.quantity ?? 0);
          const rate = Number(item.rate ?? 0);
          const amount = quantity * rate;
          const taxAmount = item.taxable ? amount * 0.13 : 0;

          return {
            ...item,
            amount,
            tax_amount: taxAmount,
          };
        })
      : [
          {
            product_name: "Saved sales item",
            quantity: 1,
            rate: Number(sale.subtotal ?? 0),
            taxable: Number(sale.tax ?? 0) > 0,
            amount: Number(sale.subtotal ?? 0),
            tax_amount: Number(sale.tax ?? 0),
          },
        ];
  const paymentHistory = [...(paymentsResponse.data ?? [])].sort((left, right) =>
    left.payment_date < right.payment_date ? 1 : -1,
  );
  const subtotal = Number(sale.subtotal ?? 0);
  const discount = Number(sale.discount ?? 0);
  const tax = Number(sale.tax ?? 0);
  const amountReceived = Number(sale.amount_received ?? 0);
  const remainingAmount = Number(sale.remaining_amount ?? 0);
  const grandTotal = Math.max(subtotal - discount + tax, 0);

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">
      <AutoPrint />

      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between print:hidden">
        <Link
          href={`/sales/create?edit=${sale.id}`}
          className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm"
        >
          Back To Sales
        </Link>
        <PrintAgainButton />
      </div>

      <section className="mx-auto w-full max-w-[210mm] bg-white p-8 shadow-sm print:min-h-[297mm] print:max-w-none print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white">
              <Image
                src={logo}
                alt="Dipak Suppliers logo"
                className="h-full w-full object-contain"
                priority
              />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                Dipak Suppliers
              </h1>
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <p>Urlabari 07, Nepal</p>
                <p>suppliersdipak@gmail.com</p>
                <p>www.dipaksuppliers.com.np</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-900 px-5 py-4 text-right text-white">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-slate-300">
              Sales Invoice
            </div>
            <div className="mt-2 text-2xl font-black">{sale.invoice_number}</div>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 border-b border-slate-200 py-6 md:grid-cols-2">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Bill To
            </div>
            <div className="mt-3 text-lg font-bold text-slate-900">{sale.customer_name}</div>
            <div className="mt-1 text-sm text-slate-500">Customer</div>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Sales Date
              </div>
              <div className="mt-2 font-semibold text-slate-900">
                {formatDate(sale.sales_date)}
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Status
              </div>
              <div className="mt-2 font-semibold text-slate-900">{sale.payment_status}</div>
            </div>
          </div>
        </div>

        <div className="py-6">
          <div className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            Sales Items
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3 text-right">Quantity</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">Tax</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {salesItems.map((item, index) => (
                  <tr key={`${item.product_name}-${index}`} className="text-sm">
                    <td className="px-4 py-4 font-semibold text-slate-900">{index + 1}</td>
                    <td className="px-4 py-4 text-slate-700">{item.product_name}</td>
                    <td className="px-4 py-4 text-right text-slate-700">{item.quantity}</td>
                    <td className="px-4 py-4 text-right text-slate-700">
                      {formatCurrency(item.rate)}
                    </td>
                    <td className="px-4 py-4 text-right text-slate-700">
                      {item.taxable ? formatCurrency(item.tax_amount) : "VAT Free"}
                    </td>
                    <td className="px-4 py-4 text-right font-semibold text-slate-900">
                      {formatCurrency(item.amount)}
                    </td>
                  </tr>
                ))}
                {salesItems.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                      No sales items found for this invoice.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 border-t border-slate-200 py-6 md:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Payment History
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {paymentHistory.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDate(payment.payment_date)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-green-600">
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

            {sale.notes && (
              <div className="mt-6">
                <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Notes
                </div>
                <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                  {sale.notes}
                </p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Discount Amount</span>
                <span className="font-semibold text-slate-900">{formatCurrency(discount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total Tax Amount</span>
                <span className="font-semibold text-slate-900">{formatCurrency(tax)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="font-semibold text-slate-900">Total Amount</span>
                <span className="text-lg font-bold text-slate-900">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Previously Paid Amount</span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(amountReceived)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Remaining Amount</span>
                <span className="font-semibold text-amber-700">
                  {formatCurrency(remainingAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
