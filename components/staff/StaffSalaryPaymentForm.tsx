"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { upsertStaffSalaryPayment } from "@/app/actions";
import { NepaliDateInput } from "@/components/shared/NepaliDateInput";
import { adToBs, bsToAd, formatBsDisplayDate, getBsDateParts } from "@/lib/nepali-date";
import { formatCurrency } from "@/lib/presentation";
import {
  getLedgerPeriodKey,
  recalculateStaffLedgerSnapshots,
  STAFF_MONTH_OPTIONS,
  StaffLedgerRecord,
  StaffSalaryTransactionRecord,
} from "@/lib/staff-payroll";

type StaffOption = {
  id: string;
  name: string;
  staff_code: string;
  total_salary: number | null;
};

type EditingSalaryTransaction =
  | {
      id: string;
      staff_id: string;
      ledger_id: string;
      month: number;
      year: number;
      base_salary: number;
      working_days: number;
      leave_days: number;
      transaction_date: string;
      type: string;
      amount: number;
      note: string | null;
    }
  | null;

const toNumber = (value: string) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const toWholeNumber = (value: string, fallback = 0) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return String(fallback);
  return String(Math.max(Math.trunc(numericValue), 0));
};

export function StaffSalaryPaymentForm({
  staffProfiles,
  editingTransaction,
  defaultDate,
  redirectTo = "/staff",
  ledgers,
  transactions,
}: {
  staffProfiles: StaffOption[];
  editingTransaction: EditingSalaryTransaction;
  defaultDate: string;
  redirectTo?: string;
  ledgers: StaffLedgerRecord[];
  transactions: StaffSalaryTransactionRecord[];
}) {
  const defaultBsDate = adToBs(defaultDate);
  const defaultBsParts = getBsDateParts(defaultBsDate);
  const [staffId, setStaffId] = useState(editingTransaction?.staff_id ?? "");
  const [month, setMonth] = useState(
    String(editingTransaction?.month ?? defaultBsParts.month ?? 1),
  );
  const [year, setYear] = useState(
    String(editingTransaction?.year ?? defaultBsParts.year ?? 2080),
  );
  const [paymentDateBs, setPaymentDateBs] = useState(
    adToBs(editingTransaction?.transaction_date ?? defaultDate),
  );
  const [paymentType, setPaymentType] = useState(editingTransaction?.type ?? "ADVANCE");
  const [workingDays, setWorkingDays] = useState(String(editingTransaction?.working_days ?? 30));
  const [leaveDays, setLeaveDays] = useState(String(editingTransaction?.leave_days ?? 0));
  const [baseSalary, setBaseSalary] = useState(String(editingTransaction?.base_salary ?? 0));
  const [amount, setAmount] = useState(String(editingTransaction?.amount ?? 0));
  const [note, setNote] = useState(editingTransaction?.note ?? "");

  const selectedMonth = Math.max(Math.min(Math.trunc(toNumber(month)), 12), 1);
  const selectedYear = Math.max(Math.trunc(toNumber(year)), 2000);
  const normalizedWorkingDays = Math.max(Math.trunc(toNumber(workingDays)), 1);
  const normalizedLeaveDays = Math.min(
    Math.max(Math.trunc(toNumber(leaveDays)), 0),
    normalizedWorkingDays,
  );
  const normalizedBaseSalary = Math.max(toNumber(baseSalary), 0);
  const normalizedAmount = Math.max(toNumber(amount), 0);
  const paymentDate = bsToAd(paymentDateBs);

  const activeStaff = useMemo(
    () => staffProfiles.find((staff) => staff.id === staffId) ?? null,
    [staffId, staffProfiles],
  );

  const draftSnapshots = useMemo(() => {
    if (!staffId) {
      return { ledgers: [], transactions: [] };
    }

    const relevantLedgers = ledgers.filter((ledger) => ledger.staff_id === staffId);
    const relevantTransactions = transactions.filter(
      (transaction) => transaction.staff_id === staffId && transaction.id !== editingTransaction?.id,
    );
    const draftPeriodKey = getLedgerPeriodKey(selectedMonth, selectedYear);
    const existingLedger =
      relevantLedgers.find(
        (ledger) => getLedgerPeriodKey(ledger.month, ledger.year) === draftPeriodKey,
      ) ?? null;

    const nextLedgers = existingLedger
      ? relevantLedgers.map((ledger) =>
          ledger.id === existingLedger.id
            ? {
                ...ledger,
                base_salary: normalizedBaseSalary,
                working_days: normalizedWorkingDays,
                leave_days: normalizedLeaveDays,
              }
            : ledger,
        )
      : [
          ...relevantLedgers,
          {
            id: "draft-ledger",
            staff_id: staffId,
            month: selectedMonth,
            year: selectedYear,
            base_salary: normalizedBaseSalary,
            working_days: normalizedWorkingDays,
            leave_days: normalizedLeaveDays,
            total_advance: 0,
            salary_paid: 0,
            total_paid: 0,
            remaining: normalizedBaseSalary,
            carry_forward: 0,
            status: "OPEN",
          },
        ];

    const draftLedgerId = existingLedger?.id ?? "draft-ledger";
    const nextTransactions =
      normalizedAmount > 0
        ? [
            ...relevantTransactions,
            {
              id: editingTransaction?.id ?? "draft-transaction",
              staff_id: staffId,
              ledger_id: draftLedgerId,
              transaction_date: paymentDate,
              type: paymentType === "SALARY" ? "SALARY" : "ADVANCE",
              amount: normalizedAmount,
              note,
              created_at: paymentDate,
            },
          ]
        : relevantTransactions;

    return recalculateStaffLedgerSnapshots(nextLedgers, nextTransactions);
  }, [
    editingTransaction?.id,
    ledgers,
    normalizedAmount,
    normalizedBaseSalary,
    normalizedLeaveDays,
    normalizedWorkingDays,
    note,
    paymentDate,
    paymentType,
    selectedMonth,
    selectedYear,
    staffId,
    transactions,
  ]);

  const currentLedger = draftSnapshots.ledgers.find(
    (ledger) =>
      ledger.staff_id === staffId &&
      ledger.month === selectedMonth &&
      ledger.year === selectedYear,
  );
  const staffLedgerHistory = draftSnapshots.ledgers
    .filter((ledger) => ledger.staff_id === staffId)
    .sort((left, right) => right.period_key.localeCompare(left.period_key));
  const recentTransactions = draftSnapshots.transactions
    .filter((transaction) => transaction.staff_id === staffId)
    .slice(0, 8);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_460px]">
      <form action={upsertStaffSalaryPayment} autoComplete="off" className="space-y-4">
        <input type="hidden" name="id" defaultValue={editingTransaction?.id ?? ""} />
        <input type="hidden" name="redirect_to" value={redirectTo} />
        <input type="hidden" name="payment_date" value={paymentDate} />
        <input type="hidden" name="payment_date_bs" value={paymentDateBs} />

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Staff Member</label>
          <select
            name="staff_id"
            required
            value={staffId}
            onChange={(event) => {
              const nextStaffId = event.target.value;
              const nextStaff = staffProfiles.find((staff) => staff.id === nextStaffId) ?? null;
              setStaffId(nextStaffId);
              if (!editingTransaction) {
                setBaseSalary(String(nextStaff?.total_salary ?? 0));
              }
            }}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
          >
            <option value="">Select staff member</option>
            {staffProfiles.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name} ({staff.staff_code})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Month (BS)</label>
            <select
              name="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            >
              {STAFF_MONTH_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Year (BS)</label>
            <input
              name="year"
              type="number"
              min="2000"
              step="1"
              value={year}
              onChange={(event) => setYear(toWholeNumber(event.target.value, defaultBsParts.year || 2080))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Payment Date (BS)</label>
            <NepaliDateInput
              value={paymentDateBs}
              onChange={(nextValue) => {
                setPaymentDateBs(nextValue);
                const nextParts = getBsDateParts(nextValue);
                if (nextParts.month) setMonth(String(nextParts.month));
                if (nextParts.year) setYear(String(nextParts.year));
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Transaction Type</label>
            <select
              name="payment_type"
              value={paymentType}
              onChange={(event) => setPaymentType(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            >
              <option value="ADVANCE">Advance</option>
              <option value="SALARY">Salary Payment</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Amount</label>
            <input
              name="amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Enter paid amount"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Base Salary</label>
            <input
              name="base_salary"
              type="number"
              min="0"
              step="0.01"
              value={baseSalary}
              onChange={(event) => setBaseSalary(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
            {activeStaff ? (
              <div className="mt-2 text-xs text-slate-500">
                Default from staff profile: {formatCurrency(activeStaff.total_salary)}
              </div>
            ) : null}
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Working Days</label>
            <input
              name="working_days"
              type="number"
              min="1"
              step="1"
              value={workingDays}
              onChange={(event) => setWorkingDays(toWholeNumber(event.target.value, 30))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Leave Days</label>
            <input
              name="leave_days"
              type="number"
              min="0"
              step="1"
              value={leaveDays}
              onChange={(event) => setLeaveDays(toWholeNumber(event.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Carry In
            </div>
            <div className="mt-2 font-semibold text-amber-700">
              {formatCurrency(currentLedger?.carry_in ?? 0)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Payable This Month
            </div>
            <div className="mt-2 font-semibold text-slate-900">
              {formatCurrency(currentLedger?.payable_amount ?? normalizedBaseSalary)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Remaining
            </div>
            <div className="mt-2 font-semibold text-blue-700">
              {formatCurrency(currentLedger?.remaining ?? 0)}
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Note</label>
          <textarea
            name="note"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Optional note for this transaction"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            {editingTransaction
              ? "Update Salary Transaction"
              : paymentType === "SALARY"
                ? "Add Salary Payment"
                : "Add Advance"}
          </button>
          <Link
            href={redirectTo}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700"
          >
            Cancel
          </Link>
        </div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/40 shadow-sm xl:self-start">
        <div className="border-b border-slate-50 px-6 py-5">
          <h3 className="text-lg font-bold text-slate-900">Monthly Salary Ledger</h3>
          <p className="mt-1 text-xs text-slate-500">
            One ledger per month with advances, salary paid, remaining balance, and carry forward.
          </p>
        </div>

        {staffId ? (
          staffLedgerHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="bg-slate-50 px-6 py-4">Month</th>
                    <th className="bg-slate-50 px-6 py-4">Base</th>
                    <th className="bg-slate-50 px-6 py-4">Advance</th>
                    <th className="bg-slate-50 px-6 py-4">Salary Paid</th>
                    <th className="bg-slate-50 px-6 py-4">Remaining</th>
                    <th className="bg-slate-50 px-6 py-4">Carry Forward</th>
                    <th className="bg-slate-50 px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {staffLedgerHistory.map((ledger, index) => (
                    <tr
                      key={ledger.id}
                      className={`${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      } transition-colors hover:bg-blue-50/40`}
                    >
                      <td className="px-6 py-4 text-sm text-slate-600">{ledger.month_label}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                        {formatCurrency(ledger.base_salary)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-amber-700">
                        {formatCurrency(ledger.total_advance)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-blue-700">
                        {formatCurrency(ledger.salary_paid)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                        {formatCurrency(ledger.remaining)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-rose-700">
                        {formatCurrency(ledger.carry_forward)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-600">
                        {ledger.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              No salary ledger exists for the selected staff yet.
            </div>
          )
        ) : (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            Select a staff member to preview the monthly ledger.
          </div>
        )}

        {staffId && recentTransactions.length > 0 ? (
          <div className="border-t border-slate-50">
            <div className="px-6 py-5">
              <h4 className="text-base font-bold text-slate-900">Recent Transactions</h4>
              <p className="mt-1 text-xs text-slate-500">
                Every advance and salary payment is stored as a transaction log.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="bg-slate-50 px-6 py-4">Month</th>
                    <th className="bg-slate-50 px-6 py-4">Date</th>
                    <th className="bg-slate-50 px-6 py-4">Type</th>
                    <th className="bg-slate-50 px-6 py-4">Previous Paid</th>
                    <th className="bg-slate-50 px-6 py-4">Amount</th>
                    <th className="bg-slate-50 px-6 py-4">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentTransactions.map((transaction, index) => (
                    <tr
                      key={transaction.id}
                      className={`${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      } transition-colors hover:bg-blue-50/40`}
                    >
                      <td className="px-6 py-4 text-sm text-slate-600">{transaction.month_label}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {transaction.transaction_date
                          ? formatBsDisplayDate(transaction.transaction_date)
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                        {transaction.type === "SALARY" ? "Salary" : "Advance"}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-500">
                        {formatCurrency(transaction.previous_paid)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-blue-700">
                        {formatCurrency(transaction.paid_now)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-amber-700">
                        {formatCurrency(transaction.remaining_after)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
