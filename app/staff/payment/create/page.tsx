import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { StaffSalaryPaymentForm } from "@/components/staff/StaffSalaryPaymentForm";
import { QueryNoticeToast } from "@/components/shared/QueryNoticeToast";
import { adToBs, getBsDateParts } from "@/lib/nepali-date";
import { getSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const getTodayDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
  }).format(new Date());

export default async function CreateStaffPaymentPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await getSupabaseClient();
  const params = await searchParams;
  const editId = typeof params.edit === "string" ? params.edit : "";
  const preselectedStaffId = typeof params.staff === "string" ? params.staff : "";
  const notice = typeof params.notice === "string" ? params.notice : "";
  const todayDate = getTodayDate();
  const todayBs = adToBs(todayDate);
  const todayBsParts = getBsDateParts(todayBs);
  const defaultYear = todayBsParts.year || 2080;
  const defaultMonth = todayBsParts.month || 1;
  const preselectedMonth = typeof params.month === "string" ? Number(params.month) : defaultMonth;
  const preselectedYear = typeof params.year === "string" ? Number(params.year) : defaultYear;

  const [staffProfilesResponse, ledgersResponse, transactionsResponse] = await Promise.all([
    supabase
      .from("staff_profiles")
      .select("id, staff_code, name, total_salary")
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
  const ledgers = ledgersResponse.data ?? [];
  const transactions = transactionsResponse.data ?? [];
  const editingTransaction = editId
    ? (() => {
        const transaction = transactions.find((payment) => payment.id === editId);
        if (!transaction) return null;
        const ledger = ledgers.find((entry) => entry.id === transaction.ledger_id);
        if (!ledger) return null;

        return {
          id: transaction.id,
          staff_id: transaction.staff_id,
          ledger_id: transaction.ledger_id,
          month: ledger.month,
          year: ledger.year,
          base_salary: Number(ledger.base_salary ?? 0),
          working_days: Number(ledger.working_days ?? 30),
          leave_days: Number(ledger.leave_days ?? 0),
          transaction_date: transaction.transaction_date ?? todayDate,
          type: transaction.type ?? "ADVANCE",
          amount: Number(transaction.amount ?? 0),
          note: transaction.note ?? "",
        };
      })()
    : null;
  const seededTransaction = preselectedStaffId
    ? {
        id: "",
        staff_id: preselectedStaffId,
        ledger_id: "",
        month: Number.isFinite(preselectedMonth) ? preselectedMonth : defaultMonth,
        year: Number.isFinite(preselectedYear) ? preselectedYear : defaultYear,
        transaction_date: todayDate,
        type: typeof params.type === "string" && params.type === "SALARY" ? "SALARY" : "ADVANCE",
        working_days: 30,
        leave_days: 0,
        base_salary:
          staffProfiles.find((staff) => staff.id === preselectedStaffId)?.total_salary ?? 0,
        amount: 0,
        note: "",
      }
    : null;
  const resolvedEditingTransaction = editingTransaction ?? seededTransaction;

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <Header
          title={editingTransaction?.id ? "Update Salary Transaction" : "Add Salary Transaction"}
          description="Record a simple staff advance or salary payment against the correct monthly ledger."
        />
        <QueryNoticeToast message={notice} />

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">
              {editingTransaction?.id ? "Update Salary Transaction" : "Add Salary Transaction"}
            </h3>
            <p className="text-sm text-slate-500">
              Keep one ledger per staff per month, and store each advance or salary payment as a transaction.
            </p>
          </div>

          <StaffSalaryPaymentForm
            staffProfiles={staffProfiles}
            editingTransaction={resolvedEditingTransaction}
            defaultDate={todayDate}
            redirectTo="/staff"
            ledgers={ledgers}
            transactions={transactions}
          />
        </section>
      </main>
    </div>
  );
}
