"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/auth/auth-context";
import { supabase } from "../../lib/supabase/client";
import { api, ApiClientError } from "../../lib/api/client";
import type { RecipeRow } from "../../lib/types/db";
import { LoadingBlock, EmptyBlock, ErrorBlock } from "../StateViews";
import { DishPhoto } from "../DishPhoto";
import { useToast } from "../Toast";

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

interface PlanEntry {
  id: string;
  day_of_week: number;
  meal_slot: string;
  recipes: RecipeRow;
}

function mondayOf(date: Date): string {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = Monday
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

// "Jul 20 – 26" (or "Jul 28 – Aug 3" across a month boundary) instead of a
// single date — a 7-day plan covers a range, not one day.
function formatWeekRange(weekStart: string): string {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startLabel = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  const endLabel =
    start.getMonth() === end.getMonth()
      ? end.toLocaleDateString(undefined, { day: "numeric" })
      : end.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

export function PlannerTab() {
  const { user, isPro } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [entries, setEntries] = useState<PlanEntry[] | null>(null);
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    const { data: plan } = await supabase
      .from("meal_plans")
      .select("id, week_start")
      .eq("user_id", user.id)
      .order("week_start", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!plan) {
      setEntries([]);
      return;
    }
    setWeekStart(plan.week_start);
    const { data: rows, error: entriesErr } = await supabase
      .from("meal_plan_entries")
      .select("id, day_of_week, meal_slot, recipes(*)")
      .eq("plan_id", plan.id)
      .order("day_of_week", { ascending: true });
    if (entriesErr) {
      setError(entriesErr.message);
      return;
    }
    setEntries((rows as unknown as PlanEntry[]) ?? []);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function generateWeek() {
    setGenerating(true);
    try {
      await api.generateMealPlan({ week_start: mondayOf(new Date()) });
      toast.show("Week planned.", "success");
      await load();
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.isPaywall) {
          router.push("/paywall");
          return;
        }
        if (err.status === 404) {
          toast.show("Meal planning isn't deployed on the backend yet.", "error");
          return;
        }
        toast.show(err.message, "error");
      } else {
        toast.show("Could not generate a plan.", "error");
      }
    } finally {
      setGenerating(false);
    }
  }

  const entriesByDay = new Map<number, PlanEntry>();
  (entries ?? []).forEach((e) => entriesByDay.set(e.day_of_week, e));
  const missingCount = (entries ?? []).length; // placeholder metric until shopping-list diff is wired per-plan

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] text-[var(--text-primary)] md:text-[36px]">This week</h1>
          <p className="mt-1 text-[13px] text-[var(--text-alpha-55)]">
            {formatWeekRange(weekStart)} · dinners · 2 servings
          </p>
        </div>
        <button
          type="button"
          onClick={generateWeek}
          disabled={generating}
          className="btn-primary h-11 whitespace-nowrap px-5 text-[14px]"
        >
          {generating ? "Planning…" : "Generate week"}
        </button>
      </div>

      {!isPro ? (
        <div className="glass-panel mb-5 rounded-[var(--radius-card-md)] p-4 text-[13px] text-[var(--text-alpha-60)]">
          The weekly meal planner is a Pro feature.{" "}
          <Link href="/paywall" className="font-semibold text-[var(--accent)]">
            Go Pro
          </Link>{" "}
          to generate one.
        </div>
      ) : null}

      {error ? (
        <ErrorBlock subtitle={error} />
      ) : entries === null ? (
        <LoadingBlock label="Loading your plan…" />
      ) : entries.length === 0 ? (
        <EmptyBlock
          title="No plan yet"
          subtitle="Generate a week and we'll fill in dinners from your preferences."
        />
      ) : (
        <>
          {/* Mobile: day rows, matches 09-ios-meal-planner */}
          <div className="flex flex-col gap-3 md:hidden">
            {DAY_LABELS.map((label, i) => {
              const entry = entriesByDay.get(i);
              return (
                <div key={i} className="glass-panel flex items-center gap-3 rounded-[var(--radius-card-md)] p-3">
                  <div className="w-11 shrink-0 text-center">
                    <p className="text-label-xs text-[var(--text-alpha-45)]">{label}</p>
                  </div>
                  {entry ? (
                    <>
                      <DishPhoto
                        url={entry.recipes.image_url}
                        status={entry.recipes.image_status}
                        className="h-11 w-11 shrink-0 rounded-[10px]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14.5px] font-bold text-[var(--text-primary)]">{entry.recipes.title}</p>
                        <p className="text-[12px] text-[var(--text-alpha-50)]">
                          {entry.recipes.macros ? `${Math.round(entry.recipes.macros.calories)} kcal` : entry.meal_slot}
                        </p>
                      </div>
                      <Link href={`/recipe/${entry.recipes.id}`} className="shrink-0 text-[13px] font-semibold text-[var(--accent)]">
                        Cook →
                      </Link>
                    </>
                  ) : (
                    <p className="flex-1 text-[13px] text-[var(--text-alpha-40)]">— free —</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop: week grid, matches 17-web-meal-planner */}
          <div className="hidden grid-cols-7 gap-3 md:grid">
            {DAY_LABELS.map((label, i) => {
              const entry = entriesByDay.get(i);
              const today = new Date().getDay() === (i + 1) % 7;
              return (
                <div
                  key={i}
                  className="glass-panel flex min-h-[220px] flex-col rounded-[var(--radius-card-md)] p-3"
                  style={today ? { border: "2px solid var(--accent)" } : undefined}
                >
                  <p className="text-label-xs text-[var(--text-alpha-50)]">{label}</p>
                  {entry ? (
                    <>
                      <DishPhoto url={entry.recipes.image_url} status={entry.recipes.image_status} className="mt-2 h-20 w-full rounded-[10px]" />
                      <p className="mt-2 text-[13px] font-bold leading-tight text-[var(--text-primary)]">{entry.recipes.title}</p>
                      {entry.recipes.macros ? (
                        <p className="mt-1 text-[11.5px] text-[var(--text-alpha-50)]">{Math.round(entry.recipes.macros.calories)} kcal</p>
                      ) : null}
                    </>
                  ) : (
                    <div className="mt-2 flex flex-1 items-center justify-center rounded-[10px] border border-dashed" style={{ borderColor: "rgba(255,255,255,0.14)" }}>
                      <span className="text-[18px] text-[var(--text-alpha-30)]">+</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex items-center justify-between gap-3 rounded-[var(--radius-card-md)] p-4" style={{ background: "rgba(0,0,0,0.35)" }}>
            <div>
              <p className="text-[13.5px] font-bold text-[var(--text-primary)]">
                {missingCount} recipe{missingCount === 1 ? "" : "s"} planned this week
              </p>
              <p className="text-[11.5px] text-[var(--text-alpha-45)]">Pantry staples excluded automatically</p>
            </div>
            <Link href="/list" className="btn-cream h-10 whitespace-nowrap px-5 text-[13px]">
              To list →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
