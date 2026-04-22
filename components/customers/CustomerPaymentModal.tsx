"use client";

import { useState } from "react";
import { HandCoins, X } from "lucide-react";
import { createCustomerPayment } from "@/app/actions";
import { Button } from "@/components/shared/Button";
import { FieldHint } from "@/components/shared/FieldHint";
import { Input } from "@/components/shared/Input";
import { NepaliDateInput } from "@/components/shared/NepaliDateInput";
import { Select } from "@/components/shared/Select";
import { adToBs, bsToAd } from "@/lib/nepali-date";
import { formatCurrency } from "@/lib/presentation";

export function CustomerPaymentModal({
  customerId,
  customerName,
  defaultDate,
  totalDue,
  autoOpen = false,
  labels,
}: {
  customerId: string;
  customerName: string;
  defaultDate: string;
  totalDue: number;
  autoOpen?: boolean;
  labels?: {
    addPayment: string;
    noUnpaidInvoicesTitle: string;
    noUnpaidInvoicesHint: string;
    addCustomerPayment: string;
    addCustomerPaymentDescription: string;
    closePaymentModal: string;
    customer: string;
    currentDueBalance: string;
    paymentAmount: string;
    maximumReceivable: string;
    paymentMethod: string;
    cash: string;
    mobile: string;
    paymentDateBs: string;
    note: string;
    optionalPaymentNote: string;
    autoApplyOldest: string;
    cancel: string;
    savePayment: string;
  };
}) {
  const t = labels ?? {
    addPayment: "Add Payment",
    noUnpaidInvoicesTitle: "No unpaid invoices available for this customer",
    noUnpaidInvoicesHint: "No unpaid invoices to allocate.",
    addCustomerPayment: "Add Customer Payment",
    addCustomerPaymentDescription:
      "Record one customer payment and auto-apply it across unpaid invoices.",
    closePaymentModal: "Close customer payment modal",
    customer: "Customer",
    currentDueBalance: "Current Due Balance",
    paymentAmount: "Payment Amount",
    maximumReceivable: "Maximum receivable",
    paymentMethod: "Payment Method",
    cash: "Cash",
    mobile: "Mobile",
    paymentDateBs: "Payment Date (BS)",
    note: "Note",
    optionalPaymentNote: "Optional payment note",
    autoApplyOldest: "Payment will be automatically applied to oldest unpaid invoices first.",
    cancel: "Cancel",
    savePayment: "Save Payment",
  };
  const isDisabled = totalDue <= 0;
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
          title={isDisabled ? t.noUnpaidInvoicesTitle : undefined}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-blue-600 bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none"
        >
          <HandCoins className="h-4 w-4" />
          {t.addPayment}
        </button>
        {isDisabled ? <FieldHint className="px-1">{t.noUnpaidInvoicesHint}</FieldHint> : null}
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="w-full max-w-xl rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{t.addCustomerPayment}</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {t.addCustomerPaymentDescription}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label={t.closePaymentModal}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={createCustomerPayment} className="space-y-5 px-6 py-6">
              <input type="hidden" name="customer_id" value={customerId} />
              <input type="hidden" name="redirect_to" value={`/customers/${customerId}`} />
              <input type="hidden" name="payment_date" value={paymentDate} />

              <div className="grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">{t.customer}</label>
                  <Input value={customerName} disabled className="bg-slate-100 text-slate-700" />
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-700">
                      {t.currentDueBalance}
                    </div>
                    <div className="mt-1 text-xl font-black tracking-tight text-amber-900">
                      {formatCurrency(totalDue)}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">{t.paymentAmount}</label>
                  <Input
                    name="amount"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.]?[0-9]*"
                    placeholder="0.00"
                    required
                  />
                  <FieldHint>
                    {t.maximumReceivable}: {formatCurrency(totalDue)}
                  </FieldHint>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">{t.paymentMethod}</label>
                  <Select name="payment_method" defaultValue="Cash">
                    <option value="Cash">{t.cash}</option>
                    <option value="Mobile">{t.mobile}</option>
                  </Select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">{t.paymentDateBs}</label>
                  <NepaliDateInput
                    value={paymentDateBs}
                    onChange={setPaymentDateBs}
                    inputClassName="h-[var(--ui-input-h)] rounded-[var(--ui-radius-input)] border-[color:var(--ui-border-strong)] bg-slate-50 focus:border-[color:var(--ui-ring)] focus:bg-white"
                  />
                  <input type="hidden" name="payment_date_bs" value={paymentDateBs} />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">{t.note}</label>
                  <textarea
                    name="note"
                    rows={3}
                    placeholder={t.optionalPaymentNote}
                    className="w-full rounded-[var(--ui-radius-input)] border border-[color:var(--ui-border-strong)] bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[color:var(--ui-ring)] focus:bg-white"
                  />
                  <FieldHint tone="info">
                    {t.autoApplyOldest}
                  </FieldHint>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                  {t.cancel}
                </Button>
                <Button type="submit">
                  <HandCoins className="h-4 w-4" />
                  {t.savePayment}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
