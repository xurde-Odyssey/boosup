import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("grid grid-cols-1 gap-6 xl:grid-cols-12", className)}>{children}</div>;
}
