import { Suspense } from "react";
import { IngredientReview } from "./IngredientReview";

export default function IngredientsPage() {
  return (
    <Suspense fallback={null}>
      <IngredientReview />
    </Suspense>
  );
}
