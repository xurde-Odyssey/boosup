import { ArrowLeft, FilePlus2 } from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { InvoicesTable } from "@/components/dashboard/InvoicesTable";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { PageActionStrip } from "@/components/shared/PageActionStrip";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { QueryNoticeToast } from "@/components/shared/QueryNoticeToast";
import { ReportToolbar } from "@/components/shared/ReportToolbar";
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

export default async function RecentSalesInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const locale = await getServerLocale(params.lang);
  const notice = typeof params.notice === "string" ? params.notice : "";
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const sort = typeof params.sort === "string" ? params.sort : "date_desc";
  const status = typeof params.status === "string" ? params.status : "ALL";
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

  const supabase = await getSupabaseClient();
  const { data: allSales = [] } = await supabase
    .from("sales")
    .select(
      "id, invoice_number, customer_id, customer_name, sales_date, payment_status, grand_total, amount_received, remaining_amount, customers(name)",
    )
    .order("created_at", { ascending: false });

  const allSalesRows = allSales ?? [];
  const rangedSales = allSalesRows.filter((sale) => isWithinRange(sale.sales_date, fromDate, toDate));
  const searchedSales = search
    ? rangedSales.filter((sale) => {
        const haystack = `${sale.invoice_number} ${sale.customer_name}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
    : rangedSales;
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
  const paginatedSales = sales.slice((safeCurrentPage - 1) * perPage, safeCurrentPage * perPage);

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

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
        <Header
          title="Recent Sales Invoices"
          description="Dedicated view of your saved sales invoices with filters, search, and pagination."
        />
        <QueryNoticeToast message={notice} />
        <ReportToolbar
          actionPath="/sales/view"
          selectedRange={selectedRange}
          fromDate={fromDate}
          toDate={toDate}
          locale={locale}
        />
        <PageActionStrip
          actions={[
            { label: "Create Sales", href: "/sales/create", icon: FilePlus2 },
            {
              label: "Back To Sales Overview",
              href: "/sales",
              variant: "secondary",
              icon: ArrowLeft,
            },
          ]}
        />

        <InvoicesTable
          invoices={invoices}
          search={search}
          sort={sort}
          status={status}
          perPage={perPage}
          locale={locale}
        />
        <PaginationControls
          basePath="/sales/view"
          pageParam="page"
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          totalItems={sales.length}
          pageSize={perPage}
          searchParams={params}
        />
      </main>
    </div>
  );
}
