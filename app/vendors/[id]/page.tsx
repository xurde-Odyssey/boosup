import { Fragment } from "react";
import Link from "next/link";
import {
  BadgeDollarSign,
  CreditCard,
  PackageSearch,
  ReceiptText,
  Truck,
} from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { formatCurrency, formatDate } from "@/lib/presentation";
import { getSupabaseClient } from "@/lib/supabase/server";

type Params = Promise<{ id: string }>;

export default async function VendorLedgerPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = getSupabaseClient();

  const [vendorResponse, purchasesResponse, paymentsResponse] = await Promise.all([
    supabase
      .from("vendors")
      .select("id, vendor_code, name, contact_person, phone, address, payment_terms, status, notes")
      .eq("id", id)
      .single(),
    supabase
      .from("purchases")
      .select(
        "id, purchase_number, purchase_date, payment_status, payment_method, total_amount, paid_amount, credit_amount, notes, purchase_items(product_name, quantity, rate)",
      )
      .eq("vendor_id", id)
      .order("purchase_date", { ascending: false }),
    supabase
      .from("purchase_payments")
      .select("id, payment_date, amount, payment_method, purchase_id, purchases!inner(vendor_id, purchase_number)")
      .eq("purchases.vendor_id", id)
      .order("payment_date", { ascending: false }),
  ]);

  const vendor = vendorResponse.data;
  const purchases = purchasesResponse.data ?? [];
  const payments = paymentsResponse.data ?? [];

  const totalPurchase = purchases.reduce(
    (sum, purchase) => sum + Number(purchase.total_amount ?? 0),
    0,
  );
  const totalPaid = purchases.reduce(
    (sum, purchase) => sum + Number(purchase.paid_amount ?? 0),
    0,
  );
  const totalPayable = purchases.reduce(
    (sum, purchase) => sum + Number(purchase.credit_amount ?? 0),
    0,
  );
  const totalItemsBought = purchases.reduce((sum, purchase) => {
    return (
      sum +
      (purchase.purchase_items ?? []).reduce(
        (itemSum, item) => itemSum + Number(item.quantity ?? 0),
        0,
      )
    );
  }, 0);
  const paymentsByPurchase = new Map<string, typeof payments>();
  payments.forEach((payment) => {
    const purchaseId = payment.purchase_id;
    if (!purchaseId) return;
    const existingPayments = paymentsByPurchase.get(purchaseId) ?? [];
    existingPayments.push(payment);
    paymentsByPurchase.set(purchaseId, existingPayments);
  });

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <Header
          title={vendor ? `${vendor.name} Ledger` : "Vendor Ledger"}
          description="Vendor-wise purchase history, bills, paid amount, and outstanding payable."
          primaryActionLabel="Back To Vendors"
          primaryActionHref="/vendors"
        />

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Purchase"
            value={formatCurrency(totalPurchase)}
            trend={`${purchases.length} bills`}
            trendType="positive"
            icon={ReceiptText}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <SummaryCard
            title="Total Paid"
            value={formatCurrency(totalPaid)}
            trend="Settled with vendor"
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

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Vendor Details</h3>
                <p className="text-sm text-slate-500">Supplier profile and payment terms.</p>
              </div>
            </div>

            {vendor ? (
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Vendor</div>
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
                <Link
                  href={`/vendors/create?edit=${vendor.id}`}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                >
                  Edit Vendor Profile
                </Link>
              </div>
            ) : (
              <div className="text-sm text-slate-500">Vendor not found.</div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-50 p-6">
              <h3 className="text-lg font-bold text-slate-900">Purchase History</h3>
              <p className="mt-1 text-xs text-slate-500">Bill-wise vendor ledger and balance.</p>
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
                  {purchases.map((purchase) => {
                    const purchasePayments = paymentsByPurchase.get(purchase.id) ?? [];

                    return (
                      <Fragment key={purchase.id}>
                        <tr key={purchase.id} className="transition-colors hover:bg-slate-50/50">
                          <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                            {purchase.purchase_number}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600">
                            {formatDate(purchase.purchase_date)}
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
                            {formatCurrency(purchase.paid_amount)}
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-red-600">
                            {formatCurrency(purchase.credit_amount)}
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
                        {purchasePayments.length > 0 && (
                          <tr className="bg-slate-50/40">
                            <td colSpan={9} className="px-6 py-4">
                              <div className="rounded-xl border border-slate-100 bg-white p-4">
                                <div className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                                  Payment History
                                </div>
                                <div className="space-y-2">
                                  {purchasePayments.map((payment) => (
                                    <div
                                      key={payment.id}
                                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                                    >
                                      <div className="text-slate-600">
                                        {formatDate(payment.payment_date)}
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
                        No purchase history for this vendor yet.
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
            <h3 className="text-lg font-bold text-slate-900">Payment History</h3>
            <p className="mt-1 text-xs text-slate-500">All payment transactions recorded for this vendor.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Bill</th>
                  <th className="px-6 py-4">Method</th>
                  <th className="px-6 py-4">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payments.map((payment) => (
                  <tr key={payment.id} className="transition-colors hover:bg-slate-50/50">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(payment.payment_date)}
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
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-500">
                      No payments recorded for this vendor yet.
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
