import { Sidebar } from "@/components/dashboard/Sidebar";

function LoadingDots() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="inline-flex items-center gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <span
            key={index}
            className="h-4 w-4 rounded-full bg-primary loading-dot"
            style={{ animationDelay: `${index * 0.18}s` }}
          />
        ))}
      </div>
    </div>
  );
}

export function ListPageSkeleton() {
  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex flex-1 items-center justify-center overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
        <LoadingDots />
      </main>
    </div>
  );
}

export function FormPageSkeleton() {
  return (
    <div className="flex min-h-screen bg-slate-50/50">
      <Sidebar />

      <main className="flex flex-1 items-center justify-center overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-24 lg:p-8 lg:pt-8">
        <LoadingDots />
      </main>
    </div>
  );
}
