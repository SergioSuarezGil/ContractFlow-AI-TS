interface AlertProps {
  variant?: "info" | "success" | "danger";
  children: React.ReactNode;
}

const styles: Record<NonNullable<AlertProps["variant"]>, string> = {
  info: "border-sky-200 bg-sky-50 text-sky-900",
  success: "border-teal-200 bg-teal-50 text-teal-900",
  danger: "border-rose-200 bg-rose-50 text-rose-900",
};

export function Alert({ variant = "info", children }: AlertProps) {
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${styles[variant]}`}
      role="status"
    >
      {children}
    </div>
  );
}
