"use client";

import Link from "next/link";
import { upsertStaffProfile } from "@/app/actions";

type EditingStaff = {
  id: string;
  staff_code: string;
  name: string;
  address: string | null;
  phone: string | null;
  total_salary: number | null;
  status: string;
} | null;

export function StaffProfileForm({
  editingStaff,
  nextStaffCode,
}: {
  editingStaff: EditingStaff;
  nextStaffCode: string;
}) {
  return (
    <form action={upsertStaffProfile} autoComplete="off" className="space-y-4">
      <input type="hidden" name="id" defaultValue={editingStaff?.id ?? ""} />
      <input type="hidden" name="redirect_to" value="/staff" />

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Staff Code</label>
        <input
          name="staff_code"
          defaultValue={editingStaff?.staff_code ?? nextStaffCode}
          placeholder="DS-S01"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
        />
        <div className="mt-2 text-xs text-slate-500">
          Leave blank to auto-generate the next staff code like DS-S01.
        </div>
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Staff Name</label>
        <input
          name="name"
          required
          defaultValue={editingStaff?.name ?? ""}
          placeholder="Enter staff name"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Address</label>
        <textarea
          name="address"
          rows={3}
          defaultValue={editingStaff?.address ?? ""}
          placeholder="Enter address"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Phone</label>
        <input
          name="phone"
          defaultValue={editingStaff?.phone ?? ""}
          placeholder="Enter phone number"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Base Monthly Salary</label>
        <input
          name="total_salary"
          type="number"
          min="0"
          step="0.01"
          defaultValue={editingStaff?.total_salary ?? 0}
          placeholder="Enter base monthly salary"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">Status</label>
        <select
          name="status"
          defaultValue={editingStaff?.status ?? "ACTIVE"}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
        >
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="flex-1 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white"
        >
          {editingStaff ? "Update Staff Profile" : "Save Staff Profile"}
        </button>
        <Link
          href="/staff"
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
