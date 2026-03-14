import { cn } from "@/lib/utils";

type Customer = {
  name: string;
  category: string;
  revenue: string;
  lastTransaction: string;
  status: string;
  initials: string;
  initialsBg: string;
  initialsColor: string;
};

export function TopCustomersTable({ customers }: { customers: Customer[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-50 p-6">
        <h3 className="text-lg font-bold text-slate-900">Top Customers</h3>
        <div className="text-sm font-semibold text-blue-600">{customers.length} customers</div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <th className="px-6 py-4">Customer Name</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4">Total Revenue</th>
              <th className="px-6 py-4">Last Transaction</th>
              <th className="px-6 py-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {customers.map((customer) => (
              <tr key={customer.name} className="transition-colors hover:bg-slate-50/50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold",
                        customer.initialsBg,
                        customer.initialsColor,
                      )}
                    >
                      {customer.initials}
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{customer.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">{customer.category}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-900">{customer.revenue}</td>
                <td className="px-6 py-4 text-sm text-slate-500">{customer.lastTransaction}</td>
                <td className="px-6 py-4">
                  <span
                    className={cn(
                      "inline-flex rounded-md px-2 py-1 text-[10px] font-bold tracking-wider",
                      customer.status === "ACTIVE"
                        ? "bg-green-50 text-green-700"
                        : "bg-slate-100 text-slate-500",
                    )}
                  >
                    {customer.status}
                  </span>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                  No customer activity yet. This table will fill from real sales data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
