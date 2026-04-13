import { ArrowLeft, LayoutList, UserPlus } from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { StaffTransactionsTable } from "@/components/staff/StaffTransactionsTable";
import { PageActionStrip } from "@/components/shared/PageActionStrip";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { QueryNoticeToast } from "@/components/shared/QueryNoticeToast";
import { ReportToolbar } from "@/components/shared/ReportToolbar";
import { getMessages, getStaffMonthLabel } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { formatBsDisplayDate, getNepalTodayAd } from "@/lib/nepali-date";
import { formatCurrency } from "@/lib/presentation";
import { recalculateStaffLedgerSnapshots } from "@/lib/staff-payroll";
import { getSupabaseClient } from "@/lib/supabase/server";

const parsePage = (value: string | string[] | undefined) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const PAGE_SIZE = 10;
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

export default async function RecordedSalaryTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const locale = await getServerLocale(params.lang);
  const messages = getMessages(locale);
  const notice = typeof params.notice === "string" ? params.notice : "";
  const search = typeof params.q === "string" ? params.q.trim() : "";
  const transactionType = typeof params.type === "string" ? params.type : "ALL";
  const month = typeof params.month === "string" ? params.month : "ALL";
  const sort = typeof params.sort === "string" ? params.sort : "latest";
  const selectedRange = typeof params.range === "string" ? params.range : "year";
  const todayDate = getNepalTodayAd();
  const defaultRange = getDateRange(selectedRange, todayDate);
  const fromDate = typeof params.from === "string" && params.from ? params.from : defaultRange.from;
  const toDate = typeof params.to === "string" && params.to ? params.to : defaultRange.to;
  const currentPage = parsePage(params.page);
  const perPage = (() => {
    const rawValue = typeof params.perPage === "string" ? Number(params.perPage) : PAGE_SIZE;
    return [10, 25, 50].includes(rawValue) ? rawValue : PAGE_SIZE;
  })();

  const supabase = await getSupabaseClient();
  const [staffProfilesResponse, ledgersResponse, transactionsResponse] = await Promise.all([
    supabase
      .from("staff_profiles")
      .select("id, staff_code, name")
      .order("name"),
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
  const snapshots = recalculateStaffLedgerSnapshots(
    ledgersResponse.data ?? [],
    transactionsResponse.data ?? [],
  );
  const staffMap = new Map(
    staffProfiles.map((staff) => [
      staff.id,
      { name: staff.name ?? "Staff", code: staff.staff_code ?? "-" },
    ]),
  );

  const rangedTransactions = snapshots.transactions.filter((transaction) =>
    isWithinRange(transaction.transaction_date, fromDate, toDate),
  );
  const searchedTransactions = search
    ? rangedTransactions.filter((transaction) => {
        const staff = staffMap.get(transaction.staff_id);
        const haystack = `${staff?.name ?? ""} ${staff?.code ?? ""}`.toLowerCase();
        return haystack.includes(search.toLowerCase());
      })
    : rangedTransactions;
  const typeFilteredTransactions =
    transactionType === "ALL"
      ? searchedTransactions
      : searchedTransactions.filter((transaction) => transaction.type === transactionType);
  const monthFilteredTransactions =
    month === "ALL"
      ? typeFilteredTransactions
      : typeFilteredTransactions.filter((transaction) => transaction.period_key === month);

  const sortedTransactions = [...monthFilteredTransactions].sort((left, right) => {
    if (sort === "oldest") {
      return (left.transaction_date ?? "").localeCompare(right.transaction_date ?? "");
    }

    if (sort === "name_asc") {
      const leftName = staffMap.get(left.staff_id)?.name ?? "";
      const rightName = staffMap.get(right.staff_id)?.name ?? "";
      return leftName.localeCompare(rightName);
    }

    if (sort === "amount_desc") {
      return Number(right.amount ?? 0) - Number(left.amount ?? 0);
    }

    if (sort === "amount_asc") {
      return Number(left.amount ?? 0) - Number(right.amount ?? 0);
    }

    return (right.transaction_date ?? "").localeCompare(left.transaction_date ?? "");
  });

  const totalPages = Math.max(Math.ceil(sortedTransactions.length / perPage), 1);
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTransactions = sortedTransactions.slice(
    (safeCurrentPage - 1) * perPage,
    safeCurrentPage * perPage,
  );

  const rows = paginatedTransactions.map((transaction) => {
    const staff = staffMap.get(transaction.staff_id);

    return {
      id: transaction.id,
      transactionId: `SAL-${transaction.id.slice(0, 8).toUpperCase()}`,
      date: formatBsDisplayDate(transaction.transaction_date),
      staffId: transaction.staff_id,
      staffName: staff?.name ?? "Staff",
      staffCode: staff?.code ?? "-",
      salaryMonth: getStaffMonthLabel(transaction.month, transaction.year, locale),
      periodKey: transaction.period_key,
      type: transaction.type,
      amount: formatCurrency(transaction.amount),
      note: transaction.note ?? "",
      ledgerStatus: transaction.remaining_after > 0 ? "OPEN" : "CLOSED",
    };
  });

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
        <Header
          title={messages.common.recordedSalaryTransactions}
          description="Dedicated view of salary advances and salary payments with filters, search, and pagination."
        />
        <QueryNoticeToast message={notice} />
        <ReportToolbar
          actionPath="/staff/view"
          selectedRange={selectedRange}
          fromDate={fromDate}
          toDate={toDate}
        />
        <PageActionStrip
          locale={locale}
          actions={[
            { label: messages.staffPage.createStaffProfile, href: "/staff/create", icon: UserPlus },
            {
              label: "Staff Overview",
              href: "/staff",
              variant: "secondary",
              icon: ArrowLeft,
            },
            {
              label: messages.common.recordedSalaryTransactions,
              href: "/staff/view",
              variant: "secondary",
              icon: LayoutList,
            },
          ]}
        />

        <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Transactions
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">{sortedTransactions.length}</div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Salary Payments
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {formatCurrency(
                sortedTransactions
                  .filter((transaction) => transaction.type === "SALARY")
                  .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0),
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Advance Payments
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {formatCurrency(
                sortedTransactions
                  .filter((transaction) => transaction.type === "ADVANCE")
                  .reduce((sum, transaction) => sum + Number(transaction.amount ?? 0), 0),
              )}
            </div>
          </div>
        </div>

        <StaffTransactionsTable
          transactions={rows}
          totalCount={sortedTransactions.length}
          search={search}
          transactionType={transactionType}
          month={month}
          sort={sort}
          perPage={perPage}
          locale={locale}
        />
        <PaginationControls
          basePath="/staff/view"
          pageParam="page"
          currentPage={safeCurrentPage}
          totalPages={totalPages}
          totalItems={sortedTransactions.length}
          pageSize={perPage}
          searchParams={params}
        />
      </main>
    </div>
  );
}
