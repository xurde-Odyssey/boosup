import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { StaffSalaryPaymentForm } from "@/components/staff/StaffSalaryPaymentForm";
import { QueryNoticeToast } from "@/components/shared/QueryNoticeToast";
import { adToBs } from "@/lib/nepali-date";
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
  const currentSalaryMonthBs = adToBs(todayDate).slice(0, 7);

  const [staffProfilesResponse, staffPaymentsResponse] = await Promise.all([
    supabase
      .from("staff_profiles")
      .select("id, staff_code, name, total_salary")
      .order("name"),
    supabase
      .from("staff_salary_payments")
      .select(
        "id, staff_id, salary_month_bs, payment_date, payment_type, working_days, leave_days, monthly_salary, monthly_payment, advance_payment, notes, created_at",
      )
      .order("created_at", { ascending: false }),
  ]);

  const staffProfiles = staffProfilesResponse.data ?? [];
  const salaryHistory = staffPaymentsResponse.data ?? [];
  const editingPayment = editId
    ? salaryHistory.find((payment) => payment.id === editId) ?? null
    : null;
  const seededPayment = preselectedStaffId
    ? {
        id: "",
        staff_id: preselectedStaffId,
        salary_month_bs: currentSalaryMonthBs,
        payment_date: todayDate,
        payment_type: "ADVANCE",
        working_days: 30,
        leave_days: 0,
        monthly_salary:
          staffProfiles.find((staff) => staff.id === preselectedStaffId)?.total_salary ?? 0,
        advance_payment: 0,
        notes: "",
      }
    : null;
  const resolvedEditingPayment = editingPayment ?? seededPayment;

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <Header
          title={editingPayment?.id ? "Update Salary Entry" : "Add Salary Entry"}
          description="Create or update a monthly salary record on its own page, separate from the staff dashboard."
        />
        <QueryNoticeToast message={notice} />

        <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">
              {editingPayment?.id ? "Update Salary Entry" : "Add Monthly Salary Entry"}
            </h3>
            <p className="text-sm text-slate-500">
              Record monthly due salary, advance taken during the month, payday settlements, and remaining balance.
            </p>
          </div>

          <StaffSalaryPaymentForm
            staffProfiles={staffProfiles}
            editingPayment={resolvedEditingPayment}
            defaultDate={todayDate}
            redirectTo="/staff"
            salaryHistory={salaryHistory}
          />
        </section>
      </main>
    </div>
  );
}
