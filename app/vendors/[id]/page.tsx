import { Fragment } from "react";
import Link from "next/link";
import {
  BadgeDollarSign,
  CreditCard,
  PackageSearch,
  Pencil,
  ReceiptText,
  Truck,
} from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { ReportToolbar } from "@/components/shared/ReportToolbar";
import { SupplierPaymentModal } from "@/components/vendors/SupplierPaymentModal";
import { VendorPrintPreview } from "@/components/vendors/VendorPrintPreview";
import { getCompanySettings } from "@/lib/company-settings-server";
import { getServerLocale } from "@/lib/i18n-server";
import { formatBsDisplayDate } from "@/lib/nepali-date";
import { formatCurrency } from "@/lib/presentation";
import { getSupabaseClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function VendorLedgerPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const query = await searchParams;
  const locale = await getServerLocale(query.lang);
  const supabase = await getSupabaseClient();
  const company = await getCompanySettings();
  const todayDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
  }).format(new Date());
  const openPaymentModal = (Array.isArray(query.action) ? query.action[0] : query.action) === "pay";

  const [
    vendorResponse,
    purchasesResponse,
    paymentsResponse,
    supplierPaymentsResponse,
    summaryResponse,
  ] = await Promise.all([
    supabase
      .from("vendors")
      .select("id, vendor_code, name, contact_person, phone, address, payment_terms, status, notes")
      .eq("id", id)
      .single(),
    supabase
      .from("purchases")
      .select(
        "id, purchase_number, purchase_date, created_at, payment_status, payment_method, total_amount, paid_amount, credit_amount, notes, purchase_items(product_name, quantity, rate)",
      )
      .eq("vendor_id", id)
      .order("purchase_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("purchase_payments")
      .select("id, payment_date, amount, payment_method, notes, purchase_id, purchases!inner(vendor_id, purchase_number)")
      .eq("purchases.vendor_id", id)
      .order("payment_date", { ascending: false }),
    supabase
      .from("supplier_payments")
      .select(
        "id, payment_date, amount, payment_method, note, created_at, supplier_payment_allocations(id, amount, purchase_id, purchases(purchase_number, purchase_date))",
      )
      .eq("vendor_id", id)
      .order("payment_date", { ascending: false }),
    supabase.rpc("get_vendor_purchase_summary", { p_vendor_id: id }),
  ]);

  const vendor = vendorResponse.data;
  const purchases = purchasesResponse.data ?? [];
  const payments = (paymentsResponse.data ?? []).map((payment) => {
    const purchase = Array.isArray(payment.purchases) ? payment.purchases[0] : payment.purchases;

    return {
      ...payment,
      purchases: purchase
        ? {
            purchase_number: purchase.purchase_number ?? null,
          }
        : null,
    };
  });
  const supplierPayments = supplierPaymentsResponse.data ?? [];
  const paymentsByPurchase = new Map<string, typeof payments>();
  payments.forEach((payment) => {
    const purchaseId = payment.purchase_id;
    if (!purchaseId) return;
    const existingPayments = paymentsByPurchase.get(purchaseId) ?? [];
    existingPayments.push(payment);
    paymentsByPurchase.set(purchaseId, existingPayments);
  });

  const purchaseRows = purchases
    .map((purchase) => {
      const purchasePayments = [...(paymentsByPurchase.get(purchase.id) ?? [])].sort((left, right) => {
        const rightKey = `${right.payment_date ?? ""}|${right.id}`;
        const leftKey = `${left.payment_date ?? ""}|${left.id}`;
        return rightKey.localeCompare(leftKey);
      });
      const paidFromHistory = purchasePayments.reduce(
        (sum, payment) => sum + Number(payment.amount ?? 0),
        0,
      );
      const paidAmount = purchasePayments.length > 0
        ? paidFromHistory
        : Number(purchase.paid_amount ?? 0);
      const totalAmount = Number(purchase.total_amount ?? 0);
      const remainingAmount = Math.max(totalAmount - paidAmount, 0);

      return {
        ...purchase,
        paidAmount,
        remainingAmount,
        purchasePayments,
      };
    })
    .sort((left, right) => {
      const rightKey = `${right.purchase_date ?? ""}|${right.created_at ?? ""}`;
      const leftKey = `${left.purchase_date ?? ""}|${left.created_at ?? ""}`;
      return rightKey.localeCompare(leftKey);
    });

  const localTotalPurchase = purchaseRows.reduce(
    (sum, purchase) => sum + Number(purchase.total_amount ?? 0),
    0,
  );
  const localTotalPaid = purchaseRows.reduce(
    (sum, purchase) => sum + purchase.paidAmount,
    0,
  );
  const localTotalPayable = purchaseRows.reduce(
    (sum, purchase) => sum + purchase.remainingAmount,
    0,
  );
  const summaryRow = Array.isArray(summaryResponse.data) ? summaryResponse.data[0] : null;
  const totalPurchase = Number(summaryRow?.total_purchase_amount ?? localTotalPurchase);
  const totalPaid = Number(summaryRow?.total_paid ?? localTotalPaid);
  const totalPayable = Number(summaryRow?.total_outstanding ?? localTotalPayable);
  const totalBills = Number(summaryRow?.total_bills ?? purchaseRows.length);
  const totalItemsBought = purchaseRows.reduce((sum, purchase) => {
    return (
      sum +
      (purchase.purchase_items ?? []).reduce(
        (itemSum, item) => itemSum + Number(item.quantity ?? 0),
        0,
      )
    );
  }, 0);
  const lastPurchaseDate = purchaseRows.reduce<string | null>((latest, purchase) => {
    if (!purchase.purchase_date) return latest;
    if (!latest) return purchase.purchase_date;
    return purchase.purchase_date > latest ? purchase.purchase_date : latest;
  }, null);
  const supplierPaymentRows = supplierPayments.map((payment) => ({
    ...payment,
    supplier_payment_allocations: (payment.supplier_payment_allocations ?? [])
      .map((allocation) => ({
        ...allocation,
        purchase: Array.isArray(allocation.purchases) ? allocation.purchases[0] : allocation.purchases,
      }))
      .sort((left, right) => {
        const rightDate = `${right.purchase?.purchase_date ?? ""}|${right.id}`;
        const leftDate = `${left.purchase?.purchase_date ?? ""}|${left.id}`;
        return rightDate.localeCompare(leftDate);
      }),
  }));

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
        <Header
          title={vendor ? `${vendor.name} Ledger` : "Supplier Ledger"}
          description="Supplier-wise purchase history, bills, paid amount, and outstanding payable."
          primaryActionLabel="Back To Suppliers"
          primaryActionHref="/vendors"
        />
        <ReportToolbar actionPath={`/vendors/${id}`} locale={locale} />

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Purchase"
            value={formatCurrency(totalPurchase)}
            trend={`${totalBills} bills`}
            trendType="positive"
            icon={ReceiptText}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <SummaryCard
            title="Total Paid"
            value={formatCurrency(totalPaid)}
            trend="Settled with supplier"
            trendType="positive"
            icon={BadgeDollarSign}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
          />
          <SummaryCard
            title="Outstanding Payable"
            value={formatCurrency(totalPayable)}
            trend="Still to be paid"
            trendType="negative"
            icon={CreditCard}
            iconBgColor="bg-red-50"
            iconColor="text-red-600"
          />
          <SummaryCard
            title="Items Bought"
            value={`${totalItemsBought}`}
            trend="Total quantity bought"
            trendType="neutral"
            icon={PackageSearch}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-600"
          />
        </div>

        <section className="mb-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-50 p-6">
            <h3 className="text-lg font-bold text-slate-900">Supplier Balance Summary</h3>
            <p className="mt-1 text-xs text-slate-500">
              One combined balance view for this supplier across all purchase bills.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Supplier</th>
                  <th className="px-6 py-4">Total Purchase</th>
                  <th className="px-6 py-4">Total Paid</th>
                  <th className="px-6 py-4">Total Pending</th>
                  <th className="px-6 py-4">Bills</th>
                  <th className="px-6 py-4">Last Purchase</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-slate-50">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-slate-900">
                      {vendor?.name ?? "Unknown supplier"}
                    </div>
                    <div className="text-xs text-slate-500">{vendor?.vendor_code ?? "-"}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                    {formatCurrency(totalPurchase)}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-green-600">
                    {formatCurrency(totalPaid)}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-amber-700">
                    {formatCurrency(totalPayable)}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">{totalBills}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {formatBsDisplayDate(lastPurchaseDate)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Supplier Details</h3>
                <p className="text-sm text-slate-500">Supplier profile and payment terms.</p>
              </div>
            </div>

            {vendor ? (
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Supplier</div>
                  <div className="mt-1 font-semibold text-slate-900">{vendor.name}</div>
                  <div className="text-slate-500">{vendor.vendor_code}</div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Contact Person</div>
                  <div className="mt-1 text-slate-700">{vendor.contact_person ?? "-"}</div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Phone</div>
                  <div className="mt-1 text-slate-700">{vendor.phone ?? "-"}</div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Address</div>
                  <div className="mt-1 text-slate-700">{vendor.address ?? "-"}</div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment Terms</div>
                  <div className="mt-1 text-slate-700">{vendor.payment_terms}</div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Status</div>
                  <div className="mt-1 text-slate-700">{vendor.status}</div>
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Notes</div>
                  <div className="mt-1 text-slate-700">{vendor.notes ?? "-"}</div>
                </div>
                <div className="space-y-3 pt-2">
                  <SupplierPaymentModal
                    vendorId={vendor.id}
                    vendorName={vendor.name}
                    defaultDate={todayDate}
                    totalPayable={totalPayable}
                    autoOpen={openPaymentModal}
                  />
                  <Link
                    href={`/vendors/create?edit=${vendor.id}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit Supplier Profile
                  </Link>
                </div>
                <VendorPrintPreview
                  company={company}
                  locale={locale}
                  vendor={{
                    name: vendor.name,
                    vendor_code: vendor.vendor_code,
                    contact_person: vendor.contact_person,
                    phone: vendor.phone,
                    address: vendor.address,
                    totalPurchase,
                    totalPaid,
                    totalPayable,
                    totalBills,
                    lastPurchaseDate,
                    payments,
                  }}
                  className="w-full"
                />
              </div>
            ) : (
              <div className="text-sm text-slate-500">Supplier not found.</div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-50 p-6">
              <h3 className="text-lg font-bold text-slate-900">Purchase History</h3>
              <p className="mt-1 text-xs text-slate-500">Bill-wise supplier ledger and balance.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Bill</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Items</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Paid</th>
                    <th className="px-6 py-4">Payable</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Method</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {purchaseRows.map((purchase) => {
                    return (
                      <Fragment key={purchase.id}>
                        <tr key={purchase.id} className="transition-colors hover:bg-slate-50/50">
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                            {purchase.purchase_number}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {formatBsDisplayDate(purchase.purchase_date)}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            <div className="space-y-1">
                              {(purchase.purchase_items ?? []).map((item, index) => (
                                <div key={`${purchase.id}-${index}`}>
                                  {item.product_name} ({item.quantity})
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                            {formatCurrency(purchase.total_amount)}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-green-600">
                            {formatCurrency(purchase.paidAmount)}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-red-600">
                            {formatCurrency(purchase.remainingAmount)}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {purchase.payment_status}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {purchase.payment_method}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              href={`/purchases/create?edit=${purchase.id}`}
                              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                            >
                              Open Bill
                            </Link>
                          </td>
                        </tr>
                        {purchase.purchasePayments.length > 0 && (
                          <tr className="bg-slate-50/40">
                            <td colSpan={9} className="px-6 py-4">
                              <div className="rounded-xl border border-slate-100 bg-white p-4">
                                <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                                  Payment History
                                </div>
                                <div className="space-y-2">
                                  {purchase.purchasePayments.map((payment) => (
                                    <div
                                      key={payment.id}
                                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                                    >
                                      <div className="text-slate-600">
                                        {formatBsDisplayDate(payment.payment_date)}
                                      </div>
                                      <div className="text-slate-600">{payment.payment_method}</div>
                                      <div className="font-semibold text-green-600">
                                        {formatCurrency(payment.amount)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {purchases.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-10 text-center text-sm text-slate-500">
                        No purchase history for this supplier yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-50 p-6">
            <h3 className="text-lg font-bold text-slate-900">Supplier Payment History</h3>
            <p className="mt-1 text-xs text-slate-500">
              One payment entry per supplier payment, including how it was allocated across bills.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Note</th>
                  <th className="px-6 py-4">Allocations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {supplierPaymentRows.map((payment) => (
                  <tr key={payment.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatBsDisplayDate(payment.payment_date)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {payment.payment_method}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {payment.note || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="space-y-2">
                        {payment.supplier_payment_allocations.length > 0 ? (
                          payment.supplier_payment_allocations.map((allocation) => (
                            <div
                              key={allocation.id}
                              className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2"
                            >
                              <div className="font-semibold text-slate-900">
                                {allocation.purchase?.purchase_number ?? "Bill"}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                <span>{formatBsDisplayDate(allocation.purchase?.purchase_date ?? null)}</span>
                                <span>{formatCurrency(allocation.amount)}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <span>No allocations recorded.</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {supplierPaymentRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                      No supplier-level payments recorded for this supplier yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-50 p-6">
            <h3 className="text-lg font-bold text-slate-900">Bill Payment History</h3>
            <p className="mt-1 text-xs text-slate-500">
              Manual bill payments and supplier-level allocations recorded against individual purchase bills.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Bill</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payments.map((payment) => (
                  <tr key={payment.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatBsDisplayDate(payment.payment_date)}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      {payment.purchases?.purchase_number ?? "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {payment.payment_method}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {payment.notes || "-"}
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                      No bill payments recorded for this supplier yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
