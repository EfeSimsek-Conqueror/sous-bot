// Loading / empty / error surfaces. None of these exist in the source doc
// (DESIGN.md §5 "Empty states" / "Progress & loading states" — flagged
// gaps except for the striped async-image placeholder, which is handled
// separately via .placeholder-stripe). Designed fresh, consistent with the
// glass language: soft pulse for loading, dashed-border "+"-style card for
// empty, paprika/pro-tinted card for error.
import { Icon, type IconName } from "./Icon";

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="relative h-10 w-10">
        <div
          className="absolute inset-0 rounded-full border-2 border-[rgba(255,255,255,0.12)]"
          aria-hidden
        />
        <div
          className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[var(--accent)]"
          aria-hidden
        />
      </div>
      <p className="text-[13px] font-medium text-[var(--text-alpha-55)]">{label}</p>
    </div>
  );
}

export function EmptyBlock({
  icon = "sparkle",
  title,
  subtitle,
  action,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-[var(--radius-hero)] border-[1.5px] border-dashed px-6 py-12 text-center"
      style={{ borderColor: "rgba(255,255,255,0.16)" }}
    >
      <div className="text-[var(--accent)]">
        <Icon name={icon} size={28} strokeWidth={1.4} />
      </div>
      <p className="font-display text-[20px] text-[var(--text-primary)]">{title}</p>
      {subtitle ? <p className="max-w-xs text-[13.5px] text-[var(--text-alpha-55)]">{subtitle}</p> : null}
      {action}
    </div>
  );
}

export function ErrorBlock({
  title = "Something went wrong",
  subtitle,
  action,
}: {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center gap-3 rounded-[var(--radius-hero)] px-6 py-10 text-center"
      style={{ background: "var(--pro-tint-bg)", border: "1px solid var(--pro-tint-border)" }}
    >
      <div style={{ color: "var(--pro-dark)" }}>
        <Icon name="x" size={22} />
      </div>
      <p className="text-[15px] font-bold" style={{ color: "var(--pro-text-on-tint)" }}>
        {title}
      </p>
      {subtitle ? (
        <p className="max-w-xs text-[13px]" style={{ color: "var(--pro-text-on-tint)" }}>
          {subtitle}
        </p>
      ) : null}
      {action}
    </div>
  );
}
