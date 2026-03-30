"use client";

import { useMemo, useState } from "react";
import { upsertStaffSalaryPayment } from "@/app/actions";
import { NepaliDateInput } from "@/components/shared/NepaliDateInput";
import { adToBs, bsToAd, formatBsDisplayDate } from "@/lib/nepali-date";
import { formatCurrency } from "@/lib/presentation";
import {
  buildPayrollEntries,
  buildPayrollMonthSummaries,
  computeMonthlyDue,
} from "@/lib/staff-payroll";

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
  payment_type?: string | null;
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
  payment_type?: string | null;
  working_days?: number | null;
  leave_days?: number | null;
  monthly_salary?: number | null;
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
  const [paymentType, setPaymentType] = useState(editingPayment?.payment_type ?? "ADVANCE");
  const [workingDays, setWorkingDays] = useState(String(editingPayment?.working_days ?? 30));
  const [leaveDays, setLeaveDays] = useState(String(editingPayment?.leave_days ?? 0));
  const [monthlySalary, setMonthlySalary] = useState(String(editingPayment?.monthly_salary ?? 0));
  const [paidNow, setPaidNow] = useState(String(editingPayment?.advance_payment ?? 0));
  const [notes, setNotes] = useState(editingPayment?.notes ?? "");

  const activeStaff = useMemo(
    () => staffProfiles.find((staff) => staff.id === staffId) ?? null,
    [staffId, staffProfiles],
  );
  const selectedStaffHistory = useMemo(
    () =>
      salaryHistory.filter(
        (entry) => entry.staff_id === staffId && entry.id !== editingPayment?.id,
      ),
    [editingPayment?.id, salaryHistory, staffId],
  );

  const normalizedWorkingDays = Math.max(toNumber(workingDays), 1);
  const normalizedLeaveDays = Math.min(Math.max(toNumber(leaveDays), 0), normalizedWorkingDays);
  const baseMonthlySalary = Math.max(toNumber(monthlySalary), 0);
  const dueSalary = computeMonthlyDue({
    workingDays: normalizedWorkingDays,
    leaveDays: normalizedLeaveDays,
    monthlySalary: baseMonthlySalary,
  });
  const currentPaidNow = Math.max(toNumber(paidNow), 0);
  const previousPaid = useMemo(() => {
    if (!staffId || !salaryMonthBs) {
      return 0;
    }

    const monthEntries = buildPayrollEntries(
      selectedStaffHistory.filter((entry) => entry.salary_month_bs === salaryMonthBs),
    );
    return monthEntries.at(-1)?.total_paid ?? 0;
  }, [salaryMonthBs, selectedStaffHistory, staffId]);
  const totalPaidAfterThisEntry = previousPaid + currentPaidNow;
  const remainingSalary = Math.max(dueSalary - totalPaidAfterThisEntry, 0);
  const paymentDate = bsToAd(paymentDateBs);
  const payrollMonthSummaries = useMemo(() => {
    if (!staffId) {
      return [];
    }

    return buildPayrollMonthSummaries(selectedStaffHistory).slice(0, 6);
  }, [selectedStaffHistory, staffId]);
  const recentTransactions = useMemo(() => {
    if (!staffId) {
      return [];
    }

    return buildPayrollEntries(selectedStaffHistory).reverse().slice(0, 8);
  }, [selectedStaffHistory, staffId]);

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
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
                setPaidNow("0");
                setPaymentType("ADVANCE");
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

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">Payment Type</label>
          <select
            name="payment_type"
            value={paymentType}
            onChange={(event) => setPaymentType(event.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
          >
            <option value="ADVANCE">Advance During Month</option>
            <option value="SALARY">Salary On Payday</option>
          </select>
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
            <label className="mb-2 block text-sm font-semibold text-slate-700">Amount Paid Now</label>
            <input
              name="advance_payment"
              type="number"
              min="0"
              step="0.01"
              value={paidNow}
              onChange={(event) => setPaidNow(event.target.value)}
              placeholder="Enter amount being paid now"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
            <div className="mt-2 text-xs text-slate-500">
              {paymentType === "SALARY"
                ? "Use this for the actual payday salary payment."
                : "Use this for salary taken in advance during the month."}
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
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Salary Due For Month</label>
            <input
              type="text"
              readOnly
              value={formatCurrency(dueSalary)}
              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">Remaining Salary</label>
            <input
              type="text"
              readOnly
              value={formatCurrency(remainingSalary)}
              className="w-full rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm outline-none"
            />
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
          <h3 className="text-lg font-bold text-slate-900">Payroll Month Summary</h3>
          <p className="mt-1 text-xs text-slate-500">
            One row per month with paid and remaining salary derived from transaction history.
          </p>
        </div>

        {staffId ? (
          payrollMonthSummaries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="bg-slate-50 px-6 py-4">Month</th>
                    <th className="bg-slate-50 px-6 py-4">Due</th>
                    <th className="bg-slate-50 px-6 py-4">Advance</th>
                    <th className="bg-slate-50 px-6 py-4">Salary</th>
                    <th className="bg-slate-50 px-6 py-4">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {payrollMonthSummaries.map((entry, index) => (
                    <tr
                      key={`${entry.staff_id}-${entry.salary_month_bs}`}
                      className={`${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      } transition-colors hover:bg-blue-50/40`}
                    >
                      <td className="px-6 py-4 text-sm text-slate-600">{entry.salary_month_bs}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                        {formatCurrency(entry.due_salary)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-amber-700">
                        {formatCurrency(entry.advance_paid)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-blue-700">
                        {formatCurrency(entry.salary_paid)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-700">
                        {formatCurrency(entry.remaining_salary)}
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
            Select a staff member to view payroll history.
          </div>
        )}

        {staffId && recentTransactions.length > 0 ? (
          <div className="border-t border-slate-50">
            <div className="px-6 py-5">
              <h4 className="text-base font-bold text-slate-900">Recent Salary Transactions</h4>
              <p className="mt-1 text-xs text-slate-500">
                Latest payment rows for this staff member, newest first.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="bg-slate-50 px-6 py-4">Month</th>
                    <th className="bg-slate-50 px-6 py-4">Date</th>
                    <th className="bg-slate-50 px-6 py-4">Type</th>
                    <th className="bg-slate-50 px-6 py-4">Previously Paid</th>
                    <th className="bg-slate-50 px-6 py-4">Paid Now</th>
                    <th className="bg-slate-50 px-6 py-4">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentTransactions.map((entry, index) => (
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
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                        {entry.payment_type === "SALARY" ? "Payday Salary" : "Advance"}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-red-600">
                        {formatCurrency(entry.previous_paid)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-blue-700">
                        {formatCurrency(entry.paid_now)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-green-700">
                        {formatCurrency(entry.remaining_salary)}
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
