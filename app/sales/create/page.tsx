import { FilePlus2, Printer, ReceiptText } from "lucide-react";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SalesPrintPreview } from "@/components/sales/SalesPrintPreview";
import { SalesForm } from "@/components/sales/SalesForm";
import { ReportToolbar } from "@/components/shared/ReportToolbar";
import { formatCurrency } from "@/lib/presentation";
import { getSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const getTodayDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
  }).format(new Date());

export default async function CreateSalesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await getSupabaseClient();
  const params = await searchParams;
  const editId = typeof params.edit === "string" ? params.edit : "";
  const todayDate = getTodayDate();

  const { data: products = [] } = await supabase
    .from("products")
    .select("id, name, sales_rate")
    .eq("status", "ACTIVE")
    .order("name");

  let editingSale: {
    id: string;
    invoice_number: string;
    customer_name: string;
    sales_date: string;
    payment_status: string;
    subtotal: number | null;
    discount: number | null;
    tax: number | null;
    amount_received: number | null;
    remaining_amount: number | null;
    notes: string | null;
    sales_items: {
      product_id: string | null;
      product_name: string;
      quantity: number | null;
      rate: number | null;
      taxable?: boolean | null;
      tax_amount?: number | null;
    }[];
    sales_payments: {
      id: string;
      payment_date: string;
      amount: number;
      created_at?: string;
    }[];
  } | null = null;

  if (editId) {
    const [{ data: saleData }, itemsResponse, paymentsResponse] = await Promise.all([
      supabase
        .from("sales")
        .select(
          "id, invoice_number, customer_name, sales_date, payment_status, subtotal, discount, tax, amount_received, remaining_amount, notes",
        )
        .eq("id", editId)
        .single(),
      supabase
        .from("sales_items")
        .select("product_id, product_name, quantity, rate, taxable")
        .eq("sale_id", editId)
        .order("created_at", { ascending: true }),
      supabase
        .from("sales_payments")
        .select("id, payment_date, amount, created_at")
        .eq("sale_id", editId)
        .order("payment_date", { ascending: false }),
    ]);

    if (saleData) {
      editingSale = {
        ...saleData,
        sales_items: itemsResponse.data ?? [],
        sales_payments: paymentsResponse.data ?? [],
      };
    }
  }

  const subtotal = Number(editingSale?.subtotal ?? 0);
  const discount = Number(editingSale?.discount ?? 0);
  const tax = Number(editingSale?.tax ?? 0);
  const grandTotal = Math.max(subtotal - discount + tax, 0);
  const totalReceived = Number(editingSale?.amount_received ?? 0);
  const remainingAmount = Math.max(Number(editingSale?.remaining_amount ?? 0), 0);
  const paymentHistory = [...(editingSale?.sales_payments ?? [])].sort((left, right) =>
    left.payment_date < right.payment_date ? 1 : -1,
  );

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <Header
          title={editingSale ? "Update Sales" : "Create New Sales"}
          description="Enter and persist a sales record in Supabase."
          primaryActionLabel={editingSale ? "Update Sales" : "Save Sales"}
        />
        <ReportToolbar actionPath={editingSale ? `/sales/create?edit=${editingSale.id}` : "/sales/create"} />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                <FilePlus2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Sales Entry</h3>
                <p className="text-sm text-slate-500">
                  Multi-item sales form linked to Supabase.
                </p>
              </div>
            </div>

            <SalesForm
              key={editingSale?.id ?? "new-sale"}
              defaultDate={todayDate}
              products={products}
              editingSale={editingSale}
            />
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-xl bg-green-50 p-3 text-green-600">
                  <ReceiptText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Sales Summary</h3>
                  <p className="text-sm text-slate-500">Current values for the selected record.</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Invoice Snapshot
                  </div>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Subtotal</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Discount</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(discount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Tax</span>
                      <span className="font-semibold text-slate-900">{formatCurrency(tax)}</span>
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Collection Snapshot
                  </div>
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Previously Received Amount</span>
                      <span className="font-semibold text-green-700">
                        {formatCurrency(totalReceived)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Remaining Amount</span>
                      <span className="font-semibold text-amber-700">
                        {formatCurrency(remainingAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 pt-3">
                      <span className="font-semibold text-slate-900">Grand Total</span>
                      <span className="text-lg font-bold text-blue-600">
                        {formatCurrency(grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 border-t border-slate-100 pt-4">
                {editingSale ? (
                  <SalesPrintPreview sale={editingSale} />
                ) : (
                  <button
                    type="button"
                    disabled
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-300 px-4 py-3 text-sm font-semibold text-white"
                  >
                    <Printer className="h-4 w-4" />
                    Save Sales To Enable Print
                  </button>
                )}
              </div>
            </section>

            {editingSale && (
              <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Transaction History</h3>
                  <p className="text-sm text-slate-500">
                    Payment collection history for this sales invoice.
                  </p>
                </div>

                <div className="space-y-3 text-sm">
                  {paymentHistory.length > 0 ? (
                    paymentHistory.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">
                            {payment.payment_date}
                          </div>
                          <div className="text-xs text-slate-500">Payment received</div>
                        </div>
                        <div className="font-semibold text-green-600">
                          {formatCurrency(payment.amount)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                      No payment transactions yet.
                    </div>
                  )}
                </div>
              </section>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
