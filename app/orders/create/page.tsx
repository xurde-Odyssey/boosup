import { ArrowLeft, ReceiptText } from "lucide-react";
import { OrderEntryWorkspace } from "@/components/orders/OrderEntryWorkspace";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { PageActionStrip } from "@/components/shared/PageActionStrip";
import { QueryNoticeToast } from "@/components/shared/QueryNoticeToast";
import { getMessages } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { getSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function CreateOrderPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const locale = await getServerLocale(params.lang);
  const messages = getMessages(locale);
  const ordersMessages = messages.ordersPage;
  const notice = typeof params.notice === "string" ? params.notice : "";
  const editId = typeof params.edit === "string" ? params.edit : "";
  const todayDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
  }).format(new Date());
  const supabase = await getSupabaseClient();
  const { data: products = [] } = await supabase
    .from("products")
    .select("id, name, unit, sales_rate")
    .eq("status", "ACTIVE")
    .order("name");

  const editingOrder = editId
    ? await supabase
        .from("orders")
        .select(
          "id, customer_name, customer_phone, items_summary, order_date, status, notes, order_items(id, product_id, product_name, quantity, unit_snapshot, rate_snapshot)",
        )
        .eq("id", editId)
        .maybeSingle()
        .then(({ data }) => data)
    : null;

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
        <Header
          title={editingOrder ? ordersMessages.editPageTitle : ordersMessages.createPageTitle}
          description={ordersMessages.createPageSubtitle}
        />
        <QueryNoticeToast message={notice} />
        <PageActionStrip
          locale={locale}
          actions={[
            {
              label: ordersMessages.backToOrders,
              href: "/orders",
              variant: "secondary",
              icon: ArrowLeft,
            },
            {
              label: ordersMessages.createSalesBill,
              href: "/sales/create",
              variant: "secondary",
              icon: ReceiptText,
            },
          ]}
        />

        <OrderEntryWorkspace
          editingOrder={editingOrder}
          products={products ?? []}
          todayDate={todayDate}
          ordersMessages={ordersMessages}
          statusLabels={messages.status}
        />
      </main>
    </div>
  );
}
