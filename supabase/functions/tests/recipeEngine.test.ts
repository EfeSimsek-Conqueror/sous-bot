// Recipe engine output handling — PRD Test Decisions module 2.
//
// Exercises the module's public interface (parseWithRetry + validateRecipe/validateRecipeList +
// checkAllergyViolations) exactly as generate-recipes/adapt-recipe/generate-meal-plan use them.
// The fal.ai HTTP layer is mocked here by directly supplying the "attempts" functions that
// parseWithRetry calls — no network access, fully deterministic and free.

import { assertEquals, assert, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseWithRetry, stripJsonFences } from "../_shared/jsonRetry.ts";
import { validateRecipe, validateRecipeList, type Recipe } from "../_shared/recipeSchema.ts";
import { checkAllergyViolations, violatesAllergies } from "../_shared/allergens.ts";
import { ApiError } from "../_shared/errors.ts";

function validRecipeJson(overrides: Partial<Recipe> = {}): string {
  const recipe: Recipe = {
    title: "Lemon Garlic Chicken",
    description: "A simple weeknight dinner.",
    ingredients: [
      { name: "chicken breast", quantity: 2, unit: "pieces" },
      { name: "garlic", quantity: 3, unit: "cloves" },
    ],
    steps: ["Season the chicken.", "Cook until done."],
    macros: { calories: 450, protein_g: 45, carbs_g: 10, fat_g: 15 },
    prep_minutes: 10,
    cook_minutes: 20,
    servings: 2,
    difficulty: "easy",
    tags: ["chicken", "dinner"],
    ...overrides,
  };
  return JSON.stringify(recipe);
}

Deno.test("stripJsonFences removes ```json fences (the documented fal.ai gotcha)", () => {
  const fenced = "```json\n[\"tomato\", \"onion\"]\n```";
  assertEquals(stripJsonFences(fenced), '["tomato", "onion"]');
});

Deno.test("stripJsonFences is a no-op on already-clean JSON", () => {
  assertEquals(stripJsonFences('{"a":1}'), '{"a":1}');
});

Deno.test("parseWithRetry: succeeds immediately on well-formed JSON (no retry needed)", async () => {
  let calls = 0;
  const outcome = await parseWithRetry({
    attempts: [
      () => {
        calls++;
        return Promise.resolve(validRecipeJson());
      },
    ],
    validate: validateRecipe,
  });
  assertEquals(calls, 1);
  assertEquals(outcome.attemptsUsed, 1);
  assertEquals(outcome.value.title, "Lemon Garlic Chicken");
});

Deno.test("parseWithRetry: strips markdown fences before parsing (fal.ai vision gotcha)", async () => {
  const outcome = await parseWithRetry({
    attempts: [() => Promise.resolve("```json\n" + validRecipeJson() + "\n```")],
    validate: validateRecipe,
  });
  assertEquals(outcome.value.title, "Lemon Garlic Chicken");
});

Deno.test("parseWithRetry: malformed JSON on attempt 1 retries and succeeds on attempt 2", async () => {
  const calls: string[] = [];
  const outcome = await parseWithRetry({
    attempts: [
      () => {
        calls.push("attempt1");
        return Promise.resolve("this is not json at all {{{");
      },
      () => {
        calls.push("attempt2");
        return Promise.resolve(validRecipeJson());
      },
    ],
    validate: validateRecipe,
  });
  assertEquals(calls, ["attempt1", "attempt2"]);
  assertEquals(outcome.attemptsUsed, 2);
  assertEquals(outcome.value.title, "Lemon Garlic Chicken");
});

Deno.test("parseWithRetry: partial/schema-invalid JSON retries (valid JSON, wrong shape)", async () => {
  const partial = JSON.stringify({ title: "Missing everything else" });
  const outcome = await parseWithRetry({
    attempts: [
      () => Promise.resolve(partial),
      () => Promise.resolve(validRecipeJson()),
    ],
    validate: validateRecipe,
  });
  assertEquals(outcome.attemptsUsed, 2);
});

Deno.test("parseWithRetry: exhausting all attempts (2 retries = 3 total) throws and never returns broken JSON", async () => {
  let callCount = 0;
  await assertRejects(
    () =>
      parseWithRetry({
        attempts: [
          () => {
            callCount++;
            return Promise.resolve("not json");
          },
          () => {
            callCount++;
            return Promise.resolve("{{{ still not json");
          },
          () => {
            callCount++;
            return Promise.resolve(JSON.stringify({ title: "" })); // parses but fails schema validation
          },
        ],
        validate: validateRecipe,
      }),
    ApiError,
  );
  assertEquals(callCount, 3, "should have used exactly the 3 configured attempts (1 primary + 2 retries)");
});

Deno.test("parseWithRetry: never lets a validation error's partial value leak into the result", async () => {
  try {
    await parseWithRetry({
      attempts: [() => Promise.resolve(JSON.stringify({ title: "x" }))],
      validate: validateRecipe,
    });
    throw new Error("expected parseWithRetry to throw");
  } catch (e) {
    assert(e instanceof ApiError);
    assertEquals(e.code, "upstream_invalid_output");
  }
});

Deno.test("validateRecipeList: accepts a single object (n=1 shape) and an array (n>1 shape)", () => {
  const single = validateRecipeList(JSON.parse(validRecipeJson()));
  assert(single.ok);
  if (single.ok) assertEquals(single.value.length, 1);

  const array = validateRecipeList([JSON.parse(validRecipeJson()), JSON.parse(validRecipeJson({ title: "Second Dish" }))]);
  assert(array.ok);
  if (array.ok) assertEquals(array.value.length, 2);
});

Deno.test("validateRecipeList: drops invalid entries but keeps valid ones", () => {
  const result = validateRecipeList([JSON.parse(validRecipeJson()), { title: "broken, missing everything" }]);
  assert(result.ok);
  if (result.ok) assertEquals(result.value.length, 1);
});

// ---------------------------------------------------------------------------
// Allergy hard-constraint post-check
// ---------------------------------------------------------------------------

Deno.test("checkAllergyViolations: rejects a recipe containing a declared allergen ingredient", () => {
  const recipe: Recipe = JSON.parse(
    validRecipeJson({ ingredients: [{ name: "peanut butter", quantity: 1, unit: "tbsp" }] }),
  );
  const violations = checkAllergyViolations(recipe, ["peanuts"]);
  assert(violations.length > 0);
  assertEquals(violations[0].allergy, "peanuts");
});

Deno.test("checkAllergyViolations: catches allergen mentioned only in a step, not ingredients[]", () => {
  const recipe: Recipe = JSON.parse(validRecipeJson());
  recipe.steps = ["Toss the vegetables with peanut oil.", "Serve hot."];
  const violations = checkAllergyViolations(recipe, ["peanut"]);
  assert(violations.length > 0);
});

Deno.test("checkAllergyViolations: catches synonym matches (dairy -> butter/cheese/cream)", () => {
  const recipe: Recipe = JSON.parse(
    validRecipeJson({ ingredients: [{ name: "butter", quantity: 2, unit: "tbsp" }] }),
  );
  assert(violatesAllergies(recipe, ["dairy"]));
});

Deno.test("checkAllergyViolations: clean recipe with no allergen overlap passes", () => {
  const recipe: Recipe = JSON.parse(validRecipeJson());
  const violations = checkAllergyViolations(recipe, ["shellfish", "peanuts"]);
  assertEquals(violations.length, 0);
});

Deno.test("checkAllergyViolations: empty allergy list never flags anything", () => {
  const recipe: Recipe = JSON.parse(
    validRecipeJson({ ingredients: [{ name: "peanut butter", quantity: 1, unit: "tbsp" }] }),
  );
  assertEquals(checkAllergyViolations(recipe, []).length, 0);
});

Deno.test("end-to-end simulation: violating recipe is rejected, regeneration produces a clean one", () => {
  // Mirrors the generate-recipes allergy round-trip: batch 1 has a violation, it's filtered out
  // (never stored/returned), batch 2 (the 'regeneration') is clean and used instead.
  const allergies = ["peanuts"];
  const batch1: Recipe[] = [
    JSON.parse(validRecipeJson({ title: "Peanut Noodles", ingredients: [{ name: "peanut sauce", quantity: 1, unit: "cup" }] })),
  ];
  const batch2: Recipe[] = [JSON.parse(validRecipeJson({ title: "Sesame Noodles" }))];

  const safeFromBatch1 = batch1.filter((r) => !violatesAllergies(r, allergies));
  assertEquals(safeFromBatch1.length, 0, "the violating recipe must be rejected, not returned");

  const safeFromBatch2 = batch2.filter((r) => !violatesAllergies(r, allergies));
  assertEquals(safeFromBatch2.length, 1);
  assertEquals(safeFromBatch2[0].title, "Sesame Noodles");
});
