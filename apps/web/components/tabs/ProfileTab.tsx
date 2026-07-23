"use client";

// Profile/settings tab (11-ios-profile / 18-web-settings). Diet flags and
// allergies write straight to `profiles` (RLS-scoped), applied server-side
// to every generate-recipes / generate-meal-plan / adapt-recipe call per
// supabase/functions/README.md ("Injects the caller's diet flags,
// allergies... into the prompt").
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth/auth-context";
import { supabase } from "../../lib/supabase/client";
import type { ProfileRow } from "../../lib/types/db";
import { Icon } from "../Icon";
import { useToast } from "../Toast";

const DIET_OPTIONS = ["gluten-free", "halal", "vegan", "vegetarian", "keto", "dairy-free"];
const ALLERGY_SUGGESTIONS = ["peanuts", "shellfish", "dairy", "eggs", "soy", "gluten"];

function titleCase(s: string): string {
  return s
    .split("-")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
}

export function ProfileTab() {
  const { user, profile, isPro, subscription, usageUsed, usageLimit, signOut, refreshProfile } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [addingAllergy, setAddingAllergy] = useState(false);
  const [allergyDraft, setAllergyDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const dietFlags = profile?.diet_flags ?? [];
  const allergies = profile?.allergies ?? [];

  async function patchProfile(patch: Partial<ProfileRow>) {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.show("Couldn't save that change", "error");
      return;
    }
    await refreshProfile();
  }

  function toggleDiet(flag: string) {
    const next = dietFlags.includes(flag) ? dietFlags.filter((f) => f !== flag) : [...dietFlags, flag];
    void patchProfile({ diet_flags: next });
  }

  function removeAllergy(flag: string) {
    void patchProfile({ allergies: allergies.filter((f) => f !== flag) });
  }

  function addAllergy(raw: string) {
    const flag = raw.trim().toLowerCase();
    setAddingAllergy(false);
    setAllergyDraft("");
    if (!flag || allergies.includes(flag)) return;
    void patchProfile({ allergies: [...allergies, flag] });
  }

  function cycleLanguage() {
    void patchProfile({ language: profile?.language === "en" ? "tr" : "en" });
  }

  function cycleUnits() {
    void patchProfile({ units: profile?.units === "metric" ? "imperial" : "metric" });
  }

  const name = profile?.display_name ?? "Sousbot cook";
  const email = user?.is_anonymous ? "Anonymous session" : (user?.email ?? "");

  return (
    <div className="pb-4">
      <div className="flex items-center gap-4">
        <span
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-[24px] font-bold"
          style={{ background: "var(--accent-subtle-bg-dark)", color: "var(--accent-light)" }}
        >
          {name[0]?.toUpperCase() ?? "S"}
        </span>
        <div>
          <p className="font-display text-[24px] text-[var(--text-primary)]">{name}</p>
          <p className="text-[13px] text-[var(--text-alpha-55)]">{email}</p>
        </div>
      </div>

      <section className="mt-7">
        <p className="text-label-xs mb-3 text-[var(--text-alpha-45)]">Diet — applied to every generation</p>
        <div className="flex flex-wrap gap-2">
          {DIET_OPTIONS.map((flag) => {
            const active = dietFlags.includes(flag);
            return (
              <button
                key={flag}
                type="button"
                onClick={() => toggleDiet(flag)}
                aria-pressed={active}
                disabled={saving}
                className="rounded-full px-4 py-2 text-[13.5px] font-semibold"
                style={
                  active
                    ? { background: "var(--accent)", color: "var(--on-accent)" }
                    : { background: "var(--panel-bg-mid)", border: "1px solid var(--border-subtle)", color: "var(--text-alpha-65)" }
                }
              >
                {titleCase(flag)}
                {active ? " ✓" : ""}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-6">
        <p className="text-label-xs mb-3" style={{ color: "var(--pro-dark)" }}>
          Allergies — hard rules, double-checked
        </p>
        <div className="flex flex-wrap gap-2">
          {allergies.map((flag) => (
            <button
              key={flag}
              type="button"
              onClick={() => removeAllergy(flag)}
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[13.5px] font-semibold"
              style={{ background: "var(--pro-tint-bg)", border: "1px solid var(--pro-tint-border)", color: "var(--pro-text-on-tint)" }}
            >
              {titleCase(flag)} <Icon name="x" size={12} strokeWidth={2.4} />
            </button>
          ))}
          {addingAllergy ? (
            <input
              autoFocus
              value={allergyDraft}
              onChange={(e) => setAllergyDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAllergy(allergyDraft)}
              onBlur={() => addAllergy(allergyDraft)}
              placeholder="e.g. peanuts"
              list="allergy-suggestions"
              aria-label="Add an allergy"
              className="w-32 rounded-full border border-dashed px-4 py-2 text-[13.5px] outline-none"
              style={{ borderColor: "var(--text-alpha-40)", background: "transparent", color: "var(--text-base)" }}
            />
          ) : (
            <button type="button" onClick={() => setAddingAllergy(true)} className="chip chip-dashed">
              <Icon name="plus" size={13} strokeWidth={2.2} />
              Add
            </button>
          )}
          <datalist id="allergy-suggestions">
            {ALLERGY_SUGGESTIONS.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </div>
      </section>

      <section className="glass-panel mt-6 divide-y overflow-hidden rounded-[var(--radius-list)]" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        <SettingsRow label="Language" value={profile?.language === "tr" ? "Türkçe" : "English"} onClick={cycleLanguage} />
        <SettingsRow label="Units" value={profile?.units === "imperial" ? "Imperial" : "Metric"} onClick={cycleUnits} />
        <SettingsRow label="Pantry staples" value="Manage" onClick={() => router.push("/library")} />
        <SettingsRow label="Taste profile" value="View ratings" onClick={() => router.push("/library")} />
      </section>

      <section className="glass-panel mt-4 flex items-center justify-between gap-3 rounded-[var(--radius-card-md)] p-4">
        <div>
          <p className="text-[15px] font-bold text-[var(--text-primary)]">{isPro ? "Pro plan" : "Free plan"}</p>
          <p className="text-[12.5px] text-[var(--text-alpha-50)]">
            {isPro
              ? `${subscription?.platform ?? "Pro"} · unlimited generations`
              : `${usageUsed} of ${usageLimit ?? 10} generations used this month`}
          </p>
        </div>
        {isPro ? (
          <button
            type="button"
            onClick={() => toast.show("Billing portal isn't wired up yet — TODO(stripe).")}
            className="btn-secondary h-9 whitespace-nowrap px-4 text-[12.5px]"
          >
            Manage
          </button>
        ) : (
          <button type="button" onClick={() => router.push("/paywall")} className="btn-pro-outline-dark h-9 px-4 text-[12.5px]">
            Go Pro
          </button>
        )}
      </section>

      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-6 flex w-full items-center justify-center gap-2 py-3 text-[14px] font-semibold"
        style={{ color: "var(--pro-dark)" }}
      >
        <Icon name="logout" size={17} />
        Sign out
      </button>
    </div>
  );
}

function SettingsRow({ label, value, onClick }: { label: string; value: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between px-4 py-3.5 text-left"
    >
      <span className="text-[14.5px] font-medium text-[var(--text-base)]">{label}</span>
      <span className="text-[13.5px] text-[var(--text-alpha-50)]">{value}</span>
    </button>
  );
}
