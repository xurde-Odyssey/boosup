import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FieldHint({
  children,
  tone = "muted",
  className,
}: {
  children: ReactNode;
  tone?: "muted" | "info" | "warning";
  className?: string;
}) {
  const toneClass =
    tone === "info"
      ? "text-blue-600"
      : tone === "warning"
        ? "text-amber-600"
        : "text-slate-500";

  return <p className={cn("mt-2 text-xs leading-5", toneClass, className)}>{children}</p>;
}
