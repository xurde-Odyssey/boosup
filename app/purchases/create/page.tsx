import Link from "next/link";
import { ActionNotice } from "@/components/shared/ActionNotice";
import { formatCurrency } from "@/lib/presentation";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { upsertPurchase } from "@/app/actions";
import { getSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const getTodayDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
  }).format(new Date());

export default async function CreatePurchasePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = getSupabaseClient();
  const params = await searchParams;
  const editId = typeof params.edit === "string" ? params.edit : "";
  const notice = typeof params.notice === "string" ? params.notice : "";
  const todayDate = getTodayDate();

  const [{ data: vendors = [] }, purchaseResponse, paymentsResponse] = await Promise.all([
    supabase
      .from("vendors")
      .select("id, name")
      .eq("status", "ACTIVE")
      .order("name"),
    editId
      ? supabase
          .from("purchases")
          .select(
            "id, purchase_number, purchase_date, payment_status, payment_type, payment_method, paid_amount, total_amount, credit_amount, notes, vendor_id, vendor_name, purchase_items(product_id, product_name, quantity, rate)",
          )
          .eq("id", editId)
          .single()
      : Promise.resolve({ data: null }),
    editId
      ? supabase
          .from("purchase_payments")
          .select("id, payment_date, amount, payment_method, created_at")
          .eq("purchase_id", editId)
          .order("payment_date", { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  const editingPurchase = purchaseResponse.data;
  const purchasePayments = paymentsResponse.data ?? [];
  const purchaseItem = editingPurchase?.purchase_items?.[0] ?? null;
  const quantity = Number(purchaseItem?.quantity ?? 1);
  const rate = Number(purchaseItem?.rate ?? 0);
  const totalAmount = quantity * rate;
  const previouslyPaidAmount = Number(editingPurchase?.paid_amount ?? 0);
  const remainingAmount = Math.max(totalAmount - previouslyPaidAmount, 0);

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <Header
          title={editingPurchase ? "Update Purchase" : "Create Purchase"}
          description="Create and update purchase entries in a dedicated screen."
          primaryActionLabel="Back To Purchases"
          primaryActionHref="/purchases"
        />

        {notice && <ActionNotice message={notice} />}

        <section className="max-w-3xl rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">
              {editingPurchase ? "Update Purchase" : "Create Purchase"}
            </h3>
            <p className="text-sm text-slate-500">
              Purchase record with typed raw material item details.
            </p>
          </div>

          <form action={upsertPurchase} className="space-y-4">
            <input type="hidden" name="id" defaultValue={editingPurchase?.id ?? ""} />
            <input type="hidden" name="redirect_to" value="/purchases" />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Purchase Number
                </label>
                <input
                  name="purchase_number"
                  required
                  defaultValue={editingPurchase?.purchase_number ?? ""}
                  placeholder="PUR-2026-001"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Purchase Date
                </label>
                <input
                  name="purchase_date"
                  type="date"
                  required
                  defaultValue={editingPurchase?.purchase_date ?? todayDate}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Saved Vendor</label>
              <select
                name="vendor_id"
                defaultValue={editingPurchase?.vendor_id ?? ""}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
              >
                <option value="">Select saved vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">
                Choose a saved vendor or type a one-time vendor name below.
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                One-Time Vendor Name
              </label>
              <input
                name="vendor_name"
                defaultValue={editingPurchase?.vendor_name ?? ""}
                placeholder="Type vendor name if no profile exists"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Raw Material Name
              </label>
              <input
                name="product_name"
                defaultValue={purchaseItem?.product_name ?? ""}
                placeholder="Type raw material or imported goods name"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Quantity</label>
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  step="0.01"
                  defaultValue={purchaseItem?.quantity ?? 1}
                  placeholder="Enter quantity"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Rate</label>
                <input
                  name="rate"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={purchaseItem?.rate ?? 0}
                  placeholder="Enter rate in Rs."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Payment Status
                </label>
                <select
                  name="payment_status"
                  defaultValue={editingPurchase?.payment_status ?? "PENDING"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="PAID">Paid</option>
                  <option value="PARTIAL">Partial</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="PENDING">Pending</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Payment Method
                </label>
                <select
                  name="payment_method"
                  defaultValue={editingPurchase?.payment_method ?? "Cash"}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="Mobile">Mobile</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Previously Paid Amount
                </label>
                <input
                  type="text"
                  readOnly
                  value={formatCurrency(previouslyPaidAmount)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Amount Paid Now
                </label>
                <input
                  name="payment_now"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={0}
                  placeholder="Enter new payment amount"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Payment Date
                </label>
                <input
                  name="payment_date"
                  type="date"
                  defaultValue={todayDate}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Current Total Amount
                </label>
                <input
                  type="text"
                  readOnly
                  value={formatCurrency(totalAmount)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Remaining Amount
                </label>
                <input
                  type="text"
                  readOnly
                  value={formatCurrency(remainingAmount)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Notes</label>
              <textarea
                name="notes"
                rows={3}
                defaultValue={editingPurchase?.notes ?? ""}
                placeholder="Optional purchase note"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
              >
                {editingPurchase ? "Update Purchase" : "Save Purchase"}
              </button>
              <Link
                href="/purchases"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700"
              >
                Cancel
              </Link>
            </div>
          </form>
        </section>

        {editingPurchase && (
          <section className="mt-6 max-w-3xl overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-50 p-6">
              <h3 className="text-lg font-bold text-slate-900">Purchase Payment History</h3>
              <p className="mt-1 text-xs text-slate-500">
                All partial and full payments recorded for this purchase bill.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Payment Date</th>
                    <th className="px-6 py-4">Method</th>
                    <th className="px-6 py-4">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {purchasePayments.map((payment) => (
                    <tr key={payment.id} className="transition-colors hover:bg-slate-50/50">
                      <td className="px-6 py-4 text-sm text-slate-600">{payment.payment_date}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{payment.payment_method}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-600">
                        {formatCurrency(payment.amount)}
                      </td>
                    </tr>
                  ))}
                  {purchasePayments.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-sm text-slate-500">
                        No payments recorded for this purchase yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
