"use client";

import { useState } from "react";
import { upsertPurchase } from "@/app/actions";
import { FormSectionHeader } from "@/components/shared/FormSectionHeader";
import { FormStickyActions } from "@/components/shared/FormStickyActions";
import { formatCurrency } from "@/lib/presentation";

type VendorOption = {
  id: string;
  name: string;
};

type PurchasePayment = {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
};

type EditingPurchase = {
  id: string;
  purchase_number: string;
  purchase_date: string;
  payment_status: string;
  payment_method: string;
  paid_amount: number | null;
  total_amount: number | null;
  credit_amount: number | null;
  notes: string | null;
  vendor_id: string | null;
  vendor_name: string | null;
  purchase_items:
    | {
        product_name: string | null;
        quantity: number | null;
        rate: number | null;
      }[]
    | null;
};

const toNumber = (value: string) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

export function PurchaseForm({
  vendors,
  editingPurchase,
  purchasePayments,
  defaultDate,
}: {
  vendors: VendorOption[];
  editingPurchase: EditingPurchase | null;
  purchasePayments: PurchasePayment[];
  defaultDate: string;
}) {
  const purchaseItem = editingPurchase?.purchase_items?.[0] ?? null;
  const [purchaseNumber, setPurchaseNumber] = useState(editingPurchase?.purchase_number ?? "");
  const [purchaseDate, setPurchaseDate] = useState(editingPurchase?.purchase_date ?? defaultDate);
  const [vendorId, setVendorId] = useState(editingPurchase?.vendor_id ?? "");
  const [vendorName, setVendorName] = useState(editingPurchase?.vendor_name ?? "");
  const [productName, setProductName] = useState(purchaseItem?.product_name ?? "");
  const [quantity, setQuantity] = useState(String(purchaseItem?.quantity ?? 1));
  const [rate, setRate] = useState(String(purchaseItem?.rate ?? 0));
  const [paymentStatus, setPaymentStatus] = useState(editingPurchase?.payment_status ?? "PENDING");
  const [paymentMethod, setPaymentMethod] = useState(editingPurchase?.payment_method ?? "Cash");
  const [paymentNow, setPaymentNow] = useState("0");
  const [paymentDate, setPaymentDate] = useState(defaultDate);
  const [notes, setNotes] = useState(editingPurchase?.notes ?? "");

  const previousPaidAmount = Number(editingPurchase?.paid_amount ?? 0);
  const itemAmount = Math.max(toNumber(quantity) * toNumber(rate), 0);
  const normalizedPaymentNow =
    paymentStatus === "PAID" && !editingPurchase && toNumber(paymentNow) <= 0
      ? itemAmount
      : Math.max(toNumber(paymentNow), 0);
  const nextPaidAmount = Math.min(previousPaidAmount + normalizedPaymentNow, itemAmount);
  const remainingAmount = Math.max(itemAmount - nextPaidAmount, 0);
  const activeVendorLabel =
    vendorId ? vendors.find((vendor) => vendor.id === vendorId)?.name ?? "Saved vendor" : vendorName || "No vendor selected";

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-slate-900">
            {editingPurchase ? "Update Purchase" : "Create Purchase"}
          </h3>
          <p className="text-sm text-slate-500">
            Purchase record with typed raw material item details.
          </p>
        </div>

        <form action={upsertPurchase} className="space-y-5">
          <input type="hidden" name="id" defaultValue={editingPurchase?.id ?? ""} />
          <input type="hidden" name="redirect_to" value="/purchases" />

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <FormSectionHeader
              eyebrow="Party"
              title="Vendor and bill details"
              description="Capture who supplied the goods and when the bill was issued."
            />
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Purchase Number
                </label>
                <input
                  name="purchase_number"
                  required
                  autoFocus
                  value={purchaseNumber}
                  onChange={(event) => setPurchaseNumber(event.target.value)}
                  placeholder="PUR-2026-001"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
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
                  value={purchaseDate}
                  onChange={(event) => setPurchaseDate(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Saved Vendor
                </label>
                <select
                  name="vendor_id"
                  value={vendorId}
                  onChange={(event) => setVendorId(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">Select saved vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  One-Time Vendor Name
                </label>
                <input
                  name="vendor_name"
                  value={vendorName}
                  onChange={(event) => setVendorName(event.target.value)}
                  placeholder="Type vendor name if no profile exists"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <FormSectionHeader
              eyebrow="Items"
              title="Raw material details"
              description="Type the purchased material exactly as it appears on the bill."
            />
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.4fr)_140px_160px]">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Raw Material Name
                </label>
                <input
                  name="product_name"
                  value={productName}
                  onChange={(event) => setProductName(event.target.value)}
                  placeholder="Type raw material or imported goods name"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Quantity</label>
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  step="0.01"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  placeholder="1"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Rate</label>
                <input
                  name="rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={rate}
                  onChange={(event) => setRate(event.target.value)}
                  placeholder="Enter rate in Rs."
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Material Amount
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">{formatCurrency(itemAmount)}</div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Quantity x Rate
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">
                    {quantity || "0"} x {formatCurrency(rate)}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    Active Vendor
                  </div>
                  <div className="mt-1 font-semibold text-slate-900">{activeVendorLabel}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <FormSectionHeader
              eyebrow="Payment"
              title="Bill settlement"
              description="Track what was already paid, what is being paid now, and the remaining balance."
            />
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2 xl:col-span-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                      Bill Amount
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900">
                      {formatCurrency(itemAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                      Previously Paid
                    </div>
                    <div className="mt-1 text-lg font-bold text-green-700">
                      {formatCurrency(previousPaidAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">
                      Remaining Balance
                    </div>
                    <div className="mt-1 text-lg font-bold text-amber-700">
                      {formatCurrency(remainingAmount)}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Payment Status
                </label>
                <select
                  name="payment_status"
                  value={paymentStatus}
                  onChange={(event) => setPaymentStatus(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
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
                  value={paymentMethod}
                  onChange={(event) => setPaymentMethod(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="Cash">Cash</option>
                  <option value="Mobile">Mobile</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Payment Date
                </label>
                <input
                  name="payment_date"
                  type="date"
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Previously Paid Amount
                </label>
                <input
                  type="text"
                  readOnly
                  value={formatCurrency(previousPaidAmount)}
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
                  value={paymentNow}
                  onChange={(event) => setPaymentNow(event.target.value)}
                  placeholder="Enter new payment amount"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
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
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <FormSectionHeader
              eyebrow="Notes"
              title="Reference notes"
              description="Optional internal notes for transport, bill remarks, or payment follow-up."
            />
            <div className="mt-5">
              <textarea
                name="notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional purchase note"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <FormStickyActions
            submitLabel={editingPurchase ? "Update Purchase" : "Save Purchase"}
            cancelHref="/purchases"
            helperText="Payments and remaining balance stay visible while you finish the bill."
          />
        </form>
      </section>

      <aside className="space-y-6">
        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
            Live Summary
          </div>
          <h3 className="mt-2 text-lg font-bold text-slate-900">Purchase Snapshot</h3>
          <p className="mt-1 text-sm text-slate-500">Live values based on the current form input.</p>

          <div className="mt-5 space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Vendor
              </div>
              <div className="mt-2 text-base font-semibold text-slate-900">{activeVendorLabel}</div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Raw Material
              </div>
              <div className="mt-2 text-base font-semibold text-slate-900">
                {productName || "No material entered"}
              </div>
            </div>
            <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Item Amount</span>
                <span className="font-semibold text-slate-900">{formatCurrency(itemAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Previously Paid</span>
                <span className="font-semibold text-green-700">
                  {formatCurrency(previousPaidAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Paying Now</span>
                <span className="font-semibold text-blue-600">
                  {formatCurrency(normalizedPaymentNow)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="font-semibold text-slate-900">Remaining Balance</span>
                <span className="text-lg font-bold text-amber-700">
                  {formatCurrency(remainingAmount)}
                </span>
              </div>
            </div>
          </div>
        </section>

        {editingPurchase && (
          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-50 p-6">
              <h3 className="text-lg font-bold text-slate-900">Purchase Payment History</h3>
              <p className="mt-1 text-xs text-slate-500">
                All partial and full payments recorded for this purchase bill.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Payment Date</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Method</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {purchasePayments.map((payment, index) => (
                    <tr
                      key={payment.id}
                      className={`transition-colors hover:bg-blue-50/40 ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      }`}
                    >
                      <td className="px-6 py-4 text-sm text-slate-600">{payment.payment_date}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{payment.payment_method}</td>
                      <td className="px-6 py-4 text-sm font-bold text-green-700">
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
      </aside>
    </div>
  );
}
