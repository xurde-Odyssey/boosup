import {
  AlertCircle,
  CircleDollarSign,
  Clock,
  FilePlus,
  HandCoins,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { InvoicesTable } from "@/components/dashboard/InvoicesTable";
import { SalesReportPrintButton } from "@/components/dashboard/SalesReportPrintButton";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { SalesTrendChart } from "@/components/dashboard/SalesTrendChart";
import { TopSalesItemsTable } from "@/components/dashboard/TopSalesItemsTable";
import { PageActionStrip } from "@/components/shared/PageActionStrip";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { QueryNoticeToast } from "@/components/shared/QueryNoticeToast";
import { ReportToolbar } from "@/components/shared/ReportToolbar";
import { getCompanySettings } from "@/lib/company-settings-server";
import { getMessages } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { formatBsDisplayDate } from "@/lib/nepali-date";
import { formatCurrency, getAvatarTone, getInitials } from "@/lib/presentation";
import { getSupabaseClient } from "@/lib/supabase/server";

const parsePage = (value: string | string[] | undefined) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const PAGE_SIZE = 10;
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

const formatReportPeriod = (range: string, from: string, to: string) => {
  if (range === "week") return "This Week";
  if (range === "month") return "This Month";
  if (range === "year") return "This Year";
  return `${formatBsDisplayDate(from)} - ${formatBsDisplayDate(to)}`;
};

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const locale = await getServerLocale(params.lang);
  const messages = getMessages(locale);
  const notice = typeof params.notice === "string" ? params.notice : "";
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const sort = typeof params.sort === "string" ? params.sort : "date_desc";
  const status = typeof params.status === "string" ? params.status : "ALL";
  const collection = typeof params.collection === "string" ? params.collection : "";
  const selectedRange = typeof params.range === "string" ? params.range : "year";
  const todayDate = getTodayDate();
  const defaultRange = getDateRange(selectedRange, todayDate);
  const fromDate = typeof params.from === "string" && params.from ? params.from : defaultRange.from;
  const toDate = typeof params.to === "string" && params.to ? params.to : defaultRange.to;
  const currentPage = parsePage(params.page);
  const perPage = (() => {
    const rawValue = typeof params.perPage === "string" ? Number(params.perPage) : PAGE_SIZE;
    return [10, 25, 50].includes(rawValue) ? rawValue : PAGE_SIZE;
  })();
  const company = await getCompanySettings();
  const supabase = await getSupabaseClient();
  const [{ data: allSales = [] }, { data: allSalesItems = [] }] = await Promise.all([
    supabase
      .from("sales")
      .select(
        "id, invoice_number, customer_id, customer_name, sales_date, payment_status, grand_total, amount_received, remaining_amount, customers(name)",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("sales_items")
      .select("sale_id, product_name, quantity, amount"),
  ]);

  const allSalesRows = allSales ?? [];
  const allSalesItemRows = allSalesItems ?? [];
  const rangedSales = allSalesRows.filter((sale) => isWithinRange(sale.sales_date, fromDate, toDate));
  const searchedSales = search
    ? rangedSales.filter((sale) => {
        const haystack = `${sale.invoice_number} ${sale.customer_name}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
    : rangedSales;
  const statusFilteredSales =
    status === "ALL"
      ? searchedSales
      : searchedSales.filter((sale) => sale.payment_status === status);
  const filteredSales =
    collection === "pending"
      ? statusFilteredSales.filter((sale) => Number(sale.remaining_amount ?? 0) > 0)
      : statusFilteredSales;

  const sales = [...filteredSales].sort((left, right) => {
    if (sort === "name_asc") {
      return left.customer_name.localeCompare(right.customer_name);
    }

    if (sort === "amount_desc") {
      return Number(right.grand_total ?? 0) - Number(left.grand_total ?? 0);
    }

    if (sort === "amount_asc") {
      return Number(left.grand_total ?? 0) - Number(right.grand_total ?? 0);
    }

    if (sort === "status_asc") {
      return left.payment_status.localeCompare(right.payment_status);
    }

    return (right.sales_date ?? "").localeCompare(left.sales_date ?? "");
  });
  const totalPages = Math.max(Math.ceil(sales.length / perPage), 1);
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedSales = sales.slice(
    (safeCurrentPage - 1) * perPage,
    safeCurrentPage * perPage,
  );

  const totalInvoiced = sales.reduce((sum, sale) => sum + Number(sale.grand_total ?? 0), 0);
  const totalPaid = sales
    .filter((sale) => sale.payment_status === "PAID")
    .reduce((sum, sale) => sum + Number(sale.grand_total ?? 0), 0);
  const totalPartialReceived = sales
    .filter((sale) => sale.payment_status === "PARTIAL")
    .reduce((sum, sale) => sum + Number(sale.amount_received ?? 0), 0);
  const totalPending = sales
    .filter((sale) => sale.payment_status === "PENDING" || sale.payment_status === "PARTIAL")
    .reduce((sum, sale) => sum + Number(sale.remaining_amount ?? 0), 0);
  const totalOverdue = sales
    .filter((sale) => sale.payment_status === "OVERDUE")
    .reduce((sum, sale) => sum + Number(sale.remaining_amount ?? 0), 0);

  const invoices = paginatedSales.map((sale, index) => {
    const tone = getAvatarTone(index);
    const linkedCustomer = Array.isArray(sale.customers) ? sale.customers[0] : sale.customers;
    const customerName = linkedCustomer?.name ?? sale.customer_name;

    return {
      id: sale.id,
      invoiceNumber: sale.invoice_number,
      customerId: sale.customer_id,
      customer: customerName,
      totalAmount: formatCurrency(sale.grand_total),
      paidAmount: formatCurrency(sale.amount_received ?? 0),
      remainingAmount: formatCurrency(sale.remaining_amount ?? 0),
      date: formatBsDisplayDate(sale.sales_date),
      status: sale.payment_status,
      initials: getInitials(customerName),
      initialsBg: tone.bg,
      initialsColor: tone.text,
    };
  });
  const reportInvoices = sales.slice(0, 10).map((sale) => ({
    invoiceNumber: sale.invoice_number,
    customer: sale.customer_name,
    totalAmount: formatCurrency(sale.grand_total),
    paidAmount: formatCurrency(sale.amount_received ?? 0),
    remainingAmount: formatCurrency(sale.remaining_amount ?? 0),
    status: sale.payment_status,
    date: formatBsDisplayDate(sale.sales_date),
  }));
  const filteredSaleIds = new Set(sales.map((sale) => sale.id));
  const filteredSalesItems = allSalesItemRows.filter((item) => filteredSaleIds.has(item.sale_id));
  const topSalesItemMap = new Map<
    string,
    { quantity: number; amount: number; invoiceCount: number; lastSold: string | null }
  >();
  filteredSalesItems.forEach((item) => {
    const itemName = item.product_name?.trim();
    if (!itemName) return;

    const parentSale = sales.find((sale) => sale.id === item.sale_id);
    const existing = topSalesItemMap.get(itemName) ?? {
      quantity: 0,
      amount: 0,
      invoiceCount: 0,
      lastSold: null,
    };

    existing.quantity += Number(item.quantity ?? 0);
    existing.amount += Number(item.amount ?? 0);
    existing.invoiceCount += 1;
    if (parentSale?.sales_date) {
      existing.lastSold =
        existing.lastSold && existing.lastSold > parentSale.sales_date
          ? existing.lastSold
          : parentSale.sales_date;
    }

    topSalesItemMap.set(itemName, existing);
  });
  const topSalesItems = Array.from(topSalesItemMap.entries())
    .sort((left, right) => right[1].amount - left[1].amount)
    .slice(0, 5)
    .map(([name, value]) => ({
      name,
      quantitySold: `${value.quantity}`,
      salesAmount: formatCurrency(value.amount),
      invoiceCount: value.invoiceCount,
      lastSold: formatBsDisplayDate(value.lastSold),
    }));
  const salesTrendMap = new Map<string, number>();
  sales.forEach((sale) => {
    const saleDate = sale.sales_date;
    if (!saleDate) return;
    salesTrendMap.set(saleDate, (salesTrendMap.get(saleDate) ?? 0) + Number(sale.grand_total ?? 0));
  });
  const salesTrendData = Array.from(salesTrendMap.entries())
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([date, total]) => ({
      name: formatBsDisplayDate(date),
      sales: total,
    }));

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
        <Header
          title={messages.salesPage.title}
          description={messages.salesPage.subtitle}
        />
        <QueryNoticeToast message={notice} />
        <ReportToolbar
          actionPath="/sales"
          selectedRange={selectedRange}
          fromDate={fromDate}
          toDate={toDate}
          reportButton={
            <SalesReportPrintButton
              company={company}
              generatedDate={formatBsDisplayDate(todayDate)}
              selectedPeriod={formatReportPeriod(selectedRange, fromDate, toDate)}
              metrics={[
                { title: "Total Invoiced", value: formatCurrency(totalInvoiced) },
                { title: "Paid Invoices", value: formatCurrency(totalPaid) },
                { title: "Partial Amount Received", value: formatCurrency(totalPartialReceived) },
                { title: "Pending Payment", value: formatCurrency(totalPending) },
                { title: "Overdue Payment", value: formatCurrency(totalOverdue) },
              ]}
              invoices={reportInvoices}
            />
          }
        />
        <PageActionStrip
          locale={locale}
          actions={[
            { label: messages.salesPage.createSalesBill, href: "/sales/create", icon: FilePlus },
            {
              label: messages.salesPage.recordedBills,
              href: "/sales/view",
              variant: "secondary",
              icon: ReceiptText,
            },
          ]}
        />

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            title="Total Invoiced"
            value={formatCurrency(totalInvoiced)}
            trend={`${sales.length} invoices created`}
            trendType="positive"
            icon={TrendingUp}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <SummaryCard
            title="Paid Invoices"
            value={formatCurrency(totalPaid)}
            trend={`${sales.filter((sale) => sale.payment_status === "PAID").length} paid`}
            trendType="positive"
            icon={CircleDollarSign}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
          />
          <SummaryCard
            title="Partial Amount Received"
            value={formatCurrency(totalPartialReceived)}
            trend={`${sales.filter((sale) => sale.payment_status === "PARTIAL").length} partial`}
            trendType="neutral"
            icon={HandCoins}
            iconBgColor="bg-cyan-50"
            iconColor="text-cyan-600"
          />
          <SummaryCard
            title="Pending Payment"
            value={formatCurrency(totalPending)}
            trend={`${sales.filter((sale) => sale.payment_status === "PENDING" || sale.payment_status === "PARTIAL").length} pending`}
            trendType="neutral"
            icon={Clock}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-600"
          />
          <SummaryCard
            title="Overdue Payment"
            value={formatCurrency(totalOverdue)}
            trend={`${sales.filter((sale) => sale.payment_status === "OVERDUE").length} overdue`}
            trendType="negative"
            icon={AlertCircle}
            iconBgColor="bg-red-50"
            iconColor="text-red-500"
          />
        </div>

        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="min-w-0 xl:col-span-8">
            <SalesTrendChart data={salesTrendData} />
          </div>
          <div className="xl:col-span-4">
            <TopSalesItemsTable items={topSalesItems} />
          </div>
        </div>

        <div>
          <InvoicesTable
            invoices={invoices}
            search={search}
            sort={sort}
            status={status}
            perPage={perPage}
            locale={locale}
          />
          <PaginationControls
            basePath="/sales"
            pageParam="page"
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            totalItems={sales.length}
            pageSize={perPage}
            searchParams={params}
          />
        </div>
      </main>
    </div>
  );
}
