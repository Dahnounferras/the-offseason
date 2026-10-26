import type { InputHTMLAttributes } from "react";

type InputTone = "default" | "accent" | "error";

const TONES: Record<InputTone, string> = {
  default: "border-border",
  accent: "border-accent",
  error: "border-loss",
};

export function inputClasses(tone: InputTone = "default", compact = false): string {
  return `px-3 ${compact ? "py-1.5" : "py-2"} rounded-lg text-sm outline-none bg-surface-2 border ${TONES[tone]} text-foreground`;
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  tone?: InputTone;
  compact?: boolean;
};

export default function Input({ tone, compact, className = "", ...rest }: InputProps) {
  return <input className={`${inputClasses(tone, compact)} ${className}`.trim()} {...rest} />;
}
