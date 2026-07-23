"use client";

// Recipe detail (04-ios-recipe-detail-glass / 14-android). Async dish photo
// (Pro only, generate-dish-image + poll dish-image-status per
// supabase/functions/README.md), macros, have/missing ingredient split
// (compared against the ingredients that produced this generation, via the
// module-level generation-store cache — falls back to "all missing" if the
// recipe was reached from a saved link with no cache entry, which is the
// honest answer since the server doesn't persist a have/missing split).
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../lib/auth/auth-context";
import { supabase } from "../../../lib/supabase/client";
import { api, ApiClientError } from "../../../lib/api/client";
import { getLastGeneration } from "../../../lib/state/generationStore";
import type { RecipeRow } from "../../../lib/types/db";
import { BackButton, IconButton } from "../../../components/PageHeader";
import { DishPhoto } from "../../../components/DishPhoto";
import { MacroStats } from "../../../components/MacroStats";
import { Icon } from "../../../components/Icon";
import { LoadingBlock, ErrorBlock } from "../../../components/StateViews";
import { useToast } from "../../../components/Toast";
import { BottomSheet } from "../../../components/BottomSheet";

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isPro } = useAuth();
  const toast = useToast();

  const [recipe, setRecipe] = useState<RecipeRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingMissing, setAddingMissing] = useState(false);
  const [adaptOpen, setAdaptOpen] = useState(false);
  const pollRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: err } = await supabase.from("recipes").select("*").eq("id", id).maybeSingle();
    if (err) setError(err.message);
    else if (!data) setError("Recipe not found.");
    else setRecipe(data as RecipeRow);
  }, [id]);

  useEffect(() => {
    if (user) void load();
  }, [user, load]);

  // Kick off / poll the async dish-image job for Pro users.
  useEffect(() => {
    if (!isPro || !recipe || recipe.image_status === "ready" || recipe.image_status === "failed") return;

    let cancelled = false;
    let attempts = 0;

    async function poll() {
      if (cancelled || attempts >= 8) return;
      attempts += 1;
      try {
        const res =
          attempts === 1 ? await api.generateDishImage({ recipe_id: recipe!.id }) : await api.dishImageStatus({ recipe_id: recipe!.id });
        if (cancelled) return;
        setRecipe((prev) => (prev ? { ...prev, image_status: res.image_status, image_url: res.image_url } : prev));
        if (res.image_status === "pending") {
          pollRef.current = window.setTimeout(poll, 3000);
        }
      } catch {
        // Non-fatal — the placeholder stays up.
      }
    }
    void poll();
    return () => {
      cancelled = true;
      if (pollRef.current) window.clearTimeout(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro, recipe?.id]);

  async function toggleSave() {
    if (!recipe) return;
    const next = !recipe.is_saved;
    setRecipe({ ...recipe, is_saved: next });
    await supabase.from("recipes").update({ is_saved: next }).eq("id", recipe.id);
    toast.show(next ? "Saved to Library" : "Removed from Library", "success");
  }

  function openAdapt() {
    if (!isPro) {
      router.push("/paywall");
      return;
    }
    setAdaptOpen(true);
  }

  async function addMissingToList() {
    if (!recipe || !user) return;
    setAddingMissing(true);
    try {
      const { have } = splitIngredients(recipe);
      const missing = recipe.ingredients.filter((ing) => !have.has(ing.name.toLowerCase()));
      if (missing.length === 0) {
        toast.show("Nothing missing — you have it all.", "success");
        return;
      }
      await supabase.from("shopping_list_items").insert(
        missing.map((ing) => ({
          user_id: user.id,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          checked: false,
          source_plan_id: null,
        })),
      );
      toast.show(`Added ${missing.length} to your shopping list.`, "success");
    } catch {
      toast.show("Couldn't update your shopping list.", "error");
    } finally {
      setAddingMissing(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col px-5 pt-[calc(env(safe-area-inset-top)+20px)]">
        <BackButton onClick={() => router.back()} />
        <div className="mt-6">
          <ErrorBlock title="Couldn't load this recipe" subtitle={error} />
        </div>
      </div>
    );
  }
  if (!recipe) return <LoadingBlock label="Loading recipe…" />;

  const { have, missing } = splitIngredients(recipe);
  const minutes = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[640px] flex-col pb-[190px]">
      <div className="relative">
        <DishPhoto
          url={recipe.image_url}
          status={isPro ? recipe.image_status : "none"}
          caption={isPro ? "AI dish photo · fills in async" : "Dish photos come with Pro"}
          className="h-64 w-full"
        />
        <div className="absolute inset-x-5 top-[calc(env(safe-area-inset-top)+16px)] flex items-center justify-between">
          <BackButton onClick={() => router.back()} />
          <div className="flex gap-2">
            <IconButton icon="sparkle" label="Adapt this recipe" onClick={openAdapt} />
            <IconButton icon="bookmark" label={recipe.is_saved ? "Remove from library" : "Save recipe"} active={recipe.is_saved} onClick={toggleSave} />
          </div>
        </div>
      </div>

      <div className="px-5 pt-5">
        {isPro ? (
          <span className="btn-pro-outline-dark inline-flex h-7 px-3 text-[11px]">PRO · AI PHOTO</span>
        ) : null}
        <h1 className="font-display mt-2 text-[30px] leading-[1.1] text-[var(--text-primary)]">{recipe.title}</h1>
        <p className="mt-1 text-[13px] text-[var(--text-alpha-55)]">
          {minutes > 0 ? `${minutes} min · ` : ""}
          {recipe.servings ? `serves ${recipe.servings} · ` : ""}
          {recipe.tags.slice(0, 2).join(" · ")}
        </p>

        <div className="mt-5">
          <MacroStats macros={recipe.macros} />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-[var(--text-primary)]">Ingredients</h2>
          <p className="text-[12.5px] text-[var(--text-alpha-50)]">
            you have {have.size} · missing {missing.length}
          </p>
        </div>

        <div className="glass-panel mt-3 divide-y overflow-hidden rounded-[var(--radius-list)]" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          {recipe.ingredients.map((ing, i) => {
            const isHave = have.has(ing.name.toLowerCase());
            return (
              <div key={`${ing.name}-${i}`} className="flex items-center gap-3 px-4 py-3.5" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                {isHave ? (
                  <span style={{ color: "var(--accent)" }}>
                    <Icon name="check" size={16} strokeWidth={2.4} />
                  </span>
                ) : (
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--pro-dark)" }} />
                )}
                <span className="flex-1 text-[14.5px] text-[var(--text-base)]">
                  {ing.quantity ? `${ing.quantity} ` : ""}
                  {ing.unit ? `${ing.unit} ` : ""}
                  {ing.name}
                </span>
                {!isHave ? <span className="text-[12.5px] font-semibold" style={{ color: "var(--pro-dark)" }}>missing</span> : null}
              </div>
            );
          })}
        </div>

        {recipe.steps.length > 0 ? (
          <div className="mt-6">
            <h2 className="text-[17px] font-bold text-[var(--text-primary)]">Steps</h2>
            <ol className="mt-3 flex flex-col gap-3">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-[14px] leading-[1.5] text-[var(--text-alpha-70)]">
                  <span className="font-bold text-[var(--accent)]">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 flex flex-col gap-2 px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-8 md:left-[var(--sidebar-width)]"
        style={{ background: "linear-gradient(to top, #101314 60%, transparent)" }}
      >
        {missing.length > 0 ? (
          <button type="button" disabled={addingMissing} onClick={addMissingToList} className="btn-pro-outline-dark h-11 w-full text-[13.5px]">
            {addingMissing ? "Adding…" : `Add ${missing.length} missing to shopping list`}
          </button>
        ) : null}
        <div className="flex items-center gap-2.5">
          <RatingButton recipeId={recipe.id} userId={user?.id} />
          <button type="button" onClick={() => router.push(`/cook/${recipe.id}`)} className="btn-primary h-[56px] flex-1 text-[16px]">
            Start cooking
          </button>
        </div>
      </div>

      <AdaptSheet open={adaptOpen} onClose={() => setAdaptOpen(false)} recipeId={recipe.id} />
    </div>
  );
}

const ADAPT_PRESETS = ["Make it vegan", "Half portions", "Air fryer version", "Swap the protein"];

function AdaptSheet({ open, onClose, recipeId }: { open: boolean; onClose: () => void; recipeId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [transformation, setTransformation] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(value: string) {
    if (!value.trim() || loading) return;
    setLoading(true);
    try {
      const res = await api.adaptRecipe({ recipe_id: recipeId, transformation: value.trim() });
      toast.show("Adapted — here's your new recipe.", "success");
      onClose();
      router.push(`/recipe/${res.recipe.id}`);
    } catch (err) {
      if (err instanceof ApiClientError && err.isPaywall) {
        onClose();
        router.push("/paywall");
        return;
      }
      toast.show(err instanceof Error ? err.message : "Couldn't adapt this recipe.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Adapt this recipe">
      <div className="flex flex-col gap-2">
        {ADAPT_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            disabled={loading}
            onClick={() => submit(preset)}
            className="glass-panel flex items-center justify-between rounded-[var(--radius-card-md)] px-4 py-3.5 text-left text-[14.5px] font-semibold text-[var(--text-base)]"
          >
            {preset}
            <Icon name="chevronLeft" size={16} className="rotate-180 text-[var(--text-alpha-40)]" />
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          value={transformation}
          onChange={(e) => setTransformation(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit(transformation)}
          placeholder="Or describe your own…"
          aria-label="Custom adaptation"
          className="glass-panel min-w-0 flex-1 rounded-[var(--radius-full)] px-4 py-3 text-[14px] text-[var(--text-base)] outline-none placeholder:text-[var(--text-alpha-40)]"
        />
        <button
          type="button"
          disabled={loading || !transformation.trim()}
          onClick={() => submit(transformation)}
          className="btn-primary h-[46px] px-5 text-[14px]"
        >
          {loading ? "…" : "Go"}
        </button>
      </div>
    </BottomSheet>
  );
}

function splitIngredients(recipe: RecipeRow): { have: Set<string>; missing: RecipeRow["ingredients"] } {
  const detected = detectedIngredientsFor(recipe);
  const detectedSet = new Set(detected.map((d) => d.toLowerCase()));
  const have = new Set<string>();
  for (const ing of recipe.ingredients) {
    const name = ing.name.toLowerCase();
    if ([...detectedSet].some((d) => name.includes(d) || d.includes(name))) have.add(name);
  }
  const missing = recipe.ingredients.filter((ing) => !have.has(ing.name.toLowerCase()));
  return { have, missing };
}

// Root cause of the "everything shows missing" bug: this used to read only
// the ephemeral client-side generation cache (module var + sessionStorage),
// which is only populated for the tab that just ran the generation — it's
// empty on a fresh tab/reload, or when the recipe is reached later via Home
// "Cook again", Library, or a shared link, so every ingredient silently
// fell back to "missing" with no indication anything was wrong.
// generate-recipes (see supabase/functions) already persists the exact
// input ingredient list into `generation_params.ingredients` on the row
// itself, so prefer that durable, server-side source of truth and only
// fall back to the session cache for older rows that predate it.
function detectedIngredientsFor(recipe: RecipeRow): string[] {
  const params = recipe.generation_params as { ingredients?: unknown } | null;
  if (params && Array.isArray(params.ingredients)) {
    const fromParams = params.ingredients.filter((x): x is string => typeof x === "string");
    if (fromParams.length > 0) return fromParams;
  }
  return getLastGeneration().ingredients;
}

function RatingButton({ recipeId, userId }: { recipeId: string; userId?: string }) {
  const [rating, setRating] = useState<"like" | "dislike" | null>(null);
  async function rate(v: "like" | "dislike") {
    setRating(v);
    if (!userId) return;
    try {
      await supabase.from("taste_events").insert({ user_id: userId, recipe_id: recipeId, verdict: v });
    } catch {
      // Non-fatal, taste rating is a nice-to-have.
    }
  }
  return (
    <button
      type="button"
      onClick={() => rate(rating === "like" ? "dislike" : "like")}
      aria-pressed={rating === "like"}
      aria-label="I liked this recipe"
      className="glass-pill-button flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full"
      style={{ color: rating === "like" ? "var(--accent)" : "var(--text-base)" }}
    >
      <Icon name="thumbsUp" size={19} />
    </button>
  );
}
