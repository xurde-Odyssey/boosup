import {
  AlertCircle,
  BellRing,
  CalendarClock,
  CircleDollarSign,
  CreditCard,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { ExpenseBreakdownChart } from "@/components/dashboard/ExpenseBreakdownChart";
import { Header } from "@/components/dashboard/Header";
import { SalesPurchasesChart } from "@/components/dashboard/SalesPurchasesChart";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { TopCustomersTable } from "@/components/dashboard/TopCustomersTable";
import { TopPurchaseItemsTable } from "@/components/dashboard/TopPurchaseItemsTable";
import { TopSalesItemsTable } from "@/components/dashboard/TopSalesItemsTable";
import { DashboardReportPrintButton } from "@/components/dashboard/DashboardReportPrintButton";
import { ReportToolbar } from "@/components/shared/ReportToolbar";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { getCompanySettings } from "@/lib/company-settings-server";
import { formatBsDisplayDate } from "@/lib/nepali-date";
import {
  formatCurrency,
  getAvatarTone,
  getInitials,
} from "@/lib/presentation";
import { buildPayrollMonthSummaries } from "@/lib/staff-payroll";
import { getSupabaseClient } from "@/lib/supabase/server";
import { ADtoBS } from "nepali-date-library";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const monthKey = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-US", { month: "short" }).toUpperCase() : "";

const getTodayDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
  }).format(new Date());

const getNepaliDateTimeParts = () => {
  const now = new Date();
  const adToday = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
  }).format(now);

  try {
    return {
      date: ADtoBS(adToday).replace(/-/g, "/"),
      time: new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kathmandu",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(now),
      timezone: "GMT+5:45",
    };
  } catch {
    return {
      date: adToday,
      time: new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kathmandu",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(now),
      timezone: "GMT+5:45",
    };
  }
};

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

  return {
    from: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-01`,
    to: today,
  };
};

const isWithinRange = (value: string | null | undefined, from: string, to: string) => {
  if (!value) return false;
  return value >= from && value <= to;
};

const formatReportPeriod = (range: string, from: string, to: string) => {
  if (range === "week") return "This Week";
  if (range === "month") return "This Month";
  if (range === "year") return "This Year";
  return `${formatBsDisplayDate(from)} - ${formatBsDisplayDate(to)}`;
};

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabase = await getSupabaseClient();
  const company = await getCompanySettings();
  const todayDate = getTodayDate();
  const selectedRange = typeof params.range === "string" ? params.range : "year";
  const defaultRange = getDateRange(selectedRange, todayDate);
  const fromDate = typeof params.from === "string" && params.from ? params.from : defaultRange.from;
  const toDate = typeof params.to === "string" && params.to ? params.to : defaultRange.to;
  const [
    salesResponse,
    purchasesResponse,
    staffResponse,
    expensesResponse,
    salesItemsResponse,
    purchaseItemsResponse,
    staffSalaryPaymentsResponse,
  ] = await Promise.all([
    supabase
      .from("sales")
      .select("invoice_number, customer_name, sales_date, grand_total, payment_status, created_at")
      .order("sales_date", { ascending: true }),
    supabase
      .from("purchases")
      .select("purchase_number, purchase_date, total_amount, credit_amount, created_at")
      .order("purchase_date", { ascending: true }),
    supabase.from("staff_profiles").select("total_salary, advance_salary"),
    supabase.from("purchase_expenses").select("expense_date, expense_title, amount, created_at"),
    supabase
      .from("sales_items")
      .select("product_name, quantity, amount, sales(sales_date)")
      .order("created_at", { ascending: false }),
    supabase
      .from("purchase_items")
      .select("product_name, quantity, amount, purchases(purchase_date)")
      .order("created_at", { ascending: false }),
    supabase
      .from("staff_salary_payments")
      .select("staff_id, salary_month_bs, payment_date, payment_type, working_days, leave_days, monthly_salary, advance_payment, created_at, staff_profiles(name)")
      .order("created_at", { ascending: false }),
  ]);

  const sales = salesResponse.data ?? [];
  const purchases = purchasesResponse.data ?? [];
  const staff = staffResponse.data ?? [];
  const purchaseExpenses = expensesResponse.data ?? [];
  const salesItems = salesItemsResponse.data ?? [];
  const purchaseItems = purchaseItemsResponse.data ?? [];
  const staffSalaryPayments = staffSalaryPaymentsResponse.data ?? [];
  const payrollMonthSummaries = buildPayrollMonthSummaries(staffSalaryPayments);
  const filteredSales = sales.filter((sale) => isWithinRange(sale.sales_date, fromDate, toDate));
  const filteredPurchases = purchases.filter((purchase) =>
    isWithinRange(purchase.purchase_date, fromDate, toDate),
  );
  const filteredExpenses = purchaseExpenses.filter((expense) =>
    isWithinRange(expense.expense_date, fromDate, toDate),
  );
  const filteredSalesItems = salesItems.filter((item) => {
    const soldOn = Array.isArray(item.sales)
      ? item.sales[0]?.sales_date ?? null
      : item.sales?.sales_date ?? null;
    return isWithinRange(soldOn, fromDate, toDate);
  });
  const filteredPurchaseItems = purchaseItems.filter((item) => {
    const boughtOn = Array.isArray(item.purchases)
      ? item.purchases[0]?.purchase_date ?? null
      : item.purchases?.purchase_date ?? null;
    return isWithinRange(boughtOn, fromDate, toDate);
  });

  const totalSales = filteredSales.reduce((sum, sale) => sum + Number(sale.grand_total ?? 0), 0);
  const totalPurchases = filteredPurchases.reduce(
    (sum, purchase) => sum + Number(purchase.total_amount ?? 0),
    0,
  );
  const payables = filteredPurchases.reduce(
    (sum, purchase) => sum + Number(purchase.credit_amount ?? 0),
    0,
  );
  const netProfit = totalSales - totalPurchases;

  const monthlyMap = new Map<string, { sales: number; purchases: number }>();
  filteredSales.forEach((sale) => {
    const key = monthKey(sale.sales_date);
    if (!key) return;
    const existing = monthlyMap.get(key) ?? { sales: 0, purchases: 0 };
    existing.sales += Number(sale.grand_total ?? 0);
    monthlyMap.set(key, existing);
  });
  filteredPurchases.forEach((purchase) => {
    const key = monthKey(purchase.purchase_date);
    if (!key) return;
    const existing = monthlyMap.get(key) ?? { sales: 0, purchases: 0 };
    existing.purchases += Number(purchase.total_amount ?? 0);
    monthlyMap.set(key, existing);
  });

  const chartData = Array.from(monthlyMap.entries()).map(([name, value]) => ({
    name,
    sales: value.sales,
    purchases: value.purchases,
  }));

  const payroll = staff.reduce((sum, item) => sum + Number(item.total_salary ?? 0), 0);
  const advances = staff.reduce((sum, item) => sum + Number(item.advance_salary ?? 0), 0);
  const miscExpenses = filteredExpenses.reduce(
    (sum, item) => sum + Number(item.amount ?? 0),
    0,
  );
  const expenses = [
    { name: "Payroll", value: payroll, color: "#3b82f6" },
    { name: "Purchase Credit", value: payables, color: "#0ea5e9" },
    { name: "Advance Salary", value: advances, color: "#64748b" },
    { name: "Purchase Expenses", value: miscExpenses, color: "#f59e0b" },
  ].filter((item) => item.value > 0);
  const expenseTotal = expenses.reduce((sum, item) => sum + item.value, 0);
  const expenseData = expenses.map((item) => ({
    ...item,
    value: Math.round((item.value / expenseTotal) * 100),
  }));

  const customerMap = new Map<
    string,
    { revenue: number; lastTransaction: string | null; count: number }
  >();
  filteredSales.forEach((sale) => {
    const existing = customerMap.get(sale.customer_name) ?? {
      revenue: 0,
      lastTransaction: sale.sales_date,
      count: 0,
    };
    existing.revenue += Number(sale.grand_total ?? 0);
    existing.count += 1;
    existing.lastTransaction =
      existing.lastTransaction && sale.sales_date && existing.lastTransaction > sale.sales_date
        ? existing.lastTransaction
        : sale.sales_date;
    customerMap.set(sale.customer_name, existing);
  });

  const customers = Array.from(customerMap.entries())
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 5)
    .map(([name, value], index) => {
      const tone = getAvatarTone(index);
      return {
        name,
        category: value.count > 5 ? "Regular" : "Customer",
        revenue: formatCurrency(value.revenue),
        lastTransaction: formatBsDisplayDate(value.lastTransaction),
        status: "ACTIVE",
        initials: getInitials(name),
        initialsBg: tone.bg,
        initialsColor: tone.text,
      };
    });

  const salesItemMap = new Map<
    string,
    { quantity: number; amount: number; invoiceCount: number; lastSold: string | null }
  >();
  filteredSalesItems.forEach((item) => {
    const name = item.product_name?.trim();
    if (!name) return;

    const existing = salesItemMap.get(name) ?? {
      quantity: 0,
      amount: 0,
      invoiceCount: 0,
      lastSold: null,
    };

    existing.quantity += Number(item.quantity ?? 0);
    existing.amount += Number(item.amount ?? 0);
    existing.invoiceCount += 1;

    const soldOn = Array.isArray(item.sales)
      ? item.sales[0]?.sales_date ?? null
      : item.sales?.sales_date ?? null;
    existing.lastSold =
      existing.lastSold && soldOn && existing.lastSold > soldOn ? existing.lastSold : soldOn;

    salesItemMap.set(name, existing);
  });

  const topSalesItems = Array.from(salesItemMap.entries())
    .sort((left, right) => right[1].amount - left[1].amount)
    .slice(0, 5)
    .map(([name, value]) => ({
      name,
      quantitySold: `${value.quantity}`,
      salesAmount: formatCurrency(value.amount),
      invoiceCount: value.invoiceCount,
      lastSold: formatBsDisplayDate(value.lastSold),
    }));
  const purchaseItemMap = new Map<
    string,
    { quantity: number; amount: number; billCount: number; lastBought: string | null }
  >();
  filteredPurchaseItems.forEach((item) => {
    const name = item.product_name?.trim();
    if (!name) return;

    const existing = purchaseItemMap.get(name) ?? {
      quantity: 0,
      amount: 0,
      billCount: 0,
      lastBought: null,
    };

    existing.quantity += Number(item.quantity ?? 0);
    existing.amount += Number(item.amount ?? 0);
    existing.billCount += 1;

    const boughtOn = Array.isArray(item.purchases)
      ? item.purchases[0]?.purchase_date ?? null
      : item.purchases?.purchase_date ?? null;
    existing.lastBought =
      existing.lastBought && boughtOn && existing.lastBought > boughtOn
        ? existing.lastBought
        : boughtOn;

    purchaseItemMap.set(name, existing);
  });

  const topPurchaseItems = Array.from(purchaseItemMap.entries())
    .sort((left, right) => right[1].amount - left[1].amount)
    .slice(0, 5)
    .map(([name, value]) => ({
      name,
      quantityBought: `${value.quantity}`,
      purchaseAmount: formatCurrency(value.amount),
      billCount: value.billCount,
      lastBought: formatBsDisplayDate(value.lastBought),
    }));
  const overdueSalesCount = filteredSales.filter((sale) => sale.payment_status === "OVERDUE").length;
  const overduePurchasesCount = filteredPurchases.filter(
    (purchase) => Number(purchase.credit_amount ?? 0) > 0,
  ).length;
  const unpaidSalaryCount = payrollMonthSummaries.filter(
    (summary) => summary.remaining_salary > 0,
  ).length;
  const alerts = [
    overdueSalesCount > 0
      ? {
          title: `${overdueSalesCount} overdue sales invoice${overdueSalesCount > 1 ? "s" : ""}`,
          description: "Customer collections need follow-up.",
          tone: "red",
        }
      : null,
    overduePurchasesCount > 0
      ? {
          title: `${overduePurchasesCount} purchase bill${overduePurchasesCount > 1 ? "s" : ""} still payable`,
          description: "Supplier credit remains unsettled.",
          tone: "amber",
        }
      : null,
    unpaidSalaryCount > 0
      ? {
          title: `${unpaidSalaryCount} salary entr${unpaidSalaryCount > 1 ? "ies" : "y"} with remaining payment`,
          description: "Staff payments need attention.",
          tone: "blue",
        }
      : null,
  ].filter(Boolean) as { title: string; description: string; tone: string }[];
  const recentActivity = [
    ...filteredSales.slice(-5).map((sale) => ({
      id: `sale-${sale.invoice_number}-${sale.created_at ?? sale.sales_date}`,
      title: `Sale invoice ${sale.invoice_number}`,
      description: sale.customer_name,
      amount: formatCurrency(sale.grand_total),
      date: formatBsDisplayDate(sale.sales_date),
      sortKey: sale.created_at ?? sale.sales_date ?? "",
      tone: "green",
      icon: ReceiptText,
    })),
    ...filteredPurchases.slice(-5).map((purchase) => ({
      id: `purchase-${purchase.purchase_number}-${purchase.created_at ?? purchase.purchase_date}`,
      title: `Purchase ${purchase.purchase_number}`,
      description: "Purchase entry recorded",
      amount: formatCurrency(purchase.total_amount),
      date: formatBsDisplayDate(purchase.purchase_date),
      sortKey: purchase.created_at ?? purchase.purchase_date ?? "",
      tone: "blue",
      icon: ShoppingCart,
    })),
    ...filteredExpenses.slice(-5).map((expense) => ({
      id: `expense-${expense.expense_title}-${expense.created_at ?? expense.expense_date}`,
      title: expense.expense_title || "Purchase expense",
      description: "Expense recorded",
      amount: formatCurrency(expense.amount),
      date: formatBsDisplayDate(expense.expense_date),
      sortKey: expense.created_at ?? expense.expense_date ?? "",
      tone: "amber",
      icon: CreditCard,
    })),
    ...staffSalaryPayments.slice(0, 5).map((payment) => ({
      id: `salary-${payment.created_at ?? payment.payment_date}-${payment.salary_month_bs}`,
      title: `${payment.payment_type === "SALARY" ? "Salary paid" : "Advance paid"} ${payment.salary_month_bs}`,
      description: Array.isArray(payment.staff_profiles)
        ? payment.staff_profiles[0]?.name ?? "Staff"
        : payment.staff_profiles?.name ?? "Staff",
      amount: formatCurrency(payment.advance_payment),
      date: formatBsDisplayDate(payment.payment_date),
      sortKey: payment.created_at ?? payment.payment_date ?? "",
      tone: "slate",
      icon: Wallet,
    })),
  ]
    .sort((left, right) => right.sortKey.localeCompare(left.sortKey))
    .slice(0, 8);
  const selectedPeriodLabel = formatReportPeriod(selectedRange, fromDate, toDate);
  const generatedReportDate = formatBsDisplayDate(todayDate);
  const nepaliNow = getNepaliDateTimeParts();

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <Header
          actions={<ThemeToggle />}
          meta={
            <section className="inline-flex max-w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                <CalendarClock className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                  Nepal Date & Time
                </div>
                <div className="mt-1 text-sm font-bold text-slate-900">{nepaliNow.date}</div>
                <div className="text-xs font-medium text-slate-500">
                  {nepaliNow.time}
                  <span className="ml-2 font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {nepaliNow.timezone}
                  </span>
                </div>
              </div>
            </section>
          }
        />

        <ReportToolbar
          actionPath="/"
          selectedRange={selectedRange}
          fromDate={fromDate}
          toDate={toDate}
          reportButton={
            <DashboardReportPrintButton
              company={company}
              generatedDate={generatedReportDate}
              selectedPeriod={selectedPeriodLabel}
              metrics={[
                { title: "Total Sales", value: formatCurrency(totalSales) },
                { title: "Total Purchases", value: formatCurrency(totalPurchases) },
                { title: "Net Profit", value: formatCurrency(netProfit) },
                { title: "Outstanding Payables", value: formatCurrency(payables) },
                { title: "Extra Expenses", value: formatCurrency(miscExpenses) },
              ]}
              customers={customers.map((customer) => ({
                name: customer.name,
                revenue: customer.revenue,
                lastTransaction: customer.lastTransaction,
              }))}
              items={topSalesItems.map((item) => ({
                name: item.name,
                quantitySold: item.quantitySold,
                salesAmount: item.salesAmount,
              }))}
            />
          }
        />

        <div className="mb-10 grid grid-cols-1 gap-5 xl:grid-cols-12">
          <SummaryCard
            title="Total Sales"
            value={formatCurrency(totalSales)}
            trend={`${filteredSales.length} sales recorded`}
            trendType="positive"
            icon={TrendingUp}
            iconBgColor="bg-emerald-50"
            iconColor="text-emerald-600"
            emphasis="high"
            className="xl:col-span-3"
          />
          <SummaryCard
            title="Total Purchases"
            value={formatCurrency(totalPurchases)}
            trend={`${filteredPurchases.length} purchases recorded`}
            trendType="neutral"
            icon={ShoppingCart}
            iconBgColor="bg-slate-100"
            iconColor="text-slate-700"
            emphasis="high"
            className="xl:col-span-3"
          />
          <SummaryCard
            title="Net Profit"
            value={formatCurrency(netProfit)}
            trend="Sales minus purchases"
            trendType={netProfit >= 0 ? "positive" : "negative"}
            icon={CircleDollarSign}
            iconBgColor={netProfit >= 0 ? "bg-emerald-50" : "bg-rose-50"}
            iconColor={netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}
            emphasis="high"
            className="xl:col-span-3"
          />
          <SummaryCard
            title="Outstanding Payables"
            value={formatCurrency(payables)}
            trend="Open purchase credit"
            trendType={payables > 0 ? "negative" : "neutral"}
            icon={AlertCircle}
            iconBgColor={payables > 0 ? "bg-rose-50" : "bg-slate-100"}
            iconColor={payables > 0 ? "text-rose-500" : "text-slate-700"}
            emphasis="high"
            className="xl:col-span-3"
          />
        </div>

        <div className="mb-10 grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <SalesPurchasesChart data={chartData} />
          </div>
          <div className="xl:col-span-4">
            <ExpenseBreakdownChart
              data={expenseData}
              total={formatCurrency(expenseTotal)}
            />
          </div>
        </div>

        <div className="mb-10 grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-50 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-rose-50 p-3 text-rose-500">
                  <BellRing className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Operational Alerts</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Follow-up items needing action across sales, purchases, and payroll.
                  </p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-slate-50">
              {alerts.length > 0 ? (
                alerts.map((alert, index) => (
                  <div
                    key={`${alert.title}-${index}`}
                    className={`px-6 py-4 ${
                      index % 2 === 0 ? "bg-white" : "bg-slate-50/20"
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-900">{alert.title}</div>
                    <div className="mt-1 text-xs text-slate-500">{alert.description}</div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-10 text-center text-sm text-slate-500">
                  No active alerts in the selected period.
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-50 p-6">
              <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
              <p className="mt-1 text-xs text-slate-500">
                Latest entries flowing through the system.
              </p>
            </div>
            <div className="divide-y divide-slate-50">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div
                      key={activity.id}
                      className={`flex items-center justify-between gap-4 px-6 py-4 ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/20"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="rounded-xl bg-slate-100 p-2.5 text-slate-600">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-slate-900">
                            {activity.title}
                          </div>
                          <div className="truncate text-xs text-slate-500">
                            {activity.description}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-bold text-slate-900">{activity.amount}</div>
                        <div className="text-xs text-slate-500">{activity.date}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="px-6 py-10 text-center text-sm text-slate-500">
                  No recent activity recorded yet.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="mb-10">
          <TopCustomersTable customers={customers} />
        </div>

        <div>
          <TopSalesItemsTable items={topSalesItems} />
        </div>

        <div className="mt-8">
          <TopPurchaseItemsTable items={topPurchaseItems} />
        </div>
      </main>
    </div>
  );
}
