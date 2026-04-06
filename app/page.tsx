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
import Link from "next/link";
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

const readVendorName = (
  relation:
    | { name?: string | null }
    | Array<{ name?: string | null }>
    | null
    | undefined,
) => {
  if (Array.isArray(relation)) {
    return relation[0]?.name ?? null;
  }

  return relation?.name ?? null;
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
    salesPaymentsResponse,
    purchasePaymentsResponse,
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
    supabase
      .from("sales_payments")
      .select(
        "id, payment_date, amount, created_at, sales(id, invoice_number, customer_name, grand_total, amount_received, payment_status)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("purchase_payments")
      .select(
        "id, payment_date, amount, created_at, payment_method, purchases(id, purchase_number, total_amount, paid_amount, credit_amount, payment_status, vendor_name, vendors(name))",
      )
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
  const salesPayments = salesPaymentsResponse.data ?? [];
  const purchasePayments = purchasePaymentsResponse.data ?? [];
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
  const filteredSalesPayments = salesPayments.filter((payment) =>
    isWithinRange(payment.payment_date, fromDate, toDate),
  );
  const filteredPurchasePayments = purchasePayments.filter((payment) =>
    isWithinRange(payment.payment_date, fromDate, toDate),
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
  const recentActivity = [
    ...filteredSales.map((sale) => ({
      id: `sale-${sale.invoice_number}-${sale.created_at ?? sale.sales_date}`,
      title: "Sales bill created",
      description: `${sale.invoice_number} • ${sale.customer_name}`,
      amount: formatCurrency(sale.grand_total),
      date: formatBsDisplayDate(sale.sales_date),
      sortKey: sale.created_at ?? sale.sales_date ?? "",
      tone: "green",
      icon: ReceiptText,
    })),
    ...filteredSalesPayments.map((payment) => {
      const sale = Array.isArray(payment.sales) ? payment.sales[0] : payment.sales;
      const totalAmount = Number(sale?.grand_total ?? 0);
      const amountReceived = Number(sale?.amount_received ?? 0);
      const wasFullyPaidByThisPayment =
        amountReceived >= totalAmount && amountReceived - Number(payment.amount ?? 0) < totalAmount;

      return {
        id: `sales-payment-${payment.id}`,
        title: wasFullyPaidByThisPayment ? "Sales bill fully paid" : "Sales payment received",
        description: `${sale?.invoice_number ?? "Sales bill"} • ${sale?.customer_name ?? "Customer"}`,
        amount: formatCurrency(payment.amount),
        date: formatBsDisplayDate(payment.payment_date),
        sortKey: payment.created_at ?? payment.payment_date ?? "",
        tone: wasFullyPaidByThisPayment ? "emerald" : "green",
        icon: Wallet,
      };
    }),
    ...filteredPurchases.map((purchase) => ({
      id: `purchase-${purchase.purchase_number}-${purchase.created_at ?? purchase.purchase_date}`,
      title: "Purchase bill created",
      description: `${purchase.purchase_number} • ${purchase.vendor_name ?? "Supplier"}`,
      amount: formatCurrency(purchase.total_amount),
      date: formatBsDisplayDate(purchase.purchase_date),
      sortKey: purchase.created_at ?? purchase.purchase_date ?? "",
      tone: "blue",
      icon: ShoppingCart,
    })),
    ...filteredPurchasePayments.map((payment) => {
      const purchase = Array.isArray(payment.purchases) ? payment.purchases[0] : payment.purchases;
      const vendorName = readVendorName(
        purchase?.vendors as { name?: string | null } | Array<{ name?: string | null }> | null,
      );
      const totalAmount = Number(purchase?.total_amount ?? 0);
      const paidAmount = Number(purchase?.paid_amount ?? 0);
      const wasFullyPaidByThisPayment =
        paidAmount >= totalAmount && paidAmount - Number(payment.amount ?? 0) < totalAmount;

      return {
        id: `purchase-payment-${payment.id}`,
        title: wasFullyPaidByThisPayment ? "Purchase bill fully paid" : "Purchase payment made",
        description: `${purchase?.purchase_number ?? "Purchase bill"} • ${vendorName ?? purchase?.vendor_name ?? "Supplier"}`,
        amount: formatCurrency(payment.amount),
        date: formatBsDisplayDate(payment.payment_date),
        sortKey: payment.created_at ?? payment.payment_date ?? "",
        tone: wasFullyPaidByThisPayment ? "blue" : "slate",
        icon: CircleDollarSign,
      };
    }),
    ...filteredExpenses.map((expense) => ({
      id: `expense-${expense.expense_title}-${expense.created_at ?? expense.expense_date}`,
      title: "Expense added",
      description: expense.expense_title || "Purchase expense",
      amount: formatCurrency(expense.amount),
      date: formatBsDisplayDate(expense.expense_date),
      sortKey: expense.created_at ?? expense.expense_date ?? "",
      tone: "amber",
      icon: CreditCard,
    })),
    ...filteredStaffSalaryPayments.map((payment) => {
      const staffName =
        staffProfiles.find((staff) => staff.id === payment.staff_id)?.name ?? "Staff";
      return {
      id: `salary-${payment.created_at ?? payment.transaction_date}-${payment.id}`,
      title: payment.type === "SALARY" ? "Staff salary paid" : "Staff advance paid",
      description: `${staffName} • ${payment.month_label}`,
      amount: formatCurrency(payment.amount),
      date: formatBsDisplayDate(payment.transaction_date),
      sortKey: payment.created_at ?? payment.transaction_date ?? "",
      tone: "slate",
      icon: Wallet,
    };
    }),
  ]
    .sort((left, right) => right.sortKey.localeCompare(left.sortKey))
    .slice(0, 10);
  const selectedPeriodLabel = formatReportPeriod(selectedRange, fromDate, toDate);
  const generatedReportDate = formatBsDisplayDate(todayDate);
  const nepaliNow = getNepaliDateTimeParts();
  const overdueSalesHref = buildDrillDownHref("/sales", selectedRange, fromDate, toDate, {
    status: "OVERDUE",
  });
  const pendingCollectionsHref = buildDrillDownHref(
    "/sales",
    selectedRange,
    fromDate,
    toDate,
    { collection: "pending" },
  );
  const supplierDuesHref = buildDrillDownHref("/purchases", selectedRange, fromDate, toDate, {
    dues: "1",
  });
  const salaryPendingHref = buildDrillDownHref("/staff", selectedRange, fromDate, toDate, {
    salary_status: "pending",
  });
  const expenseSpikesHref = buildDrillDownHref("/purchases", selectedRange, fromDate, toDate, {
    expense_min: "50000",
  });

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
            href={supplierDuesHref}
          />
        </div>

        <div className="mb-10 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            title="Overdue Sales"
            value={formatCurrency(
              overdueSales.reduce((sum, sale) => sum + Number(sale.remaining_amount ?? 0), 0),
            )}
            trend={`${overdueSales.length} overdue invoice${overdueSales.length === 1 ? "" : "s"}`}
            trendType="negative"
            icon={AlertCircle}
            iconBgColor="bg-rose-50"
            iconColor="text-rose-500"
            href={overdueSalesHref}
          />
          <SummaryCard
            title="Pending Collections"
            value={formatCurrency(
              pendingCustomerCollections.reduce(
                (sum, sale) => sum + Number(sale.remaining_amount ?? 0),
                0,
              ),
            )}
            trend={`${pendingCustomerCollections.length} bill${pendingCustomerCollections.length === 1 ? "" : "s"} awaiting collection`}
            trendType="neutral"
            icon={Wallet}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-600"
            href={pendingCollectionsHref}
          />
          <SummaryCard
            title="Supplier Dues"
            value={formatCurrency(
              supplierDues.reduce((sum, purchase) => sum + Number(purchase.credit_amount ?? 0), 0),
            )}
            trend={`${supplierDues.length} supplier bill${supplierDues.length === 1 ? "" : "s"} unpaid`}
            trendType="negative"
            icon={ShoppingCart}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
            href={supplierDuesHref}
          />
          <SummaryCard
            title="Salary Pending"
            value={formatCurrency(
              unpaidSalaryEntries.reduce(
                (sum, entry) => sum + Number(entry.remaining ?? 0),
                0,
              ),
            )}
            trend={`${unpaidSalaryEntries.length} payroll entr${unpaidSalaryEntries.length === 1 ? "y" : "ies"} pending`}
            trendType="neutral"
            icon={ReceiptText}
            iconBgColor="bg-slate-100"
            iconColor="text-slate-700"
            href={salaryPendingHref}
          />
          <SummaryCard
            title="Expense Spikes"
            value={formatCurrency(highExpensesTotal)}
            trend={`${filteredExpenses.length} expense${filteredExpenses.length === 1 ? "" : "s"} in range`}
            trendType={highExpensesTotal >= 50000 ? "negative" : "neutral"}
            icon={CreditCard}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-700"
            href={expenseSpikesHref}
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
                    Top actionable issues needing follow-up across collections, payables, and payroll.
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
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
                          {alert.title}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{alert.value}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500">{alert.description}</div>
                      </div>
                      <Link
                        href={alert.href}
                        className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        {alert.actionLabel}
                      </Link>
                    </div>
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
                Latest financial events recorded across sales, purchases, expenses, and staff payments.
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
                        <div
                          className={`rounded-xl p-2.5 ${
                            activity.tone === "green"
                              ? "bg-emerald-50 text-emerald-600"
                              : activity.tone === "emerald"
                                ? "bg-green-50 text-green-700"
                                : activity.tone === "blue"
                                  ? "bg-blue-50 text-blue-600"
                                  : activity.tone === "amber"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                          }`}
                        >
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
