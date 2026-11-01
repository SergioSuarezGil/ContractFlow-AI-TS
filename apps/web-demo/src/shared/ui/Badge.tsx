interface BadgeProps {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warn" | "danger";
}

const tones: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-slate-100 text-slate-700",
  success: "bg-teal-100 text-teal-800",
  warn: "bg-amber-100 text-amber-900",
  danger: "bg-rose-100 text-rose-800",
};

export function Badge({ children, tone = "neutral" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
