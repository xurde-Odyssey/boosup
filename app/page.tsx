import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeDollarSign,
  ChevronDown,
  CirclePlay,
  History,
  ReceiptText,
  Truck,
  WalletCards,
} from "lucide-react";
import { LandingHeader } from "@/components/marketing/LandingHeader";
import { APP_BRAND_NAME } from "@/lib/brand";

const painPoints = [
  {
    title: "Time wastage",
    text: "Hours go into checking sales, purchases, and balances by hand instead of running the business.",
  },
  {
    title: "Human errors",
    text: "Manual totals, missing entries, and inconsistent records create payment confusion and reporting mistakes.",
  },
  {
    title: "Zero insight",
    text: "Without digital tracking, it stays hard to know what is selling, what is due, and where the cash is moving.",
  },
];

const featureCards = [
  {
    icon: WalletCards,
    title: "Customer balances and credit",
    text: "Follow paid, partial, pending, and overdue amounts so customer dues stay clear and collectible.",
  },
  {
    icon: BadgeDollarSign,
    title: "Staff ledger and salary flow",
    text: "Manage salary, advances, pending balances, and monthly payment records from one staff ledger.",
  },
  {
    icon: History,
    title: "Purchases, products, and activity",
    text: "Record purchases, maintain product visibility, and review activity history and reports from the same system.",
  },
];

const steps = [
  {
    step: "01",
    title: "Record daily bills",
  },
  {
    step: "02",
    title: "Track money movement",
  },
  {
    step: "03",
    title: "Review pending dues",
  },
  {
    step: "04",
    title: "Generate reports",
  },
];

const faqs = [
  {
    question: "Do I need accounting knowledge to use KhataCore?",
    answer:
      "No. The system is built around billing, purchases, payments, supplier records, salary tracking, and reports that a small business already understands.",
  },
  {
    question: "Can I manage both sales and purchases in the same system?",
    answer:
      "Yes. Sales, purchases, suppliers, products, staff salary, payment history, and dashboard summaries are all part of the same workflow.",
  },
  {
    question: "Does it support Nepali date usage?",
    answer:
      "Yes. The interface can show Nepali dates while the system keeps reliable Gregorian date values internally for filtering and records.",
  },
  {
    question: "Can I track credit and partial payments?",
    answer:
      "Yes. The current system already handles paid, partial, pending, overdue, supplier due, and salary pending states across the main modules.",
  },
  {
    question: "Is it suitable for shops and small businesses?",
    answer:
      "Yes. The current structure is aimed at practical day-to-day business control for shops, suppliers, and owner-managed businesses.",
  },
  {
    question: "Can reports be reviewed by date range?",
    answer:
      "Yes. Dashboard, sales, purchases, and staff pages support report ranges so you can review the selected week, month, year, or custom period.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen scroll-smooth bg-[linear-gradient(180deg,_#f6f9ff_0%,_#eef4ff_38%,_#f8fbff_100%)] text-slate-950">
      <LandingHeader />

      <section className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.12),_transparent_42%),radial-gradient(circle_at_78%_16%,_rgba(14,165,233,0.10),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,0.92)_0%,_rgba(248,251,255,0)_100%)]" />
        <div className="relative mx-auto grid min-h-[calc(100vh-81px)] max-w-7xl items-center gap-14 px-4 py-14 sm:px-6 sm:py-18 lg:grid-cols-[minmax(0,1fr)_minmax(500px,0.96fr)] lg:px-8 lg:py-24">
          <div className="max-w-2xl text-center lg:text-left">
            <div className="inline-flex max-w-full items-center gap-3 rounded-[22px] border border-white/80 bg-white/78 px-4 py-3 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.2)] backdrop-blur lg:px-5">
              <div className="h-10 w-1.5 rounded-full bg-[linear-gradient(180deg,_#2563eb_0%,_#0ea5e9_100%)]" />
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-blue-600">
                  KhataCore
                </div>
                <div className="text-sm font-semibold text-slate-700 sm:text-[15px]">
                  The core of your business accounting
                </div>
              </div>
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.96] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
              Smart bookkeeping for Nepali businesses
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
              Manage sales, purchases, suppliers, staff salary, credit, and daily business reports from one simple dashboard.
            </p>
            <p className="mt-5 text-2xl font-bold tracking-tight text-slate-700 sm:text-3xl">
              तपाईंको कारोबारको सजिलो हिसाबकिताब।
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/login?next=/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-[0_18px_40px_-18px_rgba(37,99,235,0.8)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700"
              >
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#demo"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/88 px-6 py-4 text-base font-semibold text-slate-800 shadow-sm shadow-slate-950/5 backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:bg-white"
              >
                <CirclePlay className="h-4 w-4 text-blue-600" />
                View Demo
              </a>
            </div>

            <div className="mt-8 flex flex-col gap-3 text-sm leading-7 text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
              <span>No complex accounting knowledge needed.</span>
              <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:inline-block" />
              <span>Built for shops, suppliers, and small businesses.</span>
            </div>
          </div>

          <div id="demo" className="relative scroll-mt-28">
            <div className="absolute -inset-x-8 -inset-y-10 rounded-[3rem] bg-[radial-gradient(circle,_rgba(37,99,235,0.16),_rgba(255,255,255,0)_68%)] blur-2xl" />
            <div className="relative">
              <div className="absolute -inset-3 rounded-[2rem] border border-white/60 bg-white/22 shadow-[0_30px_120px_-40px_rgba(15,23,42,0.45)] backdrop-blur-2xl" />
              <div className="relative overflow-hidden rounded-[26px] border border-white/80 bg-white/80 shadow-[0_40px_110px_-36px_rgba(15,23,42,0.42)]">
                <div className="flex items-center justify-between border-b border-slate-200/80 bg-white/78 px-5 py-3 backdrop-blur">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{APP_BRAND_NAME} Dashboard</div>
                    <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                      Sales, purchases, dues, reports
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
                  </div>
                </div>
                <Image
                  src="/logos/dashboard.jpeg"
                  alt={`${APP_BRAND_NAME} dashboard preview`}
                  width={1024}
                  height={561}
                  className="h-auto w-full object-cover"
                  priority
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-18 sm:px-6 lg:px-8">
        <div className="grid gap-8 border-y border-slate-200/80 py-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 lg:py-14">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">The Problem</div>
          </div>
          <div>
            <h2 className="max-w-3xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Drowning in paper receipts and manual logs?
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {painPoints.map((item) => (
                <div key={item.title} className="border-t border-slate-200 pt-4">
                  <div className="text-sm font-bold uppercase tracking-[0.18em] text-slate-900">
                    {item.title}
                  </div>
                  <p className="mt-3 text-base leading-7 text-slate-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl scroll-mt-28 px-4 pb-18 sm:px-6 lg:px-8">
        <div className="grid gap-8 border-y border-slate-200/80 py-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 lg:py-14">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">Features</div>
          </div>
          <div>
            <h2 className="max-w-3xl text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Built around daily business work, not accounting jargon
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600">
              KhataCore focuses on the records a shop, supplier, or small business actually needs every day.
            </p>

            <div className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_360px]">
              <div>
                <div className="inline-flex rounded-2xl bg-blue-50 p-3 text-blue-600">
                  <ReceiptText className="h-5 w-5" />
                </div>
                <div className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-[2rem]">
                  Sales and billing control
                </div>
                <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
                  Create bills, track customer balances, follow partial payments, and keep daily sales records ready without manual bookkeeping.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {[
                    "Invoice numbers and dates",
                    "Customer and credit tracking",
                    "Line items and tax values",
                    "Payment status and received amount",
                  ].map((item) => (
                    <div key={item} className="border-t border-slate-200 pt-3 text-sm font-semibold text-slate-700">
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,_#0f172a_0%,_#111827_100%)] p-6 text-white shadow-[0_24px_60px_-32px_rgba(15,23,42,0.7)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold">Billing workflow</div>
                      <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        Daily sales control
                      </div>
                    </div>
                    <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                      Ready
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    {[
                      ["Invoices", "128"],
                      ["Partial payments", "23"],
                      ["Pending balances", "11"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-4">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                          {label}
                        </div>
                        <div className="mt-2 text-2xl font-black text-white">{value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 space-y-3">
                    {[
                      "Create invoice with bill number and date",
                      "Track customer due and received amount",
                      "Keep tax, totals, and payment state aligned",
                    ].map((item) => (
                      <div key={item} className="border-t border-white/10 pt-3 text-sm font-medium text-slate-200">
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-5 xl:pt-0 xl:pl-2">
                <div className="inline-flex rounded-2xl bg-blue-600/10 p-3 text-blue-600">
                  <Truck className="h-5 w-5" />
                </div>
                <div className="mt-5 text-3xl font-black tracking-tight text-slate-950">
                  Supplier management
                </div>
                <p className="mt-3 text-base leading-8 text-slate-600">
                  Keep track of supplier profiles, purchase bills, pending payments, and payable history without losing past records.
                </p>

                <div className="mt-8 space-y-4">
                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-900">
                      <span>Active suppliers</span>
                      <span>12 total</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full w-[76%] rounded-full bg-blue-600" />
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Pending payments</span>
                      <span className="font-semibold text-slate-900">6 vendors</span>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 pt-4">
                    <div className="flex items-center justify-between text-sm text-slate-600">
                      <span>Recent purchase bills</span>
                      <span className="font-semibold text-slate-900">28 this month</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {featureCards.map((item) => (
            <div key={item.title} className="border-t border-slate-200 pt-4">
              <div className="inline-flex rounded-2xl bg-slate-50 p-3 text-blue-600">
                <item.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 text-2xl font-black tracking-tight text-slate-950">{item.title}</div>
              <p className="mt-3 text-base leading-8 text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-28 px-4 pb-18 sm:px-6 lg:px-8">
        <div className="grid gap-8 border-y border-slate-200/80 py-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-12 lg:py-14">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">How It Works</div>
          </div>
          <div>
            <h2 className="max-w-3xl text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Simple operational flow from entry to report
            </h2>

            <div className="mt-10 grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)] xl:gap-10">
              <div className="border-t border-slate-200 pt-5">
                <div className="text-sm font-bold uppercase tracking-[0.18em] text-slate-900">
                  From first entry to final review
                </div>
                <p className="mt-4 text-base leading-8 text-slate-600">
                  The workflow stays short: enter the bill, track the money, watch pending dues, and review results without scattered records.
                </p>
              </div>

              <div className="relative">
                <div className="absolute left-8 top-8 hidden h-[calc(100%-4rem)] w-px bg-slate-200 md:block xl:hidden" />
                <div className="absolute left-0 right-0 top-8 hidden h-px border-t border-dashed border-slate-300 xl:block" />

                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                  {steps.map((item, index) => (
                    <div
                      key={item.step}
                      className={`relative border-t border-slate-200 pt-5 ${
                        index % 2 === 1 ? "md:translate-y-6 xl:translate-y-0" : ""
                      }`}
                    >
                      <div className="flex items-center gap-4 xl:flex-col xl:items-start xl:gap-5">
                        <div
                          className={`relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-[20px] text-2xl font-black text-white shadow-sm ${
                            item.step === "04" ? "bg-emerald-700" : "bg-blue-600"
                          }`}
                        >
                          {Number(item.step)}
                        </div>
                        <div>
                          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                            Step {item.step}
                          </div>
                          <div className="mt-1 text-xl font-black tracking-tight text-slate-950">
                            {item.title}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" className="mx-auto max-w-7xl scroll-mt-28 px-4 pb-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-14">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">FAQ</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Questions before you start?
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              Clear answers for the most common concerns around day-to-day business use.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((item, index) => (
              <details
                key={item.question}
                className="group overflow-hidden rounded-[22px] border border-slate-200/80 bg-white/86 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.16)]"
                open={index === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left text-lg font-bold text-slate-950">
                  <span>{item.question}</span>
                  <ChevronDown className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-slate-200/80 px-6 py-5 text-base leading-8 text-slate-600">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
