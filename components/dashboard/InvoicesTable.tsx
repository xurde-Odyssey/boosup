"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FileText, Pencil, Printer, RefreshCcw, Trash2 } from "lucide-react";
import { deleteSale } from "@/app/actions";
import { Button } from "@/components/shared/Button";
import { ConfirmActionForm } from "@/components/shared/ConfirmActionForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { Input } from "@/components/shared/Input";
import { Select } from "@/components/shared/Select";
import { PaymentStatusBadge } from "@/components/shared/StatusBadge";
import { TableWrapper } from "@/components/shared/TableWrapper";
import { cn } from "@/lib/utils";

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

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const highlightText = (text: string, query: string): ReactNode => {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return text;
  }

  const matcher = new RegExp(`(${escapeRegExp(normalizedQuery)})`, "ig");
  const parts = text.split(matcher);

  if (parts.length === 1) {
    return text;
  }

  return parts.map((part, index) =>
    part.toLowerCase() === normalizedQuery.toLowerCase() ? (
      <span key={`${part}-${index}`} className="rounded bg-blue-100 px-1 text-blue-900">
        {part}
      </span>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
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

      if ("q" in next) setOrDelete("q", next.q);
      if ("status" in next) setOrDelete("status", next.status, "ALL");
      if ("sort" in next) setOrDelete("sort", next.sort, "date_desc");
      if ("perPage" in next) setOrDelete("perPage", next.perPage, "10");
      if (next.resetPage) params.delete("page");

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
    <TableWrapper
      title="Recent Invoices"
      description="Live sales records from Supabase"
      countLabel={`${invoices.length} invoices`}
      filters={
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/40">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.7fr)_220px_220px_220px]">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Search
              </label>
              <Input
                type="text"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Invoice no or customer name"
                className="bg-white"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Status
              </label>
              <Select
                value={status}
                onChange={(event) => {
                  const value = event.target.value;
                  updateParams({ status: value, resetPage: true });
                }}
                className="bg-white"
              >
                <option value="ALL">All</option>
                <option value="PAID">Paid</option>
                <option value="PARTIAL">Partial</option>
                <option value="PENDING">Pending</option>
                <option value="OVERDUE">Overdue</option>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Sort
              </label>
              <Select
                value={sort}
                onChange={(event) => {
                  const value = event.target.value;
                  updateParams({ sort: value, resetPage: true });
                }}
                className="bg-white"
              >
                <option value="date_desc">Latest</option>
                <option value="name_asc">Name</option>
                <option value="amount_desc">Amount High-Low</option>
                <option value="amount_asc">Amount Low-High</option>
                <option value="status_asc">Status</option>
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Per Page
              </label>
              <Select
                value={String(perPage)}
                onChange={(event) => {
                  const value = event.target.value;
                  updateParams({ perPage: value, resetPage: true });
                }}
                className="bg-white"
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
              </Select>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Button href={pathname} variant="secondary">
              Reset
            </Button>
          </div>
        </div>
      }
    >
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
                <td className="px-6 py-4 text-sm font-bold text-slate-900">
                  <Link
                    href={`/sales/create?edit=${invoice.id}`}
                    className="transition-colors hover:text-blue-600"
                    title={`Open sales invoice ${invoice.invoiceNumber}`}
                  >
                    {highlightText(invoice.invoiceNumber, search)}
                  </Link>
                </td>
                <td className="px-6 py-4">
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
                      {highlightText(invoice.customer, search)}
                    </Link>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-slate-900">{invoice.totalAmount}</td>
                <td className="px-6 py-4 text-sm font-bold text-green-700">{invoice.paidAmount}</td>
                <td className="px-6 py-4 text-sm font-bold text-amber-700">{invoice.remainingAmount}</td>
                <td className="px-6 py-4">
                  <PaymentStatusBadge status={invoice.status} />
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{invoice.date}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/sales/create?edit=${invoice.id}`}
                      className="rounded-lg p-1.5 text-slate-300 transition-all hover:bg-blue-50 hover:text-blue-600"
                      title={`Edit sales invoice ${invoice.invoiceNumber}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/sales/create?edit=${invoice.id}&print=1`}
                      className="rounded-lg p-1.5 text-slate-300 transition-all hover:bg-slate-100 hover:text-slate-700"
                      title={`Print sales invoice ${invoice.invoiceNumber}`}
                    >
                      <Printer className="h-4 w-4" />
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
                    title="No sales records found"
                    description="Start by creating a sales invoice or adjust your filters to see records here."
                    actionLabel="Create Sales Invoice"
                    actionHref="/sales/create"
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </TableWrapper>
  );
}
