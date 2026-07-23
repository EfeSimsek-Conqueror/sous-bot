import Link from "next/link";
import { DishPhoto } from "./DishPhoto";
import type { RecipeRow } from "../lib/types/db";

export function RecipeCard({ recipe }: { recipe: Pick<RecipeRow, "id" | "title" | "image_url" | "image_status" | "macros" | "prep_minutes" | "cook_minutes"> }) {
  const minutes = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);
  return (
    <Link
      href={`/recipe/${recipe.id}`}
      className="glass-panel block overflow-hidden rounded-[var(--radius-card-lg)] transition-transform duration-200 hover:-translate-y-0.5"
    >
      <DishPhoto url={recipe.image_url} status={recipe.image_status} caption="dish photo" className="h-[100px] w-full" />
      <div className="p-3.5">
        <p className="text-[14.5px] font-bold leading-tight text-[var(--text-primary)]">{recipe.title}</p>
        <p className="mt-1 text-[12.5px] text-[var(--text-alpha-55)]">
          {recipe.macros ? `${Math.round(recipe.macros.calories)} kcal · ` : ""}
          {minutes > 0 ? `${minutes} min` : ""}
        </p>
      </div>
    </Link>
  );
}
