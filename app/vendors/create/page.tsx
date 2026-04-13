import { ActionNotice } from "@/components/shared/ActionNotice";
import { Button } from "@/components/shared/Button";
import { Card } from "@/components/shared/Card";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Input } from "@/components/shared/Input";
import { ReportToolbar } from "@/components/shared/ReportToolbar";
import { Select } from "@/components/shared/Select";
import { upsertVendor } from "@/app/actions";
import { getSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CreateVendorPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await getSupabaseClient();
  const params = await searchParams;
  const editId = typeof params.edit === "string" ? params.edit : "";
  const notice = typeof params.notice === "string" ? params.notice : "";

  const { data: vendors = [] } = await supabase
    .from("vendors")
    .select("id, vendor_code, name, contact_person, phone, address, payment_terms, status, notes")
    .eq("id", editId || "00000000-0000-0000-0000-000000000000");

  const editingVendor = vendors[0] ?? null;

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
        <Header
          title={editingVendor ? "Update Supplier Profile" : "Create Supplier Profile"}
          description="Create and update supplier profiles in a dedicated screen."
          primaryActionLabel="Back To Suppliers"
          primaryActionHref="/vendors"
        />

        {notice && <ActionNotice message={notice} />}
        <ReportToolbar actionPath={editingVendor ? `/vendors/create?edit=${editingVendor.id}` : "/vendors/create"} />

        <Card className="max-w-2xl p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">
              {editingVendor ? "Update Supplier Profile" : "Create Supplier Profile"}
            </h3>
            <p className="text-sm text-slate-500">Supplier records stored in Supabase.</p>
          </div>

          <form action={upsertVendor} className="space-y-4">
            <input type="hidden" name="id" defaultValue={editingVendor?.id ?? ""} />
            <input type="hidden" name="redirect_to" value="/vendors/create" />

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Supplier Code</label>
              <Input
                name="vendor_code"
                required
                defaultValue={editingVendor?.vendor_code ?? ""}
                placeholder="VND-001"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Supplier Name</label>
              <Input
                name="name"
                required
                defaultValue={editingVendor?.name ?? ""}
                placeholder="Enter supplier name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Contact Person</label>
              <Input
                name="contact_person"
                defaultValue={editingVendor?.contact_person ?? ""}
                placeholder="Enter contact person"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                name="phone"
                defaultValue={editingVendor?.phone ?? ""}
                placeholder="Phone number"
              />
              <Select
                name="payment_terms"
                defaultValue={editingVendor?.payment_terms ?? "Cash"}
              >
                <option value="Cash">Cash</option>
                <option value="15 Days Credit">15 Days Credit</option>
                <option value="30 Days Credit">30 Days Credit</option>
                <option value="Advance + Credit">Advance + Credit</option>
              </Select>
            </div>

            <textarea
              name="address"
              rows={3}
              defaultValue={editingVendor?.address ?? ""}
              placeholder="Supplier address"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />

            <Select
              name="status"
              defaultValue={editingVendor?.status ?? "ACTIVE"}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="ON HOLD">ON HOLD</option>
              <option value="INACTIVE">INACTIVE</option>
            </Select>

            <textarea
              name="notes"
              rows={3}
              defaultValue={editingVendor?.notes ?? ""}
              placeholder="Notes"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />

            <div className="flex gap-3">
              <Button
                type="submit"
                className="flex-1"
              >
                {editingVendor ? "Update Supplier" : "Save Supplier Profile"}
              </Button>
              <Button href="/vendors" variant="secondary">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
