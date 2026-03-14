import { AlertCircle, CircleDollarSign, Clock, HandCoins, TrendingUp } from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { InvoicesTable } from "@/components/dashboard/InvoicesTable";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { ActionNotice } from "@/components/shared/ActionNotice";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { formatCurrency, formatDate, getAvatarTone, getInitials } from "@/lib/presentation";
import { getSupabaseClient } from "@/lib/supabase/server";

const parsePage = (value: string | string[] | undefined) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const PAGE_SIZE = 10;

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const notice = typeof params.notice === "string" ? params.notice : "";
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const sort = typeof params.sort === "string" ? params.sort : "date_desc";
  const status = typeof params.status === "string" ? params.status : "ALL";
  const currentPage = parsePage(params.page);
  const perPage = (() => {
    const rawValue = typeof params.perPage === "string" ? Number(params.perPage) : PAGE_SIZE;
    return [10, 25, 50].includes(rawValue) ? rawValue : PAGE_SIZE;
  })();
  const supabase = getSupabaseClient();
  const { data: allSales = [] } = await supabase
    .from("sales")
    .select(
      "id, invoice_number, customer_name, sales_date, payment_status, grand_total, amount_received, remaining_amount",
    )
    .order("created_at", { ascending: false });

  const searchedSales = search
    ? allSales.filter((sale) => {
        const haystack = `${sale.invoice_number} ${sale.customer_name}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
    : allSales;
  const filteredSales =
    status === "ALL"
      ? searchedSales
      : searchedSales.filter((sale) => sale.payment_status === status);

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
    return {
      id: sale.id,
      invoiceNumber: sale.invoice_number,
      customer: sale.customer_name,
      totalAmount: formatCurrency(sale.grand_total),
      paidAmount: formatCurrency(sale.amount_received ?? 0),
      remainingAmount: formatCurrency(sale.remaining_amount ?? 0),
      date: formatDate(sale.sales_date),
      status: sale.payment_status,
      initials: getInitials(sale.customer_name),
      initialsBg: tone.bg,
      initialsColor: tone.text,
    };
  });

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <Header
          title="Sales Invoices Overview"
          description="Detailed view of all your sales transactions and invoice statuses."
          primaryActionLabel="Create Sales"
          primaryActionHref="/sales/create"
        />
        {notice && <ActionNotice message={notice} />}

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

        <div className="mb-8">
          <InvoicesTable
            invoices={invoices}
            search={search}
            sort={sort}
            status={status}
            perPage={perPage}
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
