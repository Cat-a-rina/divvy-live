export function RouteLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-3 py-16 text-center"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-divvy-blue/20 border-t-divvy-blue" />
      <p className="text-sm text-[#0a1f3d]/60">{label}</p>
    </div>
  );
}
