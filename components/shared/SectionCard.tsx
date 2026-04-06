import { ReactNode } from "react";
import { Card } from "@/components/shared/Card";

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
    <Card className={padded ? `p-6 ${className ?? ""}` : className}>
      {children}
    </Card>
  );
}
