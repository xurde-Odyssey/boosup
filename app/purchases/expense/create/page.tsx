import { ActionNotice } from "@/components/shared/ActionNotice";
import { Header } from "@/components/dashboard/Header";
import { PurchaseExpenseForm } from "@/components/purchases/PurchaseExpenseForm";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ReportToolbar } from "@/components/shared/ReportToolbar";
import { getServerLocale } from "@/lib/i18n-server";
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
  const supabase = await getSupabaseClient();
  const params = await searchParams;
  const locale = await getServerLocale(params.lang);
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

      <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
        <Header
          title={editingExpense ? "Update Expense" : "Add Expense"}
          description="Record courier, transport, and other misc purchase expenses."
          primaryActionLabel="Back To Purchases"
          primaryActionHref="/purchases"
        />

        {notice && <ActionNotice message={notice} />}
        <ReportToolbar
          actionPath={editingExpense ? `/purchases/expense/create?edit=${editingExpense.id}` : "/purchases/expense/create"}
          locale={locale}
        />

        <section className="max-w-3xl rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">
              {editingExpense ? "Update Expense" : "Add Expense"}
            </h3>
            <p className="text-sm text-slate-500">
              Separate expense entry for courier, transport, and misc costs.
            </p>
          </div>

          <PurchaseExpenseForm editingExpense={editingExpense} defaultDate={todayDate} />
        </section>
      </main>
    </div>
  );
}
