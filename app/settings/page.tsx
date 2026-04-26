import {
  Archive,
  BadgeDollarSign,
  ChevronDown,
  Building2,
  DatabaseBackup,
  Download,
  ReceiptText,
  Settings2,
  SlidersHorizontal,
  ShoppingCart,
  Users,
} from "lucide-react";
import { upsertCompanySettings } from "@/app/actions";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { QueryNoticeToast } from "@/components/shared/QueryNoticeToast";
import { CompanyLogoUploadField } from "@/components/settings/CompanyLogoUploadField";
import { SystemPreferencesPanel } from "@/components/settings/SystemPreferencesPanel";
import { buildCompanySettings } from "@/lib/company-settings";
import { getMessages } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";
import { getSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await getSupabaseClient();
  const params = await searchParams;
  const locale = await getServerLocale(params.lang);
  const messages = getMessages(locale);
  const settingsMessages = messages.settingsPage;
  const notice = typeof params.notice === "string" ? params.notice : "";

  const settingsResponse = await supabase
    .from("company_settings")
    .select("id, business_name, address, phone, email, website, logo_path")
    .order("created_at", { ascending: true })
    .limit(1);

  const settingsRows = settingsResponse.data ?? [];
  const companySettings = buildCompanySettings(settingsRows[0] ?? null);
  const backupActions = [
    {
      label: settingsMessages.exportSalesCsv,
      icon: ReceiptText,
    },
    {
      label: settingsMessages.exportCustomersCsv,
      icon: Users,
    },
    {
      label: settingsMessages.exportPurchasesCsv,
      icon: ShoppingCart,
    },
    {
      label: settingsMessages.exportStaffSalaryCsv,
      icon: BadgeDollarSign,
    },
    {
      label: settingsMessages.exportAllReportsZip,
      icon: Archive,
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
        <Header
          title={settingsMessages.title}
          description={settingsMessages.subtitle}
        />
        <QueryNoticeToast message={notice} />

        <div className="mb-8 rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/10 p-3 text-slate-100">
              <Settings2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">{settingsMessages.heroTitle}</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                {settingsMessages.heroDescription}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_420px]">
          <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <details className="group" open>
              <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="rounded-2xl bg-slate-50 p-3 text-slate-700">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                      {settingsMessages.areaLabel}
                    </div>
                    <h3 className="mt-2 text-lg font-bold text-slate-900">
                      {settingsMessages.companyProfileTitle}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {settingsMessages.companyProfileDescription}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500 transition-transform group-open:rotate-180">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </summary>

              <form action={upsertCompanySettings} className="mt-6 border-t border-slate-100 pt-6">
                <input type="hidden" name="id" defaultValue={companySettings.id ?? ""} />
                <input type="hidden" name="redirect_to" value="/settings" />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      {settingsMessages.businessName}
                    </label>
                    <input
                      name="business_name"
                      required
                      defaultValue={companySettings.businessName}
                      placeholder={settingsMessages.businessNamePlaceholder}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      {settingsMessages.address}
                    </label>
                    <textarea
                      name="address"
                      rows={3}
                      defaultValue={companySettings.address}
                      placeholder={settingsMessages.addressPlaceholder}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      {settingsMessages.phone}
                    </label>
                    <input
                      name="phone"
                      defaultValue={companySettings.phone}
                      placeholder={settingsMessages.phonePlaceholder}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      {settingsMessages.email}
                    </label>
                    <input
                      name="email"
                      type="email"
                      defaultValue={companySettings.email}
                      placeholder={settingsMessages.emailPlaceholder}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      {settingsMessages.website}
                    </label>
                    <input
                      name="website"
                      defaultValue={companySettings.website}
                      placeholder={settingsMessages.websitePlaceholder}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <CompanyLogoUploadField
                    name="logo_path"
                    initialValue={companySettings.logoPath}
                    labels={{
                      label: settingsMessages.logoUpload,
                      hint: settingsMessages.logoUploadHint,
                      choose: settingsMessages.logoChoose,
                      replace: settingsMessages.logoReplace,
                      remove: settingsMessages.logoRemove,
                      preview: settingsMessages.logoPreview,
                      tooLarge: settingsMessages.logoTooLarge,
                      invalidType: settingsMessages.logoInvalidType,
                    }}
                  />
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    {settingsMessages.saveCompanyProfile}
                  </button>
                </div>
              </form>
            </details>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-slate-50 p-3 text-slate-700">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  {settingsMessages.areaLabel}
                </div>
                <h3 className="mt-2 text-lg font-bold text-slate-900">
                  {settingsMessages.systemPreferencesTitle}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {settingsMessages.systemPreferencesDescription}
                </p>
              </div>
            </div>

            <SystemPreferencesPanel />
          </section>
        </div>

        <section className="mt-6 rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                <DatabaseBackup className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                  {settingsMessages.areaLabel}
                </div>
                <h3 className="mt-2 text-lg font-bold text-slate-900">
                  {settingsMessages.backupTitle}
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  {settingsMessages.backupDescription}
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {settingsMessages.backupComingSoon}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {backupActions.map((action) => {
              const Icon = action.icon;

              return (
                <button
                  key={action.label}
                  type="button"
                  disabled
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-75"
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-left">{action.label}</span>
                  <Download className="ml-auto h-4 w-4 shrink-0 text-slate-400" />
                </button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
