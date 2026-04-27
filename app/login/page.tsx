import {
  Activity,
  Boxes,
  LockKeyhole,
  ReceiptText,
  ShoppingCart,
  WalletCards,
} from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { APP_BRAND_NAME } from "@/lib/brand";
import { getMessages } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n-server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const locale = await getServerLocale(params.lang);
  const messages = getMessages(locale);
  const loginMessages = messages.loginPage;
  const nextPath = typeof params.next === "string" ? params.next : "/";
  const initialError = typeof params.error === "string" ? params.error : "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,_#f8fbff_0%,_#eaf3ff_46%,_#f6fffb_100%)] px-6 py-12 dark:bg-[linear-gradient(135deg,_#020617_0%,_#0f172a_46%,_#071a1a_100%)]">
      <div className="w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/70 bg-white/55 shadow-2xl shadow-blue-950/15 ring-1 ring-white/80 backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-950/65 dark:ring-slate-800/80">
        <div className="grid md:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px]">
          <section className="border-b border-white/60 bg-white/35 p-6 shadow-inner shadow-white/40 backdrop-blur-xl sm:p-8 md:border-b-0 md:border-r lg:p-10 dark:border-slate-800/80 dark:bg-slate-950/35 dark:shadow-none">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600">
                  {APP_BRAND_NAME}
                </div>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {loginMessages.tagline}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <LanguageSwitcher compact />
                <ThemeToggle />
              </div>
            </div>

            <div className="mt-8">
              <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight text-slate-950 dark:text-slate-50">
                {loginMessages.heroTitle}
              </h1>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { value: loginMessages.salesCardTitle, label: loginMessages.salesCardLabel },
                { value: loginMessages.ledgerCardTitle, label: loginMessages.ledgerCardLabel },
                { value: loginMessages.salaryCardTitle, label: loginMessages.salaryCardLabel },
              ].map((item) => (
                <div
                  key={item.value}
                  className="rounded-[18px] border border-white/70 bg-white/45 p-4 shadow-sm shadow-blue-950/5 ring-1 ring-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/55 dark:ring-slate-800/70"
                >
                  <div className="text-lg font-bold text-slate-950 dark:text-slate-50">{item.value}</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="flex items-center bg-white/50 p-6 backdrop-blur-xl sm:p-8 lg:p-10 dark:bg-slate-950/45">
            <div className="w-full">
              <div className="mb-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-white/70 bg-blue-50/70 text-blue-600 shadow-sm shadow-blue-950/5 ring-1 ring-blue-100/70 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/80 dark:text-cyan-300 dark:ring-slate-800/70">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-50">{loginMessages.loginTitle}</h2>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                  {loginMessages.loginDescription}
                </p>
              </div>

              <LoginForm
                nextPath={nextPath}
                initialError={initialError}
                labels={{
                  email: loginMessages.email,
                  emailPlaceholder: loginMessages.emailPlaceholder,
                  password: loginMessages.password,
                  passwordPlaceholder: loginMessages.passwordPlaceholder,
                  hidePassword: loginMessages.hidePassword,
                  showPassword: loginMessages.showPassword,
                  signingIn: loginMessages.signingIn,
                  loginButton: loginMessages.loginButton,
                }}
              />
            </div>
          </section>
        </div>

        <section className="border-t border-white/60 bg-white/40 p-6 backdrop-blur-xl sm:p-8 lg:p-10 dark:border-slate-800/80 dark:bg-slate-950/40">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                {loginMessages.capabilitiesEyebrow}
              </div>
              <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-50">
                {loginMessages.capabilitiesTitle}
              </h2>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/70 bg-blue-50/40 p-5 shadow-sm shadow-blue-950/5 ring-1 ring-blue-100/50 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/55 dark:ring-slate-800/70">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/80 bg-white/70 text-blue-600 shadow-sm shadow-blue-950/5 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/70 dark:text-cyan-300">
                    <ReceiptText className="h-5 w-5" />
                  </div>
                  <div className="text-lg font-bold text-slate-950 dark:text-slate-50">{loginMessages.salesCustomersTitle}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {loginMessages.salesCustomersDescription}
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/70 bg-cyan-50/40 p-5 shadow-sm shadow-cyan-950/5 ring-1 ring-cyan-100/50 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/55 dark:ring-slate-800/70">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/80 bg-white/70 text-cyan-700 shadow-sm shadow-cyan-950/5 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/70 dark:text-cyan-300">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <div className="text-lg font-bold text-slate-950 dark:text-slate-50">{loginMessages.purchasesSuppliersTitle}</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {loginMessages.purchasesSuppliersDescription}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-[24px] border border-white/70 bg-white/35 p-5 shadow-sm shadow-slate-950/5 ring-1 ring-slate-100/70 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/50 dark:ring-slate-800/70">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/80 bg-white/70 text-slate-700 shadow-sm shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/70 dark:text-slate-200">
                      <Boxes className="h-5 w-5" />
                    </div>
                    <div className="text-lg font-bold text-slate-950 dark:text-slate-50">{loginMessages.businessControlTitle}</div>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {loginMessages.businessControlDescription}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-600 sm:w-56 dark:text-slate-300">
                    {[
                      loginMessages.businessControlItems.staffSalary,
                      loginMessages.businessControlItems.products,
                      loginMessages.businessControlItems.reports,
                      loginMessages.businessControlItems.activity,
                    ].map((item) => (
                      <div key={item} className="rounded-xl border border-white/70 bg-white/55 px-3 py-2 shadow-sm shadow-slate-950/5 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/65">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[22px] border border-white/70 bg-white/40 p-4 shadow-sm shadow-slate-950/5 ring-1 ring-slate-100/70 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/50 dark:ring-slate-800/70">
                <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                  <WalletCards className="h-4 w-4 text-blue-600" />
                  {loginMessages.dailyWorkflowTitle}
                </div>
                <div className="grid gap-2 sm:grid-cols-4">
                  {[
                    loginMessages.dailyWorkflowSteps.createBill,
                    loginMessages.dailyWorkflowSteps.recordPayment,
                    loginMessages.dailyWorkflowSteps.trackBalance,
                    loginMessages.dailyWorkflowSteps.reviewReports,
                  ].map(
                    (step, index) => (
                      <div key={step} className="rounded-xl border border-white/70 bg-white/45 px-3 py-2.5 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/65">
                        <div className="text-xs font-bold text-blue-600">
                          {String(index + 1).padStart(2, "0")}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{step}</div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-[24px] border border-white/70 bg-emerald-50/45 p-5 shadow-sm shadow-emerald-950/5 ring-1 ring-emerald-100/50 backdrop-blur-xl dark:border-slate-800/80 dark:bg-emerald-950/20 dark:ring-emerald-900/40">
              <div>
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/80 bg-white/70 text-emerald-700 shadow-sm shadow-emerald-950/5 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/70 dark:text-emerald-300">
                  <Activity className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-emerald-950 dark:text-emerald-100">{loginMessages.recordSafetyTitle}</h3>
                <p className="mt-2 text-sm leading-6 text-emerald-800 dark:text-emerald-200">
                  {loginMessages.recordSafetyDescription}
                </p>
              </div>
              <div className="mt-6 rounded-[18px] border border-white/80 bg-white/55 p-4 text-sm font-semibold text-emerald-900 shadow-sm shadow-emerald-950/5 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-950/65 dark:text-emerald-100">
                {loginMessages.recordSafetyNote}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
