import Link from "next/link";

export function FormStickyActions({
  submitLabel,
  cancelHref,
  helperText,
}: {
  submitLabel: string;
  cancelHref: string;
  helperText: string;
}) {
  return (
    <div className="sticky bottom-4 z-20 mt-8">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg shadow-slate-200/70 backdrop-blur md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
            Action Bar
          </div>
          <p className="mt-1 text-sm font-medium text-slate-700">{helperText}</p>
        </div>
        <div className="flex gap-3">
          <Link
            href={cancelHref}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3 font-semibold text-slate-700 transition-colors hover:bg-slate-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="inline-flex min-w-[180px] items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
