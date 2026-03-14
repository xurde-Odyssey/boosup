import Link from "next/link";
import { ActionNotice } from "@/components/shared/ActionNotice";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { upsertPurchaseExpense } from "@/app/actions";
import { getSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const getTodayDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
  }).format(new Date());

export default async function CreatePurchaseExpensePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = getSupabaseClient();
  const params = await searchParams;
  const editId = typeof params.edit === "string" ? params.edit : "";
  const notice = typeof params.notice === "string" ? params.notice : "";
  const todayDate = getTodayDate();

  const expenseResponse = editId
    ? await supabase
        .from("purchase_expenses")
        .select("id, expense_date, expense_title, amount, notes")
        .eq("id", editId)
        .single()
    : { data: null };

  const editingExpense = expenseResponse.data;

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <Header
          title={editingExpense ? "Update Expense" : "Add Expense"}
          description="Record courier, transport, and other misc purchase expenses."
          primaryActionLabel="Back To Purchases"
          primaryActionHref="/purchases"
        />

        {notice && <ActionNotice message={notice} />}

        <section className="max-w-3xl rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">
              {editingExpense ? "Update Expense" : "Add Expense"}
            </h3>
            <p className="text-sm text-slate-500">
              Separate expense entry for courier, transport, and misc costs.
            </p>
          </div>

          <form action={upsertPurchaseExpense} className="space-y-4">
            <input type="hidden" name="id" defaultValue={editingExpense?.id ?? ""} />
            <input type="hidden" name="redirect_to" value="/purchases" />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Expense Date
                </label>
                <input
                  name="expense_date"
                  type="date"
                  required
                  defaultValue={editingExpense?.expense_date ?? todayDate}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Amount
                </label>
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
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Expense Title
              </label>
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
        </section>
      </main>
    </div>
  );
}
