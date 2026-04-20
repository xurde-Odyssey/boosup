import { ArrowLeft, UserPlus } from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { CustomerProfileForm } from "@/components/customers/CustomerProfileForm";
import { Card } from "@/components/shared/Card";
import { PageActionStrip } from "@/components/shared/PageActionStrip";
import { QueryNoticeToast } from "@/components/shared/QueryNoticeToast";
import { getSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CreateCustomerPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const editId = typeof params.edit === "string" ? params.edit : "";
  const notice = typeof params.notice === "string" ? params.notice : "";
  const supabase = await getSupabaseClient();

  const { data: customer } = editId
    ? await supabase
        .from("customers")
        .select("id, name, phone, address, email, notes, status")
        .eq("id", editId)
        .single()
    : { data: null };

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
        <Header
          title={customer ? "Update Customer Profile" : "Create Customer Profile"}
          description="Create reusable customer profiles for linked sales history and ledger tracking."
        />
        <QueryNoticeToast message={notice} />
        <PageActionStrip
          actions={[
            {
              label: "Back To Customers",
              href: "/customers",
              variant: "secondary",
              icon: ArrowLeft,
            },
          ]}
        />

        <Card className="max-w-2xl p-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {customer ? "Update Customer Profile" : "Create Customer Profile"}
              </h3>
              <p className="text-sm text-slate-500">
                Profiles are optional. Manual one-time customer names still work in sales bills.
              </p>
            </div>
          </div>
          <CustomerProfileForm customer={customer} />
        </Card>
      </main>
    </div>
  );
}
