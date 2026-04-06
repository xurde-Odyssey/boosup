import Link from "next/link";
import {
  CalendarClock,
  CreditCard,
  LayoutList,
  Pencil,
  ReceiptText,
  UserPlus,
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
import { recalculateStaffLedgerSnapshots } from "@/lib/staff-payroll";
import { getSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const getTodayDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
  }).format(new Date());

const getDateRange = (range: string, today: string) => {
  const current = new Date(`${today}T00:00:00`);

  if (range === "week") {
    const day = current.getDay();
    const diff = day === 0 ? 6 : day - 1;
    const start = new Date(current);
    start.setDate(current.getDate() - diff);
    return {
      from: start.toISOString().slice(0, 10),
      to: today,
    };
  }

  if (range === "year") {
    return {
      from: `${current.getFullYear()}-01-01`,
      to: today,
    };
  }

  if (range === "custom") {
    return {
      from: today,
      to: today,
    };
  }

  return {
    from: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-01`,
    to: today,
  };
};

const isWithinRange = (value: string | null | undefined, from: string, to: string) => {
  if (!value) return false;
  return value >= from && value <= to;
};

const isLedgerWithinRange = (
  ledger: { month: number; year: number },
  from: string,
  to: string,
) => {
  const ledgerDate = `${ledger.year}-${String(ledger.month).padStart(2, "0")}-01`;
  return ledgerDate >= from && ledgerDate <= to;
};

export default async function StaffPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await getSupabaseClient();
  const params = await searchParams;
  const notice = typeof params.notice === "string" ? params.notice : "";
  const selectedRange = typeof params.range === "string" ? params.range : "year";
  const todayDate = getTodayDate();
  const defaultRange = getDateRange(selectedRange, todayDate);
  const fromDate = typeof params.from === "string" && params.from ? params.from : defaultRange.from;
  const toDate = typeof params.to === "string" && params.to ? params.to : defaultRange.to;
  const salaryStatus = typeof params.salary_status === "string" ? params.salary_status : "ALL";
  const selectedStaffId = typeof params.staff === "string" ? params.staff : "";

  const [staffProfilesResponse, ledgersResponse, transactionsResponse] = await Promise.all([
    supabase
      .from("staff_profiles")
      .select("id, staff_code, name, address, phone, total_salary, status")
      .order("created_at", { ascending: false }),
    supabase
      .from("staff_salary_ledgers")
      .select(
        "id, staff_id, month, year, base_salary, working_days, leave_days, total_advance, salary_paid, total_paid, remaining, carry_forward, status, created_at, updated_at",
      )
      .order("year", { ascending: false })
      .order("month", { ascending: false }),
    supabase
      .from("staff_salary_transactions")
      .select("id, staff_id, ledger_id, transaction_date, type, amount, note, created_at, updated_at")
      .order("created_at", { ascending: false }),
  ]);

  const staffProfiles = staffProfilesResponse.data ?? [];
  const allLedgers = ledgersResponse.data ?? [];
  const allTransactions = transactionsResponse.data ?? [];
  const snapshots = recalculateStaffLedgerSnapshots(allLedgers, allTransactions);
  const visibleLedgers = snapshots.ledgers.filter((ledger) => isLedgerWithinRange(ledger, fromDate, toDate));
  const visibleTransactions = snapshots.transactions.filter((transaction) =>
    isWithinRange(transaction.transaction_date, fromDate, toDate),
  );
  const filteredLedgers =
    salaryStatus === "pending"
      ? visibleLedgers.filter((ledger) => ledger.remaining > 0)
      : visibleLedgers;
  const visibleStaffIds = new Set(filteredLedgers.map((ledger) => ledger.staff_id));
  const visibleStaffProfiles =
    salaryStatus === "pending"
      ? staffProfiles.filter((staff) => visibleStaffIds.has(staff.id))
      : staffProfiles;
  const activeStaffId = selectedStaffId || visibleStaffProfiles[0]?.id || "";
  const activeStaff = visibleStaffProfiles.find((staff) => staff.id === activeStaffId) ?? null;
  const activeStaffLedgers = filteredLedgers
    .filter((ledger) => ledger.staff_id === activeStaffId)
    .sort((left, right) => right.period_key.localeCompare(left.period_key));
  const activeStaffTransactions = visibleTransactions.filter(
    (transaction) => transaction.staff_id === activeStaffId,
  );
  const activeAdvanceTotal = activeStaffLedgers.reduce(
    (sum, ledger) => sum + ledger.total_advance,
    0,
  );
  const activeSalaryPaidTotal = activeStaffLedgers.reduce(
    (sum, ledger) => sum + ledger.salary_paid,
    0,
  );
  const activeRemainingTotal = activeStaffLedgers.reduce(
    (sum, ledger) => sum + ledger.remaining,
    0,
  );
  const activeCarryForward = activeStaffLedgers[0]?.carry_forward ?? 0;
  const latestTransaction = activeStaffTransactions[0] ?? null;

  const totalAdvance = filteredLedgers.reduce((sum, ledger) => sum + ledger.total_advance, 0);
  const totalSalaryPaid = filteredLedgers.reduce((sum, ledger) => sum + ledger.salary_paid, 0);
  const totalStaffExpense = filteredLedgers.reduce((sum, ledger) => sum + ledger.total_paid, 0);
  const totalPendingSalary = filteredLedgers.reduce((sum, ledger) => sum + ledger.remaining, 0);
  const staffWithRemainingBalance = new Set(
    filteredLedgers.filter((ledger) => ledger.remaining > 0).map((ledger) => ledger.staff_id),
  ).size;

  const baseStaffHref = `/staff?range=${selectedRange}&from=${fromDate}&to=${toDate}`;

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <Header
          title="Staff Salary Ledger"
          description="Track monthly salary, advances, payments, remaining balance, and carry forward for each staff member."
        />
        <QueryNoticeToast message={notice} />
        <ReportToolbar actionPath="/staff" selectedRange={selectedRange} fromDate={fromDate} toDate={toDate} />
        <PageActionStrip
          actions={[
            { label: "Create Staff Profile", href: "/staff/create", icon: UserPlus },
            {
              label: "Recorded Salary Transactions",
              href: "/staff/view",
              variant: "secondary",
              icon: LayoutList,
            },
          ]}
        />

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            title="Total Salary Paid"
            value={formatCurrency(totalSalaryPaid)}
            trend="Salary transactions in selected range"
            trendType="positive"
            icon={Wallet}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
            href={baseStaffHref}
          />
          <SummaryCard
            title="Total Advance"
            value={formatCurrency(totalAdvance)}
            trend="Advance transactions in selected range"
            trendType="negative"
            icon={CreditCard}
            iconBgColor="bg-red-50"
            iconColor="text-red-600"
            href={baseStaffHref}
          />
          <SummaryCard
            title="Total Staff Expense"
            value={formatCurrency(totalStaffExpense)}
            trend="All staff salary expenses in range"
            trendType="neutral"
            icon={ReceiptText}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
            href={baseStaffHref}
          />
          <SummaryCard
            title="Pending Salary"
            value={formatCurrency(totalPendingSalary)}
            trend={`${staffWithRemainingBalance} staff with remaining balance`}
            trendType="neutral"
            icon={CalendarClock}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-600"
            href={`${baseStaffHref}&salary_status=pending`}
          />
          <SummaryCard
            title="Staff With Balance"
            value={`${staffWithRemainingBalance}`}
            trend="Open salary ledgers"
            trendType={staffWithRemainingBalance > 0 ? "negative" : "positive"}
            icon={UserRound}
            iconBgColor="bg-slate-100"
            iconColor="text-slate-700"
            href={`${baseStaffHref}&salary_status=pending`}
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-50 p-6">
              <h3 className="text-lg font-bold text-slate-900">Staff List</h3>
              <p className="mt-1 text-xs text-slate-500">
                Select a staff member to view their monthly salary ledger and transactions.
              </p>
            </div>
            <div className="divide-y divide-slate-50">
              {visibleStaffProfiles.map((staff, index) => {
                const isActive = staff.id === activeStaffId;

                return (
                  <Link
                    key={staff.id}
                    href={`${baseStaffHref}${salaryStatus === "pending" ? "&salary_status=pending" : ""}&staff=${staff.id}`}
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

              {visibleStaffProfiles.length === 0 && (
                <div className="p-6">
                  <EmptyState
                    icon={UserRound}
                    title="No staff ledgers found"
                    description="Create staff profiles and start recording salary transactions to build the monthly ledger."
                    actionLabel="Create Staff Profile"
                    actionHref="/staff/create"
                  />
                </div>
              )}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {activeStaff ? activeStaff.name : "Staff Details"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Track salary, advances, and carry forward for this staff.
                  </p>
                </div>
                {activeStaff ? (
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/staff/create?edit=${activeStaff.id}`}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit Profile
                    </Link>
                    <Link
                      href={`/staff/payment/create?staff=${activeStaff.id}&type=ADVANCE`}
                      className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                    >
                      Add Advance
                    </Link>
                    <Link
                      href={`/staff/payment/create?staff=${activeStaff.id}&type=SALARY`}
                      className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      Add Salary Payment
                    </Link>
                  </div>
                ) : null}
              </div>

              {activeStaff ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Base Salary</div>
                      <div className="mt-2 font-semibold text-slate-900">
                        {formatCurrency(activeStaff.total_salary)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-red-100 bg-red-50/70 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-red-500">Total Advance</div>
                      <div className="mt-2 font-semibold text-red-700">
                        {formatCurrency(activeAdvanceTotal)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-blue-500">Salary Paid</div>
                      <div className="mt-2 font-semibold text-blue-700">
                        {formatCurrency(activeSalaryPaidTotal)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-500">Remaining</div>
                      <div className="mt-2 font-semibold text-amber-700">
                        {formatCurrency(activeRemainingTotal)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-rose-500">Carry Forward</div>
                      <div className="mt-2 font-semibold text-rose-700">
                        {formatCurrency(activeCarryForward)}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Latest Salary Activity
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      {latestTransaction
                        ? `${latestTransaction.type === "SALARY" ? "Salary payment" : "Advance"} of ${formatCurrency(latestTransaction.amount)} on ${formatBsDisplayDate(latestTransaction.transaction_date)} for ${latestTransaction.month_label}`
                        : "No salary transaction has been recorded yet."}
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={UserRound}
                  title="Select a staff member"
                  description="Choose a staff profile from the left to view monthly ledger and payment history."
                  actionLabel="Create Staff Profile"
                  actionHref="/staff/create"
                />
              )}
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="border-b border-slate-50 p-6">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Monthly Salary Ledger</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      One row per staff per month. Carry forward from an overpayment is deducted automatically in the next month.
                    </p>
                  </div>
                  {activeStaff ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href="#staff-transactions"
                        className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50"
                      >
                        View Transactions
                      </Link>
                    </div>
                  ) : null}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Month</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Base</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Carry In</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Payable</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Advance</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Salary</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Total Paid</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Remaining</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Carry Forward</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Status</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {activeStaffLedgers.map((ledger, index) => (
                      <tr
                        key={ledger.id}
                        className={`transition-colors hover:bg-blue-50/40 ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        }`}
                      >
                        <td className="px-6 py-4 text-sm text-slate-600">{ledger.month_label}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                          {formatCurrency(ledger.base_salary)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-rose-700">
                          {formatCurrency(ledger.carry_in)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                          {formatCurrency(ledger.payable_amount)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-amber-700">
                          {formatCurrency(ledger.total_advance)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-blue-700">
                          {formatCurrency(ledger.salary_paid)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                          {formatCurrency(ledger.total_paid)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-amber-700">
                          {formatCurrency(ledger.remaining)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-rose-700">
                          {formatCurrency(ledger.carry_forward)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                          {ledger.status}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex gap-3 text-sm">
                            <Link
                              href={`/staff/payment/create?staff=${ledger.staff_id}&type=ADVANCE&month=${ledger.month}&year=${ledger.year}`}
                              className="font-semibold text-amber-600 hover:text-amber-700"
                            >
                              Add Advance
                            </Link>
                            <Link
                              href={`/staff/payment/create?staff=${ledger.staff_id}&type=SALARY&month=${ledger.month}&year=${ledger.year}`}
                              className="font-semibold text-blue-600 hover:text-blue-700"
                            >
                              Add Salary
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {activeStaff && activeStaffLedgers.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-6 py-10">
                          <EmptyState
                            icon={CalendarClock}
                            title="No salary ledger yet"
                            description="Add an advance or salary payment to create the first monthly ledger for this staff member."
                            actionLabel="Add Advance"
                            actionHref={`/staff/payment/create?staff=${activeStaff.id}&type=ADVANCE`}
                          />
                        </td>
                      </tr>
                    )}

                    {!activeStaff && (
                      <tr>
                        <td colSpan={11} className="px-6 py-10">
                          <EmptyState
                            icon={CalendarClock}
                            title="No staff selected"
                            description="Choose a staff member from the left to view their monthly salary ledger."
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

            <section
              id="staff-transactions"
              className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
            >
              <div className="border-b border-slate-50 p-6">
                <h3 className="text-lg font-bold text-slate-900">Salary Transactions</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Every advance and salary payment is stored as its own transaction.
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Month</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Date</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Type</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Previous Paid</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Amount</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Remaining After</th>
                      <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {activeStaffTransactions.map((transaction, index) => (
                      <tr
                        key={transaction.id}
                        className={`transition-colors hover:bg-blue-50/40 ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        }`}
                      >
                        <td className="px-6 py-4 text-sm text-slate-600">{transaction.month_label}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {transaction.transaction_date
                            ? formatBsDisplayDate(transaction.transaction_date)
                            : "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                          {transaction.type === "SALARY" ? "Salary Payment" : "Advance"}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-500">
                          {formatCurrency(transaction.previous_paid)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-blue-700">
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-amber-700">
                          {formatCurrency(transaction.remaining_after)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link
                            href={`/staff/payment/create?edit=${transaction.id}`}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                          >
                            Edit
                          </Link>
                        </td>
                      </tr>
                    ))}

                    {activeStaff && activeStaffTransactions.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                          No salary transactions recorded for this staff member in the selected range.
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
