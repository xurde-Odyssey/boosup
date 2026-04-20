import Link from "next/link";
import { Eye, Pencil, ReceiptText, Trash2, UserPlus, UsersRound, WalletCards } from "lucide-react";
import { deleteCustomer } from "@/app/actions";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { ActionIconButton } from "@/components/shared/ActionIconButton";
import { ConfirmActionForm } from "@/components/shared/ConfirmActionForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageActionStrip } from "@/components/shared/PageActionStrip";
import { QueryNoticeToast } from "@/components/shared/QueryNoticeToast";
import { SectionCard } from "@/components/shared/SectionCard";
import { LocalizedStatusBadge } from "@/components/shared/StatusBadge";
import { formatBsDisplayDate } from "@/lib/nepali-date";
import { formatCurrency } from "@/lib/presentation";
import { getSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const notice = typeof params.notice === "string" ? params.notice : "";
  const supabase = await getSupabaseClient();

  const [{ data: customers = [] }, { data: linkedSales = [] }] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, phone, email, address, status, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("sales")
      .select("id, customer_id, sales_date, grand_total, amount_received, remaining_amount")
      .not("customer_id", "is", null)
      .order("sales_date", { ascending: false }),
  ]);

  const customerProfiles = customers ?? [];
  const salesRows = linkedSales ?? [];

  const customerRows = customerProfiles.map((customer) => {
    const sales = salesRows.filter((sale) => sale.customer_id === customer.id);
    const totalInvoiced = sales.reduce((sum, sale) => sum + Number(sale.grand_total ?? 0), 0);
    const totalPaid = sales.reduce((sum, sale) => sum + Number(sale.amount_received ?? 0), 0);
    const totalDue = sales.reduce((sum, sale) => sum + Number(sale.remaining_amount ?? 0), 0);
    const lastSaleDate = sales.reduce<string | null>((latest, sale) => {
      if (!sale.sales_date) return latest;
      if (!latest) return sale.sales_date;
      return sale.sales_date > latest ? sale.sales_date : latest;
    }, null);

    return {
      ...customer,
      totalInvoiced,
      totalPaid,
      totalDue,
      invoiceCount: sales.length,
      lastSaleDate,
    };
  });

  const activeCustomers = customerProfiles.filter((customer) => customer.status === "ACTIVE").length;
  const totalInvoiced = customerRows.reduce((sum, customer) => sum + customer.totalInvoiced, 0);
  const totalPaid = customerRows.reduce((sum, customer) => sum + customer.totalPaid, 0);
  const totalDue = customerRows.reduce((sum, customer) => sum + customer.totalDue, 0);

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
        <Header
          title="Customer Profiles"
          description="Track regular customers, linked invoices, paid amounts, and due balances."
        />
        <QueryNoticeToast message={notice} />
        <PageActionStrip
          actions={[
            { label: "Create Customer Profile", href: "/customers/create", icon: UserPlus },
            {
              label: "Create Sales Bill",
              href: "/sales/create",
              variant: "secondary",
              icon: ReceiptText,
            },
          ]}
        />

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Customers"
            value={`${customerProfiles.length}`}
            trend={`${activeCustomers} active`}
            trendType="neutral"
            icon={UsersRound}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <SummaryCard
            title="Linked Invoiced"
            value={formatCurrency(totalInvoiced)}
            trend="Profile-linked sales only"
            trendType="positive"
            icon={ReceiptText}
            iconBgColor="bg-cyan-50"
            iconColor="text-cyan-600"
          />
          <SummaryCard
            title="Linked Paid"
            value={formatCurrency(totalPaid)}
            trend="Collected from linked customers"
            trendType="positive"
            icon={WalletCards}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
          />
          <SummaryCard
            title="Linked Due"
            value={formatCurrency(totalDue)}
            trend="Outstanding linked balance"
            trendType={totalDue > 0 ? "negative" : "neutral"}
            icon={WalletCards}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-600"
          />
        </div>

        <SectionCard className="overflow-hidden" padded={false}>
          <div className="border-b border-slate-50 p-6">
            <h3 className="text-lg font-bold text-slate-900">Customer Ledger Summary</h3>
            <p className="mt-1 text-xs text-slate-500">
              Customer-wise totals are calculated only from sales linked to customer profiles.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Customer</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Contact</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Total Invoiced</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Paid</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Due</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Invoices</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Last Sale</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Status</th>
                  <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {customerRows.map((customer, index) => (
                  <tr
                    key={customer.id}
                    className={`transition-colors hover:bg-blue-50/40 ${
                      index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                    }`}
                  >
                    <td className="px-6 py-4">
                      <Link
                        href={`/customers/${customer.id}`}
                        className="text-sm font-semibold text-slate-900 hover:text-blue-600"
                      >
                        {customer.name}
                      </Link>
                      <div className="text-xs text-slate-500">{customer.address || "No address"}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div>{customer.phone || "-"}</div>
                      <div className="text-xs text-slate-400">{customer.email || "-"}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                      {formatCurrency(customer.totalInvoiced)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-green-700">
                      {formatCurrency(customer.totalPaid)}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-amber-700">
                      {formatCurrency(customer.totalDue)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{customer.invoiceCount}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatBsDisplayDate(customer.lastSaleDate)}
                    </td>
                    <td className="px-6 py-4">
                      <LocalizedStatusBadge status={customer.status ?? "ACTIVE"} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <ActionIconButton href={`/customers/${customer.id}`} label={`Open ${customer.name}`}>
                          <Eye className="h-4 w-4" />
                        </ActionIconButton>
                        <ActionIconButton
                          href={`/customers/create?edit=${customer.id}`}
                          label={`Edit ${customer.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </ActionIconButton>
                        <ConfirmActionForm
                          action={deleteCustomer}
                          confirmMessage={`Delete customer profile ${customer.name}? Linked sales will keep their manual customer name snapshot.`}
                          hiddenFields={[
                            { name: "id", value: customer.id },
                            { name: "redirect_to", value: "/customers" },
                          ]}
                        >
                          <ActionIconButton label={`Delete ${customer.name}`} type="submit">
                            <Trash2 className="h-4 w-4" />
                          </ActionIconButton>
                        </ConfirmActionForm>
                      </div>
                    </td>
                  </tr>
                ))}
                {customerRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-10">
                      <EmptyState
                        icon={UsersRound}
                        title="No customer profiles yet"
                        description="Manual customer names still work in sales. Create profiles only for regular customers who need ledger tracking."
                        actionLabel="Create Customer Profile"
                        actionHref="/customers/create"
                      />
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </main>
    </div>
  );
}
