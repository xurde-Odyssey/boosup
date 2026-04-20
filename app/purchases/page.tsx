import Link from "next/link";
import {
  BadgeDollarSign,
  CreditCard,
  FilePlus,
  FileText,
  FolderClock,
  Pencil,
  RefreshCcw,
  ShoppingCart,
  Trash2,
  Wallet,
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
import { ActionIconButton } from "@/components/shared/ActionIconButton";
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
const getTodayDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
  }).format(new Date());

const getDateRange = (range: string, today: string) => {
  const current = new Date(`${today}T00:00:00`);

  if (range === "week") {
    const day = current.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const start = new Date(current);
    start.setDate(current.getDate() - diff);
    return {
      from: start.toISOString().slice(0, 10),
      to: today,
    };
  }

  if (range === "year") {
    return {
      from: `${current.getFullYear()}-01-01`,
      to: today,
    };
  }

  if (range === "custom") {
    return {
      from: today,
      to: today,
    };
  }

  return {
    from: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-01`,
    to: today,
  };
};

const isWithinRange = (value: string | null | undefined, from: string, to: string) => {
  if (!value) return false;
  return value >= from && value <= to;
};

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await getSupabaseClient();
  const params = await searchParams;
  const notice = typeof params.notice === "string" ? params.notice : "";
  const selectedRange = typeof params.range === "string" ? params.range : "year";
  const todayDate = getTodayDate();
  const defaultRange = getDateRange(selectedRange, todayDate);
  const fromDate = typeof params.from === "string" && params.from ? params.from : defaultRange.from;
  const toDate = typeof params.to === "string" && params.to ? params.to : defaultRange.to;
  const duesOnly = typeof params.dues === "string" && params.dues === "1";
  const paymentStatus = typeof params.payment_status === "string" ? params.payment_status : "ALL";
  const expenseMin = typeof params.expense_min === "string" ? Number(params.expense_min) : 0;
  const purchasesPage = parsePage(params.purchasesPage);
  const expensesPage = parsePage(params.expensesPage);
  const paymentsPage = parsePage(params.paymentsPage);

  const [purchasesResponse, expensesResponse, paymentsResponse] = await Promise.all([
    supabase
      .from("purchases")
      .select(
        "id, purchase_number, purchase_date, payment_status, payment_type, total_amount, paid_amount, credit_amount, notes, vendor_id, vendor_name, vendors(name), purchase_items(product_id, product_name, quantity, rate)",
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

  const allPurchases = (purchasesResponse.data ?? []).filter((purchase) =>
    isWithinRange(purchase.purchase_date, fromDate, toDate),
  );
  const purchases = allPurchases.filter((purchase) => {
    if (duesOnly && Number(purchase.credit_amount ?? 0) <= 0) return false;
    if (paymentStatus !== "ALL" && purchase.payment_status !== paymentStatus) return false;
    return true;
  });
  const expenses = (expensesResponse.data ?? []).filter(
    (expense) =>
      isWithinRange(expense.expense_date, fromDate, toDate) &&
      Number(expense.amount ?? 0) >= expenseMin,
  );
  const purchasePayments = (paymentsResponse.data ?? []).filter((payment) =>
    isWithinRange(payment.payment_date, fromDate, toDate),
  );
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

      <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
        <Header
          title="Purchases Overview"
          description="Track supplier profiles, purchase totals, and outstanding credit."
        />
        <QueryNoticeToast message={notice} />
        <ReportToolbar actionPath="/purchases" selectedRange={selectedRange} fromDate={fromDate} toDate={toDate} />
        <PageActionStrip
          actions={[
            { label: "Create Purchase Bill", href: "/purchases/create", icon: FilePlus },
            { label: "Add Expense Entry", href: "/purchases/expense/create", variant: "secondary", icon: Wallet },
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
            href={`/purchases?range=${selectedRange}&from=${fromDate}&to=${toDate}`}
          />
          <SummaryCard
            title="Total Credit"
            value={formatCurrency(totalCredit)}
            trend={`${creditPurchases} credit purchases`}
            trendType="negative"
            icon={CreditCard}
            iconBgColor="bg-red-50"
            iconColor="text-red-600"
            href={`/purchases?range=${selectedRange}&from=${fromDate}&to=${toDate}&dues=1`}
          />
          <SummaryCard
            title="Total Paid"
            value={formatCurrency(totalPaid)}
            trend="Settled against supplier bills"
            trendType="positive"
            icon={BadgeDollarSign}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
            href={`/purchases?range=${selectedRange}&from=${fromDate}&to=${toDate}`}
          />
          <SummaryCard
            title="Misc Expenses"
            value={formatCurrency(totalMiscExpense)}
            trend="Courier, transport, misc"
            trendType="neutral"
            icon={BadgeDollarSign}
            iconBgColor="bg-slate-100"
            iconColor="text-slate-700"
            href={`/purchases?range=${selectedRange}&from=${fromDate}&to=${toDate}&expense_min=50000`}
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
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Supplier</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Product</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Amount</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Credit</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Date</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {visiblePurchases.map((purchase, index) => {
                      const linkedVendor = Array.isArray(purchase.vendors)
                        ? purchase.vendors[0]
                        : purchase.vendors;

                      return (
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
                            {linkedVendor?.name ? (
                            <Link
                              href={`/vendors/${purchase.vendor_id}`}
                              className="font-semibold text-slate-700 hover:text-blue-600"
                              title={`Open supplier profile for ${linkedVendor.name}`}
                            >
                              {linkedVendor.name}
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
                            <ActionIconButton
                              href={`/purchases/create?edit=${purchase.id}`}
                              label={`Edit purchase ${purchase.purchase_number}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </ActionIconButton>
                            <ActionIconButton
                              href={`/purchases/create?edit=${purchase.id}`}
                              label={`Open update view for purchase ${purchase.purchase_number}`}
                            >
                              <RefreshCcw className="h-4 w-4" />
                            </ActionIconButton>
                            <ConfirmActionForm
                              action={deletePurchase}
                              confirmMessage="Are you sure you want to delete this purchase record?"
                              hiddenFields={[
                                { name: "id", value: purchase.id },
                                { name: "redirect_to", value: "/purchases" },
                              ]}
                            >
                              <ActionIconButton
                                type="submit"
                                label={`Delete purchase ${purchase.purchase_number}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </ActionIconButton>
                            </ConfirmActionForm>
                          </div>
                        </td>
                        </tr>
                      );
                    })}
                    {purchases.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-10">
                          <EmptyState
                            icon={FileText}
                            title="No purchase records yet"
                            description="Supplier bills will begin appearing here once the first purchase is entered."
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
                            <ActionIconButton
                              href={`/purchases/expense/create?edit=${expense.id}`}
                              label={`Edit expense ${expense.expense_title}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </ActionIconButton>
                            <ActionIconButton
                              href={`/purchases/expense/create?edit=${expense.id}`}
                              label={`Open update view for expense ${expense.expense_title}`}
                            >
                              <RefreshCcw className="h-4 w-4" />
                            </ActionIconButton>
                            <ConfirmActionForm
                              action={deletePurchaseExpense}
                              confirmMessage="Are you sure you want to delete this expense?"
                              hiddenFields={[
                                { name: "id", value: expense.id },
                                { name: "redirect_to", value: "/purchases" },
                              ]}
                            >
                              <ActionIconButton
                                type="submit"
                                label={`Delete expense ${expense.expense_title}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </ActionIconButton>
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
                <p className="mt-1 text-xs text-slate-500">Latest supplier payment transactions against purchase bills.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Date</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Supplier</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Bill</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Method</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {visiblePayments.map((payment, index) => {
                      const linkedPurchase = Array.isArray(payment.purchases)
                        ? payment.purchases[0]
                        : payment.purchases;
                      const linkedVendor = Array.isArray(linkedPurchase?.vendors)
                        ? linkedPurchase?.vendors[0]
                        : linkedPurchase?.vendors;

                      return (
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
                            {linkedVendor?.name ? (
                              <Link
                                href={`/vendors/${linkedPurchase?.vendor_id}`}
                                className="font-semibold text-slate-700 hover:text-blue-600"
                                title={`Open supplier profile for ${linkedVendor.name}`}
                              >
                                {linkedVendor.name}
                              </Link>
                          ) : linkedPurchase?.vendor_name ? (
                            <span className="font-semibold text-slate-700">
                              {linkedPurchase.vendor_name}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                          {linkedPurchase?.purchase_number ?? "-"}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {payment.payment_method}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-green-700">
                          {formatCurrency(payment.amount)}
                        </td>
                        </tr>
                      );
                    })}
                    {purchasePayments.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-10">
                          <EmptyState
                            icon={WalletCards}
                            title="No purchase payments recorded"
                            description="Partial and full supplier payments will build a payment trail here after bills are updated."
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
