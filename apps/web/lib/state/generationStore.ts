// Tiny cache for handing the just-generated recipe list (and the
// ingredients that produced it) from the ingredient-review screen to the
// results/recipe-detail screens without a refetch. Mirrored into
// sessionStorage so it survives a hard navigation/refresh within the same
// tab (recipe detail is a separate route, reached by a real page load in
// some flows) — `results` also accepts `?ids=` in the URL as a further
// fallback that reads the already-persisted rows straight from Supabase.
import type { GeneratedRecipe } from "../api/types";

const STORAGE_KEY = "sousbot:last-generation";

let lastRecipes: GeneratedRecipe[] | null = null;
let lastIngredients: string[] = [];
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { recipes: GeneratedRecipe[]; ingredients: string[] };
    lastRecipes = parsed.recipes;
    lastIngredients = parsed.ingredients;
  } catch {
    // Corrupt/blocked storage — fall back to the empty in-memory state.
  }
}

export function setLastGeneration(recipes: GeneratedRecipe[], ingredients: string[]) {
  lastRecipes = recipes;
  lastIngredients = ingredients;
  hydrated = true;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ recipes, ingredients }));
  } catch {
    // Best-effort only.
  }
}

export function getLastGeneration(): { recipes: GeneratedRecipe[] | null; ingredients: string[] } {
  hydrate();
  return { recipes: lastRecipes, ingredients: lastIngredients };
}
