"use client";

import { CheckCircle2, PencilLine, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const getNoticeVariant = (message: string) => {
  const normalized = message.toLowerCase();

  if (normalized.includes("deleted")) {
    return {
      icon: Trash2,
      boxClassName: "border-red-200 bg-red-50 text-red-700",
      iconClassName: "bg-red-100 text-red-600",
      barClassName: "bg-red-500",
    };
  }

  if (normalized.includes("updated")) {
    return {
      icon: PencilLine,
      boxClassName: "border-blue-200 bg-blue-50 text-blue-700",
      iconClassName: "bg-blue-100 text-blue-600",
      barClassName: "bg-blue-500",
    };
  }

  return {
    icon: CheckCircle2,
    boxClassName: "border-green-200 bg-green-50 text-green-700",
    iconClassName: "bg-green-100 text-green-600",
    barClassName: "bg-green-500",
  };
};

export function ActionNotice({ message }: { message: string }) {
  const [visible, setVisible] = useState(true);
  const variant = useMemo(() => getNoticeVariant(message), [message]);
  const Icon = variant.icon;

  useEffect(() => {
    const hideTimer = window.setTimeout(() => setVisible(false), 3600);
    return () => window.clearTimeout(hideTimer);
  }, []);

  if (!message || !visible) {
    return null;
  }

  return (
    <div
      className={`relative mb-6 overflow-hidden rounded-2xl border px-4 py-3 shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${variant.boxClassName}`}
    >
      <div className="flex items-center gap-3">
        <div className={`rounded-full p-2 ${variant.iconClassName}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 text-sm font-medium">{message}</div>
        <button
          type="button"
          onClick={() => setVisible(false)}
          className="text-xs font-semibold uppercase tracking-wide opacity-70 transition-opacity hover:opacity-100"
        >
          Close
        </button>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-black/5">
        <div
          className={`h-full origin-left animate-[shrink_3.6s_linear_forwards] ${variant.barClassName}`}
        />
      </div>
    </div>
  );
}
