// Allergen post-check validator. Allergies are HARD constraints per the PRD: they're injected
// into the prompt AND re-validated here against the generated recipe's ingredient list (+ title/
// description/steps, since an allergen can appear in a step like "toss with peanut oil" without
// being a separate ingredients[] entry). A violating recipe must be rejected (never stored/
// returned) and the caller should regenerate.

import type { Recipe } from "./recipeSchema.ts";

// Common allergen synonym groups. Keys are the canonical allergy tag we expect in
// profiles.allergies (freeform text from the client, lowercased/trimmed for matching).
// Values are substrings that indicate the presence of that allergen in recipe text.
const ALLERGEN_SYNONYMS: Record<string, string[]> = {
  peanut: ["peanut", "peanuts", "groundnut", "groundnuts", "arachis"],
  peanuts: ["peanut", "peanuts", "groundnut", "groundnuts", "arachis"],
  "tree nut": [
    "almond", "cashew", "walnut", "pecan", "hazelnut", "pistachio", "macadamia",
    "brazil nut", "pine nut", "chestnut",
  ],
  "tree nuts": [
    "almond", "cashew", "walnut", "pecan", "hazelnut", "pistachio", "macadamia",
    "brazil nut", "pine nut", "chestnut",
  ],
  nuts: [
    "almond", "cashew", "walnut", "pecan", "hazelnut", "pistachio", "macadamia",
    "brazil nut", "pine nut", "chestnut", "peanut",
  ],
  shellfish: ["shrimp", "prawn", "crab", "lobster", "crawfish", "crayfish", "langoustine"],
  crustacean: ["shrimp", "prawn", "crab", "lobster", "crawfish", "crayfish", "langoustine"],
  fish: [
    "fish", "salmon", "tuna", "cod", "anchovy", "anchovies", "sardine", "mackerel",
    "tilapia", "trout", "halibut", "fish sauce", "worcestershire",
  ],
  shellfish_mollusk: ["clam", "mussel", "oyster", "scallop", "squid", "octopus", "snail"],
  mollusk: ["clam", "mussel", "oyster", "scallop", "squid", "octopus", "snail"],
  dairy: [
    "milk", "cheese", "butter", "cream", "yogurt", "yoghurt", "whey", "casein",
    "ghee", "custard", "buttermilk",
  ],
  milk: [
    "milk", "cheese", "butter", "cream", "yogurt", "yoghurt", "whey", "casein",
    "ghee", "custard", "buttermilk",
  ],
  egg: ["egg", "eggs", "mayonnaise", "meringue", "albumin"],
  eggs: ["egg", "eggs", "mayonnaise", "meringue", "albumin"],
  soy: ["soy", "soya", "tofu", "edamame", "tempeh", "miso", "soy sauce"],
  gluten: [
    "wheat", "flour", "barley", "rye", "malt", "bread", "pasta", "couscous",
    "breadcrumb", "soy sauce", "seitan",
  ],
  wheat: ["wheat", "flour", "bread", "pasta", "couscous", "breadcrumb", "seitan"],
  sesame: ["sesame", "tahini"],
  celery: ["celery", "celeriac"],
  mustard: ["mustard"],
  sulfite: ["sulfite", "sulphite"],
  sulphite: ["sulfite", "sulphite"],
  lupin: ["lupin", "lupine"],
  pork: ["pork", "bacon", "ham", "prosciutto", "pancetta", "lard", "chorizo"],
  alcohol: ["wine", "beer", "rum", "vodka", "whiskey", "whisky", "brandy", "liqueur"],
};

function textOf(recipe: Recipe): string {
  const parts = [
    recipe.title,
    recipe.description,
    ...recipe.ingredients.map((i) => i.name),
    ...recipe.steps,
    ...recipe.tags,
  ];
  return parts.join(" \n ").toLowerCase();
}

export interface AllergyViolation {
  allergy: string;
  matchedTerms: string[];
}

/**
 * Checks a generated/adapted recipe against the user's declared allergies. Returns an array
 * of violations (empty if clean). Matching is substring-based over ingredient names, title,
 * description, steps and tags, using a synonym table so e.g. "dairy" catches "butter" and
 * "peanuts" catches "groundnut".
 */
export function checkAllergyViolations(recipe: Recipe, allergies: string[]): AllergyViolation[] {
  if (!allergies || allergies.length === 0) return [];
  const haystack = textOf(recipe);
  const violations: AllergyViolation[] = [];

  for (const rawAllergy of allergies) {
    const allergy = rawAllergy.trim().toLowerCase();
    if (!allergy) continue;
    const synonyms = ALLERGEN_SYNONYMS[allergy] ?? [allergy];
    const matched = synonyms.filter((term) => haystack.includes(term));
    if (matched.length > 0) {
      violations.push({ allergy: rawAllergy, matchedTerms: matched });
    }
  }
  return violations;
}

export function violatesAllergies(recipe: Recipe, allergies: string[]): boolean {
  return checkAllergyViolations(recipe, allergies).length > 0;
}
