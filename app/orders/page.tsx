import Link from "next/link";
import {
  ClipboardList,
  FilePlus2,
  NotebookText,
  PackageCheck,
  Pencil,
  PhoneCall,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { deleteOrder } from "@/app/actions";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { ConfirmActionForm } from "@/components/shared/ConfirmActionForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/shared/Input";
import { PageActionStrip } from "@/components/shared/PageActionStrip";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { QueryNoticeToast } from "@/components/shared/QueryNoticeToast";
import { SectionCard } from "@/components/shared/SectionCard";
import { Select } from "@/components/shared/Select";
import { LocalizedStatusBadge } from "@/components/shared/StatusBadge";
import { getMessages } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { formatBsDisplayDate } from "@/lib/nepali-date";
import { getSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const DEFAULT_PER_PAGE = 10;

const parsePage = (value: string | string[] | undefined) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const getStatusTone = (status: string) => {
  if (status === "DELIVERED" || status === "CONVERTED") {
    return "success";
  }

  if (status === "PREPARING") {
    return "info";
  }

  if (status === "CANCELLED") {
    return "danger";
  }

  return "warning";
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const locale = await getServerLocale(params.lang);
  const messages = getMessages(locale);
  const ordersMessages = messages.ordersPage;
  const notice = typeof params.notice === "string" ? params.notice : "";
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const status = typeof params.status === "string" ? params.status : "ALL";
  const sort = typeof params.sort === "string" ? params.sort : "date_desc";
  const currentPage = parsePage(params.page);
  const perPage = (() => {
    const rawValue =
      typeof params.perPage === "string" ? Number(params.perPage) : DEFAULT_PER_PAGE;
    return [10, 25, 50].includes(rawValue) ? rawValue : DEFAULT_PER_PAGE;
  })();
  const supabase = await getSupabaseClient();

  const { data: orders = [] } = await supabase
    .from("orders")
    .select(
      "id, customer_name, customer_phone, items_summary, order_date, status, notes, created_at, order_items(id, product_name, quantity, unit_snapshot, rate_snapshot)",
    )
    .order("order_date", { ascending: false })
    .order("created_at", { ascending: false });

  const orderRows = orders ?? [];
  const searchedOrders = search
    ? orderRows.filter((order) => {
        const haystack = [
          order.customer_name,
          order.customer_phone,
          order.items_summary,
          Array.isArray(order.order_items)
            ? order.order_items.map((item) => item.product_name).join(" ")
            : "",
          order.notes,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(search.toLowerCase());
      })
    : orderRows;
  const filteredOrders =
    status === "ALL" ? searchedOrders : searchedOrders.filter((order) => order.status === status);
  const sortedOrders = [...filteredOrders].sort((left, right) => {
    if (sort === "name_asc") {
      return left.customer_name.localeCompare(right.customer_name);
    }

    if (sort === "status_asc") {
      return left.status.localeCompare(right.status);
    }

    return (right.order_date ?? "").localeCompare(left.order_date ?? "");
  });
  const totalPages = Math.max(Math.ceil(sortedOrders.length / perPage), 1);
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedOrders = sortedOrders.slice(
    (safeCurrentPage - 1) * perPage,
    safeCurrentPage * perPage,
  );

  const newCount = orderRows.filter((order) => order.status === "NEW").length;
  const preparingCount = orderRows.filter((order) => order.status === "PREPARING").length;
  const deliveredCount = orderRows.filter((order) => order.status === "DELIVERED").length;

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
        <Header title={ordersMessages.title} description={ordersMessages.subtitle} />
        <QueryNoticeToast message={notice} />
        <PageActionStrip
          locale={locale}
          actions={[
            {
              label: ordersMessages.createOrder,
              href: "/orders/create",
              icon: FilePlus2,
            },
            {
              label: ordersMessages.createSalesBill,
              href: "/sales/create",
              variant: "secondary",
              icon: ReceiptText,
            },
          ]}
        />

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title={ordersMessages.summaryCards.totalOrders}
            value={`${orderRows.length}`}
            trend={ordersMessages.summaryCards.totalOrdersHint}
            trendType="neutral"
            icon={ClipboardList}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <SummaryCard
            title={ordersMessages.summaryCards.newOrders}
            value={`${newCount}`}
            trend={ordersMessages.summaryCards.newOrdersHint}
            trendType="positive"
            icon={PhoneCall}
            iconBgColor="bg-emerald-50"
            iconColor="text-emerald-600"
          />
          <SummaryCard
            title={ordersMessages.summaryCards.preparing}
            value={`${preparingCount}`}
            trend={ordersMessages.summaryCards.preparingHint}
            trendType="neutral"
            icon={PackageCheck}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-600"
          />
          <SummaryCard
            title={ordersMessages.summaryCards.delivered}
            value={`${deliveredCount}`}
            trend={ordersMessages.summaryCards.deliveredHint}
            trendType="positive"
            icon={NotebookText}
            iconBgColor="bg-cyan-50"
            iconColor="text-cyan-600"
          />
        </div>

        <SectionCard>
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">{ordersMessages.listTitle}</h3>
            <p className="mt-1 text-sm text-slate-500">{ordersMessages.listDescription}</p>
          </div>

          <form action="/orders" className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.7fr)_220px_220px_220px]">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  {ordersMessages.filters.search}
                </label>
                <Input
                  type="text"
                  name="q"
                  defaultValue={search}
                  placeholder={ordersMessages.filters.searchPlaceholder}
                  className="bg-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  {ordersMessages.filters.status}
                </label>
                <Select name="status" defaultValue={status} className="bg-white">
                  <option value="ALL">{ordersMessages.filters.all}</option>
                  <option value="NEW">{messages.status.NEW}</option>
                  <option value="PREPARING">{messages.status.PREPARING}</option>
                  <option value="DELIVERED">{messages.status.DELIVERED}</option>
                  <option value="CANCELLED">{messages.status.CANCELLED}</option>
                  <option value="CONVERTED">{messages.status.CONVERTED}</option>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  {ordersMessages.filters.sort}
                </label>
                <Select name="sort" defaultValue={sort} className="bg-white">
                  <option value="date_desc">{ordersMessages.filters.latest}</option>
                  <option value="name_asc">{ordersMessages.filters.name}</option>
                  <option value="status_asc">{ordersMessages.filters.statusLabel}</option>
                </Select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  {ordersMessages.filters.perPage}
                </label>
                <Select name="perPage" defaultValue={String(perPage)} className="bg-white">
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </Select>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button className="inline-flex items-center justify-center rounded-xl border border-slate-900 bg-slate-900 px-5 py-3 text-sm font-semibold text-white">
                {ordersMessages.filters.apply}
              </button>
              <Link
                href="/orders"
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
              >
                {ordersMessages.filters.reset}
              </Link>
            </div>
          </form>

          {paginatedOrders.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title={ordersMessages.emptyTitle}
              description={ordersMessages.emptyDescription}
              actionLabel={ordersMessages.createOrder}
              actionHref="/orders/create"
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-bold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">{ordersMessages.table.customer}</th>
                      <th className="px-4 py-3">{ordersMessages.table.items}</th>
                      <th className="px-4 py-3">{ordersMessages.table.date}</th>
                      <th className="px-4 py-3">{ordersMessages.table.status}</th>
                      <th className="px-4 py-3">{ordersMessages.table.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white text-sm">
                    {paginatedOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-4 py-4 align-top">
                          <div className="font-semibold text-slate-900">{order.customer_name}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {order.customer_phone || ordersMessages.table.noPhone}
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="max-w-md text-sm leading-6 text-slate-700">
                            {(order.order_items ?? [])
                              .map((item) => item.product_name)
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                          {order.notes ? (
                            <div className="mt-2 text-xs text-slate-500">{order.notes}</div>
                          ) : null}
                        </td>
                        <td className="px-4 py-4 align-top text-slate-600">
                          {formatBsDisplayDate(order.order_date)}
                        </td>
                        <td className="px-4 py-4 align-top">
                          <LocalizedStatusBadge
                            status={order.status}
                            locale={locale}
                            tone={getStatusTone(order.status)}
                          />
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/orders/create?edit=${order.id}`}
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              {ordersMessages.table.edit}
                            </Link>
                            <ConfirmActionForm
                              action={deleteOrder}
                              confirmMessage={ordersMessages.deleteConfirm}
                              hiddenFields={[
                                { name: "id", value: order.id },
                                { name: "customer_name", value: order.customer_name },
                              ]}
                              confirmLabel={ordersMessages.table.delete}
                            >
                              <button className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">
                                <Trash2 className="h-3.5 w-3.5" />
                                {ordersMessages.table.delete}
                              </button>
                            </ConfirmActionForm>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                basePath="/orders"
                pageParam="page"
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                totalItems={sortedOrders.length}
                pageSize={perPage}
                searchParams={params}
              />
            </div>
          )}
        </SectionCard>
      </main>
    </div>
  );
}
