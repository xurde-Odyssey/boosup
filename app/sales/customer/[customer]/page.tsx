import Link from "next/link";
import { ArrowLeft, CircleDollarSign, Clock3, FileText, HandCoins, UserRound } from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { PageActionStrip } from "@/components/shared/PageActionStrip";
import { formatBsDisplayDate } from "@/lib/nepali-date";
import { formatCurrency } from "@/lib/presentation";
import { getSupabaseClient } from "@/lib/supabase/server";

export default async function SalesCustomerLedgerPage({
  params,
}: {
  params: Promise<{ customer: string }>;
}) {
  const supabase = await getSupabaseClient();
  const resolvedParams = await params;
  const customerName = decodeURIComponent(resolvedParams.customer);

  const { data: sales = [] } = await supabase
    .from("sales")
    .select(
      "id, invoice_number, sales_date, payment_status, grand_total, amount_received, remaining_amount, created_at",
    )
    .eq("customer_name", customerName)
    .order("created_at", { ascending: false });

  const saleRows = sales ?? [];
  const saleIds = saleRows.map((sale) => sale.id);
  const [{ data: salesItems = [] }, { data: salesPayments = [] }] = saleIds.length
    ? await Promise.all([
        supabase
          .from("sales_items")
          .select("sale_id, product_name, quantity, amount")
          .in("sale_id", saleIds),
        supabase
          .from("sales_payments")
          .select("id, sale_id, payment_date, amount, created_at")
          .in("sale_id", saleIds)
          .order("created_at", { ascending: false }),
      ])
    : [{ data: [] }, { data: [] }];
  const salesItemRows = salesItems ?? [];
  const salesPaymentRows = salesPayments ?? [];

  const totalInvoiced = saleRows.reduce((sum, sale) => sum + Number(sale.grand_total ?? 0), 0);
  const totalReceived = saleRows.reduce((sum, sale) => sum + Number(sale.amount_received ?? 0), 0);
  const totalRemaining = saleRows.reduce((sum, sale) => sum + Number(sale.remaining_amount ?? 0), 0);
  const overdueCount = saleRows.filter((sale) => sale.payment_status === "OVERDUE").length;

  const salesWithItems = saleRows.map((sale) => {
    const linkedItems = salesItemRows.filter((item) => item.sale_id === sale.id);
    return {
      ...sale,
      itemCount: linkedItems.length,
      itemSummary: linkedItems.map((item) => item.product_name).filter(Boolean).join(", "),
    };
  });

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
        <Header
          title={`${customerName} Ledger`}
          description="Complete sales, collection, and remaining balance view for this customer."
        />

        <PageActionStrip
          actions={[
            { label: "Back To Sales", href: "/sales" },
            { label: "Create Sales", href: "/sales/create", variant: "secondary" },
          ]}
        />

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Invoiced"
            value={formatCurrency(totalInvoiced)}
            trend={`${saleRows.length} invoices`}
            trendType="positive"
            icon={FileText}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <SummaryCard
            title="Total Received"
            value={formatCurrency(totalReceived)}
            trend="Collected from customer"
            trendType="positive"
            icon={HandCoins}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
          />
          <SummaryCard
            title="Remaining Balance"
            value={formatCurrency(totalRemaining)}
            trend="Open amount to collect"
            trendType={totalRemaining > 0 ? "neutral" : "positive"}
            icon={CircleDollarSign}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-600"
          />
          <SummaryCard
            title="Overdue Invoices"
            value={`${overdueCount}`}
            trend="Require collection follow-up"
            trendType={overdueCount > 0 ? "negative" : "neutral"}
            icon={Clock3}
            iconBgColor="bg-red-50"
            iconColor="text-red-500"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-50 p-6">
              <h3 className="text-lg font-bold text-slate-900">Customer Invoices</h3>
              <p className="mt-1 text-xs text-slate-500">
                All invoices and balances for this customer.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Invoice</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Date</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Items</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Total</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Received</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Remaining</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {salesWithItems.map((sale, index) => (
                    <tr
                      key={sale.id}
                      className={`transition-colors hover:bg-blue-50/30 ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/20"
                      }`}
                    >
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                        <Link
                          href={`/sales/create?edit=${sale.id}`}
                          className="hover:text-blue-600"
                          title={`Open sales invoice ${sale.invoice_number}`}
                        >
                          {sale.invoice_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {formatBsDisplayDate(sale.sales_date)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <div>{sale.itemCount} items</div>
                        <div className="mt-1 text-xs text-slate-400">
                          {sale.itemSummary || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900">
                        {formatCurrency(sale.grand_total)}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-green-700">
                        {formatCurrency(sale.amount_received)}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-amber-700">
                        {formatCurrency(sale.remaining_amount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{sale.payment_status}</td>
                    </tr>
                  ))}
                  {salesWithItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center">
                        <div className="inline-flex flex-col items-center text-center">
                          <div className="rounded-2xl bg-slate-100 p-3 text-slate-500">
                            <UserRound className="h-5 w-5" />
                          </div>
                          <div className="mt-4 text-base font-bold text-slate-900">
                            No invoices found
                          </div>
                          <p className="mt-2 max-w-md text-sm text-slate-500">
                            This customer does not have any saved sales invoices yet.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-50 p-6">
                <h3 className="text-lg font-bold text-slate-900">Collection History</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Latest payments received from this customer.
                </p>
              </div>
              <div className="divide-y divide-slate-50">
                {salesPaymentRows.length > 0 ? (
                  salesPaymentRows.map((payment, index) => {
                    const parentSale = saleRows.find((sale) => sale.id === payment.sale_id);
                    return (
                      <div
                        key={payment.id}
                        className={`px-6 py-4 ${index % 2 === 0 ? "bg-white" : "bg-slate-50/20"}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {formatBsDisplayDate(payment.payment_date)}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              Invoice {parentSale?.invoice_number ?? "-"}
                            </div>
                          </div>
                          <div className="text-sm font-bold text-green-700">
                            {formatCurrency(payment.amount)}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-6 py-10 text-center text-sm text-slate-500">
                    No payment history recorded for this customer yet.
                  </div>
                )}
              </div>
            </section>

            <Link
              href="/sales"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sales overview
            </Link>
          </aside>
        </div>
      </main>
    </div>
  );
}
