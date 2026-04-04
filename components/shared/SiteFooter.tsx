export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white/95 px-6 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 text-sm text-slate-500 dark:text-slate-400 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">BookKeep Pro</span>{" "}
          <span>for bookkeeping, purchases, sales, suppliers, products, and staff.</span>
        </div>
        <div className="text-slate-400 dark:text-slate-500">Built for daily operations</div>
      </div>
    </footer>
  );
}
