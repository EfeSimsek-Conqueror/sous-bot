// Pure shopping-list diff logic: (meal plan ingredients) MINUS (pantry items), with
// unit/quantity merging of duplicate ingredients. No I/O, no Supabase, no fal — fully
// unit-testable in isolation per the PRD's test decisions.

export interface QuantifiedIngredient {
  name: string;
  quantity: number | null; // null = "some amount", e.g. "salt to taste" or an unquantified pantry staple
  unit: string | null;
}

export interface PantryItem extends QuantifiedIngredient {
  is_staple?: boolean; // staples (salt, oil, ...) are treated as always-covered regardless of quantity
}

// Basic same-dimension unit conversion so "500 g" + "0.5 kg" merges to "1 kg" and a pantry
// item in a different-but-compatible unit still offsets correctly. Deliberately conservative:
// units outside these tables are only merged/matched when they're textually identical.
const MASS_TO_GRAMS: Record<string, number> = {
  g: 1, gram: 1, grams: 1,
  kg: 1000, kilogram: 1000, kilograms: 1000,
  mg: 0.001,
  oz: 28.3495, ounce: 28.3495, ounces: 28.3495,
  lb: 453.592, lbs: 453.592, pound: 453.592, pounds: 453.592,
};

const VOLUME_TO_ML: Record<string, number> = {
  ml: 1, milliliter: 1, milliliters: 1,
  l: 1000, liter: 1000, liters: 1000, litre: 1000, litres: 1000,
  tsp: 4.9289, teaspoon: 4.9289, teaspoons: 4.9289,
  tbsp: 14.7868, tablespoon: 14.7868, tablespoons: 14.7868,
  cup: 236.588, cups: 236.588,
  "fl oz": 29.5735, "fl_oz": 29.5735,
};

type UnitDimension = "mass" | "volume" | "count";

function normalizeUnit(unit: string | null | undefined): string {
  return (unit ?? "").trim().toLowerCase();
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function dimensionOf(unit: string): UnitDimension {
  if (unit in MASS_TO_GRAMS) return "mass";
  if (unit in VOLUME_TO_ML) return "volume";
  return "count"; // includes "", "piece", "clove", "slice", etc. — matched by exact unit string only
}

/** Converts a quantity to a canonical base unit for its dimension, for merging/comparison. */
function toBase(quantity: number, unit: string): { base: number; dimension: UnitDimension; rawUnit: string } {
  const dim = dimensionOf(unit);
  if (dim === "mass") return { base: quantity * MASS_TO_GRAMS[unit], dimension: dim, rawUnit: unit };
  if (dim === "volume") return { base: quantity * VOLUME_TO_ML[unit], dimension: dim, rawUnit: unit };
  return { base: quantity, dimension: dim, rawUnit: unit }; // count-like: no conversion, unit must match exactly
}

/** Converts a base-unit quantity back to a human unit, preferring the given preferred unit. */
function fromBase(base: number, dimension: UnitDimension, preferredUnit: string): { quantity: number; unit: string } {
  if (dimension === "mass") {
    const factor = MASS_TO_GRAMS[preferredUnit] ?? 1;
    return { quantity: round(base / factor), unit: preferredUnit };
  }
  if (dimension === "volume") {
    const factor = VOLUME_TO_ML[preferredUnit] ?? 1;
    return { quantity: round(base / factor), unit: preferredUnit };
  }
  return { quantity: round(base), unit: preferredUnit };
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

interface MergedEntry {
  name: string; // normalized
  displayName: string; // first-seen original casing
  dimension: UnitDimension;
  countUnit: string; // for count-dimension items, the exact unit string
  preferredUnit: string; // unit of the first item seen, used for display conversion
  totalBase: number; // sum in base units (grams/ml) or raw count
  hasUnquantified: boolean; // true if any merged entry had null quantity ("to taste" etc.)
}

/** Merges duplicate ingredients (same normalized name + compatible unit dimension) by summing quantity. */
export function mergeIngredients<T extends QuantifiedIngredient>(items: T[]): MergedEntry[] {
  const byKey = new Map<string, MergedEntry>();

  for (const item of items) {
    const name = normalizeName(item.name);
    const unit = normalizeUnit(item.unit);
    const dimension = dimensionOf(unit);
    // For count-dimension items, differing units are NOT merged (e.g. "2 cloves garlic" vs
    // "1 head garlic" stay separate) — key includes the raw unit in that case.
    const key = dimension === "count" ? `${name}::${unit}` : `${name}::${dimension}`;

    const existing = byKey.get(key);
    if (item.quantity === null || item.quantity === undefined) {
      if (existing) {
        existing.hasUnquantified = true;
      } else {
        byKey.set(key, {
          name,
          displayName: item.name,
          dimension,
          countUnit: unit,
          preferredUnit: unit,
          totalBase: 0,
          hasUnquantified: true,
        });
      }
      continue;
    }

    const { base } = toBase(item.quantity, unit);
    if (existing) {
      existing.totalBase += base;
    } else {
      byKey.set(key, {
        name,
        displayName: item.name,
        dimension,
        countUnit: unit,
        preferredUnit: unit,
        totalBase: base,
        hasUnquantified: false,
      });
    }
  }

  return [...byKey.values()];
}

export interface ShoppingListItemResult {
  name: string;
  quantity: number | null;
  unit: string | null;
}

/**
 * Computes the shopping list: (plan ingredients, merged) MINUS (pantry items), matching by
 * normalized name + compatible unit dimension. A pantry item marked `is_staple` (or with no
 * quantity at all) is treated as fully covering that ingredient regardless of the plan's
 * requested amount. Otherwise pantry quantity offsets the needed quantity; if pantry covers it
 * fully the ingredient is omitted, if partially covered only the remainder is listed.
 */
export function computeMissingIngredients(
  planIngredients: QuantifiedIngredient[],
  pantryItems: PantryItem[],
): ShoppingListItemResult[] {
  const mergedPlan = mergeIngredients(planIngredients);

  // Staples (salt, oil, ...) fully cover a plan ingredient by name alone, regardless of
  // unit/quantity — "don't tell me to buy salt" per the PRD. An unquantified (but non-staple)
  // pantry entry — "I have some, unspecified amount" — is treated the same way: covering by
  // name alone, since there's no unit to compare against the plan's requested unit.
  const stapleNames = new Set(
    pantryItems.filter((p) => p.is_staple).map((p) => normalizeName(p.name)),
  );
  const unquantifiedNames = new Set(
    pantryItems
      .filter((p) => !p.is_staple && (p.quantity === null || p.quantity === undefined))
      .map((p) => normalizeName(p.name)),
  );

  const quantifiedNonStaplePantry = pantryItems.filter(
    (p) => !p.is_staple && p.quantity !== null && p.quantity !== undefined,
  );
  const mergedPantry = mergeIngredients(quantifiedNonStaplePantry);
  const pantryByKey = new Map<string, MergedEntry>();
  for (const entry of mergedPantry) {
    const key =
      entry.dimension === "count" ? `${entry.name}::${entry.countUnit}` : `${entry.name}::${entry.dimension}`;
    pantryByKey.set(key, entry);
  }

  const result: ShoppingListItemResult[] = [];

  for (const planEntry of mergedPlan) {
    if (stapleNames.has(planEntry.name) || unquantifiedNames.has(planEntry.name)) continue;

    const pantryKey =
      planEntry.dimension === "count"
        ? `${planEntry.name}::${planEntry.countUnit}`
        : `${planEntry.name}::${planEntry.dimension}`;
    const pantryEntry = pantryByKey.get(pantryKey);

    if (!pantryEntry) {
      // Not in pantry at all → fully missing.
      result.push(toResult(planEntry));
      continue;
    }

    // Pantry has it but with no quantity recorded (e.g. "have some, unspecified amount") →
    // treat as fully covering.
    if (pantryEntry.hasUnquantified && pantryEntry.totalBase === 0) continue;

    const remainingBase = planEntry.totalBase - pantryEntry.totalBase;
    if (remainingBase <= 1e-9) continue; // fully covered

    result.push(toResult({ ...planEntry, totalBase: remainingBase }));
  }

  return result;
}

function toResult(entry: MergedEntry): ShoppingListItemResult {
  if (entry.hasUnquantified && entry.totalBase === 0) {
    return { name: entry.displayName, quantity: null, unit: entry.preferredUnit || null };
  }
  const { quantity, unit } = fromBase(entry.totalBase, entry.dimension, entry.preferredUnit || entry.countUnit);
  return { name: entry.displayName, quantity, unit: unit || null };
}
