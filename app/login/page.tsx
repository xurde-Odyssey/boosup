import Image from "next/image";
import {
  Activity,
  Boxes,
  LockKeyhole,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  WalletCards,
} from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";
import appIcon from "@/app/logos/icon.png";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const nextPath = typeof params.next === "string" ? params.next : "/";
  const initialError = typeof params.error === "string" ? params.error : "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,_#f8fbff_0%,_#eaf3ff_46%,_#f6fffb_100%)] px-6 py-12">
      <div className="w-full max-w-6xl overflow-hidden rounded-[28px] border border-white/70 bg-white/55 shadow-2xl shadow-blue-950/15 ring-1 ring-white/80 backdrop-blur-2xl">
        <div className="grid md:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px]">
          <section className="border-b border-white/60 bg-white/35 p-6 shadow-inner shadow-white/40 backdrop-blur-xl sm:p-8 md:border-b-0 md:border-r lg:p-10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-[22px] border border-white/80 bg-white/65 p-3 shadow-lg shadow-blue-950/10 ring-1 ring-white/90 backdrop-blur-xl">
                <Image
                  src={appIcon}
                  alt="Bookkeeping system logo"
                  width={120}
                  height={80}
                  className="h-full w-full object-contain"
                  priority
                />
              </div>
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/70 bg-white/55 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-700 shadow-sm shadow-blue-950/5 ring-1 ring-blue-100/70 backdrop-blur-xl">
                <ShieldCheck className="h-4 w-4" />
                Admin Access
              </div>
            </div>

            <div className="mt-8">
              <div className="text-xs font-bold uppercase tracking-[0.24em] text-blue-600">
                Dipak Suppliers
              </div>
              <h1 className="mt-3 max-w-2xl text-4xl font-bold leading-tight text-slate-950">
                One workspace for daily business control.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
                Manage billing, payments, staff salary, suppliers, products, reports, and activity
                history without moving between separate books.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                { value: "Sales", label: "Invoices and collections" },
                { value: "Ledger", label: "Customer and supplier balances" },
                { value: "Salary", label: "Staff advances and payments" },
              ].map((item) => (
                <div
                  key={item.value}
                  className="rounded-[18px] border border-white/70 bg-white/45 p-4 shadow-sm shadow-blue-950/5 ring-1 ring-white/80 backdrop-blur-xl"
                >
                  <div className="text-lg font-bold text-slate-950">{item.value}</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="flex items-center bg-white/50 p-6 backdrop-blur-xl sm:p-8 lg:p-10">
            <div className="w-full">
              <div className="mb-5">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-white/70 bg-blue-50/70 text-blue-600 shadow-sm shadow-blue-950/5 ring-1 ring-blue-100/70 backdrop-blur-xl">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <h2 className="mt-3 text-xl font-bold text-slate-900">Admin Login</h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  Enter your credentials to open the dashboard.
                </p>
              </div>

              <LoginForm nextPath={nextPath} initialError={initialError} />
            </div>
          </section>
        </div>

        <section className="border-t border-white/60 bg-white/40 p-6 backdrop-blur-xl sm:p-8 lg:p-10">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Capabilities
              </div>
              <h2 className="mt-1 text-xl font-bold text-slate-950">
                What the system handles and other components
              </h2>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/70 bg-blue-50/40 p-5 shadow-sm shadow-blue-950/5 ring-1 ring-blue-100/50 backdrop-blur-xl">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/80 bg-white/70 text-blue-600 shadow-sm shadow-blue-950/5 backdrop-blur-xl">
                    <ReceiptText className="h-5 w-5" />
                  </div>
                  <div className="text-lg font-bold text-slate-950">Sales & Customers</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Create invoices, receive payments, and track customer receivables from the
                    same ledger.
                  </p>
                </div>

                <div className="rounded-[24px] border border-white/70 bg-cyan-50/40 p-5 shadow-sm shadow-cyan-950/5 ring-1 ring-cyan-100/50 backdrop-blur-xl">
                  <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/80 bg-white/70 text-cyan-700 shadow-sm shadow-cyan-950/5 backdrop-blur-xl">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <div className="text-lg font-bold text-slate-950">Purchases & Suppliers</div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Record supplier bills, partial payments, payables, and purchase history in
                    one place.
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-[24px] border border-white/70 bg-white/35 p-5 shadow-sm shadow-slate-950/5 ring-1 ring-slate-100/70 backdrop-blur-xl">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/80 bg-white/70 text-slate-700 shadow-sm shadow-slate-950/5 backdrop-blur-xl">
                      <Boxes className="h-5 w-5" />
                    </div>
                    <div className="text-lg font-bold text-slate-950">Business Control</div>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                      Staff salary, products, dashboard reports, activity logs, and payment
                      history stay connected to daily operations.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-600 sm:w-56">
                    {["Staff salary", "Products", "Reports", "Activity"].map((item) => (
                      <div key={item} className="rounded-xl border border-white/70 bg-white/55 px-3 py-2 shadow-sm shadow-slate-950/5 backdrop-blur-xl">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-[22px] border border-white/70 bg-white/40 p-4 shadow-sm shadow-slate-950/5 ring-1 ring-slate-100/70 backdrop-blur-xl">
                <div className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
                  <WalletCards className="h-4 w-4 text-blue-600" />
                  Daily workflow
                </div>
                <div className="grid gap-2 sm:grid-cols-4">
                  {["Create bill", "Record payment", "Track balance", "Review reports"].map(
                    (step, index) => (
                      <div key={step} className="rounded-xl border border-white/70 bg-white/45 px-3 py-2.5 backdrop-blur-xl">
                        <div className="text-xs font-bold text-blue-600">
                          {String(index + 1).padStart(2, "0")}
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">{step}</div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-[24px] border border-white/70 bg-emerald-50/45 p-5 shadow-sm shadow-emerald-950/5 ring-1 ring-emerald-100/50 backdrop-blur-xl">
              <div>
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-white/80 bg-white/70 text-emerald-700 shadow-sm shadow-emerald-950/5 backdrop-blur-xl">
                  <Activity className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-emerald-950">Record safety</h3>
                <p className="mt-2 text-sm leading-6 text-emerald-800">
                  Payment history, allocation records, activity logs, and ledgers help keep daily
                  changes reviewable.
                </p>
              </div>
              <div className="mt-6 rounded-[18px] border border-white/80 bg-white/55 p-4 text-sm font-semibold text-emerald-900 shadow-sm shadow-emerald-950/5 backdrop-blur-xl">
                Built for controlled bookkeeping, not scattered notes.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
