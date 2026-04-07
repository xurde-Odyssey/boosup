import {
  CalendarClock,
  CircleDollarSign,
  FilePlus,
  HandCoins,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { AlertsCard } from "@/components/dashboard/AlertsCard";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { DashboardGrid } from "@/components/dashboard/DashboardGrid";
import { ExpenseBreakdownChart } from "@/components/dashboard/ExpenseBreakdownChart";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { SalesPurchasesChart } from "@/components/dashboard/SalesPurchasesChart";
import { Tab, TabList, TabPanel, Tabs } from "@/components/dashboard/Tabs";
import { TableCard } from "@/components/dashboard/TableCard";
import { DashboardReportPrintButton } from "@/components/dashboard/DashboardReportPrintButton";
import { Button } from "@/components/shared/Button";
import { ReportToolbar } from "@/components/shared/ReportToolbar";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { getCompanySettings } from "@/lib/company-settings-server";
import { formatBsDisplayDate } from "@/lib/nepali-date";
import {
  formatCurrency,
  getAvatarTone,
  getInitials,
} from "@/lib/presentation";
import { recalculateStaffLedgerSnapshots } from "@/lib/staff-payroll";
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

const readNestedDate = (
  relation:
    | { sales_date?: string | null; purchase_date?: string | null }
    | Array<{ sales_date?: string | null; purchase_date?: string | null }>
    | null
    | undefined,
  key: "sales_date" | "purchase_date",
) => {
  if (Array.isArray(relation)) {
    return relation[0]?.[key] ?? null;
  }

  return relation?.[key] ?? null;
};

const formatReportPeriod = (range: string, from: string, to: string) => {
  if (range === "week") return "This Week";
  if (range === "month") return "This Month";
  if (range === "year") return "This Year";
  return `${formatBsDisplayDate(from)} - ${formatBsDisplayDate(to)}`;
};

const buildDrillDownHref = (
  basePath: string,
  selectedRange: string,
  fromDate: string,
  toDate: string,
  filters: Record<string, string>,
) => {
  const searchParams = new URLSearchParams({
    range: selectedRange,
    from: fromDate,
    to: toDate,
    ...filters,
  });

  return `${basePath}?${searchParams.toString()}`;
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
    staffProfilesResponse,
    staffLedgersResponse,
    staffTransactionsResponse,
    expensesResponse,
    salesItemsResponse,
    purchaseItemsResponse,
  ] = await Promise.all([
    supabase
      .from("sales")
      .select(
        "invoice_number, customer_name, sales_date, grand_total, amount_received, remaining_amount, payment_status, created_at",
      )
      .order("sales_date", { ascending: true }),
    supabase
      .from("purchases")
      .select(
        "purchase_number, purchase_date, total_amount, paid_amount, credit_amount, payment_status, vendor_name, created_at",
      )
      .order("purchase_date", { ascending: true }),
    supabase.from("staff_profiles").select("id, name, total_salary"),
    supabase
      .from("staff_salary_ledgers")
      .select(
        "id, staff_id, month, year, base_salary, working_days, leave_days, total_advance, salary_paid, total_paid, remaining, carry_forward, status, created_at, updated_at",
      ),
    supabase
      .from("staff_salary_transactions")
      .select("id, staff_id, ledger_id, transaction_date, type, amount, note, created_at, updated_at"),
    supabase.from("purchase_expenses").select("expense_date, expense_title, amount, created_at"),
    supabase
      .from("sales_items")
      .select("product_name, quantity, amount, sales(sales_date)")
      .order("created_at", { ascending: false }),
    supabase
      .from("purchase_items")
      .select("product_name, quantity, amount, purchases(purchase_date)")
      .order("created_at", { ascending: false }),
  ]);

  const sales = salesResponse.data ?? [];
  const purchases = purchasesResponse.data ?? [];
  const staffProfiles = staffProfilesResponse.data ?? [];
  const staffLedgerSnapshots = recalculateStaffLedgerSnapshots(
    staffLedgersResponse.data ?? [],
    staffTransactionsResponse.data ?? [],
  );
  const purchaseExpenses = expensesResponse.data ?? [];
  const salesItems = salesItemsResponse.data ?? [];
  const purchaseItems = purchaseItemsResponse.data ?? [];
  const payrollMonthSummaries = staffLedgerSnapshots.ledgers;
  const filteredSales = sales.filter((sale) => isWithinRange(sale.sales_date, fromDate, toDate));
  const filteredPurchases = purchases.filter((purchase) =>
    isWithinRange(purchase.purchase_date, fromDate, toDate),
  );
  const filteredExpenses = purchaseExpenses.filter((expense) =>
    isWithinRange(expense.expense_date, fromDate, toDate),
  );
  const filteredSalesItems = salesItems.filter((item) => {
    const soldOn = readNestedDate(
      item.sales as { sales_date?: string | null } | Array<{ sales_date?: string | null }> | null,
      "sales_date",
    );
    return isWithinRange(soldOn, fromDate, toDate);
  });
  const filteredPurchaseItems = purchaseItems.filter((item) => {
    const boughtOn = readNestedDate(
      item.purchases as
        | { purchase_date?: string | null }
        | Array<{ purchase_date?: string | null }>
        | null,
      "purchase_date",
    );
    return isWithinRange(boughtOn, fromDate, toDate);
  });
  const filteredStaffSalaryPayments = staffLedgerSnapshots.transactions.filter((transaction) =>
    isWithinRange(transaction.transaction_date, fromDate, toDate),
  );

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

  const payroll = payrollMonthSummaries
    .filter((ledger) => {
      const ledgerDate = `${ledger.year}-${String(ledger.month).padStart(2, "0")}-01`;
      return ledgerDate >= fromDate && ledgerDate <= toDate;
    })
    .reduce((sum, ledger) => sum + Number(ledger.salary_paid ?? 0), 0);
  const advances = payrollMonthSummaries
    .filter((ledger) => {
      const ledgerDate = `${ledger.year}-${String(ledger.month).padStart(2, "0")}-01`;
      return ledgerDate >= fromDate && ledgerDate <= toDate;
    })
    .reduce((sum, ledger) => sum + Number(ledger.total_advance ?? 0), 0);
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

    const soldOn = readNestedDate(
      item.sales as { sales_date?: string | null } | Array<{ sales_date?: string | null }> | null,
      "sales_date",
    );
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

    const boughtOn = readNestedDate(
      item.purchases as
        | { purchase_date?: string | null }
        | Array<{ purchase_date?: string | null }>
        | null,
      "purchase_date",
    );
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
  const overdueSales = filteredSales.filter((sale) => sale.payment_status === "OVERDUE");
  const pendingCustomerCollections = filteredSales.filter(
    (sale) =>
      sale.payment_status !== "OVERDUE" && Number(sale.remaining_amount ?? 0) > 0,
  );
  const overdueSupplierBills = filteredPurchases.filter(
    (purchase) => purchase.payment_status === "OVERDUE",
  );
  const supplierDues = filteredPurchases.filter((purchase) => Number(purchase.credit_amount ?? 0) > 0);
  const unpaidSalaryEntries = payrollMonthSummaries.filter((summary) => summary.remaining > 0);
  const highExpensesTotal = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0);
  const alerts = [
    overdueSales.length > 0
      ? {
          title: "Overdue Sales",
          value: `${overdueSales.length} invoice${overdueSales.length > 1 ? "s" : ""}`,
          description: `${formatCurrency(overdueSales.reduce((sum, sale) => sum + Number(sale.remaining_amount ?? 0), 0))} needs collection follow-up.`,
          tone: "rose",
          href: "/sales?status=OVERDUE",
          actionLabel: "Open Sales",
        }
      : null,
    pendingCustomerCollections.length > 0
      ? {
          title: "Pending Customer Payments",
          value: `${pendingCustomerCollections.length} bill${pendingCustomerCollections.length > 1 ? "s" : ""}`,
          description: `${formatCurrency(pendingCustomerCollections.reduce((sum, sale) => sum + Number(sale.remaining_amount ?? 0), 0))} still outstanding.`,
          tone: "amber",
          href: "/sales?status=PARTIAL",
          actionLabel: "Review Pending",
        }
      : null,
    supplierDues.length > 0
      ? {
          title: "Supplier Dues",
          value: `${supplierDues.length} bill${supplierDues.length > 1 ? "s" : ""}`,
          description: `${formatCurrency(supplierDues.reduce((sum, purchase) => sum + Number(purchase.credit_amount ?? 0), 0))} remains payable to suppliers.`,
          tone: "blue",
          href: buildDrillDownHref("/purchases", selectedRange, fromDate, toDate, {
            dues: "1",
          }),
          actionLabel: "Open Purchases",
        }
      : null,
    overdueSupplierBills.length > 0
      ? {
          title: "Overdue Supplier Bills",
          value: `${overdueSupplierBills.length} bill${overdueSupplierBills.length > 1 ? "s" : ""}`,
          description: `${formatCurrency(overdueSupplierBills.reduce((sum, purchase) => sum + Number(purchase.credit_amount ?? 0), 0))} is overdue.`,
          tone: "red",
          href: buildDrillDownHref("/purchases", selectedRange, fromDate, toDate, {
            payment_status: "OVERDUE",
          }),
          actionLabel: "Follow Up",
        }
      : null,
    unpaidSalaryEntries.length > 0
      ? {
          title: "Unpaid Salary Commitments",
          value: `${unpaidSalaryEntries.length} entr${unpaidSalaryEntries.length > 1 ? "ies" : "y"}`,
          description: `${formatCurrency(unpaidSalaryEntries.reduce((sum, entry) => sum + Number(entry.remaining ?? 0), 0))} is still pending for staff.`,
          tone: "slate",
          href: buildDrillDownHref("/staff", selectedRange, fromDate, toDate, {
            salary_status: "pending",
          }),
          actionLabel: "Open Payroll",
        }
      : null,
    highExpensesTotal >= 50000
      ? {
          title: "High Expenses In Range",
          value: `${filteredExpenses.length} expense${filteredExpenses.length > 1 ? "s" : ""}`,
          description: `${formatCurrency(highExpensesTotal)} recorded in the selected period.`,
          tone: "amber",
          href: buildDrillDownHref("/purchases", selectedRange, fromDate, toDate, {
            expense_min: "50000",
          }),
          actionLabel: "Review Expenses",
        }
      : null,
  ].filter(Boolean) as Array<{
    title: string;
    value: string;
    description: string;
    tone: string;
    href: string;
    actionLabel: string;
  }>;
  const overviewCustomerRows = customers.map((customer) => ({
    id: customer.name,
    name: customer.name,
    category: customer.category,
    revenue: customer.revenue,
    lastTransaction: customer.lastTransaction,
    status: customer.status,
    initials: customer.initials,
    initialsBg: customer.initialsBg,
    initialsColor: customer.initialsColor,
  }));
  const salesItemRows = topSalesItems.map((item) => ({
    id: item.name,
    name: item.name,
    quantitySold: item.quantitySold,
    salesAmount: item.salesAmount,
    invoiceCount: String(item.invoiceCount),
    lastSold: item.lastSold,
  }));
  const purchaseItemRows = topPurchaseItems.map((item) => ({
    id: item.name,
    name: item.name,
    quantityBought: item.quantityBought,
    purchaseAmount: item.purchaseAmount,
    billCount: String(item.billCount),
    lastBought: item.lastBought,
  }));
  const expenseRows = filteredExpenses.slice(0, 6).map((expense, index) => ({
    id: `${expense.expense_title}-${expense.expense_date}-${index}`,
    title: expense.expense_title || "Purchase expense",
    amount: formatCurrency(expense.amount),
    date: formatBsDisplayDate(expense.expense_date),
  }));
  const staffRows = filteredStaffSalaryPayments.slice(0, 6).map((payment, index) => ({
    id: `${payment.id}-${index}`,
    staff:
      staffProfiles.find((staff) => staff.id === payment.staff_id)?.name ?? "Staff",
    month: payment.month_label,
    type: payment.type,
    amount: formatCurrency(payment.amount),
    date: formatBsDisplayDate(payment.transaction_date),
  }));
  const selectedPeriodLabel = formatReportPeriod(selectedRange, fromDate, toDate);
  const generatedReportDate = formatBsDisplayDate(todayDate);
  const nepaliNow = getNepaliDateTimeParts();
  const salaryPendingHref = buildDrillDownHref("/staff", selectedRange, fromDate, toDate, {
    salary_status: "pending",
  });

  return (
    <DashboardLayout>
      <DashboardHeader
        title="Main Financial Dashboard"
        subtitle="Real-time business performance overview with alerts, analytics, and operational logs."
        actions={
          <>
            <Button href="/sales/create">
              <FilePlus className="h-4 w-4" />
              Create Sales
            </Button>
            <Button href="/purchases/expense/create" variant="secondary">
              <HandCoins className="h-4 w-4" />
              Add Expense
            </Button>
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
            <ThemeToggle />
          </>
        }
        meta={
          <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-center">
            <section className="inline-flex max-w-full items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm shadow-slate-200/40">
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
            <ReportToolbar
              actionPath="/"
              selectedRange={selectedRange}
              fromDate={fromDate}
              toDate={toDate}
            />
          </div>
        }
      />

      <DashboardGrid className="mb-8 md:grid-cols-2 xl:grid-cols-12">
        <div className="xl:col-span-4">
          <KpiCard
            title="Total Sales"
            value={formatCurrency(totalSales)}
            trend="up"
            percentage={`${filteredSales.length} sales recorded`}
            icon={TrendingUp}
            color="emerald"
          />
        </div>
        <div className="xl:col-span-4">
          <KpiCard
            title="Total Purchases"
            value={formatCurrency(totalPurchases)}
            trend="down"
            percentage={`${filteredPurchases.length} purchases recorded`}
            icon={ShoppingCart}
            color="slate"
          />
        </div>
        <div className="xl:col-span-4">
          <KpiCard
            title="Net Profit"
            value={formatCurrency(netProfit)}
            trend={netProfit >= 0 ? "up" : "down"}
            percentage="Sales minus purchases"
            icon={CircleDollarSign}
            color={netProfit >= 0 ? "emerald" : "rose"}
          />
        </div>
      </DashboardGrid>

      <DashboardGrid className="mb-8">
        <AlertsCard items={alerts} />
        <div className="xl:col-span-5">
          <TableCard
            title="Operations Grid"
            subtitle="Priority operational numbers tied to their filtered working views."
            rows={[
              {
                id: "supplier-dues",
                metric: "Supplier Dues",
                value: formatCurrency(
                  supplierDues.reduce((sum, purchase) => sum + Number(purchase.credit_amount ?? 0), 0),
                ),
                status: `${supplierDues.length} unpaid`,
                action: "Open Purchases",
              },
              {
                id: "pending-collections",
                metric: "Pending Collections",
                value: formatCurrency(
                  pendingCustomerCollections.reduce((sum, sale) => sum + Number(sale.remaining_amount ?? 0), 0),
                ),
                status: `${pendingCustomerCollections.length} bills`,
                action: "View Invoices",
              },
              {
                id: "salary-pending",
                metric: "Salary Pending",
                value: formatCurrency(
                  unpaidSalaryEntries.reduce((sum, entry) => sum + Number(entry.remaining ?? 0), 0),
                ),
                status: `${unpaidSalaryEntries.length} payroll rows`,
                action: "Open Payroll",
              },
            ]}
            columns={[
              { key: "metric", label: "Metric", className: "font-semibold text-slate-900" },
              { key: "value", label: "Value", className: "font-bold text-slate-900" },
              { key: "status", label: "Status" },
              { key: "action", label: "Action" },
            ]}
          />
        </div>
      </DashboardGrid>

      <DashboardGrid className="mb-8">
        <ChartCard
          className="xl:col-span-7"
          title="Monthly Sales vs Purchases"
          subtitle="Revenue versus spend over the selected time window."
          summary={<div className="text-sm font-semibold text-slate-600">{selectedPeriodLabel}</div>}
          insight={`Highest current sales volume is ${formatCurrency(totalSales)} against purchases of ${formatCurrency(totalPurchases)}.`}
        >
          <SalesPurchasesChart data={chartData} compact />
        </ChartCard>
        <ChartCard
          className="xl:col-span-5"
          title="Expense Breakdown"
          subtitle="Current allocation across payroll, dues, advances, and extra expenses."
          summary={<div className="text-sm font-semibold text-slate-600">{formatCurrency(expenseTotal)}</div>}
          insight={
            expenses[0]
              ? `Highest expense: ${expenses[0].name} (${Math.round((expenses[0].value / Math.max(expenseTotal, 1)) * 100)}%)`
              : "No expense insights yet."
          }
        >
          <ExpenseBreakdownChart data={expenseData} total={formatCurrency(expenseTotal)} compact />
        </ChartCard>
      </DashboardGrid>

      <Tabs defaultValue="overview">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm shadow-slate-200/50">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-lg font-semibold text-slate-900">Data Blocks</div>
              <div className="text-sm text-slate-500">
                Tabbed drill-down tables for overview, sales, expenses, and staff.
              </div>
            </div>
            <TabList>
              <Tab value="overview">Overview</Tab>
              <Tab value="sales">Sales</Tab>
              <Tab value="expenses">Expenses</Tab>
              <Tab value="staff">Staff</Tab>
            </TabList>
          </div>

          <TabPanel value="overview">
            <DashboardGrid>
              <div className="xl:col-span-6">
                <TableCard
                  title="Top Customers"
                  actionLabel="View All"
                  actionHref="/sales"
                  rows={overviewCustomerRows}
                  columns={[
                    {
                      key: "name",
                      label: "Customer Name",
                      render: (row) => (
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold ${row.initialsBg} ${row.initialsColor}`}>
                            {row.initials}
                          </div>
                          <span className="font-semibold text-slate-900">{row.name}</span>
                        </div>
                      ),
                    },
                    { key: "category", label: "Category" },
                    { key: "revenue", label: "Revenue", className: "font-bold text-slate-900" },
                    { key: "lastTransaction", label: "Last Transaction" },
                  ]}
                />
              </div>
              <div className="xl:col-span-6">
                <TableCard
                  title="Top Sales Items"
                  actionLabel="View All"
                  actionHref="/sales"
                  rows={salesItemRows}
                  columns={[
                    { key: "name", label: "Item Name", className: "font-semibold text-slate-900" },
                    { key: "quantitySold", label: "Quantity" },
                    { key: "salesAmount", label: "Sales Amount", className: "font-bold text-slate-900" },
                    { key: "lastSold", label: "Last Sold" },
                  ]}
                />
              </div>
            </DashboardGrid>
          </TabPanel>

          <TabPanel value="sales">
            <DashboardGrid>
              <div className="xl:col-span-6">
                <TableCard
                  title="Top Customers"
                  actionLabel="Open Sales"
                  actionHref="/sales"
                  rows={overviewCustomerRows}
                  columns={[
                    { key: "name", label: "Customer", className: "font-semibold text-slate-900" },
                    { key: "revenue", label: "Revenue", className: "font-bold text-slate-900" },
                    { key: "lastTransaction", label: "Last Transaction" },
                  ]}
                />
              </div>
              <div className="xl:col-span-6">
                <TableCard
                  title="Top Sales Items"
                  actionLabel="Open Sales"
                  actionHref="/sales"
                  rows={salesItemRows}
                  columns={[
                    { key: "name", label: "Item", className: "font-semibold text-slate-900" },
                    { key: "quantitySold", label: "Quantity" },
                    { key: "salesAmount", label: "Amount", className: "font-bold text-slate-900" },
                    { key: "invoiceCount", label: "Invoices" },
                  ]}
                />
              </div>
            </DashboardGrid>
          </TabPanel>

          <TabPanel value="expenses">
            <DashboardGrid>
              <div className="xl:col-span-7">
                <TableCard
                  title="Top Purchase Items"
                  actionLabel="Open Purchases"
                  actionHref="/purchases"
                  rows={purchaseItemRows}
                  columns={[
                    { key: "name", label: "Item", className: "font-semibold text-slate-900" },
                    { key: "quantityBought", label: "Quantity" },
                    { key: "purchaseAmount", label: "Purchase Amount", className: "font-bold text-slate-900" },
                    { key: "lastBought", label: "Last Bought" },
                  ]}
                />
              </div>
              <div className="xl:col-span-5">
                <TableCard
                  title="Recent Expenses"
                  actionLabel="Add Expense"
                  actionHref="/purchases/expense/create"
                  rows={expenseRows}
                  columns={[
                    { key: "title", label: "Expense", className: "font-semibold text-slate-900" },
                    { key: "amount", label: "Amount", className: "font-bold text-slate-900" },
                    { key: "date", label: "Date" },
                  ]}
                />
              </div>
            </DashboardGrid>
          </TabPanel>

          <TabPanel value="staff">
            <DashboardGrid>
              <div className="xl:col-span-7">
                <TableCard
                  title="Recent Staff Payments"
                  actionLabel="Open Staff"
                  actionHref="/staff"
                  rows={staffRows}
                  columns={[
                    { key: "staff", label: "Staff", className: "font-semibold text-slate-900" },
                    { key: "month", label: "Month" },
                    { key: "type", label: "Type" },
                    { key: "amount", label: "Amount", className: "font-bold text-slate-900" },
                    { key: "date", label: "Date" },
                  ]}
                />
              </div>
              <div className="xl:col-span-5">
                <TableCard
                  title="Salary Pending"
                  actionLabel="Open Payroll"
                  actionHref={salaryPendingHref}
                  rows={unpaidSalaryEntries.slice(0, 6).map((entry) => ({
                    id: entry.id,
                    month: entry.month_label,
                    payable: formatCurrency(entry.payable_amount),
                    remaining: formatCurrency(entry.remaining),
                    status: entry.status,
                  }))}
                  columns={[
                    { key: "month", label: "Month", className: "font-semibold text-slate-900" },
                    { key: "payable", label: "Payable" },
                    { key: "remaining", label: "Remaining", className: "font-bold text-slate-900" },
                    { key: "status", label: "Status" },
                  ]}
                />
              </div>
            </DashboardGrid>
          </TabPanel>
        </div>
      </Tabs>
    </DashboardLayout>
  );
}
