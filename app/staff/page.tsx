import Link from "next/link";
import { CreditCard, MapPin, Pencil, RefreshCcw, Trash2, UserRound, Wallet } from "lucide-react";
import { deleteStaffProfile, upsertStaffProfile } from "@/app/actions";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { ActionNotice } from "@/components/shared/ActionNotice";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageActionStrip } from "@/components/shared/PageActionStrip";
import { ReportToolbar } from "@/components/shared/ReportToolbar";
import { formatCurrency } from "@/lib/presentation";
import { getSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function StaffPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await getSupabaseClient();
  const params = await searchParams;
  const editId = typeof params.edit === "string" ? params.edit : "";
  const notice = typeof params.notice === "string" ? params.notice : "";

  const { data: staffProfiles = [] } = await supabase
    .from("staff_profiles")
    .select("id, staff_code, name, address, phone, total_salary, advance_salary, remaining_salary, status")
    .order("created_at", { ascending: false });

  const editingStaff = staffProfiles.find((staff) => staff.id === editId) ?? null;
  const totalSalary = staffProfiles.reduce((sum, staff) => sum + Number(staff.total_salary ?? 0), 0);
  const totalAdvance = staffProfiles.reduce(
    (sum, staff) => sum + Number(staff.advance_salary ?? 0),
    0,
  );
  const totalRemaining = staffProfiles.reduce(
    (sum, staff) => sum + Number(staff.remaining_salary ?? 0),
    0,
  );

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <Header
          title="Staff Profiles"
          description="Manage staff records, salary amounts, advance salary, and remaining balance."
        />
        {notice && <ActionNotice message={notice} />}
        <ReportToolbar actionPath="/staff" />
        <PageActionStrip
          actions={[
            { label: editingStaff ? "Update Staff Profile" : "Create Staff Profile", href: "#staff-form" },
            { label: "Browse Salary Table", href: "#staff-table", variant: "secondary" },
          ]}
        />

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Total Staff"
            value={`${staffProfiles.length}`}
            trend="Active staff records"
            trendType="neutral"
            icon={UserRound}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <SummaryCard
            title="Total Salary"
            value={formatCurrency(totalSalary)}
            trend="Monthly salary total"
            trendType="positive"
            icon={Wallet}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
          />
          <SummaryCard
            title="Advance Salary Given"
            value={formatCurrency(totalAdvance)}
            trend="Already paid in advance"
            trendType="negative"
            icon={CreditCard}
            iconBgColor="bg-red-50"
            iconColor="text-red-600"
          />
          <SummaryCard
            title="Remaining Salary"
            value={formatCurrency(totalRemaining)}
            trend="Balance salary payable"
            trendType="neutral"
            icon={MapPin}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-600"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
          <section id="staff-form" className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900">
                {editingStaff ? "Update Staff Profile" : "Create Staff Profile"}
              </h3>
              <p className="text-sm text-slate-500">Staff data persisted in Supabase.</p>
            </div>

            <form action={upsertStaffProfile} className="space-y-4">
              <input type="hidden" name="id" defaultValue={editingStaff?.id ?? ""} />
              <input type="hidden" name="redirect_to" value="/staff" />

              <input
                name="staff_code"
                required
                defaultValue={editingStaff?.staff_code ?? ""}
                placeholder="Staff Code"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
              />
              <input
                name="name"
                required
                defaultValue={editingStaff?.name ?? ""}
                placeholder="Staff Name"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
              />
              <textarea
                name="address"
                rows={3}
                defaultValue={editingStaff?.address ?? ""}
                placeholder="Address"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
              />
              <input
                name="phone"
                defaultValue={editingStaff?.phone ?? ""}
                placeholder="Phone"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
              />
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <input
                  name="total_salary"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={editingStaff?.total_salary ?? 0}
                  placeholder="Total Salary"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                />
                <input
                  name="advance_salary"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={editingStaff?.advance_salary ?? 0}
                  placeholder="Advance Salary"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                />
              </div>
              <select
                name="status"
                defaultValue={editingStaff?.status ?? "ACTIVE"}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
                >
                  {editingStaff ? "Update Staff Profile" : "Save Staff Profile"}
                </button>
                {editingStaff && (
                  <Link
                    href="/staff"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700"
                  >
                    Cancel
                  </Link>
                )}
              </div>
            </form>
          </section>

          <section id="staff-table" className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-50 p-6">
              <h3 className="text-lg font-bold text-slate-900">Staff Salary Table</h3>
              <p className="mt-1 text-xs text-slate-500">Live salary data from Supabase.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Name</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Address</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Phone</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Total Salary</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Advance Given</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Remaining</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {staffProfiles.map((staff, index) => (
                    <tr
                      key={staff.id}
                      className={`transition-colors hover:bg-blue-50/40 ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-900">{staff.name}</div>
                        <div className="text-xs text-slate-500">{staff.staff_code}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{staff.address}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{staff.phone}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                        {formatCurrency(staff.total_salary)}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-red-600">
                        {formatCurrency(staff.advance_salary)}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-green-700">
                        {formatCurrency(staff.remaining_salary)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/staff?edit=${staff.id}`}
                            className="rounded-lg p-2 text-slate-400 transition-all hover:bg-blue-50 hover:text-blue-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/staff?edit=${staff.id}`}
                            className="rounded-lg p-2 text-slate-400 transition-all hover:bg-amber-50 hover:text-amber-600"
                          >
                            <RefreshCcw className="h-4 w-4" />
                          </Link>
                          <form action={deleteStaffProfile}>
                            <input type="hidden" name="id" value={staff.id} />
                            <input type="hidden" name="redirect_to" value="/staff" />
                            <button className="rounded-lg p-2 text-slate-400 transition-all hover:bg-red-50 hover:text-red-600">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {staffProfiles.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-10">
                        <EmptyState
                          icon={UserRound}
                          title="No staff profiles yet"
                          description="Add your team members here so salary, advance, and remaining balances can be tracked."
                          actionLabel="Create Staff Profile"
                          actionHref="/staff"
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
