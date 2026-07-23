"use client";

// Library/history tab. Not present in either design doc (DESIGN.md §6 flags
// it as "referenced in nav on every screen but never itself captured") — the
// grid layout, card component, and empty state are reused verbatim from the
// Home tab's "Cook again" section for visual consistency, just scoped to
// every recipe (saved or not) instead of the last 4.
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth/auth-context";
import { supabase } from "../../lib/supabase/client";
import type { RecipeRow } from "../../lib/types/db";
import { RecipeCard } from "../RecipeCard";
import { LoadingBlock, EmptyBlock, ErrorBlock } from "../StateViews";

type Filter = "all" | "saved";

export function LibraryTab() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<RecipeRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setRecipes(null);
    setError(null);
    supabase
      .from("recipes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) setError(err.message);
        else setRecipes((data as RecipeRow[]) ?? []);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const visible = (recipes ?? []).filter((r) => (filter === "saved" ? r.is_saved : true));

  return (
    <div>
      <h1 className="font-display text-[28px] text-[var(--text-primary)] md:text-[36px]">Library</h1>
      <p className="mt-1 text-[13px] text-[var(--text-alpha-55)]">Every recipe you&apos;ve generated or saved.</p>

      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto pb-1" data-no-swipe>
        {(["all", "saved"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className="shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold"
            style={
              filter === f
                ? { background: "var(--text-base)", color: "var(--text-on-cream)" }
                : { background: "var(--panel-bg-mid)", border: "1px solid var(--border-subtle)", color: "var(--text-alpha-65)" }
            }
          >
            {f === "all" ? "All recipes" : "Saved"}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {error ? (
          <ErrorBlock subtitle={error} />
        ) : recipes === null ? (
          <LoadingBlock label="Loading your library…" />
        ) : visible.length === 0 ? (
          <EmptyBlock
            icon="bookmark"
            title={filter === "saved" ? "Nothing saved yet" : "No recipes yet"}
            subtitle={
              filter === "saved"
                ? "Tap the bookmark on a recipe to save it here."
                : "Snap your fridge or type a few ingredients to get your first recipes."
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {visible.map((r) => (
              <RecipeCard key={r.id} recipe={r} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
