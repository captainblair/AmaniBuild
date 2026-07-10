import Link from "next/link";
import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "outline" | "outline-white" | "ghost" | "navy";
type ButtonSize = "sm" | "md";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--orange)] text-[var(--orange-ink)] hover:bg-[var(--orange-hover)] hover:text-white border border-transparent font-medium shadow-sm shadow-yellow-500/20",
  secondary:
    "bg-white text-[var(--navy)] hover:bg-[var(--gray-50)] border border-[var(--gray-200)]",
  outline:
    "bg-transparent text-[var(--navy)] border border-[var(--gray-200)] hover:bg-[var(--gray-50)]",
  "outline-white":
    "bg-transparent text-white border border-white/30 hover:bg-white/10",
  ghost: "bg-transparent text-[var(--gray-600)] hover:bg-[var(--gray-100)] border border-transparent",
  navy: "bg-[var(--navy)] text-white hover:bg-[var(--navy-hover)] border border-transparent",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2.5 text-sm",
};

type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  href?: string;
  className?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  disabled?: boolean;
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  className = "",
  type = "button",
  onClick,
  disabled = false,
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes} disabled={disabled}>
      {children}
    </button>
  );
}
