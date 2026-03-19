import Link from "next/link";
import {
  BadgeDollarSign,
  CreditCard,
  FileText,
  FolderClock,
  Pencil,
  RefreshCcw,
  ShoppingCart,
  Trash2,
  WalletCards,
} from "lucide-react";
import {
  deletePurchaseExpense,
  deletePurchase,
} from "@/app/actions";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { ConfirmActionForm } from "@/components/shared/ConfirmActionForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageActionStrip } from "@/components/shared/PageActionStrip";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { QueryNoticeToast } from "@/components/shared/QueryNoticeToast";
import { ReportToolbar } from "@/components/shared/ReportToolbar";
import { formatBsDisplayDate } from "@/lib/nepali-date";
import { formatCurrency } from "@/lib/presentation";
import { getSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const parsePage = (value: string | string[] | undefined) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};
const PURCHASES_PAGE_SIZE = 8;
const EXPENSES_PAGE_SIZE = 8;
const PAYMENTS_PAGE_SIZE = 8;

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await getSupabaseClient();
  const params = await searchParams;
  const notice = typeof params.notice === "string" ? params.notice : "";
  const purchasesPage = parsePage(params.purchasesPage);
  const expensesPage = parsePage(params.expensesPage);
  const paymentsPage = parsePage(params.paymentsPage);

  const [purchasesResponse, expensesResponse, paymentsResponse] = await Promise.all([
    supabase
      .from("purchases")
      .select(
        "id, purchase_number, purchase_date, payment_type, total_amount, paid_amount, credit_amount, notes, vendor_id, vendor_name, vendors(name), purchase_items(product_id, product_name, quantity, rate)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("purchase_expenses")
      .select("id, expense_date, expense_title, amount, notes")
      .order("created_at", { ascending: false }),
    supabase
      .from("purchase_payments")
      .select(
        "id, payment_date, amount, payment_method, purchase_id, purchases(purchase_number, vendor_id, vendor_name, vendors(name))",
      )
      .order("payment_date", { ascending: false })
      .limit(10),
  ]);

  const purchases = purchasesResponse.data ?? [];
  const expenses = expensesResponse.data ?? [];
  const purchasePayments = paymentsResponse.data ?? [];
  const purchasesTotalPages = Math.max(Math.ceil(purchases.length / PURCHASES_PAGE_SIZE), 1);
  const expensesTotalPages = Math.max(Math.ceil(expenses.length / EXPENSES_PAGE_SIZE), 1);
  const paymentsTotalPages = Math.max(Math.ceil(purchasePayments.length / PAYMENTS_PAGE_SIZE), 1);
  const visiblePurchases = purchases.slice(
    (Math.min(purchasesPage, purchasesTotalPages) - 1) * PURCHASES_PAGE_SIZE,
    Math.min(purchasesPage, purchasesTotalPages) * PURCHASES_PAGE_SIZE,
  );
  const visibleExpenses = expenses.slice(
    (Math.min(expensesPage, expensesTotalPages) - 1) * EXPENSES_PAGE_SIZE,
    Math.min(expensesPage, expensesTotalPages) * EXPENSES_PAGE_SIZE,
  );
  const visiblePayments = purchasePayments.slice(
    (Math.min(paymentsPage, paymentsTotalPages) - 1) * PAYMENTS_PAGE_SIZE,
    Math.min(paymentsPage, paymentsTotalPages) * PAYMENTS_PAGE_SIZE,
  );

  const totalPurchase = purchases.reduce(
    (sum, purchase) => sum + Number(purchase.total_amount ?? 0),
    0,
  );
  const totalPaid = purchases.reduce(
    (sum, purchase) => sum + Number(purchase.paid_amount ?? 0),
    0,
  );
  const totalCredit = purchases.reduce(
    (sum, purchase) => sum + Number(purchase.credit_amount ?? 0),
    0,
  );
  const totalMiscExpense = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount ?? 0),
    0,
  );
  const creditPurchases = purchases.filter(
    (purchase) => purchase.payment_type === "Credit",
  ).length;

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <Header
          title="Purchases Overview"
          description="Track vendor profiles, purchase totals, and outstanding credit."
        />
        <QueryNoticeToast message={notice} />
        <ReportToolbar actionPath="/purchases" />
        <PageActionStrip
          actions={[
            { label: "Create Purchase", href: "/purchases/create" },
            { label: "Add Expense", href: "/purchases/expense/create", variant: "secondary" },
          ]}
        />

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Purchase"
            value={formatCurrency(totalPurchase)}
            trend={`${purchases.length} purchase entries`}
            trendType="positive"
            icon={ShoppingCart}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <SummaryCard
            title="Total Credit"
            value={formatCurrency(totalCredit)}
            trend={`${creditPurchases} credit purchases`}
            trendType="negative"
            icon={CreditCard}
            iconBgColor="bg-red-50"
            iconColor="text-red-600"
          />
          <SummaryCard
            title="Total Paid"
            value={formatCurrency(totalPaid)}
            trend="Settled against vendor bills"
            trendType="positive"
            icon={BadgeDollarSign}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
          />
          <SummaryCard
            title="Misc Expenses"
            value={formatCurrency(totalMiscExpense)}
            trend="Courier, transport, misc"
            trendType="neutral"
            icon={BadgeDollarSign}
            iconBgColor="bg-slate-100"
            iconColor="text-slate-700"
          />
        </div>

        <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-50 p-6">
                <h3 className="text-lg font-bold text-slate-900">Recent Purchases</h3>
                <p className="mt-1 text-xs text-slate-500">Live purchase records from Supabase.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Purchase ID</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Vendor</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Product</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Amount</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Credit</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Date</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {visiblePurchases.map((purchase, index) => (
                      <tr
                        key={purchase.id}
                        className={`transition-colors hover:bg-blue-50/40 ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        }`}
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                          {purchase.purchase_number}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {purchase.vendors?.name ? (
                            <Link
                              href={`/vendors/${purchase.vendor_id}`}
                              className="font-semibold text-slate-700 hover:text-blue-600"
                              title={`Open vendor profile for ${purchase.vendors.name}`}
                            >
                              {purchase.vendors.name}
                            </Link>
                          ) : purchase.vendor_name ? (
                            <span className="font-semibold text-slate-700">{purchase.vendor_name}</span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {purchase.purchase_items?.[0]?.product_name ?? "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                          {formatCurrency(purchase.total_amount)}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-amber-700">
                          {formatCurrency(purchase.credit_amount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatBsDisplayDate(purchase.purchase_date)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/purchases/create?edit=${purchase.id}`}
                              className="rounded-lg p-2 text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-600"
                              title={`Edit purchase ${purchase.purchase_number}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                            <Link
                              href={`/purchases/create?edit=${purchase.id}`}
                              className="rounded-lg p-2 text-slate-400 transition-all hover:bg-amber-50 hover:text-amber-600"
                              title={`Open update view for purchase ${purchase.purchase_number}`}
                            >
                              <RefreshCcw className="h-4 w-4" />
                            </Link>
                            <ConfirmActionForm
                              action={deletePurchase}
                              confirmMessage="Are you sure you want to delete this purchase record?"
                              hiddenFields={[
                                { name: "id", value: purchase.id },
                                { name: "redirect_to", value: "/purchases" },
                              ]}
                            >
                              <button
                                className="rounded-lg p-2 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600"
                                title={`Delete purchase ${purchase.purchase_number}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </ConfirmActionForm>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {purchases.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-10">
                          <EmptyState
                            icon={FileText}
                            title="No purchase records yet"
                            description="Vendor bills will begin appearing here once the first purchase is entered."
                            actionLabel="Create Purchase"
                            actionHref="/purchases/create"
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                basePath="/purchases"
                pageParam="purchasesPage"
                currentPage={Math.min(purchasesPage, purchasesTotalPages)}
                totalPages={purchasesTotalPages}
                totalItems={purchases.length}
                pageSize={PURCHASES_PAGE_SIZE}
                searchParams={params}
              />
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-50 p-6">
                <h3 className="text-lg font-bold text-slate-900">Recent Expenses</h3>
                <p className="mt-1 text-xs text-slate-500">Courier, transport, and misc purchase expenses.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Date</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Expense</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Amount</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Notes</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {visibleExpenses.map((expense, index) => (
                      <tr
                        key={expense.id}
                        className={`transition-colors hover:bg-blue-50/40 ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        }`}
                      >
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatBsDisplayDate(expense.expense_date)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                          {expense.expense_title}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">
                          {formatCurrency(expense.amount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{expense.notes ?? "-"}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/purchases/expense/create?edit=${expense.id}`}
                              className="rounded-lg p-2 text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-600"
                              title={`Edit expense ${expense.expense_title}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Link>
                            <Link
                              href={`/purchases/expense/create?edit=${expense.id}`}
                              className="rounded-lg p-2 text-slate-400 transition-all hover:bg-amber-50 hover:text-amber-600"
                              title={`Open update view for expense ${expense.expense_title}`}
                            >
                              <RefreshCcw className="h-4 w-4" />
                            </Link>
                            <ConfirmActionForm
                              action={deletePurchaseExpense}
                              confirmMessage="Are you sure you want to delete this expense?"
                              hiddenFields={[
                                { name: "id", value: expense.id },
                                { name: "redirect_to", value: "/purchases" },
                              ]}
                            >
                              <button
                                className="rounded-lg p-2 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600"
                                title={`Delete expense ${expense.expense_title}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </ConfirmActionForm>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-10">
                          <EmptyState
                            icon={FolderClock}
                            title="No extra expenses recorded"
                            description="Courier, transport, loading, and misc costs can be added separately here."
                            actionLabel="Add Expense"
                            actionHref="/purchases/expense/create"
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                basePath="/purchases"
                pageParam="expensesPage"
                currentPage={Math.min(expensesPage, expensesTotalPages)}
                totalPages={expensesTotalPages}
                totalItems={expenses.length}
                pageSize={EXPENSES_PAGE_SIZE}
                searchParams={params}
              />
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-50 p-6">
                <h3 className="text-lg font-bold text-slate-900">Recent Payments</h3>
                <p className="mt-1 text-xs text-slate-500">Latest vendor payment transactions against purchase bills.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Date</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Vendor</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Bill</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Method</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {visiblePayments.map((payment, index) => (
                      <tr
                        key={payment.id}
                        className={`transition-colors hover:bg-blue-50/40 ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        }`}
                      >
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatBsDisplayDate(payment.payment_date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                            {payment.purchases?.vendors?.name ? (
                              <Link
                                href={`/vendors/${payment.purchases.vendor_id}`}
                                className="font-semibold text-slate-700 hover:text-blue-600"
                                title={`Open vendor profile for ${payment.purchases.vendors.name}`}
                              >
                                {payment.purchases.vendors.name}
                              </Link>
                          ) : payment.purchases?.vendor_name ? (
                            <span className="font-semibold text-slate-700">
                              {payment.purchases.vendor_name}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                          {payment.purchases?.purchase_number ?? "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {payment.payment_method}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-green-700">
                          {formatCurrency(payment.amount)}
                        </td>
                      </tr>
                    ))}
                    {purchasePayments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-10">
                          <EmptyState
                            icon={WalletCards}
                            title="No purchase payments recorded"
                            description="Partial and full vendor payments will build a payment trail here after bills are updated."
                            actionLabel="Open Purchase Bills"
                            actionHref="/purchases"
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                basePath="/purchases"
                pageParam="paymentsPage"
                currentPage={Math.min(paymentsPage, paymentsTotalPages)}
                totalPages={paymentsTotalPages}
                totalItems={purchasePayments.length}
                pageSize={PAYMENTS_PAGE_SIZE}
                searchParams={params}
              />
            </section>
        </div>
      </main>
    </div>
  );
}
