import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { StaffProfileForm } from "@/components/staff/StaffProfileForm";
import { deleteStaffProfile } from "@/app/actions";
import { ConfirmActionForm } from "@/components/shared/ConfirmActionForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { QueryNoticeToast } from "@/components/shared/QueryNoticeToast";
import { formatCurrency } from "@/lib/presentation";
import { getSupabaseClient } from "@/lib/supabase/server";
import { Pencil, Trash2, UserRound } from "lucide-react";
import Link from "next/link";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const generateNextStaffCode = (codes: (string | null | undefined)[]) => {
  const maxSequence = codes.reduce((maxValue, code) => {
    const normalized = String(code ?? "").trim().toUpperCase();
    if (!normalized.startsWith("DS-S")) return maxValue;

    const numericPart = Number(normalized.slice(4));
    return Number.isFinite(numericPart) ? Math.max(maxValue, numericPart) : maxValue;
  }, 0);

  return `DS-S${String(maxSequence + 1).padStart(2, "0")}`;
};

export default async function CreateStaffPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await getSupabaseClient();
  const params = await searchParams;
  const editId = typeof params.edit === "string" ? params.edit : "";
  const notice = typeof params.notice === "string" ? params.notice : "";

  const { data: staffProfiles = [] } = await supabase
    .from("staff_profiles")
    .select("id, staff_code, name, address, phone, total_salary, status")
    .order("created_at", { ascending: false });

  const editingStaff = staffProfiles.find((staff) => staff.id === editId) ?? null;
  const nextStaffCode = generateNextStaffCode(staffProfiles.map((staff) => staff.staff_code));

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <Header
          title={editingStaff ? "Update Staff Profile" : "Create Staff Profile"}
          description="Create or edit a staff profile on its own page, separate from the staff dashboard."
        />
        <QueryNoticeToast message={notice} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900">
                {editingStaff ? "Update Staff Profile" : "Create Staff Profile"}
              </h3>
              <p className="text-sm text-slate-500">Staff data persisted in Supabase.</p>
            </div>

            <StaffProfileForm editingStaff={editingStaff} nextStaffCode={nextStaffCode} />
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-50 p-6">
              <h3 className="text-lg font-bold text-slate-900">Existing Staff</h3>
              <p className="mt-1 text-xs text-slate-500">
                Click any profile to open it here for editing.
              </p>
            </div>

            <div className="divide-y divide-slate-50">
              {staffProfiles.map((staff, index) => {
                const isActive = staff.id === editId;

                return (
                  <div
                    key={staff.id}
                    className={`px-6 py-4 transition-colors hover:bg-blue-50/40 ${
                      isActive
                        ? "border-l-4 border-blue-600 bg-blue-50/50"
                        : index % 2 === 0
                          ? "bg-white"
                          : "bg-slate-50/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/staff/create?edit=${staff.id}`} className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900">{staff.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{staff.staff_code}</div>

                        <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs">
                          <div className="font-bold uppercase tracking-wide text-slate-400">
                            Base Monthly Salary
                          </div>
                          <div className="mt-1 font-semibold text-slate-900">
                            {formatCurrency(staff.total_salary)}
                          </div>
                        </div>
                      </Link>

                      <div className="flex shrink-0 items-center gap-2">
                        <Link
                          href={`/staff/create?edit=${staff.id}`}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Link>
                        <ConfirmActionForm
                          action={deleteStaffProfile}
                          confirmMessage="Are you sure you want to delete this staff profile?"
                          className="inline-flex"
                        >
                          <input type="hidden" name="id" value={staff.id} />
                          <input type="hidden" name="redirect_to" value="/staff/create" />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </ConfirmActionForm>
                      </div>
                    </div>
                  </div>
                );
              })}

              {staffProfiles.length === 0 && (
                <div className="p-6">
                  <EmptyState
                    icon={UserRound}
                    title="No staff profiles yet"
                    description="Create your first staff profile here, then it will appear in this list."
                  />
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
