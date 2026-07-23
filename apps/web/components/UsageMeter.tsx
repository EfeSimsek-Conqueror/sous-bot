// Persistent "X of 10 left this month" indicator for free-tier users
// (visible in 02-ios-home-glass.png). Thin pill progress bar per DESIGN.md
// §5 "Usage meter" (glass-theme variant, not the dot-row v1 variant).
export function UsageMeter({
  used,
  limit,
  compact = false,
}: {
  used: number;
  limit: number | null;
  compact?: boolean;
}) {
  if (limit === null) {
    return (
      <div
        className={`flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[12.5px] font-semibold ${compact ? "px-3 py-2" : "px-4 py-2"}`}
        style={{ background: "var(--accent-alpha-14)", color: "var(--accent)" }}
      >
        <span>Pro{compact ? "" : " · unlimited generations"}</span>
      </div>
    );
  }
  const remaining = Math.max(0, limit - used);
  const pct = Math.min(100, (used / limit) * 100);
  return (
    <div
      className={`glass-panel inline-flex w-full items-center gap-3 rounded-full ${compact ? "px-3 py-2" : "px-4 py-2.5"}`}
    >
      <div className="h-[6px] flex-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: "var(--accent)" }}
        />
      </div>
      <span className="whitespace-nowrap text-[13px] font-semibold text-[var(--text-base)]">
        {remaining} of {limit} free left
      </span>
    </div>
  );
}
