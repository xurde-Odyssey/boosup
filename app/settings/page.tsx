import {
  ChevronDown,
  Building2,
  Settings2,
  SlidersHorizontal,
} from "lucide-react";
import { upsertCompanySettings } from "@/app/actions";
import { Header } from "@/components/dashboard/Header";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { QueryNoticeToast } from "@/components/shared/QueryNoticeToast";
import { SystemPreferencesPanel } from "@/components/settings/SystemPreferencesPanel";
import { buildCompanySettings } from "@/lib/company-settings";
import { getSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await getSupabaseClient();
  const params = await searchParams;
  const notice = typeof params.notice === "string" ? params.notice : "";

  const settingsResponse = await supabase
    .from("company_settings")
    .select("id, business_name, address, phone, email, website, logo_path, favicon_path")
    .order("created_at", { ascending: true })
    .limit(1);

  const settingsRows = settingsResponse.data ?? [];
  const companySettings = buildCompanySettings(settingsRows[0] ?? null);

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <Header
          title="Settings"
          description="Simple business identity and system preference settings."
        />
        <QueryNoticeToast message={notice} />

        <div className="mb-8 rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 text-white shadow-sm">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/10 p-3 text-slate-100">
              <Settings2 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Simple Settings</h3>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Keep only the details you actually use here: business identity for invoices and
                reports, and a few light system preferences for daily operation.
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
                      Settings Area
                    </div>
                    <h3 className="mt-2 text-lg font-bold text-slate-900">Company Profile</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Keep the business identity used across invoices and reports in one place.
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
                      Business Name
                    </label>
                    <input
                      name="business_name"
                      required
                      defaultValue={companySettings.businessName}
                      placeholder="Enter business name"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Address
                    </label>
                    <textarea
                      name="address"
                      rows={3}
                      defaultValue={companySettings.address}
                      placeholder="Enter business address"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Phone
                    </label>
                    <input
                      name="phone"
                      defaultValue={companySettings.phone}
                      placeholder="Enter phone number"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Email
                    </label>
                    <input
                      name="email"
                      type="email"
                      defaultValue={companySettings.email}
                      placeholder="Enter business email"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Website
                    </label>
                    <input
                      name="website"
                      defaultValue={companySettings.website}
                      placeholder="Enter website"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Logo Path
                    </label>
                    <input
                      name="logo_path"
                      defaultValue={companySettings.logoPath}
                      placeholder="/logos/logo.png"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Use a public path like <span className="font-semibold">/logos/logo.png</span>.
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Favicon Path
                    </label>
                    <input
                      name="favicon_path"
                      defaultValue={companySettings.faviconPath}
                      placeholder="/logos/icon.png"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:bg-white"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      Used for the browser icon and system branding.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
                  >
                    Save Company Profile
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
                  Settings Area
                </div>
                <h3 className="mt-2 text-lg font-bold text-slate-900">System Preferences</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Keep these simple and easy to access.
                </p>
              </div>
            </div>

            <SystemPreferencesPanel />
          </section>
        </div>
      </main>
    </div>
  );
}
