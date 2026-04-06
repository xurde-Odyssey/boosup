import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50 transition duration-200 hover:shadow-md hover:shadow-slate-200/60 dark:bg-card dark:border-slate-800/70 dark:shadow-slate-950/20",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("p-6", className)}>{children}</div>;
}
