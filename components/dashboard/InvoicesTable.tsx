"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { deleteSale } from "@/app/actions";
import { ConfirmActionForm } from "@/components/shared/ConfirmActionForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { PaymentStatusBadge } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";
import { FileText, Pencil, RefreshCcw, Trash2 } from "lucide-react";

type Invoice = {
  id: string;
  invoiceNumber: string;
  customer: string;
  totalAmount: string;
  paidAmount: string;
  remainingAmount: string;
  date: string;
  status: string;
  initials: string;
  initialsBg: string;
  initialsColor: string;
};

export function InvoicesTable({
  invoices,
  search,
  sort,
  status,
  perPage,
}: {
  invoices: Invoice[];
  search: string;
  sort: string;
  status: string;
  perPage: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(search);
  const [statusValue, setStatusValue] = useState(status);
  const [sortValue, setSortValue] = useState(sort);
  const [perPageValue, setPerPageValue] = useState(String(perPage));

  useEffect(() => {
    setSearchValue(search);
  }, [search]);

  useEffect(() => {
    setStatusValue(status);
  }, [status]);

  useEffect(() => {
    setSortValue(sort);
  }, [sort]);

  useEffect(() => {
    setPerPageValue(String(perPage));
  }, [perPage]);

  const updateParams = useCallback(
    (next: {
      q?: string;
      status?: string;
      sort?: string;
      perPage?: string;
      resetPage?: boolean;
    }) => {
      const params = new URLSearchParams(searchParams.toString());

      const setOrDelete = (key: string, value: string | undefined, fallback?: string) => {
        if (!value || (fallback && value === fallback)) {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      };

      if ("q" in next) {
        setOrDelete("q", next.q);
      }
      if ("status" in next) {
        setOrDelete("status", next.status, "ALL");
      }
      if ("sort" in next) {
        setOrDelete("sort", next.sort, "date_desc");
      }
      if ("perPage" in next) {
        setOrDelete("perPage", next.perPage, "10");
      }
      if (next.resetPage) {
        params.delete("page");
      }

      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchValue !== search) {
        updateParams({ q: searchValue.trim(), resetPage: true });
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [search, searchValue, updateParams]);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-50 p-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Recent Invoices</h3>
          <p className="mt-1 text-xs text-slate-500">Live sales records from Supabase</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
          {invoices.length} invoices
        </div>
      </div>

      <div className="border-b border-slate-50 p-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.7fr)_220px_220px_220px]">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Search
              </label>
              <input
                type="text"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Invoice no or customer name"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Status
              </label>
              <select
                value={statusValue}
                onChange={(event) => {
                  const value = event.target.value;
                  setStatusValue(value);
                  updateParams({ status: value, resetPage: true });
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
              >
                <option value="ALL">All</option>
                <option value="PAID">Paid</option>
                <option value="PARTIAL">Partial</option>
                <option value="PENDING">Pending</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Sort
              </label>
              <select
                value={sortValue}
                onChange={(event) => {
                  const value = event.target.value;
                  setSortValue(value);
                  updateParams({ sort: value, resetPage: true });
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
              >
                <option value="date_desc">Latest</option>
                <option value="name_asc">Name</option>
                <option value="amount_desc">Amount High-Low</option>
                <option value="amount_asc">Amount Low-High</option>
                <option value="status_asc">Status</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Per Page
              </label>
              <select
                value={perPageValue}
                onChange={(event) => {
                  const value = event.target.value;
                  setPerPageValue(value);
                  updateParams({ perPage: value, resetPage: true });
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Link
              href={pathname}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Reset
            </Link>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">Invoice ID</th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">Customer</th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">Total Amount</th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">Paid Amount</th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">Remaining Amount</th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">Status</th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">Date</th>
              <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 text-right backdrop-blur">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {invoices.map((invoice, index) => (
              <tr
                key={invoice.id}
                className={`group transition-colors hover:bg-blue-50/30 ${
                  index % 2 === 0 ? "bg-white" : "bg-slate-50/20"
                }`}
              >
                <td className="px-6 py-3.5 text-sm font-bold text-slate-900">
                  <Link
                    href={`/sales/create?edit=${invoice.id}`}
                    className="transition-colors hover:text-blue-600"
                    title={`Open sales invoice ${invoice.invoiceNumber}`}
                  >
                    {invoice.invoiceNumber}
                  </Link>
                </td>
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold",
                        invoice.initialsBg,
                        invoice.initialsColor,
                      )}
                    >
                      {invoice.initials}
                    </div>
                    <Link
                      href={`/sales/customer/${encodeURIComponent(invoice.customer)}`}
                      className="text-sm font-semibold text-slate-900 transition-colors group-hover:text-blue-600"
                      title={`Open customer ledger for ${invoice.customer}`}
                    >
                      {invoice.customer}
                    </Link>
                  </div>
                </td>
                <td className="px-6 py-3.5 text-sm font-bold text-slate-900">
                  {invoice.totalAmount}
                </td>
                <td className="px-6 py-3.5 text-sm font-bold text-green-700">
                  {invoice.paidAmount}
                </td>
                <td className="px-6 py-3.5 text-sm font-bold text-amber-700">
                  {invoice.remainingAmount}
                </td>
                <td className="px-6 py-3.5">
                  <PaymentStatusBadge status={invoice.status} />
                </td>
                <td className="px-6 py-3.5 text-sm text-slate-500">{invoice.date}</td>
                <td className="px-6 py-3.5">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/sales/create?edit=${invoice.id}`}
                      className="rounded-lg p-1.5 text-slate-300 transition-all hover:bg-blue-50 hover:text-blue-600"
                      title={`Edit sales invoice ${invoice.invoiceNumber}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/sales/create?edit=${invoice.id}`}
                      className="rounded-lg p-1.5 text-slate-300 transition-all hover:bg-amber-50 hover:text-amber-600"
                      title={`Open update view for sales invoice ${invoice.invoiceNumber}`}
                    >
                      <RefreshCcw className="h-4 w-4" />
                    </Link>
                    <ConfirmActionForm
                      action={deleteSale}
                      confirmMessage="Are you sure you want to delete this sales record?"
                      hiddenFields={[
                        { name: "id", value: invoice.id },
                        { name: "redirect_to", value: "/sales" },
                      ]}
                    >
                      <button
                        type="submit"
                        className="rounded-lg p-1.5 text-slate-300 transition-all hover:bg-red-50 hover:text-red-600"
                        title={`Delete sales invoice ${invoice.invoiceNumber}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </ConfirmActionForm>
                  </div>
                </td>
              </tr>
            ))}
            {invoices.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-10">
                  <EmptyState
                    icon={FileText}
                    title="No sales invoices yet"
                    description="Your invoice list will start filling as soon as the first sale is saved."
                    actionLabel="Create Sales"
                    actionHref="/sales/create"
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
