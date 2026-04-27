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

export default function LandingPage() {
  return (
    <main className="min-h-screen scroll-smooth bg-[linear-gradient(180deg,_#f8fbff_0%,_#eef4ff_52%,_#f9fbff_100%)] text-slate-950">
      <LandingHeader />

      <section className="mx-auto grid min-h-[calc(100vh-81px)] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.95fr)] lg:px-8 lg:py-20 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700">
        <div className="max-w-2xl text-center lg:text-left">
          <h1 className="max-w-3xl text-5xl font-black leading-[1.02] tracking-tight text-slate-950 sm:text-6xl">
            Smart bookkeeping for Nepali businesses
          </h1>
          <p className="mt-5 text-lg font-semibold leading-8 text-slate-700 sm:text-xl">
            Manage sales, purchases, suppliers, staff salary, credit, and daily business reports from one simple dashboard.
          </p>
          <p className="mt-5 text-3xl font-bold tracking-tight text-slate-700">
            तपाईंको कारोबारको सजिलो हिसाबकिताब।
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login?next=/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700"
            >
              Start Free Trial
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-base font-semibold text-slate-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-50"
            >
              <CirclePlay className="h-4 w-4 text-blue-600" />
              View Demo
            </a>
          </div>
          <p className="mt-8 max-w-2xl text-sm leading-7 text-slate-500">
            No complex accounting knowledge needed. Built for shops, suppliers, and small businesses.
          </p>
        </div>

        <div id="demo" className="relative scroll-mt-28">
          <div className="absolute inset-0 rounded-[32px] bg-blue-200/40 blur-3xl" />
          <div className="relative overflow-hidden rounded-[28px] shadow-[0_38px_95px_-28px_rgba(37,99,235,0.34)] transition-transform duration-300 hover:-translate-y-1">
            <Image
              src="/logos/landingpage.png"
              alt={`${APP_BRAND_NAME} dashboard preview`}
              width={1408}
              height={768}
              className="h-auto w-full object-cover"
              priority
              unoptimized
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:delay-100">
        <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.84)_0%,_rgba(244,247,255,0.92)_100%)] px-6 py-12 shadow-sm shadow-slate-950/5 sm:px-8 lg:px-10">
          <div className="mx-auto max-w-4xl text-center">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">The Problem</div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Drowning in paper receipts and manual logs?
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
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
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[22px] border border-slate-200/80 bg-white/55 px-5 py-6 text-center shadow-sm shadow-slate-950/5"
              >
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-rose-600">
                  {item.title}
                </div>
                <p className="mt-3 text-base font-medium leading-7 text-slate-600 sm:text-[17px]">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="features"
        className="mx-auto max-w-7xl scroll-mt-28 px-4 pb-16 sm:px-6 lg:px-8 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:delay-150"
      >
        <div className="mb-8 max-w-2xl">
          <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">Features</div>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Built around daily business work, not accounting jargon
          </h2>
          <p className="mt-3 text-base leading-8 text-slate-600">
            KhataCore focuses on the records a shop, supplier, or small business actually needs every day.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.65fr)]">
          <div className="rounded-[28px] border border-slate-200 bg-white/88 p-6 shadow-sm shadow-slate-950/5">
            <div className="inline-flex rounded-2xl bg-blue-50 p-3 text-blue-600">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div className="mt-5 text-3xl font-black tracking-tight text-slate-950">
              Sales and billing control
            </div>
            <p className="mt-3 max-w-2xl text-base leading-8 text-slate-600">
              Create bills, track customer balances, follow partial payments, and keep daily sales records ready without manual bookkeeping.
            </p>

            <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-slate-950">
              <div className="border-b border-slate-800 bg-slate-900 px-5 py-4">
                <div className="text-lg font-bold text-white">Billing Interface</div>
                <div className="mt-1 text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                  Fast invoice flow
                </div>
              </div>
              <div className="grid gap-3 p-5 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-3">
                  {[
                    "Invoice Number",
                    "Customer Name",
                    "Product Items",
                    "Payment Status",
                    "Received Amount",
                  ].map((item) => (
                    <div key={item} className="rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-3 text-sm font-semibold text-slate-200">
                      {item}
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/85 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-sm font-bold text-white">Recent Sales</div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-300">
                      Today
                    </div>
                  </div>
                  <div className="space-y-3">
                    {[
                      ["SA-2083/01/08-14", "Sharma Traders", "Rs. 12,500"],
                      ["SA-2083/01/08-15", "Pokhara Mart", "Rs. 8,900"],
                      ["SA-2083/01/08-16", "New Gorkha Store", "Rs. 6,400"],
                    ].map(([invoice, customer, amount]) => (
                      <div key={invoice} className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_auto] gap-3 rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-3 text-sm">
                        <div className="truncate font-semibold text-slate-100">{invoice}</div>
                        <div className="truncate text-slate-400">{customer}</div>
                        <div className="font-bold text-emerald-300">{amount}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex min-h-[420px] flex-col justify-between rounded-[28px] bg-blue-700 p-6 text-white shadow-sm shadow-blue-950/15">
            <div>
              <div className="inline-flex rounded-2xl bg-white/12 p-3 text-white">
                <Truck className="h-5 w-5" />
              </div>
              <div className="mt-5 text-3xl font-black tracking-tight">
                Supplier management
              </div>
              <p className="mt-3 text-base leading-8 text-blue-50/90">
                Keep track of supplier profiles, purchase bills, pending payments, and payable history without losing past records.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center justify-between text-sm font-semibold text-white">
                <span>Active Suppliers</span>
                <span>12 Total</span>
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/20">
                <div className="h-full w-[76%] rounded-full bg-white" />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {[
            {
              icon: WalletCards,
              title: "Customer balances and credit",
              text: "Follow paid, partial, pending, and overdue amounts so customer dues stay clear and collectible.",
              tone: "bg-slate-100/90 text-slate-700",
            },
            {
              icon: BadgeDollarSign,
              title: "Staff ledger and salary flow",
              text: "Manage salary, advances, pending balances, and monthly payment records from a single staff ledger view.",
              tone: "bg-white/88 text-blue-600",
            },
            {
              icon: History,
              title: "Purchases, products, and activity",
              text: "Record purchases, maintain product visibility, and review activity history and reports from the same system.",
              tone: "bg-white/88 text-blue-600",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-[24px] border border-slate-200 bg-white/82 p-6 shadow-sm shadow-slate-950/5">
              <div className={`inline-flex rounded-2xl p-3 ${item.tone}`}>
                <item.icon className="h-5 w-5" />
              </div>
              <div className="mt-5 text-2xl font-black tracking-tight text-slate-950">{item.title}</div>
              <p className="mt-3 text-base leading-8 text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto max-w-7xl scroll-mt-28 px-4 pb-16 sm:px-6 lg:px-8 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:delay-200"
      >
        <div className="rounded-[28px] border border-slate-200 bg-white/82 px-6 py-10 shadow-sm shadow-slate-950/5 sm:px-8 sm:py-12 lg:px-12 lg:py-14">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">How It Works</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Simple operational flow from entry to report
            </h2>
            <p className="mt-3 text-base leading-8 text-slate-600">
              Record daily work, track payments, review dues, and generate reports without accounting complexity.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Record daily bills",
                text: "Create sales or purchase bills with the details you need.",
                tone: "bg-blue-600",
              },
              {
                step: "02",
                title: "Track money movement",
                text: "Track received amounts, payments, advances, and balances.",
                tone: "bg-blue-600",
              },
              {
                step: "03",
                title: "Review pending dues",
                text: "Review customer dues, supplier payables, and salary pending amounts.",
                tone: "bg-blue-600",
              },
              {
                step: "04",
                title: "Generate daily reports",
                text: "Use reports and filters to review daily business performance.",
                tone: "bg-emerald-700",
              },
            ].map((item, index, items) => (
              <div key={item.step} className="relative text-center">
                <div className="mx-auto flex max-w-[260px] flex-col items-center">
                  <div className={`relative z-10 flex h-24 w-24 items-center justify-center rounded-[26px] text-4xl font-black text-white shadow-lg shadow-slate-950/10 ${item.tone}`}>
                    {Number(item.step)}
                  </div>
                  {index < items.length - 1 && (
                    <div className="absolute left-[calc(50%+54px)] top-12 hidden h-0.5 w-[calc(100%-108px)] border-t-2 border-dashed border-slate-300 lg:block" />
                  )}
                  <div className="mt-8 text-2xl font-black tracking-tight text-slate-950">
                    {item.title}
                  </div>
                  <p className="mt-4 text-base leading-8 text-slate-600">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="faq"
        className="mx-auto max-w-7xl scroll-mt-28 px-4 pb-20 sm:px-6 lg:px-8 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-700 motion-safe:delay-300"
      >
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-[0.22em] text-blue-600">FAQ</div>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Frequently asked questions
            </h2>
          </div>

          <div className="mt-8 space-y-4">
            {[
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
            ].map((item, index) => (
              <details
                key={item.question}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white/84 shadow-sm shadow-slate-950/5"
                open={index === 0}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-left text-lg font-bold text-slate-950">
                  <span>{item.question}</span>
                  <ChevronDown className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-slate-200 px-6 py-5 text-base leading-8 text-slate-600">
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
