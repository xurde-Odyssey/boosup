import Link from "next/link";
import { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type BaseProps = {
  children: ReactNode;
  label: string;
  className?: string;
};

type ActionIconButtonProps =
  | (BaseProps & { href: string } & Omit<React.ComponentProps<typeof Link>, "href" | "className" | "title" | "aria-label">)
  | (BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: never });

const actionIconButtonClassName = (className?: string) =>
  cn(
    "inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-900 hover:text-white",
    className,
  );

export function ActionIconButton(props: ActionIconButtonProps) {
  const { children, label, className } = props;
  const classes = actionIconButtonClassName(className);

  if ("href" in props && props.href) {
    const { href, ...restProps } = props;

    return (
      <Link href={href} {...restProps} title={label} aria-label={label} className={classes}>
        {children}
      </Link>
    );
  }

  const buttonProps = props as BaseProps & ButtonHTMLAttributes<HTMLButtonElement>;
  const { type = "button", ...restProps } = buttonProps;
  const buttonType = type as "button" | "submit" | "reset";

  return (
    <button type={buttonType} {...restProps} title={label} aria-label={label} className={classes}>
      {children}
    </button>
  );
}
