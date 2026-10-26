import type { InputHTMLAttributes } from "react";

export const inputClasses =
  "px-3 py-2 rounded-lg text-sm outline-none bg-surface-2 border border-border text-foreground";

export default function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputClasses} ${className}`.trim()} {...rest} />;
}
