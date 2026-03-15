import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionCard({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-[24px] border border-slate-100 bg-white shadow-sm",
        padded && "p-6",
        className,
      )}
    >
      {children}
    </section>
  );
}
