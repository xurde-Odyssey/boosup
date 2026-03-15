import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CircleDollarSign,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
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
import {
  formatCurrency,
  formatDate,
  getAvatarTone,
  getInitials,
} from "@/lib/presentation";
import { getSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const monthKey = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-US", { month: "short" }).toUpperCase() : "";

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
  return `${formatDate(from)} - ${formatDate(to)}`;
};

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const supabase = await getSupabaseClient();
  const todayDate = getTodayDate();
  const selectedRange = typeof params.range === "string" ? params.range : "month";
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
  ] = await Promise.all([
    supabase
      .from("sales")
      .select("customer_name, sales_date, grand_total, payment_status")
      .order("sales_date", { ascending: true }),
    supabase
      .from("purchases")
      .select("purchase_date, total_amount, credit_amount")
      .order("purchase_date", { ascending: true }),
    supabase.from("staff_profiles").select("total_salary, advance_salary"),
    supabase.from("purchase_expenses").select("expense_date, amount"),
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
  const staff = staffResponse.data ?? [];
  const purchaseExpenses = expensesResponse.data ?? [];
  const salesItems = salesItemsResponse.data ?? [];
  const purchaseItems = purchaseItemsResponse.data ?? [];
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
        lastTransaction: formatDate(value.lastTransaction),
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
      lastSold: formatDate(value.lastSold),
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
      lastBought: formatDate(value.lastBought),
    }));
  const selectedPeriodLabel = formatReportPeriod(selectedRange, fromDate, toDate);
  const generatedReportDate = formatDate(todayDate);

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <Header />

        <ReportToolbar
          actionPath="/"
          selectedRange={selectedRange}
          fromDate={fromDate}
          toDate={toDate}
          reportButton={
            <DashboardReportPrintButton
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

        <section className="mb-10 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-50 px-6 py-5">
            <h3 className="text-lg font-bold text-slate-900">Quick Links</h3>
            <p className="mt-1 text-xs text-slate-500">
              Jump straight into the most common bookkeeping entries.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
            <Link
              href="/sales/create"
              className="group rounded-2xl border border-blue-100 bg-blue-50/70 p-5 transition-all hover:border-blue-200 hover:bg-blue-50"
            >
              <div className="mb-4 inline-flex rounded-xl bg-white p-3 text-blue-600 shadow-sm">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-slate-900">Add Sales</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    Create a new sales invoice and record customer payment.
                  </p>
                </div>
                <ArrowRight className="mt-1 h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-600" />
              </div>
            </Link>

            <Link
              href="/purchases/create"
              className="group rounded-2xl border border-amber-100 bg-amber-50/70 p-5 transition-all hover:border-amber-200 hover:bg-amber-50"
            >
              <div className="mb-4 inline-flex rounded-xl bg-white p-3 text-amber-600 shadow-sm">
                <ReceiptText className="h-5 w-5" />
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-slate-900">Add Purchase</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    Create a purchase bill and record vendor payment updates.
                  </p>
                </div>
                <ArrowRight className="mt-1 h-5 w-5 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-amber-600" />
              </div>
            </Link>
          </div>
        </section>

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
