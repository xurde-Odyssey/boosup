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
import { TopSalesItemsTable } from "@/components/dashboard/TopSalesItemsTable";
import {
  formatCurrency,
  formatDate,
  getAvatarTone,
  getInitials,
} from "@/lib/presentation";
import { getSupabaseClient } from "@/lib/supabase/server";

const monthKey = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-US", { month: "short" }).toUpperCase() : "";

export default async function Home() {
  const supabase = getSupabaseClient();
  const [
    salesResponse,
    purchasesResponse,
    staffResponse,
    expensesResponse,
    salesItemsResponse,
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
    supabase.from("purchase_expenses").select("amount"),
    supabase
      .from("sales_items")
      .select("product_name, quantity, amount, sales(sales_date)")
      .order("created_at", { ascending: false }),
  ]);

  const sales = salesResponse.data ?? [];
  const purchases = purchasesResponse.data ?? [];
  const staff = staffResponse.data ?? [];
  const purchaseExpenses = expensesResponse.data ?? [];
  const salesItems = salesItemsResponse.data ?? [];

  const totalSales = sales.reduce((sum, sale) => sum + Number(sale.grand_total ?? 0), 0);
  const totalPurchases = purchases.reduce(
    (sum, purchase) => sum + Number(purchase.total_amount ?? 0),
    0,
  );
  const payables = purchases.reduce(
    (sum, purchase) => sum + Number(purchase.credit_amount ?? 0),
    0,
  );
  const netProfit = totalSales - totalPurchases;

  const monthlyMap = new Map<string, { sales: number; purchases: number }>();
  sales.forEach((sale) => {
    const key = monthKey(sale.sales_date);
    if (!key) return;
    const existing = monthlyMap.get(key) ?? { sales: 0, purchases: 0 };
    existing.sales += Number(sale.grand_total ?? 0);
    monthlyMap.set(key, existing);
  });
  purchases.forEach((purchase) => {
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
  const miscExpenses = purchaseExpenses.reduce(
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
  sales.forEach((sale) => {
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
  salesItems.forEach((item) => {
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

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <Header />

        <section className="mb-8 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-50 p-6">
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

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total Sales"
            value={formatCurrency(totalSales)}
            trend={`${sales.length} sales recorded`}
            trendType="positive"
            icon={TrendingUp}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
          />
          <SummaryCard
            title="Total Purchases"
            value={formatCurrency(totalPurchases)}
            trend={`${purchases.length} purchases recorded`}
            trendType="neutral"
            icon={ShoppingCart}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <SummaryCard
            title="Net Profit"
            value={formatCurrency(netProfit)}
            trend="Sales minus purchases"
            trendType={netProfit >= 0 ? "positive" : "negative"}
            icon={CircleDollarSign}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
          />
          <SummaryCard
            title="Outstanding Payables"
            value={formatCurrency(payables)}
            trend="Open purchase credit"
            trendType={payables > 0 ? "negative" : "neutral"}
            icon={AlertCircle}
            iconBgColor="bg-red-50"
            iconColor="text-red-500"
          />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SalesPurchasesChart data={chartData} />
          </div>
          <div>
            <ExpenseBreakdownChart
              data={expenseData}
              total={formatCurrency(expenseTotal)}
            />
          </div>
        </div>

        <div className="mb-8">
          <TopCustomersTable customers={customers} />
        </div>

        <div>
          <TopSalesItemsTable items={topSalesItems} />
        </div>
      </main>
    </div>
  );
}
