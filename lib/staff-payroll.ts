export const STAFF_MONTH_OPTIONS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

export type StaffLedgerRecord = {
  id: string;
  staff_id: string;
  month: number;
  year: number;
  base_salary: number | null;
  working_days?: number | null;
  leave_days?: number | null;
  total_advance?: number | null;
  salary_paid?: number | null;
  total_paid?: number | null;
  remaining?: number | null;
  carry_forward?: number | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type StaffSalaryTransactionRecord = {
  id: string;
  staff_id: string;
  ledger_id: string;
  transaction_date?: string | null;
  type?: string | null;
  amount?: number | null;
  note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type StaffLedgerSnapshot = StaffLedgerRecord & {
  month_label: string;
  period_key: string;
  carry_in: number;
  payable_amount: number;
  total_advance: number;
  salary_paid: number;
  total_paid: number;
  remaining: number;
  carry_forward: number;
  status: "OPEN" | "CLOSED";
};

export type StaffTransactionSnapshot = StaffSalaryTransactionRecord & {
  month: number;
  year: number;
  month_label: string;
  period_key: string;
  previous_paid: number;
  paid_now: number;
  total_paid_after: number;
  remaining_after: number;
  carry_forward_after: number;
  type: "ADVANCE" | "SALARY";
};

const monthOrderValue = (month: number, year: number) => year * 100 + month;

export const getStaffMonthLabel = (month: number, year?: number) => {
  const monthName =
    STAFF_MONTH_OPTIONS.find((option) => option.value === month)?.label ?? `Month ${month}`;
  return typeof year === "number" ? `${monthName} ${year}` : monthName;
};

export const getLedgerPeriodKey = (month: number, year: number) =>
  `${year}-${String(month).padStart(2, "0")}`;

export const sortLedgerPeriods = <T extends { month: number; year: number }>(entries: T[]) =>
  [...entries].sort(
    (left, right) => monthOrderValue(left.month, left.year) - monthOrderValue(right.month, right.year),
  );

export const recalculateStaffLedgerSnapshots = (
  ledgers: StaffLedgerRecord[],
  transactions: StaffSalaryTransactionRecord[],
) => {
  const sortedLedgers = sortLedgerPeriods(ledgers);
  const transactionsByLedger = new Map<string, StaffSalaryTransactionRecord[]>();

  transactions.forEach((transaction) => {
    const bucket = transactionsByLedger.get(transaction.ledger_id) ?? [];
    bucket.push(transaction);
    transactionsByLedger.set(transaction.ledger_id, bucket);
  });

  const ledgerSnapshots: StaffLedgerSnapshot[] = [];
  const transactionSnapshots: StaffTransactionSnapshot[] = [];
  let carryIn = 0;

  sortedLedgers.forEach((ledger) => {
    const monthTransactions = [...(transactionsByLedger.get(ledger.id) ?? [])].sort((left, right) =>
      new Date(left.created_at ?? left.transaction_date ?? 0).getTime() -
      new Date(right.created_at ?? right.transaction_date ?? 0).getTime(),
    );
    const baseSalary = Math.max(Number(ledger.base_salary ?? 0), 0);
    const payableAmount = Math.max(baseSalary - carryIn, 0);
    const totalAdvance = monthTransactions.reduce(
      (sum, transaction) =>
        sum + (transaction.type === "ADVANCE" ? Number(transaction.amount ?? 0) : 0),
      0,
    );
    const salaryPaid = monthTransactions.reduce(
      (sum, transaction) =>
        sum + (transaction.type === "SALARY" ? Number(transaction.amount ?? 0) : 0),
      0,
    );
    const totalPaid = totalAdvance + salaryPaid;
    const remaining = Math.max(payableAmount - totalPaid, 0);
    const carryForward = Math.max(totalPaid - payableAmount, 0);
    const snapshot: StaffLedgerSnapshot = {
      ...ledger,
      month_label: getStaffMonthLabel(ledger.month, ledger.year),
      period_key: getLedgerPeriodKey(ledger.month, ledger.year),
      carry_in: carryIn,
      payable_amount: payableAmount,
      total_advance: totalAdvance,
      salary_paid: salaryPaid,
      total_paid: totalPaid,
      remaining,
      carry_forward: carryForward,
      status: remaining <= 0 ? "CLOSED" : "OPEN",
    };

    let runningPaid = 0;
    monthTransactions.forEach((transaction) => {
      const paidNow = Math.max(Number(transaction.amount ?? 0), 0);
      const previousPaid = runningPaid;
      runningPaid += paidNow;
      transactionSnapshots.push({
        ...transaction,
        month: ledger.month,
        year: ledger.year,
        month_label: snapshot.month_label,
        period_key: snapshot.period_key,
        previous_paid: previousPaid,
        paid_now: paidNow,
        total_paid_after: runningPaid,
        remaining_after: Math.max(payableAmount - runningPaid, 0),
        carry_forward_after: Math.max(runningPaid - payableAmount, 0),
        type: transaction.type === "SALARY" ? "SALARY" : "ADVANCE",
      });
    });

    ledgerSnapshots.push(snapshot);
    carryIn = carryForward;
  });

  return {
    ledgers: ledgerSnapshots,
    transactions: transactionSnapshots.sort(
      (left, right) =>
        new Date(right.created_at ?? right.transaction_date ?? 0).getTime() -
        new Date(left.created_at ?? left.transaction_date ?? 0).getTime(),
    ),
  };
};

export const getPreviousLedgerPeriod = (month: number, year: number) => {
  if (month === 1) {
    return { month: 12, year: year - 1 };
  }

  return { month: month - 1, year };
};
