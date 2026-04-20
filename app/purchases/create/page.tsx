import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { PurchaseForm } from "@/components/purchases/PurchaseForm";
import { QueryNoticeToast } from "@/components/shared/QueryNoticeToast";
import { getMessages } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { getNepalTodayAd } from "@/lib/nepali-date";
import { getSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CreatePurchasePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await getSupabaseClient();
  const params = await searchParams;
  const locale = await getServerLocale(params.lang);
  const messages = getMessages(locale);
  const purchaseMessages = messages.purchaseEntry;
  const editId = typeof params.edit === "string" ? params.edit : "";
  const notice = typeof params.notice === "string" ? params.notice : "";
  const todayDate = getNepalTodayAd();

  const [{ data: vendors = [] }, purchaseResponse, paymentsResponse] = await Promise.all([
    supabase
      .from("vendors")
      .select("id, name")
      .eq("status", "ACTIVE")
      .order("name"),
    editId
      ? supabase
          .from("purchases")
          .select(
            "id, purchase_number, purchase_date, payment_status, payment_type, payment_method, paid_amount, total_amount, credit_amount, notes, vendor_id, vendor_name, purchase_items(product_id, product_name, quantity, rate)",
          )
          .eq("id", editId)
          .single()
      : Promise.resolve({ data: null }),
    editId
      ? supabase
          .from("purchase_payments")
          .select("id, payment_date, amount, payment_method, created_at")
          .eq("purchase_id", editId)
          .order("payment_date", { ascending: false })
      : Promise.resolve({ data: null }),
  ]);

  const editingPurchase = purchaseResponse.data;
  const purchasePayments = paymentsResponse.data ?? [];
  const vendorRows = vendors ?? [];

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
        <Header
          title={editingPurchase ? purchaseMessages.pageEditTitle : purchaseMessages.pageCreateTitle}
          description={purchaseMessages.pageDescription}
          primaryActionLabel={purchaseMessages.backToPurchases}
          primaryActionHref="/purchases"
        />

        <QueryNoticeToast message={notice} />

        <PurchaseForm
          vendors={vendorRows}
          editingPurchase={editingPurchase}
          purchasePayments={purchasePayments}
          defaultDate={todayDate}
          locale={locale}
        />
      </main>
    </div>
  );
}
