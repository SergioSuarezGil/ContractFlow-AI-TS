export function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-600" role="status">
      <span className="inline-block size-4 animate-spin rounded-full border-2 border-slate-300 border-t-teal-700" />
      <span>{label}</span>
    </div>
  );
}
