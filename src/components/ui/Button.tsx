import type { ButtonHTMLAttributes } from "react";
import Spinner from "@/components/Spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "warning";
export type ButtonSize = "sm" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "font-semibold bg-accent text-black",
  secondary: "font-semibold bg-surface-2 text-foreground border border-border",
  // Used for Cancel buttons; regular weight to sit behind the primary action.
  ghost: "bg-surface-2 text-muted",
  danger: "font-semibold bg-loss text-white",
  warning: "font-semibold bg-tie text-black",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
};

// Shared with links styled as buttons: <Link className={buttonClasses("secondary")}>.
// className can add classes but not override variant/size ones (Tailwind order is not class order).
export function buttonClasses(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className = ""
): string {
  return `cursor-pointer rounded-lg disabled:opacity-50 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${className}`.trim();
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: string;
};

export default function Button({
  variant,
  size,
  loading = false,
  loadingText,
  className,
  disabled,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonClasses(variant, size, className)}
      {...rest}
    >
      {loading ? <><Spinner /> {loadingText ?? children}</> : children}
    </button>
  );
}
