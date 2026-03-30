type PayrollEntry = {
  id: string;
  staff_id: string;
  salary_month_bs: string;
  payment_date?: string | null;
  working_days?: number | null;
  leave_days?: number | null;
  monthly_salary?: number | null;
  advance_payment?: number | null;
  payment_type?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

export const computeMonthlyDue = ({
  workingDays,
  leaveDays,
  monthlySalary,
}: {
  workingDays: number;
  leaveDays: number;
  monthlySalary: number;
}) => {
  const safeWorkingDays = Math.max(Math.trunc(workingDays), 1);
  const safeLeaveDays = Math.min(Math.max(Math.trunc(leaveDays), 0), safeWorkingDays);
  const safeMonthlySalary = Math.max(monthlySalary, 0);

  return Number(
    (
      (safeMonthlySalary * Math.max(safeWorkingDays - safeLeaveDays, 0)) /
      safeWorkingDays
    ).toFixed(2),
  );
};

const getSortTime = (entry: { created_at?: string | null; payment_date?: string | null }) =>
  new Date(entry.created_at ?? entry.payment_date ?? 0).getTime();

const getSummarySortTime = (entry: {
  last_created_at?: string | null;
  last_payment_date?: string | null;
}) => new Date(entry.last_created_at ?? entry.last_payment_date ?? 0).getTime();

export const buildPayrollEntries = <T extends PayrollEntry>(entries: T[]) => {
  const sortedEntries = [...entries].sort((left, right) => getSortTime(left) - getSortTime(right));
  const paidByMonth = new Map<string, number>();

  return sortedEntries.map((entry) => {
    const monthKey = `${entry.staff_id}:${entry.salary_month_bs || "default"}`;
    const previousPaid = paidByMonth.get(monthKey) ?? 0;
    const dueSalary = computeMonthlyDue({
      workingDays: Number(entry.working_days ?? 30),
      leaveDays: Number(entry.leave_days ?? 0),
      monthlySalary: Number(entry.monthly_salary ?? 0),
    });
    const paidNow = Number(entry.advance_payment ?? 0);
    const totalPaid = previousPaid + paidNow;
    const remaining = Math.max(dueSalary - totalPaid, 0);

    paidByMonth.set(monthKey, totalPaid);

    return {
      ...entry,
      due_salary: dueSalary,
      previous_paid: previousPaid,
      paid_now: paidNow,
      total_paid: totalPaid,
      remaining_salary: remaining,
      payment_type: entry.payment_type ?? "ADVANCE",
    };
  });
};

export const buildPayrollMonthSummaries = <T extends PayrollEntry>(entries: T[]) => {
  const enrichedEntries = buildPayrollEntries(entries);
  const monthMap = new Map<
    string,
    {
      staff_id: string;
      salary_month_bs: string;
      due_salary: number;
      total_paid: number;
      remaining_salary: number;
      transaction_count: number;
      advance_paid: number;
      salary_paid: number;
      working_days: number;
      leave_days: number;
      last_payment_date: string | null;
      last_created_at: string | null;
    }
  >();

  enrichedEntries.forEach((entry) => {
    const monthKey = `${entry.staff_id}:${entry.salary_month_bs || "default"}`;
    const existing = monthMap.get(monthKey);
    const transactionTime = getSortTime(entry);

    if (!existing) {
      monthMap.set(monthKey, {
        staff_id: entry.staff_id,
        salary_month_bs: entry.salary_month_bs,
        due_salary: entry.due_salary,
        total_paid: entry.total_paid,
        remaining_salary: entry.remaining_salary,
        transaction_count: 1,
        advance_paid: entry.payment_type === "ADVANCE" ? entry.paid_now : 0,
        salary_paid: entry.payment_type === "SALARY" ? entry.paid_now : 0,
        working_days: Number(entry.working_days ?? 30),
        leave_days: Number(entry.leave_days ?? 0),
        last_payment_date: entry.payment_date ?? null,
        last_created_at: entry.created_at ?? entry.payment_date ?? null,
      });
      return;
    }

    existing.total_paid = entry.total_paid;
    existing.remaining_salary = entry.remaining_salary;
    existing.transaction_count += 1;
    existing.advance_paid += entry.payment_type === "ADVANCE" ? entry.paid_now : 0;
    existing.salary_paid += entry.payment_type === "SALARY" ? entry.paid_now : 0;

    if (transactionTime >= getSummarySortTime(existing)) {
      existing.due_salary = entry.due_salary;
      existing.working_days = Number(entry.working_days ?? existing.working_days);
      existing.leave_days = Number(entry.leave_days ?? existing.leave_days);
      existing.last_payment_date = entry.payment_date ?? existing.last_payment_date;
      existing.last_created_at = entry.created_at ?? entry.payment_date ?? existing.last_created_at;
    }
  });

  return Array.from(monthMap.values()).sort(
    (left, right) => getSummarySortTime(right) - getSummarySortTime(left),
  );
};
