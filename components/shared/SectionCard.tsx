import type { HTMLAttributes, ReactNode } from "react";
import { Card } from "@/components/shared/Card";

export function SectionCard({
  children,
  className,
  padded = true,
  ...props
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <Card {...props} className={padded ? `p-6 ${className ?? ""}` : className}>
      {children}
    </Card>
  );
}
