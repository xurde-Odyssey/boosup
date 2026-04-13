import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "border border-primary bg-primary text-primary-foreground hover:bg-[color:var(--ui-primary-hover)] hover:border-[color:var(--ui-primary-hover)] hover:text-primary-foreground",
  secondary:
    "border border-[color:var(--ui-border-strong)] bg-white text-slate-700 hover:bg-slate-50 dark:bg-card dark:text-slate-100 dark:hover:bg-slate-800/70",
  ghost:
    "border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/70 dark:hover:text-slate-50",
  danger:
    "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-[var(--ui-button-h-sm)] px-3.5 text-xs",
  md: "h-[var(--ui-button-h-md)] px-4 text-sm",
  lg: "h-[var(--ui-button-h-lg)] px-5 text-sm",
};

export const buttonClassName = ({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) =>
  cn(
    "inline-flex items-center justify-center gap-2 rounded-[var(--ui-radius-button)] font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ui-ring)] disabled:pointer-events-none disabled:opacity-60",
    variantStyles[variant],
    sizeStyles[size],
    className,
  );

type BaseProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

type ButtonProps =
  | (BaseProps & { href: string } & Omit<React.ComponentProps<typeof Link>, "href" | "className">)
  | (BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: never });

export function Button(props: ButtonProps) {
  const { children, variant = "primary", size = "md", className } = props;
  const classes = buttonClassName({ variant, size, className });

  if ("href" in props && props.href) {
    const { href, ...restProps } = props;

    return (
      <Link href={href} {...restProps} className={classes}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...restProps } = props;

  return (
    <button type={type} className={classes} {...restProps}>
      {children}
    </button>
  );
}
