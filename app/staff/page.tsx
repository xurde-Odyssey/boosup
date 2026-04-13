import Link from "next/link";
import {
  Banknote,
  CalendarClock,
  CreditCard,
  Filter,
  HandCoins,
  LayoutList,
  Search,
  Pencil,
  ReceiptText,
  UserPlus,
  UserRound,
  Wallet,
} from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { AutoSubmitSelect } from "@/components/shared/AutoSubmitSelect";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { Button } from "@/components/shared/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageActionStrip } from "@/components/shared/PageActionStrip";
import { QueryNoticeToast } from "@/components/shared/QueryNoticeToast";
import { ReportToolbar } from "@/components/shared/ReportToolbar";
import { getMessages, getStaffMonthLabel, getStatusLabel } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { adToBs, formatBsDisplayDate, getBsDateParts, getNepalTodayAd } from "@/lib/nepali-date";
import { formatCurrency } from "@/lib/presentation";
import { recalculateStaffLedgerSnapshots } from "@/lib/staff-payroll";
import { getSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

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
  const fromBs = getBsDateParts(adToBs(from));
  const toBs = getBsDateParts(adToBs(to));
  const ledgerOrder = ledger.year * 100 + ledger.month;
  const fromOrder = (fromBs.year || 0) * 100 + (fromBs.month || 0);
  const toOrder = (toBs.year || 0) * 100 + (toBs.month || 0);

  return ledgerOrder >= fromOrder && ledgerOrder <= toOrder;
};

export default async function StaffPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await getSupabaseClient();
  const params = await searchParams;
  const locale = await getServerLocale(params.lang);
  const messages = getMessages(locale);
  const notice = typeof params.notice === "string" ? params.notice : "";
  const selectedRange = typeof params.range === "string" ? params.range : "year";
  const todayDate = getNepalTodayAd();
  const defaultRange = getDateRange(selectedRange, todayDate);
  const fromDate = typeof params.from === "string" && params.from ? params.from : defaultRange.from;
  const toDate = typeof params.to === "string" && params.to ? params.to : defaultRange.to;
  const salaryStatus = typeof params.salary_status === "string" ? params.salary_status : "ALL";
  const selectedStaffId = typeof params.staff === "string" ? params.staff : "";
  const staffSearch = typeof params.staff_q === "string" ? params.staff_q.trim() : "";
  const staffFilter = typeof params.staff_filter === "string" ? params.staff_filter : "ALL";
  const activeTab = typeof params.tab === "string" ? params.tab : "overview";

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
  const rangeAwareStaffProfiles =
    salaryStatus === "pending"
      ? staffProfiles.filter((staff) => visibleStaffIds.has(staff.id))
      : staffProfiles;
  const staffSummaryMap = new Map(
    staffProfiles.map((staff) => {
      const staffLedgers = filteredLedgers
        .filter((ledger) => ledger.staff_id === staff.id)
        .sort((left, right) => right.period_key.localeCompare(left.period_key));
      const staffTransactions = visibleTransactions.filter((transaction) => transaction.staff_id === staff.id);
      const totalAdvanceAmount = staffLedgers.reduce((sum, ledger) => sum + ledger.total_advance, 0);
      const totalSalaryAmount = staffLedgers.reduce((sum, ledger) => sum + ledger.salary_paid, 0);
      const totalRemainingAmount = staffLedgers.reduce((sum, ledger) => sum + ledger.remaining, 0);

      return [
        staff.id,
        {
          ledgers: staffLedgers,
          transactions: staffTransactions,
          totalAdvanceAmount,
          totalSalaryAmount,
          totalRemainingAmount,
          hasAdvance: totalAdvanceAmount > 0,
          isPaid: staffLedgers.length > 0 && totalRemainingAmount <= 0,
          isPending: totalRemainingAmount > 0,
        },
      ];
    }),
  );
  const statusFilteredStaffProfiles = rangeAwareStaffProfiles.filter((staff) => {
    const summary = staffSummaryMap.get(staff.id);

    if (staffFilter === "PENDING") return Boolean(summary?.isPending);
    if (staffFilter === "ADVANCE") return Boolean(summary?.hasAdvance);
    if (staffFilter === "PAID") return Boolean(summary?.isPaid);
    if (staffFilter === "INACTIVE") return staff.status === "INACTIVE";

    return true;
  });
  const searchedStaffProfiles = staffSearch
    ? statusFilteredStaffProfiles.filter((staff) => {
        const haystack = `${staff.name} ${staff.staff_code}`.toLowerCase();
        return haystack.includes(staffSearch.toLowerCase());
      })
    : statusFilteredStaffProfiles;
  const activeStaffId = selectedStaffId || searchedStaffProfiles[0]?.id || "";
  const activeStaff = searchedStaffProfiles.find((staff) => staff.id === activeStaffId) ?? null;
  const activeStaffLedgers = filteredLedgers
    .filter((ledger) => ledger.staff_id === activeStaffId)
    .sort((left, right) => right.period_key.localeCompare(left.period_key));
  const activeStaffTransactions = visibleTransactions.filter(
    (transaction) => transaction.staff_id === activeStaffId,
  );
  const currentLedger = activeStaffLedgers[0] ?? null;
  const overviewTransactions = activeStaffTransactions.slice(0, 5);

  const totalAdvance = filteredLedgers.reduce((sum, ledger) => sum + ledger.total_advance, 0);
  const totalSalaryPaid = filteredLedgers.reduce((sum, ledger) => sum + ledger.salary_paid, 0);
  const totalStaffExpense = filteredLedgers.reduce((sum, ledger) => sum + ledger.total_paid, 0);
  const totalPendingSalary = filteredLedgers.reduce((sum, ledger) => sum + ledger.remaining, 0);
  const staffWithRemainingBalance = new Set(
    filteredLedgers.filter((ledger) => ledger.remaining > 0).map((ledger) => ledger.staff_id),
  ).size;

  const baseStaffHref = `/staff?range=${selectedRange}&from=${fromDate}&to=${toDate}`;
  const buildStaffPageHref = (extra: Record<string, string>) => {
    const searchParams = new URLSearchParams({
      range: selectedRange,
      from: fromDate,
      to: toDate,
    });

    if (salaryStatus !== "ALL") searchParams.set("salary_status", salaryStatus);
    if (activeStaffId) searchParams.set("staff", activeStaffId);
    if (staffSearch) searchParams.set("staff_q", staffSearch);
    if (staffFilter !== "ALL") searchParams.set("staff_filter", staffFilter);

    Object.entries(extra).forEach(([key, value]) => {
      if (value) searchParams.set(key, value);
    });

    return `/staff?${searchParams.toString()}`;
  };
  const staffFilterOptions = [
    { value: "ALL", label: "All" },
    { value: "PENDING", label: "Pending Salary" },
    { value: "ADVANCE", label: "Advance Taken" },
    { value: "PAID", label: "Paid" },
    { value: "INACTIVE", label: "Inactive" },
  ];
  const staffTabs = [
    { value: "overview", label: "Overview" },
    { value: "ledger", label: "Ledger" },
    { value: "transactions", label: "Transactions" },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
        <Header
          title={messages.staffPage.title}
          description={messages.staffPage.subtitle}
        />
        <QueryNoticeToast message={notice} />
        <ReportToolbar actionPath="/staff" selectedRange={selectedRange} fromDate={fromDate} toDate={toDate} />
        <PageActionStrip
          locale={locale}
          actions={[
            { label: messages.staffPage.createStaffProfile, href: "/staff/create", icon: UserPlus },
            {
              label: messages.common.recordedSalaryTransactions,
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
            trend="Paid this range"
            trendType="positive"
            icon={Wallet}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
            className="min-h-[168px]"
            href={baseStaffHref}
          />
          <SummaryCard
            title="Total Advance"
            value={formatCurrency(totalAdvance)}
            trend="Advance issued"
            trendType="negative"
            icon={CreditCard}
            iconBgColor="bg-red-50"
            iconColor="text-red-600"
            className="min-h-[168px]"
            href={baseStaffHref}
          />
          <SummaryCard
            title="Total Staff Expense"
            value={formatCurrency(totalStaffExpense)}
            trend="Salary outflow"
            trendType="neutral"
            icon={ReceiptText}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
            className="min-h-[168px]"
            href={baseStaffHref}
          />
          <SummaryCard
            title="Pending Salary"
            value={formatCurrency(totalPendingSalary)}
            trend="Still unpaid"
            trendType="neutral"
            icon={CalendarClock}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-600"
            className="min-h-[168px]"
            href={`${baseStaffHref}&salary_status=pending`}
          />
          <SummaryCard
            title="Staff With Balance"
            value={`${staffWithRemainingBalance}`}
            trend="Open ledgers"
            trendType={staffWithRemainingBalance > 0 ? "negative" : "positive"}
            icon={UserRound}
            iconBgColor="bg-slate-100"
            iconColor="text-slate-700"
            className="min-h-[168px]"
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
              <form action="/staff" method="get" className="mt-4 space-y-3">
                <input type="hidden" name="range" value={selectedRange} />
                <input type="hidden" name="from" value={fromDate} />
                <input type="hidden" name="to" value={toDate} />
                {salaryStatus !== "ALL" ? <input type="hidden" name="salary_status" value={salaryStatus} /> : null}
                {activeStaffId ? <input type="hidden" name="staff" value={activeStaffId} /> : null}
                {activeTab !== "overview" ? <input type="hidden" name="tab" value={activeTab} /> : null}
                {staffFilter !== "ALL" ? <input type="hidden" name="staff_filter" value={staffFilter} /> : null}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    name="staff_q"
                    defaultValue={staffSearch}
                    placeholder="Search staff name or code"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </form>
              <form action="/staff" method="get" className="mt-3">
                <input type="hidden" name="range" value={selectedRange} />
                <input type="hidden" name="from" value={fromDate} />
                <input type="hidden" name="to" value={toDate} />
                {salaryStatus !== "ALL" ? <input type="hidden" name="salary_status" value={salaryStatus} /> : null}
                {activeStaffId ? <input type="hidden" name="staff" value={activeStaffId} /> : null}
                {activeTab !== "overview" ? <input type="hidden" name="tab" value={activeTab} /> : null}
                {staffSearch ? <input type="hidden" name="staff_q" value={staffSearch} /> : null}
                <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <Filter className="h-3.5 w-3.5" />
                  Staff Filter
                </label>
                <AutoSubmitSelect
                  name="staff_filter"
                  defaultValue={staffFilter}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  {staffFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </AutoSubmitSelect>
              </form>
            </div>
            <div className="divide-y divide-slate-50">
              {searchedStaffProfiles.map((staff, index) => {
                const isActive = staff.id === activeStaffId;
                const staffSummary = staffSummaryMap.get(staff.id);

                return (
                  <Link
                    key={staff.id}
                    href={`${buildStaffPageHref({
                      staff: staff.id,
                      tab: activeTab === "overview" ? "" : activeTab,
                    })}`}
                    className={`block px-6 py-4 transition-colors hover:bg-blue-50/40 ${
                      isActive
                        ? "border-l-4 border-blue-600 bg-blue-50/50"
                        : index % 2 === 0
                          ? "bg-white"
                          : "bg-slate-50/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">{staff.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{staff.staff_code}</div>
                      </div>
                      <div className={`mt-1 h-2.5 w-2.5 rounded-full ${
                        staff.status === "ACTIVE" ? "bg-emerald-400" : "bg-slate-300"
                      }`} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      {staffSummary?.isPending ? (
                        <span className="rounded-full bg-red-50 px-2.5 py-1 font-semibold text-red-600">
                          {formatCurrency(staffSummary.totalRemainingAmount)} due
                        </span>
                      ) : null}
                      {staffSummary?.hasAdvance ? (
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700">
                          Advance taken
                        </span>
                      ) : null}
                      {staffSummary?.isPaid ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                          Paid
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-2 text-sm text-slate-600">
                      Base Salary: {formatCurrency(staff.total_salary)}
                    </div>
                  </Link>
                );
              })}

              {searchedStaffProfiles.length === 0 && (
                <div className="p-6">
                  <EmptyState
                    icon={UserRound}
                    title="No staff found"
                    description="Try a different search or filter, or create a new staff profile."
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
                  {activeStaff ? (
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                        {activeStaff.staff_code}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                        {activeStaff.status}
                      </span>
                    </div>
                  ) : null}
                </div>
                {activeStaff ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      href={`/staff/create?edit=${activeStaff.id}`}
                      variant="ghost"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit Profile
                    </Button>
                    <Button
                      href={`/staff/payment/create?staff=${activeStaff.id}&type=ADVANCE`}
                    >
                      <HandCoins className="h-4 w-4" />
                      Add Advance
                    </Button>
                    <Button
                      href={`/staff/payment/create?staff=${activeStaff.id}&type=SALARY`}
                      variant="secondary"
                    >
                      <Banknote className="h-4 w-4" />
                      Add Salary Payment
                    </Button>
                  </div>
                ) : null}
              </div>

              {activeStaff ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{messages.staffPage.monthlySalary}</div>
                      <div className="mt-2 font-semibold text-slate-900">
                        {formatCurrency(activeStaff.total_salary)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-blue-500">{messages.staffPage.payableSalary}</div>
                      <div className="mt-2 font-semibold text-blue-700">
                        {formatCurrency(currentLedger?.payable_amount ?? 0)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-emerald-500">{messages.staffPage.paidSoFar}</div>
                      <div className="mt-2 font-semibold text-blue-700">
                        {formatCurrency(currentLedger?.total_paid ?? 0)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-rose-500">{messages.staffPage.balanceDue}</div>
                      <div className="mt-2 font-semibold text-rose-700">
                        {formatCurrency(currentLedger?.remaining ?? 0)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-2">
                    {staffTabs.map((tab) => {
                      const isActiveTab = activeTab === tab.value;

                      return (
                        <Link
                          key={tab.value}
                          href={buildStaffPageHref({ tab: tab.value === "overview" ? "" : tab.value })}
                          className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                            isActiveTab
                              ? "bg-blue-600 text-white"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          }`}
                        >
                          {tab.label}
                        </Link>
                      );
                    })}
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

            {activeTab === "overview" ? (
              <>
                <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <div className="border-b border-slate-50 p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">This Month Summary</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Snapshot of the current staff ledger period.
                        </p>
                      </div>
                      {currentLedger ? (
                        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                          {getStaffMonthLabel(currentLedger.month, currentLedger.year, locale)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-4">
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Salary</div>
                      <div className="mt-2 text-lg font-bold text-slate-900">
                        {formatCurrency(currentLedger?.base_salary ?? 0)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-amber-500">Advance</div>
                      <div className="mt-2 text-lg font-bold text-amber-700">
                        {formatCurrency(currentLedger?.total_advance ?? 0)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-blue-500">Total Paid</div>
                      <div className="mt-2 text-lg font-bold text-blue-700">
                        {formatCurrency(currentLedger?.total_paid ?? 0)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-rose-500">Balance Due</div>
                      <div className="mt-2 text-lg font-bold text-rose-700">
                        {formatCurrency(currentLedger?.remaining ?? 0)}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                  <div className="border-b border-slate-50 p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Recent Activity</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          Latest staff salary activity in the selected range.
                        </p>
                      </div>
                      {activeStaffTransactions.length > 0 ? (
                        <Link
                          href={buildStaffPageHref({ tab: "transactions" })}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                        >
                          View All
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {overviewTransactions.length > 0 ? (
                      overviewTransactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between gap-4 px-6 py-4">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">
                              {transaction.type === "SALARY" ? "Salary payment" : "Advance payment"}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {formatBsDisplayDate(transaction.transaction_date)} • {getStaffMonthLabel(transaction.month, transaction.year, locale)}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-blue-700">
                            {formatCurrency(transaction.amount)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="px-6 py-10 text-center text-sm text-slate-500">
                        No salary transactions recorded for this staff member in the selected range.
                      </div>
                    )}
                  </div>
                </section>
              </>
            ) : null}

            {activeTab === "ledger" ? (
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
                      <Button
                        href="#staff-transactions"
                        variant="secondary"
                        size="sm"
                      >
                        View Transactions
                      </Button>
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
                        <td className="px-6 py-4 text-sm text-slate-600">{getStaffMonthLabel(ledger.month, ledger.year, locale)}</td>
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
                          {getStatusLabel(ledger.status, locale)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex flex-wrap justify-end gap-2">
                            <Link
                              href={`/staff/payment/create?staff=${ledger.staff_id}&type=ADVANCE&month=${ledger.month}&year=${ledger.year}`}
                              className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100"
                            >
                              Add Advance
                            </Link>
                            <Link
                              href={`/staff/payment/create?staff=${ledger.staff_id}&type=SALARY&month=${ledger.month}&year=${ledger.year}`}
                              className="inline-flex items-center rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                            >
                              Pay
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
            ) : null}

            {activeTab === "transactions" ? (
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
                        <td className="px-6 py-4 text-sm text-slate-600">{getStaffMonthLabel(transaction.month, transaction.year, locale)}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {transaction.transaction_date
                            ? formatBsDisplayDate(transaction.transaction_date)
                            : "-"}
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                          {transaction.type === "SALARY" ? `${getStatusLabel("SALARY", locale)} Payment` : getStatusLabel("ADVANCE", locale)}
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
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
