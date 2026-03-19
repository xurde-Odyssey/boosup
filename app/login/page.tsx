import { LockKeyhole, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/LoginForm";

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
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.18),_transparent_35%),linear-gradient(180deg,_#f8fbff_0%,_#eef4ff_100%)] px-6 py-12">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_480px]">
        <section className="hidden rounded-3xl border border-white/70 bg-slate-900 p-10 text-white shadow-2xl shadow-blue-200/60 lg:block">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-blue-100">
            <ShieldCheck className="h-4 w-4" />
            Admin Access
          </div>
          <h1 className="mt-6 text-4xl font-bold leading-tight">
            BookKeep Pro
            <span className="block text-blue-300">manufacturing bookkeeping control</span>
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-slate-300">
            Sign in with the admin account to manage sales, purchases, vendors, products,
            staff, and payment records.
          </p>
          <div className="mt-10 grid gap-4 text-sm text-slate-200">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              Secure the full system behind a single admin gate.
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              Keep daily operations restricted to authorized access only.
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/70">
          <div className="mb-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <LockKeyhole className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-slate-900">Admin Login</h2>
            <p className="mt-2 text-sm text-slate-500">
              Enter your admin credentials to open the bookkeeping dashboard.
            </p>
          </div>

          <LoginForm nextPath={nextPath} initialError={initialError} />
        </section>
      </div>
    </main>
  );
}
