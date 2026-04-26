import Link from "next/link";
import {
  ArrowLeft,
  FilePlus,
  FileText,
  FolderClock,
  Pencil,
  RefreshCcw,
  Trash2,
  Wallet,
  WalletCards,
} from "lucide-react";
import { deletePurchaseExpense, deletePurchase } from "@/app/actions";
import { Header } from "@/components/dashboard/Header";
import { PurchaseReportPrintButton } from "@/components/dashboard/PurchaseReportPrintButton";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { ConfirmActionForm } from "@/components/shared/ConfirmActionForm";
import { ActionIconButton } from "@/components/shared/ActionIconButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageActionStrip } from "@/components/shared/PageActionStrip";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { PurchaseRecordsFilters } from "@/components/purchases/PurchaseRecordsFilters";
import { QueryNoticeToast } from "@/components/shared/QueryNoticeToast";
import { ReportToolbar } from "@/components/shared/ReportToolbar";
import { getCompanySettings } from "@/lib/company-settings-server";
import { getServerLocale } from "@/lib/i18n-server";
import { formatBsDisplayDate } from "@/lib/nepali-date";
import { formatCurrency } from "@/lib/presentation";
import { getReportRangeSelection, isDateInRange } from "@/lib/report-range";
import { getSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const parsePage = (value: string | string[] | undefined) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const PURCHASES_PAGE_SIZE = 10;
const EXPENSES_PAGE_SIZE = 10;
const PAYMENTS_PAGE_SIZE = 10;

const getTodayDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
  }).format(new Date());

export default async function PurchaseRecordsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await getSupabaseClient();
  const company = await getCompanySettings();
  const params = await searchParams;
  const locale = await getServerLocale(params.lang);
  const notice = typeof params.notice === "string" ? params.notice : "";
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const sort = typeof params.sort === "string" ? params.sort : "date_desc";
  const status = typeof params.status === "string" ? params.status : "ALL";
  const todayDate = getTodayDate();
  const rangeSelection = getReportRangeSelection(
    typeof params.range === "string" ? params.range : "year",
    {
      todayIso: todayDate,
      fromIso: typeof params.from === "string" ? params.from : undefined,
      toIso: typeof params.to === "string" ? params.to : undefined,
    },
  );
  const selectedRange = rangeSelection.selectedRange;
  const fromDate = rangeSelection.startDateISO;
  const toDate = rangeSelection.endDateISOInclusive;
  const endDateExclusive = rangeSelection.endDateISOExclusive;
  const duesOnly = typeof params.dues === "string" && params.dues === "1";
  const paymentStatus = typeof params.payment_status === "string" ? params.payment_status : "ALL";
  const expenseMin = typeof params.expense_min === "string" ? Number(params.expense_min) : 0;
  const purchasesPage = parsePage(params.page);
  const expensesPage = parsePage(params.expensesPage);
  const paymentsPage = parsePage(params.paymentsPage);
  const perPage = (() => {
    const rawValue = typeof params.perPage === "string" ? Number(params.perPage) : PURCHASES_PAGE_SIZE;
    return [10, 25, 50].includes(rawValue) ? rawValue : PURCHASES_PAGE_SIZE;
  })();

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
      .limit(100),
  ]);

  const allPurchases = (purchasesResponse.data ?? []).filter((purchase) =>
    isDateInRange(purchase.purchase_date, fromDate, endDateExclusive),
  );
  const filteredPurchases = allPurchases.filter((purchase) => {
    if (duesOnly && Number(purchase.credit_amount ?? 0) <= 0) return false;
    if (paymentStatus !== "ALL" && purchase.payment_status !== paymentStatus) return false;
    if (status !== "ALL" && purchase.payment_status !== status) return false;
    if (!search) return true;

    const linkedVendor = Array.isArray(purchase.vendors) ? purchase.vendors[0] : purchase.vendors;
    const vendorName = linkedVendor?.name ?? purchase.vendor_name ?? "";
    const haystack = `${purchase.purchase_number} ${vendorName}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });
  const purchases = [...filteredPurchases].sort((left, right) => {
    const leftVendor = (Array.isArray(left.vendors) ? left.vendors[0] : left.vendors)?.name ?? left.vendor_name ?? "";
    const rightVendor = (Array.isArray(right.vendors) ? right.vendors[0] : right.vendors)?.name ?? right.vendor_name ?? "";

    if (sort === "name_asc") {
      return leftVendor.localeCompare(rightVendor);
    }

    if (sort === "amount_desc") {
      return Number(right.total_amount ?? 0) - Number(left.total_amount ?? 0);
    }

    if (sort === "amount_asc") {
      return Number(left.total_amount ?? 0) - Number(right.total_amount ?? 0);
    }

    if (sort === "status_asc") {
      return left.payment_status.localeCompare(right.payment_status);
    }

    return (right.purchase_date ?? "").localeCompare(left.purchase_date ?? "");
  });
  const expenses = (expensesResponse.data ?? []).filter(
    (expense) =>
      isDateInRange(expense.expense_date, fromDate, endDateExclusive) &&
      Number(expense.amount ?? 0) >= expenseMin,
  );
  const purchasePayments = (paymentsResponse.data ?? []).filter((payment) => {
    if (!isDateInRange(payment.payment_date, fromDate, endDateExclusive)) return false;
    if (!search) return true;

    const linkedPurchase = Array.isArray(payment.purchases) ? payment.purchases[0] : payment.purchases;
    const linkedVendor = Array.isArray(linkedPurchase?.vendors) ? linkedPurchase?.vendors[0] : linkedPurchase?.vendors;
    const vendorName = linkedVendor?.name ?? linkedPurchase?.vendor_name ?? "";
    const purchaseNumber = linkedPurchase?.purchase_number ?? "";
    const haystack = `${purchaseNumber} ${vendorName}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  const purchasesTotalPages = Math.max(Math.ceil(purchases.length / perPage), 1);
  const expensesTotalPages = Math.max(Math.ceil(expenses.length / EXPENSES_PAGE_SIZE), 1);
  const paymentsTotalPages = Math.max(Math.ceil(purchasePayments.length / PAYMENTS_PAGE_SIZE), 1);

  const visiblePurchases = purchases.slice(
    (Math.min(purchasesPage, purchasesTotalPages) - 1) * perPage,
    Math.min(purchasesPage, purchasesTotalPages) * perPage,
  );
  const visibleExpenses = expenses.slice(
    (Math.min(expensesPage, expensesTotalPages) - 1) * EXPENSES_PAGE_SIZE,
    Math.min(expensesPage, expensesTotalPages) * EXPENSES_PAGE_SIZE,
  );
  const visiblePayments = purchasePayments.slice(
    (Math.min(paymentsPage, paymentsTotalPages) - 1) * PAYMENTS_PAGE_SIZE,
    Math.min(paymentsPage, paymentsTotalPages) * PAYMENTS_PAGE_SIZE,
  );
  const generatedReportDate = formatBsDisplayDate(todayDate);

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
        <Header
          title="Recent Purchase Records"
          description="Dedicated view of purchase bills, supplier payments, and expense entries with filters and pagination."
        />
        <QueryNoticeToast message={notice} />
        <ReportToolbar
          actionPath="/purchases/view"
          selectedRange={selectedRange}
          fromDate={fromDate}
          toDate={toDate}
          locale={locale}
          reportButton={
            <PurchaseReportPrintButton
              company={company}
              locale={locale}
              generatedDate={generatedReportDate}
              selectedPeriod={rangeSelection.displayLabel}
              metrics={[
                {
                  title: "Total Purchase",
                  value: formatCurrency(
                    purchases.reduce((sum, purchase) => sum + Number(purchase.total_amount ?? 0), 0),
                  ),
                },
                {
                  title: "Total Credit",
                  value: formatCurrency(
                    purchases.reduce((sum, purchase) => sum + Number(purchase.credit_amount ?? 0), 0),
                  ),
                },
                {
                  title: "Total Paid",
                  value: formatCurrency(
                    purchases.reduce((sum, purchase) => sum + Number(purchase.paid_amount ?? 0), 0),
                  ),
                },
                {
                  title: "Misc Expenses",
                  value: formatCurrency(
                    expenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0),
                  ),
                },
              ]}
              purchases={purchases.slice(0, 10).map((purchase) => {
                const linkedVendor = Array.isArray(purchase.vendors)
                  ? purchase.vendors[0]
                  : purchase.vendors;
                return {
                  id: purchase.id,
                  purchaseNumber: purchase.purchase_number,
                  supplier: linkedVendor?.name ?? purchase.vendor_name ?? "-",
                  totalAmount: formatCurrency(purchase.total_amount),
                  paidAmount: formatCurrency(purchase.paid_amount ?? 0),
                  remainingAmount: formatCurrency(purchase.credit_amount ?? 0),
                  status: purchase.payment_status,
                  date: formatBsDisplayDate(purchase.purchase_date),
                };
              })}
              payments={purchasePayments.slice(0, 10).map((payment) => {
                const linkedPurchase = Array.isArray(payment.purchases)
                  ? payment.purchases[0]
                  : payment.purchases;
                const linkedVendor = Array.isArray(linkedPurchase?.vendors)
                  ? linkedPurchase?.vendors[0]
                  : linkedPurchase?.vendors;
                return {
                  id: payment.id,
                  date: formatBsDisplayDate(payment.payment_date),
                  supplier: linkedVendor?.name ?? linkedPurchase?.vendor_name ?? "-",
                  bill: linkedPurchase?.purchase_number ?? "-",
                  method: payment.payment_method ?? "-",
                  amount: formatCurrency(payment.amount),
                };
              })}
              expenses={expenses.slice(0, 10).map((expense) => ({
                id: expense.id,
                date: formatBsDisplayDate(expense.expense_date),
                title: expense.expense_title,
                amount: formatCurrency(expense.amount),
                notes: expense.notes ?? "-",
              }))}
            />
          }
        />
        <PageActionStrip
          actions={[
            { label: "Create Purchase Bill", href: "/purchases/create", icon: FilePlus },
            { label: "Add Expense Entry", href: "/purchases/expense/create", variant: "secondary", icon: Wallet },
            { label: "Back To Purchases Overview", href: "/purchases", variant: "secondary", icon: ArrowLeft },
          ]}
        />

        <div className="space-y-6">
          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-50 p-6">
              <h3 className="text-lg font-bold text-slate-900">Recent Purchases</h3>
              <p className="mt-1 text-xs text-slate-500">Live purchase records from Supabase.</p>
            </div>
            <div className="border-b border-slate-50 p-6">
              <PurchaseRecordsFilters
                search={search}
                status={status}
                sort={sort}
                perPage={perPage}
              />
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
                                { name: "redirect_to", value: "/purchases/view" },
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
              basePath="/purchases/view"
              pageParam="page"
              currentPage={Math.min(purchasesPage, purchasesTotalPages)}
              totalPages={purchasesTotalPages}
              totalItems={purchases.length}
              pageSize={perPage}
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
                          actionHref="/purchases/view"
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationControls
              basePath="/purchases/view"
              pageParam="paymentsPage"
              currentPage={Math.min(paymentsPage, paymentsTotalPages)}
              totalPages={paymentsTotalPages}
              totalItems={purchasePayments.length}
              pageSize={PAYMENTS_PAGE_SIZE}
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
                              { name: "redirect_to", value: "/purchases/view" },
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
              basePath="/purchases/view"
              pageParam="expensesPage"
              currentPage={Math.min(expensesPage, expensesTotalPages)}
              totalPages={expensesTotalPages}
              totalItems={expenses.length}
              pageSize={EXPENSES_PAGE_SIZE}
              searchParams={params}
            />
          </section>
        </div>
      </main>
    </div>
  );
}
