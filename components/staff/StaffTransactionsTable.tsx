"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Eye, Pencil, ReceiptText, Trash2 } from "lucide-react";
import { deleteStaffSalaryPayment } from "@/app/actions";
import { ConfirmActionForm } from "@/components/shared/ConfirmActionForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatusBadge } from "@/components/shared/StatusBadge";

type StaffTransactionRow = {
  id: string;
  transactionId: string;
  date: string;
  staffId: string;
  staffName: string;
  staffCode: string;
  salaryMonth: string;
  periodKey: string;
  type: string;
  amount: string;
  note: string;
  ledgerStatus?: string;
};

const getTypeTone = (type: string) => {
  if (type === "ADVANCE") return "warning";
  if (type === "SALARY") return "info";
  if (type === "ADJUSTMENT") return "neutral";
  return "neutral";
};

export function StaffTransactionsTable({
  transactions,
  totalCount,
  search,
  transactionType,
  month,
  sort,
  perPage,
}: {
  transactions: StaffTransactionRow[];
  totalCount: number;
  search: string;
  transactionType: string;
  month: string;
  sort: string;
  perPage: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(search);
  const [typeValue, setTypeValue] = useState(transactionType);
  const [monthValue, setMonthValue] = useState(month);
  const [sortValue, setSortValue] = useState(sort);
  const [perPageValue, setPerPageValue] = useState(String(perPage));

  useEffect(() => {
    setSearchValue(search);
  }, [search]);

  useEffect(() => {
    setTypeValue(transactionType);
  }, [transactionType]);

  useEffect(() => {
    setMonthValue(month);
  }, [month]);

  useEffect(() => {
    setSortValue(sort);
  }, [sort]);

  useEffect(() => {
    setPerPageValue(String(perPage));
  }, [perPage]);

  const monthOptions = useMemo(() => {
    const options = new Map<string, string>();

    transactions.forEach((transaction) => {
      if (!options.has(transaction.periodKey)) {
        options.set(transaction.periodKey, transaction.salaryMonth);
      }
    });

    return Array.from(options.entries()).sort((left, right) => right[0].localeCompare(left[0]));
  }, [transactions]);

  const redirectTo = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const updateParams = useCallback(
    (next: {
      q?: string;
      type?: string;
      month?: string;
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
      if ("type" in next) {
        setOrDelete("type", next.type, "ALL");
      }
      if ("month" in next) {
        setOrDelete("month", next.month, "ALL");
      }
      if ("sort" in next) {
        setOrDelete("sort", next.sort, "latest");
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
          <h3 className="text-lg font-bold text-slate-900">Recorded Salary Transactions</h3>
          <p className="mt-1 text-xs text-slate-500">
            Transaction-level salary history for advances and salary payments.
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
          {totalCount} transaction{totalCount === 1 ? "" : "s"}
        </div>
      </div>

      <div className="border-b border-slate-50 p-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.6fr)_190px_220px_180px_160px]">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Search
              </label>
              <input
                type="text"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder="Staff name or code"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Type
              </label>
              <select
                value={typeValue}
                onChange={(event) => {
                  const value = event.target.value;
                  setTypeValue(value);
                  updateParams({ type: value, resetPage: true });
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
              >
                <option value="ALL">All</option>
                <option value="ADVANCE">Advance</option>
                <option value="SALARY">Salary</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Salary Month
              </label>
              <select
                value={monthValue}
                onChange={(event) => {
                  const value = event.target.value;
                  setMonthValue(value);
                  updateParams({ month: value, resetPage: true });
                }}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
              >
                <option value="ALL">All</option>
                {monthOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
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
                <option value="latest">Latest</option>
                <option value="oldest">Oldest</option>
                <option value="name_asc">Staff Name</option>
                <option value="amount_desc">Amount High-Low</option>
                <option value="amount_asc">Amount Low-High</option>
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

      {transactions.length === 0 ? (
        <div className="p-6">
          <EmptyState
            icon={ReceiptText}
            title="No salary transactions found"
            description="Adjust the filters or record a new salary transaction to see it here."
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">
                  Transaction ID
                </th>
                <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">
                  Date
                </th>
                <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">
                  Staff Name
                </th>
                <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">
                  Staff Code
                </th>
                <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">
                  Salary Month
                </th>
                <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">
                  Type
                </th>
                <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">
                  Amount
                </th>
                <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 backdrop-blur">
                  Note
                </th>
                <th className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50/95 px-6 py-3 text-right backdrop-blur">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transactions.map((transaction, index) => (
                <tr
                  key={transaction.id}
                  className={`group transition-colors hover:bg-blue-50/30 ${
                    index % 2 === 0 ? "bg-white" : "bg-slate-50/20"
                  }`}
                >
                  <td className="px-6 py-3.5 text-sm font-bold text-slate-900">
                    <span title={transaction.id}>{transaction.transactionId}</span>
                  </td>
                  <td className="px-6 py-3.5 text-sm text-slate-600">{transaction.date}</td>
                  <td className="px-6 py-3.5 text-sm font-semibold text-slate-900">
                    {transaction.staffName}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-slate-600">{transaction.staffCode}</td>
                  <td className="px-6 py-3.5 text-sm text-slate-600">{transaction.salaryMonth}</td>
                  <td className="px-6 py-3.5">
                    <StatusBadge label={transaction.type} tone={getTypeTone(transaction.type)} />
                  </td>
                  <td className="px-6 py-3.5 text-sm font-semibold text-slate-900">
                    {transaction.amount}
                  </td>
                  <td className="max-w-[240px] px-6 py-3.5 text-sm text-slate-600">
                    <span className="line-clamp-2">{transaction.note || "-"}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/staff?staff=${transaction.staffId}#staff-transactions`}
                        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </Link>
                      <Link
                        href={`/staff/payment/create?edit=${transaction.id}`}
                        className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-blue-600 transition-colors hover:bg-blue-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Link>
                      <ConfirmActionForm
                        action={deleteStaffSalaryPayment}
                        confirmMessage="Are you sure you want to delete this salary transaction?"
                        className="inline-flex"
                      >
                        <input type="hidden" name="id" value={transaction.id} />
                        <input type="hidden" name="redirect_to" value={redirectTo} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </ConfirmActionForm>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
