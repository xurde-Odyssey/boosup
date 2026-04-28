import { LockKeyhole, ReceiptText, ShieldCheck, ShoppingCart } from "lucide-react";
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
  const nextPath = typeof params.next === "string" ? params.next : "/dashboard";
  const initialError = typeof params.error === "string" ? params.error : "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,_#f8fbff_0%,_#eaf3ff_46%,_#f6fffb_100%)] px-6 py-12 dark:bg-[linear-gradient(135deg,_#020617_0%,_#0f172a_46%,_#071a1a_100%)]">
      <div className="w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/70 bg-white/55 shadow-2xl shadow-blue-950/15 ring-1 ring-white/80 backdrop-blur-2xl dark:border-slate-800/80 dark:bg-slate-950/65 dark:ring-slate-800/80">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_400px]">
          <section className="border-b border-white/60 bg-white/35 p-6 shadow-inner shadow-white/40 backdrop-blur-xl sm:p-8 lg:border-b-0 lg:border-r lg:p-10 dark:border-slate-800/80 dark:bg-slate-950/35 dark:shadow-none">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600">
                {APP_BRAND_NAME}
              </div>
              <p className="mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
                {loginMessages.tagline}
              </p>
            </div>

            <div className="mt-10 max-w-xl">
              <h1 className="text-4xl font-bold leading-tight text-slate-950 dark:text-slate-50 sm:text-5xl">
                {loginMessages.heroTitle}
              </h1>
              <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">
                Open the dashboard to record bills, update payments, and review balances from one place.
              </p>
            </div>

            <div className="mt-10 space-y-3">
              {[
                {
                  icon: ReceiptText,
                  title: loginMessages.salesCardTitle,
                  label: loginMessages.salesCardLabel,
                },
                {
                  icon: ShoppingCart,
                  title: loginMessages.ledgerCardTitle,
                  label: loginMessages.ledgerCardLabel,
                },
                {
                  icon: ShieldCheck,
                  title: loginMessages.salaryCardTitle,
                  label: loginMessages.salaryCardLabel,
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-center gap-4 rounded-[18px] border border-white/70 bg-white/45 px-4 py-3 shadow-sm shadow-blue-950/5 ring-1 ring-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/50 dark:ring-slate-800/70"
                >
                  <div className="inline-flex rounded-2xl bg-blue-50 p-2.5 text-blue-600 dark:bg-slate-900 dark:text-cyan-300">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-950 dark:text-slate-50">
                      {item.title}
                    </div>
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {item.label}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="relative flex items-center bg-white/50 p-6 backdrop-blur-xl sm:p-8 lg:p-10 dark:bg-slate-950/45">
            <div className="w-full">
              <div className="mb-6 pt-10">
                <div className="absolute right-6 top-6 sm:right-8 sm:top-8 lg:right-10 lg:top-10">
                  <div className="inline-flex items-center gap-1 rounded-xl border border-white/75 bg-white/55 p-1 shadow-sm shadow-slate-950/5 ring-1 ring-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/55 dark:ring-slate-800/70">
                    <LanguageSwitcher compact />
                    <ThemeToggle compact />
                  </div>
                </div>
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-white/70 bg-blue-50/70 text-blue-600 shadow-sm shadow-blue-950/5 ring-1 ring-blue-100/70 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/80 dark:text-cyan-300 dark:ring-slate-800/70">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <h2 className="mt-3 text-xl font-bold text-slate-900 dark:text-slate-50">{loginMessages.loginTitle}</h2>
                <p className="mt-1.5 text-sm leading-6 text-slate-500 dark:text-slate-400">
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

              <div className="mt-6 rounded-[20px] border border-white/70 bg-white/50 p-4 text-sm leading-7 text-slate-600 shadow-sm shadow-slate-950/5 ring-1 ring-white/80 backdrop-blur-xl dark:border-slate-800/80 dark:bg-slate-900/55 dark:text-slate-300 dark:ring-slate-800/70">
                Payment history, ledgers, and activity logs stay reviewable after daily changes.
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
