"use client";

import Link from "next/link";
import { useState } from "react";
import { upsertPurchaseExpense } from "@/app/actions";
import { NepaliDateInput } from "@/components/shared/NepaliDateInput";
import { adToBs, bsToAd } from "@/lib/nepali-date";

type EditingExpense = {
  id: string;
  expense_date: string;
  expense_title: string;
  amount: number | null;
  notes: string | null;
} | null;

export function PurchaseExpenseForm({
  editingExpense,
  defaultDate,
}: {
  editingExpense: EditingExpense;
  defaultDate: string;
}) {
  const [expenseDateBs, setExpenseDateBs] = useState(
    adToBs(editingExpense?.expense_date ?? defaultDate),
  );
  const expenseDate = bsToAd(expenseDateBs);

  return (
    <form action={upsertPurchaseExpense} autoComplete="off" className="space-y-4">
      <input type="hidden" name="id" defaultValue={editingExpense?.id ?? ""} />
      <input type="hidden" name="redirect_to" value="/purchases" />
      <input type="hidden" name="expense_date" value={expenseDate} />
      <input type="hidden" name="expense_date_bs" value={expenseDateBs} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Expense Date</label>
          <NepaliDateInput value={expenseDateBs} onChange={setExpenseDateBs} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Amount</label>
          <input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={editingExpense?.amount ?? 0}
            placeholder="Expense amount in Rs."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Expense Title</label>
        <input
          name="expense_title"
          required
          defaultValue={editingExpense?.expense_title ?? ""}
          placeholder="Courier payment, loading, transport"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Notes</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={editingExpense?.notes ?? ""}
          placeholder="Optional expense note"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="flex-1 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
        >
          {editingExpense ? "Update Expense" : "Save Expense"}
        </button>
        <Link
          href="/purchases"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
