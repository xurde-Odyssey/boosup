import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FilePlus2, Pencil, ReceiptText, WalletCards } from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { CustomerPaymentModal } from "@/components/customers/CustomerPaymentModal";
import { CustomerPrintPreview } from "@/components/customers/CustomerPrintPreview";
import { PageActionStrip } from "@/components/shared/PageActionStrip";
import { QueryNoticeToast } from "@/components/shared/QueryNoticeToast";
import { SectionCard } from "@/components/shared/SectionCard";
import { LocalizedPaymentStatusBadge, LocalizedStatusBadge } from "@/components/shared/StatusBadge";
import { getCompanySettings } from "@/lib/company-settings-server";
import { formatBsDisplayDate } from "@/lib/nepali-date";
import { formatCurrency } from "@/lib/presentation";
import { getSupabaseClient } from "@/lib/supabase/server";

type PageParams = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CustomerProfilePage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: SearchParams;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const notice = typeof query.notice === "string" ? query.notice : "";
  const openPaymentModal = (Array.isArray(query.action) ? query.action[0] : query.action) === "pay";
  const supabase = await getSupabaseClient();
  const company = await getCompanySettings();
  const todayDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
  }).format(new Date());

  const [
    { data: customer },
    { data: sales = [] },
    paymentsResponse,
    customerPaymentsResponse,
  ] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, email, address, notes, status, created_at")
      .eq("id", id)
      .single(),
    supabase
      .from("sales")
      .select("id, invoice_number, sales_date, payment_status, grand_total, amount_received, remaining_amount")
      .eq("customer_id", id)
      .order("sales_date", { ascending: false }),
    supabase
      .from("sales_payments")
      .select("id, sale_id, payment_date, amount, notes, created_at, sales!inner(customer_id, invoice_number, sales_date)")
      .eq("sales.customer_id", id)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("customer_payments")
      .select(
        "id, payment_date, amount, payment_method, note, created_at, customer_payment_allocations(id, sale_id, amount, sales(invoice_number, sales_date))",
      )
      .eq("customer_id", id)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (!customer) {
    notFound();
  }

  const paymentRows = (paymentsResponse.data ?? []).map((payment) => {
    const sale = Array.isArray(payment.sales) ? payment.sales[0] : payment.sales;

    return {
      ...payment,
      sales: sale
        ? {
            invoice_number: sale.invoice_number ?? null,
            sales_date: sale.sales_date ?? null,
          }
        : null,
    };
  });
  const paymentsBySale = new Map<string, typeof paymentRows>();
  paymentRows.forEach((payment) => {
    if (!payment.sale_id) return;
    const salePayments = paymentsBySale.get(payment.sale_id) ?? [];
    salePayments.push(payment);
    paymentsBySale.set(payment.sale_id, salePayments);
  });
  const customerPaymentRows = (customerPaymentsResponse.data ?? []).map((payment) => {
    const allocations = ((payment.customer_payment_allocations ?? []) as Array<{
      id: string;
      sale_id: string | null;
      amount: number | string | null;
      sales:
        | {
            invoice_number?: string | null;
            sales_date?: string | null;
          }
        | Array<{
            invoice_number?: string | null;
            sales_date?: string | null;
          }>
        | null;
    }>).map((allocation) => {
      const sale = Array.isArray(allocation.sales) ? allocation.sales[0] : allocation.sales;

      return {
        ...allocation,
        amount: Number(allocation.amount ?? 0),
        sales: sale
          ? {
              invoice_number: sale.invoice_number ?? null,
              sales_date: sale.sales_date ?? null,
            }
          : null,
      };
    });

    return {
      ...payment,
      allocations,
    };
  });
  const customerSales = (sales ?? []).map((sale) => ({
    ...sale,
    salePayments: [...(paymentsBySale.get(sale.id) ?? [])].sort((left, right) => {
      const rightKey = `${right.payment_date ?? ""}|${right.created_at ?? ""}|${right.id}`;
      const leftKey = `${left.payment_date ?? ""}|${left.created_at ?? ""}|${left.id}`;
      return rightKey.localeCompare(leftKey);
    }),
  }));
  const totalInvoiced = customerSales.reduce((sum, sale) => sum + Number(sale.grand_total ?? 0), 0);
  const totalPaid = customerSales.reduce((sum, sale) => sum + Number(sale.amount_received ?? 0), 0);
  const totalDue = customerSales.reduce((sum, sale) => sum + Number(sale.remaining_amount ?? 0), 0);
  const lastSaleDate = customerSales[0]?.sales_date ?? null;

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
        <Header
          title={`${customer.name} Ledger`}
          description="Customer-wise history based on sales linked to this saved customer profile."
        />
        <QueryNoticeToast message={notice} />
        <PageActionStrip
          actions={[
            { label: "Back To Customers", href: "/customers", variant: "secondary", icon: ArrowLeft },
            { label: "Create Sales Bill", href: "/sales/create", icon: FilePlus2 },
          ]}
        />

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Invoiced"
            value={formatCurrency(totalInvoiced)}
            trend={`${customerSales.length} linked invoices`}
            trendType="positive"
            icon={ReceiptText}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <SummaryCard
            title="Total Paid"
            value={formatCurrency(totalPaid)}
            trend="Collected from linked invoices"
            trendType="positive"
            icon={WalletCards}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
          />
          <SummaryCard
            title="Total Due"
            value={formatCurrency(totalDue)}
            trend={totalDue > 0 ? "Collection pending" : "No linked due"}
            trendType={totalDue > 0 ? "negative" : "neutral"}
            icon={WalletCards}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-600"
          />
          <SummaryCard
            title="Last Sale"
            value={formatBsDisplayDate(lastSaleDate)}
            trend="Recent linked invoice"
            trendType="neutral"
            icon={ReceiptText}
            iconBgColor="bg-slate-100"
            iconColor="text-slate-600"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <SectionCard>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Customer Details</h3>
                <p className="mt-1 text-xs text-slate-500">Saved profile information.</p>
              </div>
              <LocalizedStatusBadge status={customer.status ?? "ACTIVE"} />
            </div>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Name</dt>
                <dd className="mt-1 font-semibold text-slate-900">{customer.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Phone</dt>
                <dd className="mt-1 text-slate-700">{customer.phone || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Email</dt>
                <dd className="mt-1 text-slate-700">{customer.email || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Address</dt>
                <dd className="mt-1 text-slate-700">{customer.address || "-"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-wider text-slate-400">Notes</dt>
                <dd className="mt-1 text-slate-700">{customer.notes || "-"}</dd>
              </div>
            </dl>
            <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
              <CustomerPaymentModal
                customerId={customer.id}
                customerName={customer.name}
                defaultDate={todayDate}
                totalDue={totalDue}
                autoOpen={openPaymentModal}
              />
              <Link
                href={`/customers/create?edit=${customer.id}`}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
                Edit Profile
              </Link>
              <CustomerPrintPreview
                company={company}
                customer={{
                  name: customer.name,
                  phone: customer.phone,
                  email: customer.email,
                  address: customer.address,
                  totalInvoiced,
                  totalPaid,
                  totalDue,
                  totalInvoices: customerSales.length,
                  lastSaleDate,
                  invoices: customerSales,
                }}
                className="w-full"
              />
            </div>
          </SectionCard>

          <SectionCard className="overflow-hidden" padded={false}>
            <div className="border-b border-slate-50 p-6">
              <h3 className="text-lg font-bold text-slate-900">Recent Linked Invoices</h3>
              <p className="mt-1 text-xs text-slate-500">
                This ledger excludes manual one-time customer-name invoices unless they are linked to this profile.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Invoice</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Date</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Total</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Paid</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Due</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Status</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {customerSales.map((sale, index) => (
                    <Fragment key={sale.id}>
                      <tr
                        className={`transition-colors hover:bg-blue-50/40 ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        }`}
                      >
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">
                          {sale.invoice_number}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatBsDisplayDate(sale.sales_date)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                          {formatCurrency(sale.grand_total)}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-green-700">
                          {formatCurrency(sale.amount_received ?? 0)}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-amber-700">
                          {formatCurrency(sale.remaining_amount ?? 0)}
                        </td>
                        <td className="px-6 py-4">
                          <LocalizedPaymentStatusBadge status={sale.payment_status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/sales/create?edit=${sale.id}`}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                          >
                            Open Bill
                          </Link>
                        </td>
                      </tr>
                      {sale.salePayments.length > 0 ? (
                        <tr className="bg-slate-50/40">
                          <td colSpan={7} className="px-6 py-4">
                            <div className="rounded-xl border border-slate-100 bg-white p-4">
                              <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                                Invoice Payment History
                              </div>
                              <div className="space-y-2">
                                {sale.salePayments.map((payment) => (
                                  <div
                                    key={payment.id}
                                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                                  >
                                    <div className="text-slate-600">
                                      {formatBsDisplayDate(payment.payment_date)}
                                    </div>
                                    <div className="min-w-0 flex-1 text-slate-500">
                                      {payment.notes || "Invoice payment"}
                                    </div>
                                    <div className="font-semibold text-green-700">
                                      {formatCurrency(payment.amount)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))}
                  {customerSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                        No linked invoices yet. Select this customer profile while creating a sales bill to build the ledger.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <SectionCard className="mt-6 overflow-hidden" padded={false}>
          <div className="border-b border-slate-50 p-6">
            <h3 className="text-lg font-bold text-slate-900">Customer Payment Receipts</h3>
            <p className="mt-1 text-xs text-slate-500">
              Grouped customer payments with invoice allocations saved in one transaction.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Date</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Amount</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Method</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Allocated Bills</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {customerPaymentRows.map((payment) => (
                  <tr key={payment.id} className="transition-colors hover:bg-blue-50/40">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatBsDisplayDate(payment.payment_date)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-green-700">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      {payment.payment_method}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="space-y-1">
                        {payment.allocations.map((allocation) => (
                          <div key={allocation.id} className="flex flex-wrap gap-2">
                            <span className="font-semibold text-slate-900">
                              {allocation.sales?.invoice_number ?? "-"}
                            </span>
                            <span>{formatCurrency(allocation.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {payment.note || "-"}
                    </td>
                  </tr>
                ))}
                {customerPaymentRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                      No grouped customer payment receipts yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard className="mt-6 overflow-hidden" padded={false}>
          <div className="border-b border-slate-50 p-6">
            <h3 className="text-lg font-bold text-slate-900">Invoice Payment History</h3>
            <p className="mt-1 text-xs text-slate-500">
              Payment entries recorded against linked sales invoices for this customer.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Date</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Invoice</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Amount</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {paymentRows.map((payment) => (
                  <tr key={payment.id} className="transition-colors hover:bg-blue-50/40">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatBsDisplayDate(payment.payment_date)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      {payment.sales?.invoice_number ?? "-"}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-green-700">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {payment.notes || "-"}
                    </td>
                  </tr>
                ))}
                {paymentRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">
                      No customer payments recorded yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </main>
    </div>
  );
}
