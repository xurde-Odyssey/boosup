import Link from "next/link";
import { BadgeDollarSign, CreditCard, HandCoins, Pencil, RefreshCcw, Trash2, Truck, Wallet } from "lucide-react";
import { deleteVendor } from "@/app/actions";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { ActionNotice } from "@/components/shared/ActionNotice";
import { ActionIconButton } from "@/components/shared/ActionIconButton";
import { ConfirmActionForm } from "@/components/shared/ConfirmActionForm";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageActionStrip } from "@/components/shared/PageActionStrip";
import { PaginationControls } from "@/components/shared/PaginationControls";
import { ReportToolbar } from "@/components/shared/ReportToolbar";
import { SectionCard } from "@/components/shared/SectionCard";
import { LocalizedStatusBadge } from "@/components/shared/StatusBadge";
import { VendorPrintPreview } from "@/components/vendors/VendorPrintPreview";
import { getCompanySettings } from "@/lib/company-settings-server";
import { getMessages } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { formatBsDisplayDate } from "@/lib/nepali-date";
import { formatCurrency } from "@/lib/presentation";
import { getSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const parsePage = (value: string | string[] | undefined) => {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};
const VENDOR_PAYABLES_PAGE_SIZE = 8;
const VENDOR_PROFILES_PAGE_SIZE = 8;

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await getSupabaseClient();
  const company = await getCompanySettings();
  const params = await searchParams;
  const locale = await getServerLocale(params.lang);
  const messages = getMessages(locale);
  const notice = typeof params.notice === "string" ? params.notice : "";
  const vendorPayablesPage = parsePage(params.vendorPayablesPage);
  const vendorProfilesPage = parsePage(params.vendorProfilesPage);

  const [vendorsResponse, purchasesResponse, paymentsResponse] = await Promise.all([
    supabase
      .from("vendors")
      .select("id, vendor_code, name, contact_person, phone, address, payment_terms, status, notes")
      .order("created_at", { ascending: false }),
    supabase
      .from("purchases")
      .select(
        "id, purchase_date, total_amount, paid_amount, credit_amount, vendor_id, purchase_items(quantity)",
      )
      .order("purchase_date", { ascending: false }),
    supabase
      .from("purchase_payments")
      .select("id, payment_date, amount, payment_method, purchase_id, purchases(vendor_id, purchase_number)")
      .order("payment_date", { ascending: false }),
  ]);

  const vendors = vendorsResponse.data ?? [];
  const purchases = purchasesResponse.data ?? [];
  const payments = paymentsResponse.data ?? [];

  const activeVendors = vendors.filter((vendor) => vendor.status === "ACTIVE").length;
  const vendorPayables = vendors
    .map((vendor) => {
      const vendorPurchases = purchases.filter((purchase) => purchase.vendor_id === vendor.id);
      const totalAmount = vendorPurchases.reduce(
        (sum, purchase) => sum + Number(purchase.total_amount ?? 0),
        0,
      );
      const totalPaidAmount = vendorPurchases.reduce(
        (sum, purchase) => sum + Number(purchase.paid_amount ?? 0),
        0,
      );
      const totalCreditAmount = vendorPurchases.reduce(
        (sum, purchase) => sum + Number(purchase.credit_amount ?? 0),
        0,
      );
      const totalItemsBought = vendorPurchases.reduce((sum, purchase) => {
        return (
          sum +
          (purchase.purchase_items ?? []).reduce(
            (itemSum, item) => itemSum + Number(item.quantity ?? 0),
            0,
          )
        );
      }, 0);
      const lastPurchaseDate = vendorPurchases.reduce<string | null>((latest, purchase) => {
        if (!purchase.purchase_date) return latest;
        if (!latest) return purchase.purchase_date;
        return purchase.purchase_date > latest ? purchase.purchase_date : latest;
      }, null);

      return {
        id: vendor.id,
        name: vendor.name,
        vendorCode: vendor.vendor_code,
        contactPerson: vendor.contact_person,
        phone: vendor.phone,
        paymentTerms: vendor.payment_terms,
        status: vendor.status,
        totalAmount,
        totalPaidAmount,
        totalCreditAmount,
        totalItemsBought,
        billCount: vendorPurchases.length,
        lastPurchaseDate,
      };
    })
    .sort((left, right) => right.totalCreditAmount - left.totalCreditAmount);

  const totalPayables = vendorPayables.reduce((sum, vendor) => sum + vendor.totalCreditAmount, 0);
  const totalVendorPurchase = vendorPayables.reduce((sum, vendor) => sum + vendor.totalAmount, 0);
  const totalVendorPaid = vendorPayables.reduce((sum, vendor) => sum + vendor.totalPaidAmount, 0);
  const payablesTotalPages = Math.max(
    Math.ceil(vendorPayables.length / VENDOR_PAYABLES_PAGE_SIZE),
    1,
  );
  const profilesTotalPages = Math.max(
    Math.ceil(vendorPayables.length / VENDOR_PROFILES_PAGE_SIZE),
    1,
  );
  const visibleVendorPayables = vendorPayables.slice(
    (Math.min(vendorPayablesPage, payablesTotalPages) - 1) * VENDOR_PAYABLES_PAGE_SIZE,
    Math.min(vendorPayablesPage, payablesTotalPages) * VENDOR_PAYABLES_PAGE_SIZE,
  );
  const visibleVendorProfiles = vendorPayables.slice(
    (Math.min(vendorProfilesPage, profilesTotalPages) - 1) * VENDOR_PROFILES_PAGE_SIZE,
    Math.min(vendorProfilesPage, profilesTotalPages) * VENDOR_PROFILES_PAGE_SIZE,
  );

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
        <Header
          title={messages.suppliersPage.title}
          description={messages.suppliersPage.subtitle}
        />
        {notice && <ActionNotice message={notice} />}
        <ReportToolbar actionPath="/vendors" locale={locale} />
        <PageActionStrip
          locale={locale}
          actions={[
            { label: messages.suppliersPage.createSupplierProfile, href: "/vendors/create" },
            { label: messages.suppliersPage.viewSupplierPayables, href: "/vendors", variant: "secondary" },
          ]}
        />

        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title={messages.suppliersPage.totalSuppliers}
            value={`${vendors.length}`}
            trend={`${activeVendors} active suppliers`}
            trendType="neutral"
            icon={Truck}
            iconBgColor="bg-amber-50"
            iconColor="text-amber-600"
          />
          <SummaryCard
            title={messages.suppliersPage.supplierPurchase}
            value={formatCurrency(totalVendorPurchase)}
            trend="Total supplier bills"
            trendType="positive"
            icon={BadgeDollarSign}
            iconBgColor="bg-blue-50"
            iconColor="text-blue-600"
          />
          <SummaryCard
            title={messages.suppliersPage.supplierPaid}
            value={formatCurrency(totalVendorPaid)}
            trend="Paid against supplier bills"
            trendType="positive"
            icon={BadgeDollarSign}
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
          />
          <SummaryCard
            title={messages.suppliersPage.outstandingPayables}
            value={formatCurrency(totalPayables)}
            trend="Supplier-wise credit outstanding"
            trendType="negative"
            icon={CreditCard}
            iconBgColor="bg-red-50"
            iconColor="text-red-600"
          />
        </div>

        <div className="space-y-6">
          <SectionCard className="overflow-hidden" padded={false}>
            <div className="border-b border-slate-50 p-6">
              <h3 className="text-lg font-bold text-slate-900">{messages.suppliersPage.supplierPayables}</h3>
              <p className="mt-1 text-xs text-slate-500">
                Supplier-wise payable balance, bills, and total items bought.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Supplier</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Total Purchase</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Paid</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Payable</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Bills</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Items Bought</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Last Purchase</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {visibleVendorPayables.map((vendor, index) => {
                    const vendorProfile = vendors.find((entry) => entry.id === vendor.id);
                    const vendorPayments = payments
                      .filter((payment) => {
                        const purchase = Array.isArray(payment.purchases) ? payment.purchases[0] : payment.purchases;
                        return purchase?.vendor_id === vendor.id;
                      })
                      .map((payment) => {
                        const purchase = Array.isArray(payment.purchases) ? payment.purchases[0] : payment.purchases;
                        return {
                          id: payment.id,
                          payment_date: payment.payment_date,
                          amount: Number(payment.amount ?? 0),
                          payment_method: payment.payment_method,
                          purchases: purchase ? { purchase_number: purchase.purchase_number ?? null } : null,
                        };
                      });

                    return (
                      <tr
                        key={vendor.id}
                        className={`transition-colors hover:bg-blue-50/40 ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                        }`}
                      >
                        <td className="px-6 py-4">
                          <Link
                            href={`/vendors/${vendor.id}`}
                            className="text-sm font-semibold text-slate-900 hover:text-blue-600"
                            title={`Open supplier profile for ${vendor.name}`}
                          >
                            {vendor.name}
                          </Link>
                          <div className="text-xs text-slate-500">{vendor.vendorCode}</div>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                          {formatCurrency(vendor.totalAmount)}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-green-700">
                          {formatCurrency(vendor.totalPaidAmount)}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-amber-700">
                          {formatCurrency(vendor.totalCreditAmount)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{vendor.billCount}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{vendor.totalItemsBought}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {formatBsDisplayDate(vendor.lastPurchaseDate)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <div>
                              <ActionIconButton
                                href={`/vendors/${vendor.id}?action=pay`}
                                label={`Add supplier payment for ${vendor.name}`}
                              >
                                <HandCoins className="h-4 w-4" />
                              </ActionIconButton>
                            </div>
                            <div>
                              <ActionIconButton
                                href={`/vendors/create?edit=${vendor.id}`}
                                label={`Edit supplier ${vendor.name}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </ActionIconButton>
                            </div>
                            {vendorProfile ? (
                              <VendorPrintPreview
                                company={company}
                                locale={locale}
                                vendor={{
                                  name: vendorProfile.name,
                                  vendor_code: vendorProfile.vendor_code,
                                  contact_person: vendorProfile.contact_person,
                                  phone: vendorProfile.phone,
                                  address: vendorProfile.address,
                                  totalPurchase: vendor.totalAmount,
                                  totalPaid: vendor.totalPaidAmount,
                                  totalPayable: vendor.totalCreditAmount,
                                  totalBills: vendor.billCount,
                                  lastPurchaseDate: vendor.lastPurchaseDate,
                                  payments: vendorPayments,
                                }}
                                label={`Print supplier statement for ${vendor.name}`}
                                iconOnly
                              />
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {vendorPayables.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-6 py-10">
                        <EmptyState
                          icon={Wallet}
                          title="No supplier payables yet"
                          description="Supplier balances will show here after supplier profiles and purchase bills start accumulating."
                          actionLabel="Create Supplier"
                          actionHref="/vendors/create"
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationControls
              basePath="/vendors"
              pageParam="vendorPayablesPage"
              currentPage={Math.min(vendorPayablesPage, payablesTotalPages)}
              totalPages={payablesTotalPages}
              totalItems={vendorPayables.length}
              pageSize={VENDOR_PAYABLES_PAGE_SIZE}
              searchParams={params}
            />
          </SectionCard>

          <SectionCard className="overflow-hidden" padded={false}>
            <div className="border-b border-slate-50 p-6">
              <h3 className="text-lg font-bold text-slate-900">Supplier Profiles</h3>
              <p className="mt-1 text-xs text-slate-500">All supplier profiles stored in Supabase.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Supplier</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Contact</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Phone</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Terms</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4">Status</th>
                    <th className="sticky top-0 z-10 bg-slate-50 px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {visibleVendorProfiles.map((vendor, index) => (
                    <tr
                      key={vendor.id}
                      className={`transition-colors hover:bg-blue-50/40 ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/vendors/${vendor.id}`}
                          className="text-sm font-semibold text-slate-900 hover:text-blue-600"
                        >
                          {vendor.name}
                        </Link>
                        <div className="text-xs text-slate-500">{vendor.vendorCode}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{vendor.contactPerson ?? "-"}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{vendor.phone ?? "-"}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{vendor.paymentTerms}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <LocalizedStatusBadge
                          status={vendor.status}
                          locale={locale}
                          tone={vendor.status === "ACTIVE" ? "success" : "neutral"}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <ActionIconButton
                            href={`/vendors/create?edit=${vendor.id}`}
                            label={`Edit supplier ${vendor.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </ActionIconButton>
                          <ActionIconButton
                            href={`/vendors/create?edit=${vendor.id}`}
                            label={`Open update view for supplier ${vendor.name}`}
                          >
                            <RefreshCcw className="h-4 w-4" />
                          </ActionIconButton>
                          <ConfirmActionForm
                            action={deleteVendor}
                            confirmMessage="Are you sure you want to delete this supplier profile?"
                            hiddenFields={[
                              { name: "id", value: vendor.id },
                              { name: "redirect_to", value: "/vendors" },
                            ]}
                          >
                            <ActionIconButton label={`Delete supplier ${vendor.name}`}>
                              <Trash2 className="h-4 w-4" />
                            </ActionIconButton>
                          </ConfirmActionForm>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {vendors.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10">
                        <EmptyState
                          icon={Truck}
                          title="No supplier profiles yet"
                          description="Create supplier profiles first so purchases and payable ledgers stay organized."
                          actionLabel="Create Supplier Profile"
                          actionHref="/vendors/create"
                        />
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationControls
              basePath="/vendors"
              pageParam="vendorProfilesPage"
              currentPage={Math.min(vendorProfilesPage, profilesTotalPages)}
              totalPages={profilesTotalPages}
              totalItems={vendorPayables.length}
              pageSize={VENDOR_PROFILES_PAGE_SIZE}
              searchParams={params}
            />
          </SectionCard>
        </div>
      </main>
    </div>
  );
}
