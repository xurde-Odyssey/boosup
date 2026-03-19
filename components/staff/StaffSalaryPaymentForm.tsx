"use client";

import { useMemo, useState } from "react";
import { upsertStaffSalaryPayment } from "@/app/actions";
import { NepaliDateInput } from "@/components/shared/NepaliDateInput";
import { adToBs, bsToAd, formatBsDisplayDate } from "@/lib/nepali-date";
import { formatCurrency } from "@/lib/presentation";

type StaffOption = {
  id: string;
  name: string;
  staff_code: string;
  total_salary: number | null;
};

type EditingSalaryPayment = {
  id: string;
  staff_id: string;
  salary_month_bs: string;
  payment_date: string;
  working_days: number | null;
  leave_days: number | null;
  monthly_salary: number | null;
  advance_payment: number | null;
  notes: string | null;
} | null;

type SalaryHistoryItem = {
  id: string;
  staff_id: string;
  salary_month_bs: string;
  payment_date?: string | null;
  working_days?: number | null;
  leave_days?: number | null;
  monthly_payment?: number | null;
  advance_payment: number | null;
  notes?: string | null;
  created_at?: string | null;
};

const toNumber = (value: string) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const toWholeNumber = (value: string, fallback = 0) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return String(fallback);
  }

  return String(Math.max(Math.trunc(numericValue), 0));
};

export function StaffSalaryPaymentForm({
  staffProfiles,
  editingPayment,
  defaultDate,
  redirectTo = "/staff",
  salaryHistory = [],
}: {
  staffProfiles: StaffOption[];
  editingPayment: EditingSalaryPayment;
  defaultDate: string;
  redirectTo?: string;
  salaryHistory?: SalaryHistoryItem[];
}) {
  const [staffId, setStaffId] = useState(editingPayment?.staff_id ?? "");
  const [salaryMonthBs, setSalaryMonthBs] = useState(
    editingPayment?.salary_month_bs ?? adToBs(defaultDate).slice(0, 7),
  );
  const [paymentDateBs, setPaymentDateBs] = useState(
    adToBs(editingPayment?.payment_date ?? defaultDate),
  );
  const [workingDays, setWorkingDays] = useState(String(editingPayment?.working_days ?? 30));
  const [leaveDays, setLeaveDays] = useState(String(editingPayment?.leave_days ?? 0));
  const [monthlySalary, setMonthlySalary] = useState(String(editingPayment?.monthly_salary ?? 0));
  const [advancePayment, setAdvancePayment] = useState(
    String(editingPayment?.advance_payment ?? 0),
  );
  const [notes, setNotes] = useState(editingPayment?.notes ?? "");

  const activeStaff = useMemo(
    () => staffProfiles.find((staff) => staff.id === staffId) ?? null,
    [staffId, staffProfiles],
  );
  const previousPaid = useMemo(() => {
    if (!staffId || !salaryMonthBs) {
      return 0;
    }

    return salaryHistory
      .filter(
        (entry) =>
          entry.staff_id === staffId &&
          entry.salary_month_bs === salaryMonthBs &&
          entry.id !== editingPayment?.id,
      )
      .reduce((sum, entry) => sum + Number(entry.advance_payment ?? 0), 0);
  }, [editingPayment?.id, salaryHistory, salaryMonthBs, staffId]);

  const normalizedWorkingDays = Math.max(toNumber(workingDays), 1);
  const normalizedLeaveDays = Math.min(Math.max(toNumber(leaveDays), 0), normalizedWorkingDays);
  const baseMonthlySalary = toNumber(monthlySalary);
  const monthlyPayment = Number(
    ((baseMonthlySalary * Math.max(normalizedWorkingDays - normalizedLeaveDays, 0)) /
      normalizedWorkingDays).toFixed(2),
  );
  const paymentNow = toNumber(advancePayment);
  const remainingPayment = Math.max(monthlyPayment - previousPaid - paymentNow, 0);
  const paymentDate = bsToAd(paymentDateBs);
  const recentHistory = useMemo(() => {
    if (!staffId) {
      return [];
    }

    const filteredHistory = salaryHistory
      .filter((entry) => entry.staff_id === staffId && entry.id !== editingPayment?.id)
      .sort((left, right) => {
        const leftTime = new Date(left.created_at ?? left.payment_date ?? 0).getTime();
        const rightTime = new Date(right.created_at ?? right.payment_date ?? 0).getTime();
        return leftTime - rightTime;
      });

    const runningPaidByMonth = new Map<string, number>();

    return filteredHistory
      .map((entry) => {
        const monthKey = entry.salary_month_bs || "default";
        const previousMonthPaid = runningPaidByMonth.get(monthKey) ?? 0;
        const paidNowAmount = Number(entry.advance_payment ?? 0);
        const totalPaidForMonth = previousMonthPaid + paidNowAmount;
        const monthlyDue = Number(entry.monthly_payment ?? 0);
        const remainingForMonth = Math.max(monthlyDue - totalPaidForMonth, 0);

        runningPaidByMonth.set(monthKey, totalPaidForMonth);

        return {
          ...entry,
          previous_paid: previousMonthPaid,
          paid_now: paidNowAmount,
          remaining_payment: remainingForMonth,
        };
      })
      .reverse()
      .slice(0, 6);
  }, [editingPayment?.id, salaryHistory, staffId]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <form action={upsertStaffSalaryPayment} autoComplete="off" className="space-y-4">
        <input type="hidden" name="id" defaultValue={editingPayment?.id ?? ""} />
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
              setStaffId(nextStaffId);
              const nextStaff = staffProfiles.find((staff) => staff.id === nextStaffId);
              if (nextStaff && !editingPayment) {
                setMonthlySalary(String(nextStaff.total_salary ?? 0));
                setAdvancePayment("0");
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Salary Month (BS)</label>
            <input
              name="salary_month_bs"
              required
              value={salaryMonthBs}
              onChange={(event) => setSalaryMonthBs(event.target.value.replace(/[.-]/g, "/"))}
              placeholder="2082/12"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Payment Date (BS)</label>
            <NepaliDateInput value={paymentDateBs} onChange={setPaymentDateBs} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Base Monthly Salary</label>
            <input
              name="monthly_salary"
              type="number"
              min="0"
              step="0.01"
              value={monthlySalary}
              onChange={(event) => setMonthlySalary(event.target.value)}
              placeholder="Enter monthly salary"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
            {activeStaff ? (
              <div className="mt-2 text-xs text-slate-500">
                Default salary from profile: {formatCurrency(activeStaff.total_salary)}
              </div>
            ) : null}
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Payment Now</label>
            <input
              name="advance_payment"
              type="number"
              min="0"
              step="0.01"
              value={advancePayment}
              onChange={(event) => setAdvancePayment(event.target.value)}
              placeholder="Salary paid in this transaction"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
            <div className="mt-2 text-xs text-slate-500">
              Enter the amount being paid now for this salary month.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Working Days</label>
            <input
              name="working_days"
              type="number"
              min="1"
              step="1"
              value={workingDays}
              onChange={(event) => setWorkingDays(toWholeNumber(event.target.value, 30))}
              placeholder="30"
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
              placeholder="0"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Previously Paid</label>
            <input
              type="text"
              readOnly
              value={formatCurrency(previousPaid)}
              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none"
            />
            <div className="mt-2 text-xs text-slate-500">
              Total already paid for this staff and salary month.
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Monthly Payment</label>
            <input
              type="text"
              readOnly
              value={formatCurrency(monthlyPayment)}
              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none"
            />
            <div className="mt-2 text-xs text-slate-500">
              Salary is prorated using working days and leave for the selected month.
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Remaining Payment</label>
            <input
              type="text"
              readOnly
              value={formatCurrency(remainingPayment)}
              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none"
            />
            <div className="mt-2 text-xs text-slate-500">
              Remaining payment after this entry = monthly payment minus previously paid and payment now.
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Notes</label>
          <textarea
            name="notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Optional payroll note"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            className="flex-1 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
          >
            {editingPayment ? "Update Salary Entry" : "Save Salary Entry"}
          </button>
        </div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/40 shadow-sm xl:self-start">
        <div className="border-b border-slate-50 px-6 py-5">
          <h3 className="text-lg font-bold text-slate-900">Recent Salary Transaction History</h3>
          <p className="mt-1 text-xs text-slate-500">
            Latest salary transactions for the selected staff member.
          </p>
        </div>

        {staffId ? (
          recentHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="bg-slate-50 px-6 py-4">Salary Month</th>
                    <th className="bg-slate-50 px-6 py-4">Payment Date</th>
                    <th className="bg-slate-50 px-6 py-4">Previously Paid</th>
                    <th className="bg-slate-50 px-6 py-4">Paid Now</th>
                    <th className="bg-slate-50 px-6 py-4">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentHistory.map((entry, index) => (
                    <tr
                      key={entry.id}
                      className={`${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      } transition-colors hover:bg-blue-50/40`}
                    >
                      <td className="px-6 py-4 text-sm text-slate-600">{entry.salary_month_bs}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {entry.payment_date ? formatBsDisplayDate(entry.payment_date) : "-"}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-700">
                        {formatCurrency(entry.previous_paid)}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-blue-700">
                        {formatCurrency(entry.paid_now)}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-green-700">
                        {formatCurrency(entry.remaining_payment)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-6 py-10 text-center text-sm text-slate-500">
              No salary transactions found for the selected staff yet.
            </div>
          )
        ) : (
          <div className="px-6 py-10 text-center text-sm text-slate-500">
            Select a staff member to view their recent salary transaction history.
          </div>
        )}
      </section>
    </div>
  );
}
