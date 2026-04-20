import { upsertCustomer } from "@/app/actions";
import { Button } from "@/components/shared/Button";
import { Input } from "@/components/shared/Input";
import { Select } from "@/components/shared/Select";

type CustomerProfile = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  email: string | null;
  notes: string | null;
  status: string | null;
};

export function CustomerProfileForm({
  customer,
}: {
  customer: CustomerProfile | null;
}) {
  return (
    <form action={upsertCustomer} className="space-y-4">
      <input type="hidden" name="id" defaultValue={customer?.id ?? ""} />
      <input type="hidden" name="redirect_to" value="/customers" />

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Customer Name
        </label>
        <Input
          name="name"
          required
          defaultValue={customer?.name ?? ""}
          placeholder="Enter customer name"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Phone
          </label>
          <Input
            name="phone"
            defaultValue={customer?.phone ?? ""}
            placeholder="Phone number"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Email
          </label>
          <Input
            name="email"
            type="email"
            defaultValue={customer?.email ?? ""}
            placeholder="customer@example.com"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Address
        </label>
        <textarea
          name="address"
          rows={3}
          defaultValue={customer?.address ?? ""}
          placeholder="Customer address"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500 focus:bg-white"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Status
        </label>
        <Select name="status" defaultValue={customer?.status ?? "ACTIVE"}>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </Select>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Notes
        </label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={customer?.notes ?? ""}
          placeholder="Internal notes"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition-colors focus:border-blue-500 focus:bg-white"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button type="submit" className="flex-1">
          {customer ? "Update Customer" : "Save Customer Profile"}
        </Button>
        <Button href="/customers" variant="secondary">
          Cancel
        </Button>
      </div>
    </form>
  );
}
