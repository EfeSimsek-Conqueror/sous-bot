// Shopping list diff logic — PRD Test Decisions module 3.
// Pure function, no I/O — exercises computeMissingIngredients directly (the module's public
// interface) per the PRD's test decision: "(plan ingredients) minus (pantry items) produces the
// correct missing list, including unit/quantity merging of duplicate ingredients."

import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { computeMissingIngredients, mergeIngredients } from "../_shared/shoppingList.ts";

Deno.test("computeMissingIngredients: item entirely absent from pantry is fully missing", () => {
  const missing = computeMissingIngredients(
    [{ name: "chicken breast", quantity: 2, unit: "pieces" }],
    [],
  );
  assertEquals(missing, [{ name: "chicken breast", quantity: 2, unit: "pieces" }]);
});

Deno.test("computeMissingIngredients: item fully covered by pantry is omitted", () => {
  const missing = computeMissingIngredients(
    [{ name: "rice", quantity: 500, unit: "g" }],
    [{ name: "rice", quantity: 1, unit: "kg" }], // more than enough, different-but-compatible unit
  );
  assertEquals(missing, []);
});

Deno.test("computeMissingIngredients: item partially covered by pantry lists only the remainder", () => {
  const missing = computeMissingIngredients(
    [{ name: "flour", quantity: 1000, unit: "g" }],
    [{ name: "flour", quantity: 300, unit: "g" }],
  );
  assertEquals(missing, [{ name: "flour", quantity: 700, unit: "g" }]);
});

Deno.test("computeMissingIngredients: unit conversion — kg pantry offsets g plan requirement", () => {
  const missing = computeMissingIngredients(
    [{ name: "sugar", quantity: 1500, unit: "g" }],
    [{ name: "sugar", quantity: 1, unit: "kg" }],
  );
  assertEquals(missing, [{ name: "sugar", quantity: 500, unit: "g" }]);
});

Deno.test("computeMissingIngredients: volume unit conversion — liters pantry offsets ml plan requirement", () => {
  const missing = computeMissingIngredients(
    [{ name: "milk", quantity: 750, unit: "ml" }],
    [{ name: "milk", quantity: 0.5, unit: "l" }],
  );
  assertEquals(missing, [{ name: "milk", quantity: 250, unit: "ml" }]);
});

Deno.test("computeMissingIngredients: duplicate plan ingredients are merged (quantity summed) before diffing", () => {
  // Two recipes in the same plan both need garlic — must merge to 5 cloves before comparing to pantry.
  const missing = computeMissingIngredients(
    [
      { name: "garlic", quantity: 2, unit: "cloves" },
      { name: "garlic", quantity: 3, unit: "cloves" },
    ],
    [{ name: "garlic", quantity: 4, unit: "cloves" }],
  );
  assertEquals(missing, [{ name: "garlic", quantity: 1, unit: "cloves" }]);
});

Deno.test("computeMissingIngredients: duplicate plan ingredients merge across compatible units too", () => {
  const missing = computeMissingIngredients(
    [
      { name: "butter", quantity: 200, unit: "g" },
      { name: "butter", quantity: 0.3, unit: "kg" },
    ],
    [],
  );
  assertEquals(missing, [{ name: "butter", quantity: 500, unit: "g" }]);
});

Deno.test("computeMissingIngredients: name matching is case/whitespace insensitive", () => {
  const missing = computeMissingIngredients(
    [{ name: "  Garlic  ", quantity: 2, unit: "cloves" }],
    [{ name: "garlic", quantity: 5, unit: "cloves" }],
  );
  assertEquals(missing, []);
});

Deno.test("computeMissingIngredients: a pantry staple fully covers the ingredient regardless of quantity/unit", () => {
  const missing = computeMissingIngredients(
    [{ name: "salt", quantity: 50, unit: "g" }],
    [{ name: "salt", quantity: null, unit: null, is_staple: true }],
  );
  assertEquals(missing, [], "salt is a staple — never tell the user to buy it (PRD)");
});

Deno.test("computeMissingIngredients: an unquantified (non-staple) pantry entry still counts as covering", () => {
  const missing = computeMissingIngredients(
    [{ name: "olive oil", quantity: 2, unit: "tbsp" }],
    [{ name: "olive oil", quantity: null, unit: null }],
  );
  assertEquals(missing, []);
});

Deno.test("computeMissingIngredients: different count-unit items (e.g. cloves vs head) are not cross-merged/matched", () => {
  const missing = computeMissingIngredients(
    [{ name: "garlic", quantity: 2, unit: "cloves" }],
    [{ name: "garlic", quantity: 1, unit: "head" }], // pantry has garlic, but not in a comparable unit
  );
  assertEquals(missing, [{ name: "garlic", quantity: 2, unit: "cloves" }]);
});

Deno.test("computeMissingIngredients: multiple distinct ingredients handled independently", () => {
  const missing = computeMissingIngredients(
    [
      { name: "chicken breast", quantity: 2, unit: "pieces" },
      { name: "rice", quantity: 500, unit: "g" },
      { name: "lemon", quantity: 1, unit: "piece" },
    ],
    [{ name: "rice", quantity: 2, unit: "kg" }],
  );
  assertEquals(missing.length, 2);
  assertEquals(
    missing.map((m) => m.name).sort(),
    ["chicken breast", "lemon"],
  );
});

Deno.test("computeMissingIngredients: empty plan produces empty shopping list", () => {
  assertEquals(computeMissingIngredients([], [{ name: "rice", quantity: 1, unit: "kg" }]), []);
});

Deno.test("mergeIngredients: sums quantities for exact duplicate name+unit entries", () => {
  const merged = mergeIngredients([
    { name: "onion", quantity: 1, unit: "piece" },
    { name: "onion", quantity: 2, unit: "piece" },
  ]);
  assertEquals(merged.length, 1);
  assertEquals(merged[0].totalBase, 3);
});
