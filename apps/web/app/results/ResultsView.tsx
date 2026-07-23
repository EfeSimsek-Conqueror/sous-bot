"use client";

// Results (free tier): 08-ios-results-free-tier. Multiple recipe options
// from one generation call, with macros and a thumbs like/dislike (taste
// profile input, PRD story 9). Pro users skip this screen entirely (see
// IngredientReview — n=1 + direct navigation to recipe detail).
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../lib/auth/auth-context";
import { supabase } from "../../lib/supabase/client";
import { api, ApiClientError } from "../../lib/api/client";
import type { GeneratedRecipe } from "../../lib/api/types";
import { getLastGeneration, setLastGeneration } from "../../lib/state/generationStore";
import { BackButton } from "../../components/PageHeader";
import { MacroStats } from "../../components/MacroStats";
import { Icon } from "../../components/Icon";
import { LoadingBlock, EmptyBlock } from "../../components/StateViews";
import { useToast } from "../../components/Toast";

type FilterKey = "all" | "quick" | "leftover" | "protein";
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "quick", label: "Quick dinner" },
  { key: "leftover", label: "Leftover rescue" },
  { key: "protein", label: "High protein" },
];

function matchesFilter(r: GeneratedRecipe, key: FilterKey): boolean {
  const minutes = (r.prep_minutes ?? 0) + (r.cook_minutes ?? 0);
  if (key === "quick") return minutes > 0 && minutes <= 30;
  if (key === "leftover") return r.tags.some((t) => t.toLowerCase().includes("leftover"));
  if (key === "protein") return (r.macros?.protein_g ?? 0) >= 30;
  return true;
}

export function ResultsView() {
  const params = useSearchParams();
  const router = useRouter();
  const { isPro, user } = useAuth();
  const toast = useToast();
  const ids = (params.get("ids") ?? "").split(",").filter(Boolean);

  const [recipes, setRecipes] = useState<GeneratedRecipe[] | null>(null);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [regenerating, setRegenerating] = useState(false);
  const [rated, setRated] = useState<Record<string, "like" | "dislike">>({});

  useEffect(() => {
    const cached = getLastGeneration();
    if (cached.recipes && cached.recipes.every((r) => ids.includes(r.id))) {
      setRecipes(cached.recipes);
      setIngredients(cached.ingredients);
      return;
    }
    if (ids.length === 0 || !user) {
      setRecipes([]);
      return;
    }
    supabase
      .from("recipes")
      .select("*")
      .in("id", ids)
      .then(({ data }) => setRecipes((data as GeneratedRecipe[] | null) ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function rate(recipeId: string, verdict: "like" | "dislike") {
    setRated((prev) => ({ ...prev, [recipeId]: verdict }));
    if (!user) return;
    await supabase.from("taste_events").insert({ user_id: user.id, recipe_id: recipeId, verdict });
  }

  async function regenerate() {
    if (ingredients.length === 0) return;
    setRegenerating(true);
    try {
      const res = await api.generateRecipes({ ingredients, n: 3 });
      setLastGeneration(res.recipes, ingredients);
      setRecipes(res.recipes);
      router.replace(`/results?ids=${res.recipes.map((r) => r.id).join(",")}`);
    } catch (err) {
      if (err instanceof ApiClientError && err.isPaywall) {
        router.replace("/paywall");
        return;
      }
      toast.show(err instanceof Error ? err.message : "Couldn't regenerate.", "error");
    } finally {
      setRegenerating(false);
    }
  }

  const visible = recipes?.filter((r) => filter === "all" || matchesFilter(r, filter)) ?? [];
  const showingAllFallback = recipes !== null && recipes.length > 0 && filter !== "all" && visible.length === 0;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col px-5 pb-10 pt-[calc(env(safe-area-inset-top)+20px)] md:px-0 md:pt-12">
      <div className="flex items-start gap-3 pb-1">
        <BackButton />
        <div>
          <h1 className="font-display text-[26px] leading-[1.1] text-[var(--text-primary)]">
            {recipes?.length ?? "…"} ideas for tonight
          </h1>
          <p className="mt-1 text-[13px] text-[var(--text-alpha-55)]">
            {ingredients.length > 0 ? `from your ${ingredients.length} ingredients` : "generated just now"}
          </p>
        </div>
      </div>

      <div className="relative mt-5">
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1 pr-8" data-no-swipe>
          <FilterPill active={filter === "all"} onClick={() => setFilter("all")} label="All" />
          {FILTERS.map((f) => (
            <FilterPill key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)} label={f.label} />
          ))}
        </div>
        {/* Fade hint that the pill row scrolls — there's always at least one
            more pill than fits on a narrow phone. */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-10"
          style={{ background: "linear-gradient(to right, transparent, #101314)" }}
          aria-hidden
        />
      </div>

      <div className="mt-5 flex flex-col gap-3.5">
        {recipes === null ? (
          <LoadingBlock label="Loading your recipes…" />
        ) : recipes.length === 0 ? (
          <EmptyBlock title="No recipes here" subtitle="Head back and generate a few ideas from your ingredients." />
        ) : (
          (showingAllFallback ? recipes : visible).map((r, i) => (
            <ResultCard key={r.id} recipe={r} expanded={i === 0} rating={rated[r.id]} onRate={rate} />
          ))
        )}
      </div>

      {recipes && recipes.length > 0 ? (
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            disabled={regenerating || ingredients.length === 0}
            onClick={regenerate}
            className="btn-secondary h-12 w-full text-[14.5px]"
          >
            {regenerating ? "Regenerating…" : "Regenerate · uses 1 more"}
          </button>
          {!isPro ? (
            <p className="flex items-center gap-1.5 text-[12.5px] text-[var(--text-alpha-45)]">
              <Icon name="lock" size={13} /> Dish photos come with Pro
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FilterPill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="shrink-0 rounded-full px-4 py-2.5 text-[13.5px] font-semibold"
      style={
        active
          ? { background: "var(--text-base)", color: "var(--text-on-cream)" }
          : { background: "var(--panel-bg-mid)", border: "1px solid var(--border-subtle)", color: "var(--text-alpha-65)" }
      }
    >
      {label}
    </button>
  );
}

function ResultCard({
  recipe,
  expanded,
  rating,
  onRate,
}: {
  recipe: GeneratedRecipe;
  expanded: boolean;
  rating?: "like" | "dislike";
  onRate: (id: string, v: "like" | "dislike") => void;
}) {
  const minutes = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);
  return (
    <Link href={`/recipe/${recipe.id}`} className="glass-panel block rounded-[var(--radius-hero)] p-5">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-[22px] leading-tight text-[var(--text-primary)]">{recipe.title}</h2>
        <Icon name="chevronLeft" size={18} className="mt-1.5 shrink-0 rotate-180 text-[var(--text-alpha-40)]" />
      </div>
      <p className="mt-1.5 text-[13px] text-[var(--text-alpha-55)]">
        {minutes > 0 ? `${minutes} min · ` : ""}
        uses {recipe.ingredients.length} ingredients
        {recipe.macros ? ` · ${Math.round(recipe.macros.calories)} kcal · ${Math.round(recipe.macros.protein_g)}g protein` : ""}
      </p>

      {expanded ? (
        <div className="mt-4">
          <MacroStats macros={recipe.macros} />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onRate(recipe.id, "like");
              }}
              aria-pressed={rating === "like"}
              aria-label="I liked this recipe"
              className="glass-pill-button flex h-9 w-9 items-center justify-center rounded-full"
              style={{ color: rating === "like" ? "var(--accent)" : "var(--text-base)" }}
            >
              <Icon name="thumbsUp" size={16} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onRate(recipe.id, "dislike");
              }}
              aria-pressed={rating === "dislike"}
              aria-label="I didn't like this recipe"
              className="glass-pill-button flex h-9 w-9 items-center justify-center rounded-full"
              style={{ color: rating === "dislike" ? "var(--pro-dark)" : "var(--text-base)" }}
            >
              <Icon name="thumbsDown" size={16} />
            </button>
          </div>
        </div>
      ) : null}
    </Link>
  );
}
