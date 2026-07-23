"use client";

import { useRouter } from "next/navigation";
import { Icon } from "./Icon";

export function BackButton({ onClick }: { onClick?: () => void }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={onClick ?? (() => router.back())}
      aria-label="Back"
      className="glass-pill-button flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-base)]"
    >
      <Icon name="chevronLeft" size={19} />
    </button>
  );
}

export function IconButton({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ComponentProps<typeof Icon>["name"];
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className="glass-pill-button flex h-9 w-9 items-center justify-center rounded-full"
      style={{ color: active ? "var(--accent)" : "var(--text-base)" }}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 pb-5 pt-1">
      <div className="flex items-start gap-3">
        {onBack !== undefined ? <BackButton onClick={onBack} /> : null}
        <div>
          <h1 className="font-display text-[28px] leading-[1.1] text-[var(--text-primary)]">{title}</h1>
          {subtitle ? <p className="mt-1 text-[13px] text-[var(--text-alpha-55)]">{subtitle}</p> : null}
        </div>
      </div>
      {right}
    </div>
  );
}
