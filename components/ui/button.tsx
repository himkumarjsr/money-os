import { cn } from "@/lib/cn";
import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

const variants = {
  primary:
    "bg-primary text-[color:var(--color-primary-foreground)] hover:opacity-95 active:opacity-90",
  secondary:
    "border border-border bg-surface text-[color:var(--color-text)] hover:bg-surface-alt",
  success:
    "bg-success text-[color:var(--color-success-foreground)] hover:opacity-95",
  ghost: "text-primary hover:bg-primary/10",
} as const;

const sizes = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-10 px-4 text-sm",
  lg: "min-h-11 px-5 text-base sm:min-h-12",
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#534AB7]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-white";

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium outline-none transition",
        "focus-visible:ring-2 focus-visible:ring-[var(--ring-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]",
        "disabled:pointer-events-none disabled:opacity-50",
        "touch-manipulation select-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}

export type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> & {
  className?: string;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function ButtonLink({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl font-semibold outline-none transition",
        focusRing,
        "touch-manipulation select-none",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
