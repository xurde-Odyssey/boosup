import Link from "next/link";
import {
  BadgeDollarSign,
  FileText,
  HandCoins,
  History,
  Package,
  ReceiptText,
  ShoppingCart,
  Truck,
  Users,
} from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageActionStrip } from "@/components/shared/PageActionStrip";
import { SectionCard } from "@/components/shared/SectionCard";
import { formatBsDisplayDate } from "@/lib/nepali-date";
import { formatCurrency } from "@/lib/presentation";
import { getSupabaseClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const moduleConfig = {
  sales: { label: "Sales", icon: ReceiptText, tone: "bg-emerald-50 text-emerald-700" },
  purchases: { label: "Purchases", icon: ShoppingCart, tone: "bg-blue-50 text-blue-700" },
  suppliers: { label: "Suppliers", icon: Truck, tone: "bg-amber-50 text-amber-700" },
  customers: { label: "Customers", icon: Users, tone: "bg-green-50 text-green-700" },
  staff: { label: "Staff", icon: BadgeDollarSign, tone: "bg-slate-100 text-slate-700" },
  products: { label: "Products", icon: Package, tone: "bg-cyan-50 text-cyan-700" },
  expenses: { label: "Expenses", icon: HandCoins, tone: "bg-orange-50 text-orange-700" },
};

const moduleOptions = Object.entries(moduleConfig);

const parsePage = (value: string | string[] | undefined) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const parsePerPage = (value: string | string[] | undefined) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);
  return [10, 25, 50].includes(parsed) ? parsed : 10;
};

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const selectedModule = typeof params.module === "string" ? params.module : "all";
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const action = typeof params.action === "string" ? params.action : "ALL";
  const sort = typeof params.sort === "string" ? params.sort : "created_desc";
  const currentPage = parsePage(params.page);
  const perPage = parsePerPage(params.perPage);
  const supabase = await getSupabaseClient();
  let query = supabase
    .from("activity_logs")
    .select("id, module, action, title, description, amount, entity_type, entity_id, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (selectedModule !== "all") {
    query = query.eq("module", selectedModule);
  }

  const { data: activities = [] } = await query;
  const allRows = activities ?? [];
  const searchedRows = search
    ? allRows.filter((activity) => {
        const haystack = `${activity.title} ${activity.description ?? ""} ${activity.module} ${activity.action}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
    : allRows;
  const actionRows =
    action === "ALL" ? searchedRows : searchedRows.filter((activity) => activity.action === action);
  const rows = [...actionRows].sort((left, right) => {
    if (sort === "created_asc") {
      return (left.created_at ?? "").localeCompare(right.created_at ?? "");
    }

    if (sort === "module_asc") {
      return left.module.localeCompare(right.module);
    }

    if (sort === "action_asc") {
      return left.action.localeCompare(right.action);
    }

    if (sort === "amount_desc") {
      return Number(right.amount ?? 0) - Number(left.amount ?? 0);
    }

    return (right.created_at ?? "").localeCompare(left.created_at ?? "");
  });
  const totalPages = Math.max(Math.ceil(rows.length / perPage), 1);
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRows = rows.slice((safeCurrentPage - 1) * perPage, safeCurrentPage * perPage);

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
        <Header
          title="Activity Log"
          description="A simple record of recent business actions across sales, purchases, payments, products, customers, suppliers, and staff."
        />
        <PageActionStrip
          actions={[
            { label: "Back To Dashboard", href: "/", variant: "secondary", icon: History },
          ]}
        />

        <div className="mb-6 flex flex-wrap gap-2">
          <Link
            href="/activity"
            className={cn(
              "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
              selectedModule === "all"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            All
          </Link>
          {moduleOptions.map(([value, config]) => (
            <Link
              key={value}
              href={`/activity?module=${value}`}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                selectedModule === value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              {config.label}
            </Link>
          ))}
        </div>

        <div className="mb-6 border-b border-slate-50">
          <form action="/activity" className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            {selectedModule !== "all" ? <input type="hidden" name="module" value={selectedModule} /> : null}
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.7fr)_220px_220px_220px]">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Search
                </label>
                <input
                  type="text"
                  name="q"
                  defaultValue={search}
                  placeholder="Title, description, module, action"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Status
                </label>
                <select
                  name="action"
                  defaultValue={action}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                >
                  <option value="ALL">All</option>
                  <option value="created">Created</option>
                  <option value="updated">Updated</option>
                  <option value="deleted">Deleted</option>
                  <option value="payment">Payment</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Sort
                </label>
                <select
                  name="sort"
                  defaultValue={sort}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                >
                  <option value="created_desc">Newest</option>
                  <option value="created_asc">Oldest</option>
                  <option value="module_asc">Module</option>
                  <option value="action_asc">Action</option>
                  <option value="amount_desc">Amount High-Low</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Per Page
                </label>
                <select
                  name="perPage"
                  defaultValue={String(perPage)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                >
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </select>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                type="submit"
                className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white"
              >
                Apply
              </button>
              <Link
                href={selectedModule === "all" ? "/activity" : `/activity?module=${selectedModule}`}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Reset
              </Link>
            </div>
          </form>
        </div>

        <SectionCard className="overflow-hidden" padded={false}>
          <div className="border-b border-slate-50 p-6">
            <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
            <p className="mt-1 text-xs text-slate-500">
              Showing {paginatedRows.length} of {rows.length} {selectedModule === "all" ? "entries" : `${selectedModule} entries`}.
            </p>
          </div>

          {rows.length === 0 ? (
            <div className="p-10">
              <EmptyState
                icon={FileText}
                title="No activity yet"
                description="New actions will appear here after records are created, updated, deleted, or payments are added."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-4">Activity</th>
                    <th className="px-6 py-4">Module</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paginatedRows.map((activity) => {
                    const config =
                      moduleConfig[activity.module as keyof typeof moduleConfig] ??
                      { label: activity.module, icon: History, tone: "bg-slate-100 text-slate-700" };
                    const Icon = config.icon;
                    const date = activity.created_at ? activity.created_at.slice(0, 10) : null;

                    return (
                      <tr key={activity.id} className="transition-colors hover:bg-blue-50/40">
                        <td className="px-6 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className={cn("rounded-xl p-2.5", config.tone)}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-900">
                                {activity.title}
                              </div>
                              <div className="text-xs text-slate-500">
                                {activity.description || "-"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                          {config.label}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {activity.action}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">
                          {activity.amount === null || activity.amount === undefined
                            ? "-"
                            : formatCurrency(activity.amount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatBsDisplayDate(date)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
        {rows.length > perPage ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="font-medium text-slate-500">
              Page {safeCurrentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Link
                href={`/activity?${new URLSearchParams({
                  ...(selectedModule !== "all" ? { module: selectedModule } : {}),
                  ...(search ? { q: search } : {}),
                  ...(action !== "ALL" ? { action } : {}),
                  sort,
                  perPage: String(perPage),
                  page: String(Math.max(safeCurrentPage - 1, 1)),
                }).toString()}`}
                className={cn(
                  "rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700",
                  safeCurrentPage <= 1 && "pointer-events-none opacity-50",
                )}
              >
                Previous
              </Link>
              <Link
                href={`/activity?${new URLSearchParams({
                  ...(selectedModule !== "all" ? { module: selectedModule } : {}),
                  ...(search ? { q: search } : {}),
                  ...(action !== "ALL" ? { action } : {}),
                  sort,
                  perPage: String(perPage),
                  page: String(Math.min(safeCurrentPage + 1, totalPages)),
                }).toString()}`}
                className={cn(
                  "rounded-xl border border-slate-200 bg-white px-4 py-2 font-semibold text-slate-700",
                  safeCurrentPage >= totalPages && "pointer-events-none opacity-50",
                )}
              >
                Next
              </Link>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
