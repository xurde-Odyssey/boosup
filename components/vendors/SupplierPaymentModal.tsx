"use client";

import { useState } from "react";
import { HandCoins, X } from "lucide-react";
import { createSupplierPayment } from "@/app/actions";
import { FieldHint } from "@/components/shared/FieldHint";
import { NepaliDateInput } from "@/components/shared/NepaliDateInput";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { Select } from "@/components/shared/Select";
import { adToBs, bsToAd } from "@/lib/nepali-date";
import { formatCurrency } from "@/lib/presentation";

export function SupplierPaymentModal({
  vendorId,
  vendorName,
  defaultDate,
  totalPayable,
  autoOpen = false,
}: {
  vendorId: string;
  vendorName: string;
  defaultDate: string;
  totalPayable: number;
  autoOpen?: boolean;
}) {
  const isDisabled = totalPayable <= 0;
  const [open, setOpen] = useState(() => autoOpen && !isDisabled);
  const [paymentDateBs, setPaymentDateBs] = useState(adToBs(defaultDate));
  const paymentDate = bsToAd(paymentDateBs);

  return (
    <>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={isDisabled}
          title={isDisabled ? "No payable bills available for this supplier" : undefined}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-blue-600 bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
        >
          <HandCoins className="h-4 w-4" />
          Add Supplier Payment
        </button>
        {isDisabled ? (
          <FieldHint className="px-1">No unpaid bills to allocate.</FieldHint>
        ) : null}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Supplier Payment</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Record one supplier payment and auto-allocate it across pending bills.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close supplier payment modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={createSupplierPayment} className="space-y-5 px-6 py-6">
              <input type="hidden" name="vendor_id" value={vendorId} />
              <input type="hidden" name="redirect_to" value={`/vendors/${vendorId}`} />
              <input type="hidden" name="payment_date" value={paymentDate} />

              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Supplier</label>
                  <Input value={vendorName} disabled className="bg-slate-100 text-slate-700" />
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-700">
                      Current Pending Balance
                    </div>
                    <div className="mt-1 text-xl font-black tracking-tight text-amber-900">
                      {formatCurrency(totalPayable)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Payment Amount</label>
                  <Input
                    name="amount"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    placeholder="0.00"
                    required
                  />
                  <FieldHint>Maximum payable: {formatCurrency(totalPayable)}</FieldHint>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Payment Method</label>
                  <Select name="payment_method" defaultValue="Cash">
                    <option value="Cash">Cash</option>
                    <option value="Mobile">Mobile</option>
                  </Select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Payment Date (BS)</label>
                  <NepaliDateInput
                    value={paymentDateBs}
                    onChange={setPaymentDateBs}
                    inputClassName="h-[var(--ui-input-h)] rounded-[var(--ui-radius-input)] border-[color:var(--ui-border-strong)] bg-slate-50 focus:border-[color:var(--ui-ring)] focus:bg-white"
                  />
                  <input type="hidden" name="payment_date_bs" value={paymentDateBs} />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Note</label>
                  <textarea
                    name="note"
                    rows={3}
                    placeholder="Optional payment note"
                    className="w-full rounded-[var(--ui-radius-input)] border border-[color:var(--ui-border-strong)] bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[color:var(--ui-ring)] focus:bg-white"
                  />
                  <FieldHint tone="info">
                    Payment will be automatically applied to oldest unpaid bills first.
                  </FieldHint>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  <HandCoins className="h-4 w-4" />
                  Save Supplier Payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
