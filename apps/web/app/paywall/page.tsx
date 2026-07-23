"use client";

// Paywall/upgrade (06-ios-paywall-glass). Reached from any 402
// (generation_limit_reached / forbidden_not_pro) or a direct "Go Pro" tap.
// TODO(billing): Stripe/RevenueCat aren't provisioned yet (see
// supabase/functions/README.md — both webhook secrets are unset and verify
// fails open). The plan cards are real, priced UI; the CTA is honestly
// stubbed with a toast rather than faking a purchase.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth/auth-context";
import { Icon } from "../../components/Icon";
import { useToast } from "../../components/Toast";

const FEATURES = [
  "**Unlimited** recipe generations",
  "AI **photos of every dish**",
  "Weekly **meal planner** + smart shopping list",
  "**Adapt any recipe** — vegan it, halve it, air-fry it",
];

function renderFeature(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>));
}

export default function PaywallPage() {
  const router = useRouter();
  const toast = useToast();
  const { usageUsed, usageLimit } = useAuth();
  const [plan, setPlan] = useState<"monthly" | "annual">("annual");

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden px-6 pb-10 pt-[calc(env(safe-area-inset-top)+20px)]">
      <div className="bloom-pro pointer-events-none absolute -left-10 -top-16 h-80 w-80 rounded-full" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-[460px] flex-1 flex-col">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Close"
          className="glass-pill-button ml-auto flex h-10 w-10 items-center justify-center rounded-full"
        >
          <Icon name="x" size={17} />
        </button>

        {usageLimit !== null ? (
          <span
            className="mt-2 inline-flex w-fit rounded-full px-4 py-2 text-[13px] font-semibold"
            style={{ background: "var(--pro-tint-bg)", color: "var(--pro-text-on-tint)", border: "1px solid var(--pro-tint-border)" }}
          >
            {usageUsed} of {usageLimit} free recipes used this month
          </span>
        ) : null}

        <h1 className="font-display mt-5 text-[44px] leading-[1.05] text-[var(--text-primary)]">
          Cook without <span className="italic" style={{ color: "var(--pro-dark)" }}>limits.</span>
        </h1>

        <ul className="mt-6 flex flex-col gap-3">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-start gap-3 text-[15px] text-[var(--text-base)]">
              <span className="mt-0.5" style={{ color: "var(--accent)" }}>
                <Icon name="check" size={17} strokeWidth={2.4} />
              </span>
              {renderFeature(f)}
            </li>
          ))}
        </ul>

        <div className="flex-1" style={{ maxHeight: 120 }} />

        <div className="mt-8 grid grid-cols-2 gap-3">
          <PlanCard
            label="Monthly"
            price="$7.99"
            sub="per month"
            active={plan === "monthly"}
            onClick={() => setPlan("monthly")}
          />
          <PlanCard
            label="Annual"
            price="$59.99"
            sub="$5.00 / month"
            badge="SAVE 37%"
            active={plan === "annual"}
            onClick={() => setPlan("annual")}
          />
        </div>

        <button
          type="button"
          onClick={() => toast.show("Billing isn't wired up yet — TODO(stripe/revenuecat).")}
          className="btn-cream mt-6 h-[56px] w-full text-[16px]"
        >
          Start Pro — {plan}
        </button>
        <p className="mt-4 text-center text-[12px] leading-[1.6] text-[var(--text-alpha-40)]">
          Billed through the App Store · Cancel anytime
          <br />
          Works on web &amp; Android too ·{" "}
          <button type="button" onClick={() => toast.show("Nothing to restore yet — TODO(stripe/revenuecat).")} className="underline">
            Restore purchase
          </button>
        </p>
      </div>
    </div>
  );
}

function PlanCard({
  label,
  price,
  sub,
  badge,
  active,
  onClick,
}: {
  label: string;
  price: string;
  sub: string;
  badge?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="glass-panel relative rounded-[var(--radius-card-lg)] p-4 text-left"
      style={active ? { border: "2px solid var(--accent)" } : undefined}
    >
      {badge ? (
        <span
          className="absolute -top-3 right-3 rounded-full px-2.5 py-1 text-[10px] font-bold"
          style={{ background: "var(--pro-dark)", color: "var(--on-accent)" }}
        >
          {badge}
        </span>
      ) : null}
      <p className="text-label-xs" style={{ color: active ? "var(--accent)" : "var(--text-alpha-50)" }}>
        {label}
      </p>
      <p className="font-display mt-1 text-[26px] text-[var(--text-primary)]">{price}</p>
      <p className="mt-0.5 text-[12px] text-[var(--text-alpha-45)]">{sub}</p>
    </button>
  );
}
