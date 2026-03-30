import Link from "next/link";
import {
  CalendarClock,
  CreditCard,
  MapPin,
  Pencil,
  ReceiptText,
  UserRound,
  Wallet,
} from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageActionStrip } from "@/components/shared/PageActionStrip";
import { QueryNoticeToast } from "@/components/shared/QueryNoticeToast";
import { ReportToolbar } from "@/components/shared/ReportToolbar";
import { formatBsDisplayDate } from "@/lib/nepali-date";
import { formatCurrency } from "@/lib/presentation";
import { buildPayrollEntries, buildPayrollMonthSummaries } from "@/lib/staff-payroll";
import { getSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function StaffPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await getSupabaseClient();
  const params = await searchParams;
  const notice = typeof params.notice === "string" ? params.notice : "";
  const selectedStaffId = typeof params.staff === "string" ? params.staff : "";

  const [staffProfilesResponse, staffPaymentsResponse] = await Promise.all([
    supabase
      .from("staff_profiles")
      .select("id, staff_code, name, address, phone, total_salary, status")
      .order("created_at", { ascending: false }),
    supabase
      .from("staff_salary_payments")
      .select(
        "id, staff_id, salary_month_bs, payment_date, payment_type, working_days, leave_days, monthly_salary, monthly_payment, advance_payment, remaining_payment, notes, created_at",
      )
      .order("created_at", { ascending: false }),
  ]);

  const staffProfiles = staffProfilesResponse.data ?? [];
  const staffPayments = staffPaymentsResponse.data ?? [];
  const payrollEntries = buildPayrollEntries(staffPayments);
  const payrollMonthSummaries = buildPayrollMonthSummaries(staffPayments);
  const activeStaffId = selectedStaffId || staffProfiles[0]?.id || "";
  const activeStaff = staffProfiles.find((staff) => staff.id === activeStaffId) ?? null;
  const activeStaffPayments = staffPayments.filter((payment) => payment.staff_id === activeStaffId);
  const activePaymentHistory = payrollEntries
    .filter((payment) => payment.staff_id === activeStaffId)
    .reverse();
  const activeMonthSummaries = payrollMonthSummaries.filter(
    (summary) => summary.staff_id === activeStaffId,
  );
  const activeAdvanceTotal = activeMonthSummaries.reduce(
    (sum, month) => sum + month.advance_paid,
    0,
  );
  const activeSalaryPaidTotal = activeMonthSummaries.reduce(
    (sum, month) => sum + month.salary_paid,
    0,
  );
  const activeTotalPaid = activeMonthSummaries.reduce(
    (sum, month) => sum + month.total_paid,
    0,
  );
  const activeRemainingTotal = activeMonthSummaries.reduce(
    (sum, month) => sum + month.remaining_salary,
    0,
  );
  const latestPayment = activePaymentHistory[0] ?? null;

  const totalSalary = staffProfiles.reduce((sum, staff) => sum + Number(staff.total_salary ?? 0), 0);
  const totalAdvance = payrollMonthSummaries.reduce(
    (sum, month) => sum + month.advance_paid,
    0,
  );
  const totalRemaining = payrollMonthSummaries.reduce(
    (sum, month) => sum + month.remaining_salary,
    0,
  );
  const totalSalaryPaid = payrollMonthSummaries.reduce(
    (sum, month) => sum + month.salary_paid,
    0,
  );

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <Header
          title="Staff Overview"
          description="Browse staff records and open monthly salary transaction details."
        />
        <QueryNoticeToast message={notice} />
        <ReportToolbar actionPath="/staff" />
        <PageActionStrip
          actions={[
            { label: "Create Staff Profile", href: "/staff/create" },
            {
              label: "Add Salary Entry",
              href: activeStaffId ? `/staff/payment/create?staff=${activeStaffId}` : "/staff/payment/create",
              variant: "secondary",
            },
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
            trend="Base monthly salary total"
            trendType="positive"
            icon={Wallet}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
          />
          <SummaryCard
            title="Advance Salary"
            value={formatCurrency(totalAdvance)}
            trend={`${staffPayments.length} payroll transactions`}
            trendType="negative"
            icon={CreditCard}
            iconBgColor="bg-red-50"
            iconColor="text-red-600"
          />
          <SummaryCard
            title="Remaining Salary"
            value={formatCurrency(totalRemaining)}
            trend={`${formatCurrency(totalSalaryPaid)} released on payday`}
            trendType="neutral"
            icon={MapPin}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-600"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-50 p-6">
              <h3 className="text-lg font-bold text-slate-900">Staff List</h3>
              <p className="mt-1 text-xs text-slate-500">
                Select a staff member to view salary and transaction details.
              </p>
            </div>
            <div className="divide-y divide-slate-50">
              {staffProfiles.map((staff, index) => {
                const isActive = staff.id === activeStaffId;

                return (
                  <Link
                    key={staff.id}
                    href={`/staff?staff=${staff.id}`}
                    className={`block px-6 py-4 transition-colors hover:bg-blue-50/40 ${
                      isActive
                        ? "border-l-4 border-blue-600 bg-blue-50/50"
                        : index % 2 === 0
                          ? "bg-white"
                          : "bg-slate-50/40"
                    }`}
                  >
                    <div className="text-sm font-semibold text-slate-900">{staff.name}</div>
                    <div className="mt-1 text-xs text-slate-500">{staff.staff_code}</div>
                    <div className="mt-2 text-sm text-slate-600">
                      Base Salary: {formatCurrency(staff.total_salary)}
                    </div>
                  </Link>
                );
              })}

              {staffProfiles.length === 0 && (
                <div className="p-6">
                  <EmptyState
                    icon={UserRound}
                    title="No staff profiles yet"
                    description="Create a staff profile first, then salary records can be linked to it."
                    actionLabel="Create Staff Profile"
                    actionHref="/staff/create"
                  />
                </div>
              )}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {activeStaff ? activeStaff.name : "Staff Details"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Salary profile and monthly transaction details.
                  </p>
                </div>
                {activeStaff ? (
                  <div className="flex gap-2">
                    <Link
                      href={`/staff/create?edit=${activeStaff.id}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      title={`Edit staff profile for ${activeStaff.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit Profile
                    </Link>
                    <Link
                      href={`/staff/payment/create?staff=${activeStaff.id}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                      title={`Add salary entry for ${activeStaff.name}`}
                    >
                      <ReceiptText className="h-4 w-4" />
                      Add Salary
                    </Link>
                  </div>
                ) : null}
              </div>

                {activeStaff ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Staff Code</div>
                      <div className="mt-2 font-semibold text-slate-900">{activeStaff.staff_code}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Base Salary</div>
                      <div className="mt-2 font-semibold text-slate-900">
                        {formatCurrency(activeStaff.total_salary)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Payroll Months
                      </div>
                      <div className="mt-2 font-semibold text-slate-900">
                        {activeMonthSummaries.length}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Total Remaining
                      </div>
                      <div className="mt-2 font-semibold text-amber-700">
                        {formatCurrency(activeRemainingTotal)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-blue-500">
                        Salary Entries
                      </div>
                      <div className="mt-2 text-xl font-bold text-slate-900">
                        {activeStaffPayments.length}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Total Paid
                      </div>
                      <div className="mt-2 font-semibold text-slate-900">
                        {formatCurrency(activeTotalPaid)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-red-100 bg-red-50/70 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-red-500">
                        Advance Salary
                      </div>
                      <div className="mt-2 font-semibold text-red-700">
                        {formatCurrency(activeAdvanceTotal)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-500">
                        Payday Salary
                      </div>
                      <div className="mt-2 font-semibold text-emerald-700">
                        {formatCurrency(activeSalaryPaidTotal)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Latest Salary Activity
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      {latestPayment
                        ? `${latestPayment.salary_month_bs} ${latestPayment.payment_type === "SALARY" ? "salary paid" : "advance paid"} on ${formatBsDisplayDate(latestPayment.payment_date)} with ${formatCurrency(latestPayment.remaining_salary)} remaining`
                        : "No salary activity has been recorded yet."}
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={UserRound}
                  title="Select a staff member"
                  description="Choose a staff profile from the left to view salary and transaction details."
                  actionLabel="Create Staff Profile"
                  actionHref="/staff/create"
                />
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-50 p-6">
                <h3 className="text-lg font-bold text-slate-900">Monthly Payroll Ledger</h3>
                <p className="mt-1 text-xs text-slate-500">
                  One row per salary month with due salary, total paid, and remaining balance.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Salary Month</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Working Days</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Leave</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Due Salary</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Advance Paid</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Salary Paid</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Total Paid</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Remaining</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Last Payment</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {activeMonthSummaries.map((payment, index) => (
                      <tr
                        key={`${payment.staff_id}-${payment.salary_month_bs}`}
                        className={`transition-colors hover:bg-blue-50/40 ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        }`}
                      >
                        <td className="px-6 py-4 text-sm text-slate-600">{payment.salary_month_bs}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{payment.working_days}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{payment.leave_days}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                          {formatCurrency(payment.due_salary)}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-red-600">
                          {formatCurrency(payment.advance_paid)}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-blue-700">
                          {formatCurrency(payment.salary_paid)}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">
                          {formatCurrency(payment.total_paid)}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-green-700">
                          {formatCurrency(payment.remaining_salary)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {payment.last_payment_date ? formatBsDisplayDate(payment.last_payment_date) : "-"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/staff/payment/create?staff=${payment.staff_id}`}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                            title={`Open salary entry for ${payment.salary_month_bs}`}
                          >
                            Add Entry
                          </Link>
                        </td>
                      </tr>
                    ))}

                    {activeStaff && activeMonthSummaries.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-6 py-10">
                          <EmptyState
                            icon={CalendarClock}
                            title="No salary transactions yet"
                            description="Add a monthly salary entry to start building this staff member's payroll history."
                            actionLabel="Add Salary Entry"
                            actionHref={`/staff/payment/create?staff=${activeStaff.id}`}
                          />
                        </td>
                      </tr>
                    )}

                    {!activeStaff && (
                      <tr>
                        <td colSpan={10} className="px-6 py-10">
                          <EmptyState
                            icon={CalendarClock}
                            title="No staff selected"
                            description="Choose a staff member from the left to view transaction details."
                            actionLabel="Create Staff Profile"
                            actionHref="/staff/create"
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
