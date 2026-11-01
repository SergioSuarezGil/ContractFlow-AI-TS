import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const variants: Record<Variant, string> = {
  primary:
    "border-transparent bg-teal-700 text-white hover:bg-teal-800 focus:ring-teal-600",
  secondary:
    "border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus:ring-slate-400",
  ghost: "border-transparent bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-400",
  danger:
    "border-transparent bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500",
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
