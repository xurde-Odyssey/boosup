"use client";

import { Printer } from "lucide-react";

export function PrintAgainButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
    >
      <Printer className="h-4 w-4" />
      Print Again
    </button>
  );
}
