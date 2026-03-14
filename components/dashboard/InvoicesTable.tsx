import Link from "next/link";
import { deleteSale } from "@/app/actions";
import { ConfirmActionForm } from "@/components/shared/ConfirmActionForm";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Pencil,
  RefreshCcw,
  Trash2,
} from "lucide-react";

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

const statusStyles: Record<string, string> = {
  PAID: "bg-green-50 text-green-700 border-green-100",
  PENDING: "bg-amber-50 text-amber-700 border-amber-100",
  PARTIAL: "bg-blue-50 text-blue-700 border-blue-100",
  OVERDUE: "bg-red-50 text-red-700 border-red-100",
};

function StatusBadge({ status }: { status: string }) {
  const icon =
    status === "PAID" ? (
      <CheckCircle2 className="h-3 w-3" />
    ) : status === "OVERDUE" ? (
      <AlertTriangle className="h-3 w-3" />
    ) : (
      <Clock className="h-3 w-3" />
    );

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold tracking-wider",
        statusStyles[status] ?? "bg-slate-50 text-slate-600 border-slate-100",
      )}
    >
      {icon}
      {status}
    </span>
  );
}

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
        <form action="/sales" className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.7fr)_220px_220px_220px]">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Search
              </label>
              <input
                type="text"
                name="q"
                defaultValue={search}
                placeholder="Invoice no or customer name"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Status
              </label>
              <select
                name="status"
                defaultValue={status}
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
                name="sort"
                defaultValue={sort}
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
              href="/sales"
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700"
            >
              Reset
            </Link>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <th className="px-6 py-4">Invoice ID</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Total Amount</th>
              <th className="px-6 py-4">Paid Amount</th>
              <th className="px-6 py-4">Remaining Amount</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {invoices.map((invoice) => (
              <tr key={invoice.id} className="group transition-colors hover:bg-slate-50/50">
                <td className="px-6 py-4 text-sm font-bold text-slate-900">
                  {invoice.invoiceNumber}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
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
                      href={`/sales/create?edit=${invoice.id}`}
                      className="text-sm font-semibold text-slate-900 group-hover:text-blue-600"
                    >
                      {invoice.customer}
                    </Link>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-slate-900">
                  {invoice.totalAmount}
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-green-700">
                  {invoice.paidAmount}
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-amber-700">
                  {invoice.remainingAmount}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={invoice.status} />
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{invoice.date}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/sales/create?edit=${invoice.id}`}
                      className="rounded-lg p-2 text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-600"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/sales/create?edit=${invoice.id}`}
                      className="rounded-lg p-2 text-slate-400 transition-all hover:bg-amber-50 hover:text-amber-600"
                      title="Update"
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
                        className="rounded-lg p-2 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600"
                        title="Delete"
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
                <td colSpan={8} className="px-6 py-10 text-center text-sm text-slate-500">
                  No sales invoices yet. Create your first sales record manually.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
