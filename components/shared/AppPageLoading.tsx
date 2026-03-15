import { Sidebar } from "@/components/dashboard/Sidebar";

function LoadingBar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`.trim()} />;
}

export function ListPageSkeleton() {
  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <div className="space-y-6">
          <div className="space-y-3">
            <LoadingBar className="h-9 w-56" />
            <LoadingBar className="h-5 w-96 max-w-full" />
          </div>

          <div className="flex gap-3">
            <LoadingBar className="h-11 w-36" />
            <LoadingBar className="h-11 w-40" />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <LoadingBar className="h-4 w-24" />
                    <LoadingBar className="h-8 w-32" />
                    <LoadingBar className="h-4 w-28" />
                  </div>
                  <LoadingBar className="h-10 w-10 rounded-2xl" />
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-50 p-6">
              <LoadingBar className="h-6 w-48" />
              <LoadingBar className="mt-3 h-4 w-72 max-w-full" />
            </div>
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-3 xl:grid-cols-4">
                <LoadingBar className="h-12" />
                <LoadingBar className="h-12" />
                <LoadingBar className="h-12" />
                <LoadingBar className="h-12" />
              </div>
              {Array.from({ length: 6 }).map((_, index) => (
                <LoadingBar key={index} className="h-14" />
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function FormPageSkeleton() {
  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex-1 overflow-y-auto p-8">
        <div className="space-y-6">
          <div className="space-y-3">
            <LoadingBar className="h-9 w-56" />
            <LoadingBar className="h-5 w-80 max-w-full" />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section className="space-y-5 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <LoadingBar className="h-7 w-40" />
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <LoadingBar className="h-5 w-32" />
                  <LoadingBar className="mt-3 h-4 w-64 max-w-full" />
                  <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <LoadingBar className="h-12" />
                    <LoadingBar className="h-12" />
                  </div>
                </div>
              ))}
              <div className="sticky bottom-4 z-20">
                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg shadow-slate-200/70 backdrop-blur md:flex-row md:items-center md:justify-between">
                  <div>
                    <LoadingBar className="h-4 w-24" />
                    <LoadingBar className="mt-2 h-4 w-72 max-w-full" />
                  </div>
                  <div className="flex gap-3">
                    <LoadingBar className="h-12 w-28" />
                    <LoadingBar className="h-12 w-40" />
                  </div>
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <LoadingBar className="h-6 w-36" />
                <div className="mt-5 space-y-3">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <LoadingBar key={index} className="h-12" />
                  ))}
                </div>
              </section>
              <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                <LoadingBar className="h-6 w-44" />
                <div className="mt-5 space-y-3">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <LoadingBar key={index} className="h-11" />
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
