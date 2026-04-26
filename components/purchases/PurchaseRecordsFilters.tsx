"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function PurchaseRecordsFilters({
  search,
  status,
  sort,
  perPage,
}: {
  search: string;
  status: string;
  sort: string;
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
            placeholder="Purchase no or supplier name"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
            Status
          </label>
          <select
            value={status}
            onChange={(event) => updateParams({ status: event.target.value, resetPage: true })}
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
            value={sort}
            onChange={(event) => updateParams({ sort: event.target.value, resetPage: true })}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
          >
            <option value="date_desc">Latest</option>
            <option value="name_asc">Supplier</option>
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
            value={String(perPage)}
            onChange={(event) => updateParams({ perPage: event.target.value, resetPage: true })}
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
  );
}
