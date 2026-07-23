// Hand-written types matching supabase/migrations/0001_init.sql and
// 0002_storage.sql. Kept intentionally close to the SQL shape — if the
// migrations change, update here. (Not codegen'd because `supabase gen
// types` requires a live linked project shell step outside this agent's
// scope; safe to swap in later without changing call sites.)

export type Units = "metric" | "imperial";
export type Difficulty = "easy" | "medium" | "hard";
export type ImageStatus = "none" | "pending" | "ready" | "failed";
export type RecipeSource = "generated" | "adapted";
export type Verdict = "like" | "dislike";
export type SubscriptionStatus = "free" | "pro" | "grace" | "expired";
export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";

export interface RecipeIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
  /** Client-side only: whether the user's pantry/detected list covers this. */
  have?: boolean;
}

export interface Macros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  language: string;
  units: Units;
  diet_flags: string[];
  allergies: string[];
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecipeRow {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  ingredients: RecipeIngredient[];
  steps: string[];
  macros: Macros | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  servings: number | null;
  difficulty: Difficulty | null;
  tags: string[];
  image_url: string | null;
  image_status: ImageStatus;
  generation_params: Record<string, unknown> | null;
  is_saved: boolean;
  source: RecipeSource;
  created_at: string;
}

export interface TasteEventRow {
  id: string;
  user_id: string;
  recipe_id: string;
  verdict: Verdict;
  created_at: string;
}

export interface PantryItemRow {
  id: string;
  user_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  is_staple: boolean;
  created_at: string;
}

export interface MealPlanRow {
  id: string;
  user_id: string;
  week_start: string;
  created_at: string;
}

export interface MealPlanEntryRow {
  id: string;
  plan_id: string;
  recipe_id: string;
  day_of_week: number;
  meal_slot: MealSlot;
}

export interface ShoppingListItemRow {
  id: string;
  user_id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  checked: boolean;
  source_plan_id: string | null;
  created_at: string;
}

export interface SubscriptionRow {
  user_id: string;
  status: SubscriptionStatus;
  platform: "stripe" | "revenuecat" | null;
  product_id: string | null;
  current_period_end: string | null;
  raw: Record<string, unknown> | null;
  updated_at: string;
}

export interface UsageCounterRow {
  user_id: string;
  period: string;
  generation_count: number;
  updated_at: string;
}

// Minimal Database shape for @supabase/supabase-js generics — enough for
// typed `.from("table")` calls without full codegen. `Relationships: []` on
// every table (and `Views`/`Functions` on the schema) are required to
// satisfy postgrest-js's `GenericTable`/`GenericSchema` constraints — without
// them `.update()`/`.insert()` silently infer as `never` (see
// node_modules/@supabase/postgrest-js/src/types/common/common.ts).
// Interfaces (unlike type-literal aliases) don't get TS's implicit string
// index signature, so `ProfileRow extends Record<string, unknown>` is
// `false` even though it's structurally compatible — this `Simplify` mapped
// type re-derives a plain object type from the interface so the
// `GenericTable`/`GenericSchema` constraint checks above actually pass.
type Simplify<T> = { [K in keyof T]: T[K] };

type Table<Row, Insert, Update = Partial<Row>> = {
  Row: Simplify<Row>;
  Insert: Simplify<Insert>;
  Update: Simplify<Update>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<ProfileRow, Partial<ProfileRow> & { id: string }>;
      recipes: Table<RecipeRow, Partial<RecipeRow>>;
      taste_events: Table<TasteEventRow, Partial<TasteEventRow> & { user_id: string; recipe_id: string; verdict: Verdict }>;
      pantry_items: Table<PantryItemRow, Partial<PantryItemRow>>;
      meal_plans: Table<MealPlanRow, Partial<MealPlanRow>>;
      meal_plan_entries: Table<MealPlanEntryRow, Partial<MealPlanEntryRow>>;
      shopping_list_items: Table<ShoppingListItemRow, Partial<ShoppingListItemRow> & { user_id: string; name: string }>;
      subscriptions: Table<SubscriptionRow, Partial<SubscriptionRow>>;
      usage_counters: Table<UsageCounterRow, Partial<UsageCounterRow>>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
