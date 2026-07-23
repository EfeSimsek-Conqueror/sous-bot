"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth/auth-context";
import { supabase } from "../../lib/supabase/client";
import type { RecipeRow } from "../../lib/types/db";
import { Icon } from "../Icon";
import { UsageMeter } from "../UsageMeter";
import { RecipeCard } from "../RecipeCard";
import { LoadingBlock, EmptyBlock } from "../StateViews";
import { IngredientTokenInput } from "../IngredientTokenInput";
import { useToast } from "../Toast";

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function HomeTab() {
  const { user, profile, usageUsed, usageLimit } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [recent, setRecent] = useState<RecipeRow[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [typed, setTyped] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("recipes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(4)
      .then(({ data }) => {
        if (!cancelled) setRecent((data as RecipeRow[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handlePhoto = useCallback(
    async (file: File) => {
      if (!user) return;
      setUploading(true);
      try {
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;
        const { error } = await supabase.storage.from("fridge-photos").upload(path, file, {
          contentType: file.type || "image/jpeg",
        });
        if (error) throw error;
        router.push(`/ingredients?source=photo&path=${encodeURIComponent(path)}`);
      } catch (err) {
        toast.show(err instanceof Error ? err.message : "Photo upload failed", "error");
      } finally {
        setUploading(false);
      }
    },
    [user, router, toast],
  );

  function goType() {
    const seed = typed.length ? `&seed=${encodeURIComponent(typed.join(","))}` : "";
    router.push(`/ingredients?source=type${seed}`);
  }

  // No "Good morning, there" placeholder-name fallback — just drop the name
  // clause entirely when we don't have a real display_name yet.
  const name = profile?.display_name ?? null;

  return (
    <div className="flex flex-col gap-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handlePhoto(f);
          e.target.value = "";
        }}
      />

      {/* Mobile: hero camera card, matches 02-ios-home-glass */}
      <div className="md:hidden">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h1 className="font-display text-[30px] leading-[1.1] text-[var(--text-primary)]">
              {greeting()}
              {name ? `, ${name}` : ""}
            </h1>
            <p className="mt-1 text-[13px] text-[var(--text-alpha-55)]">
              {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full text-[15px] font-bold"
            style={{ background: "var(--accent-subtle-bg-dark)", color: "var(--accent-light)" }}
          >
            {name?.[0]?.toUpperCase() ?? "S"}
          </span>
        </div>

        <UsageMeter used={usageUsed} limit={usageLimit} />

        <div className="glass-hero relative mt-5 overflow-hidden rounded-[var(--radius-hero-lg)] p-6">
          <div className="bloom-accent-lg pointer-events-none absolute -right-10 -top-10 h-56 w-56 rounded-full" />
          <div className="relative">
            <div className="text-[var(--accent)]">
              <Icon name="camera" size={26} />
            </div>
            <h2 className="font-display mt-3 text-[26px] text-[var(--text-primary)]">Snap your fridge</h2>
            <p className="mt-1.5 max-w-[240px] text-[13.5px] text-[var(--text-alpha-60)]">
              Photo in, dinner ideas out. Under 20 seconds.
            </p>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="btn-primary mt-5 h-[52px] px-8"
            >
              {uploading ? "Uploading…" : "Open camera"}
            </button>
          </div>
        </div>

        <button type="button" onClick={goType} className="btn-secondary mt-3 h-12 w-full">
          Type ingredients instead
        </button>
      </div>

      {/* Desktop: dual-input dashboard, matches 07-web-cook-glass */}
      <div className="hidden md:block">
        <h1 className="font-display text-[36px] text-[var(--text-primary)]">
          What&apos;s in your <span className="italic text-[var(--accent)]">kitchen?</span>
        </h1>
        <p className="mt-2 text-[14.5px] text-[var(--text-alpha-60)]">
          Drop a fridge photo or type your ingredients — we&apos;ll do the rest.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-5">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-[var(--radius-hero)] border-[1.5px] border-dashed p-8 text-center"
            style={{ borderColor: "var(--accent-alpha-40)" }}
          >
            <Icon name="camera" size={28} className="text-[var(--accent)]" />
            <span className="text-[16px] font-bold text-[var(--text-primary)]">
              {uploading ? "Uploading…" : "Drop your fridge photo"}
            </span>
            <span className="text-[12.5px] text-[var(--text-alpha-50)]">or click to browse · JPG, PNG, HEIC</span>
          </button>
          <IngredientTokenInput
            value={typed}
            onChange={setTyped}
            footer={
              <>
                <p className="text-[12px] text-[var(--text-alpha-45)]">
                  {profile?.diet_flags?.length ? profile.diet_flags.join(" & ") + " applied" : "No diet flags set"}
                </p>
                <button type="button" onClick={goType} className="btn-primary h-11 shrink-0 px-6 text-[14px]">
                  Generate recipes
                </button>
              </>
            }
          />
        </div>
      </div>

      <section className="mt-2">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-[var(--text-primary)]">Cook again</h3>
          <a href="/library" className="text-[13px] font-semibold text-[var(--accent)]">
            Library
          </a>
        </div>
        {recent === null ? (
          <LoadingBlock label="Loading your recipes…" />
        ) : recent.length === 0 ? (
          <EmptyBlock
            icon="camera"
            title="No recipes yet"
            subtitle="Snap your fridge or type a few ingredients to get your first recipes."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {recent.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
