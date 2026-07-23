"use client";

// Cooking mode (05-ios-cooking-mode-glass). Step-by-step, large text, flat
// darker background (no bloom, per DESIGN.md §1.3's "cooking mode, no
// bloom" gradient variant), screen stays awake via the Wake Lock API while
// active (PRD story 15).
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase/client";
import type { RecipeRow } from "../../../lib/types/db";
import { Icon } from "../../../components/Icon";
import { LoadingBlock, ErrorBlock } from "../../../components/StateViews";

const TIMER_SECONDS = 5 * 60;

export default function CookingModePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<RecipeRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [timerLeft, setTimerLeft] = useState<number | null>(null);
  const wakeLockRef = useRef<{ release: () => Promise<void> } | null>(null);

  useEffect(() => {
    supabase
      .from("recipes")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        else if (!data) setError("Recipe not found.");
        else setRecipe(data as RecipeRow);
      });
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    async function acquire() {
      try {
        const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> } };
        if (nav.wakeLock) {
          const lock = await nav.wakeLock.request("screen");
          if (!cancelled) wakeLockRef.current = lock;
          else void lock.release();
        }
      } catch {
        // Wake Lock unsupported/denied — cooking mode still works, just
        // won't override the device's screen-sleep timer.
      }
    }
    void acquire();
    return () => {
      cancelled = true;
      void wakeLockRef.current?.release();
    };
  }, []);

  useEffect(() => {
    if (timerLeft === null) return;
    if (timerLeft <= 0) return;
    const t = window.setTimeout(() => setTimerLeft((s) => (s ?? 0) - 1), 1000);
    return () => window.clearTimeout(t);
  }, [timerLeft]);

  if (error) {
    return (
      <div className="flex min-h-dvh flex-col px-5 pt-[calc(env(safe-area-inset-top)+20px)]" style={{ background: "var(--bg-gradient-flat)" }}>
        <ErrorBlock title="Couldn't load this recipe" subtitle={error} />
      </div>
    );
  }
  if (!recipe) return <LoadingBlock label="Loading…" />;

  const steps = recipe.steps.length > 0 ? recipe.steps : ["No steps were generated for this recipe."];
  const total = steps.length;
  const mm = timerLeft !== null ? Math.floor(timerLeft / 60) : 0;
  const ss = timerLeft !== null ? timerLeft % 60 : 0;

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-10 pt-[calc(env(safe-area-inset-top)+20px)]" style={{ background: "var(--bg-gradient-flat)" }}>
      <div className="mx-auto flex w-full max-w-[560px] flex-1 flex-col">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/recipe/${recipe.id}`)}
            aria-label="Exit cooking mode"
            className="glass-pill-button flex h-9 w-9 items-center justify-center rounded-full"
          >
            <Icon name="x" size={16} />
          </button>
          <p className="text-label-xs text-[var(--text-alpha-45)]">{recipe.title}</p>
        </div>

        <div className="mt-6 flex gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className="h-1 flex-1 rounded-full"
              style={{
                background: i < step ? "var(--accent-light)" : i === step ? "var(--text-primary)" : "rgba(255,255,255,0.16)",
              }}
            />
          ))}
        </div>
        <p className="text-label-xs mt-3" style={{ color: "var(--accent-light)" }}>
          STEP {step + 1} OF {total}
        </p>

        <div className="flex flex-1 items-center">
          <p className="font-display text-[32px] leading-[1.25] text-[var(--text-primary)]">{steps[step]}</p>
        </div>

        <button
          type="button"
          onClick={() => setTimerLeft((s) => (s === null ? TIMER_SECONDS : s))}
          className="glass-panel mb-8 flex w-fit items-center gap-2.5 self-start rounded-full px-5 py-3"
        >
          <span style={{ color: "var(--accent-light)" }}>
            <Icon name="clock" size={18} />
          </span>
          {timerLeft !== null ? (
            <span className="text-[15px] font-bold text-[var(--text-primary)]">
              {mm}:{String(ss).padStart(2, "0")}
            </span>
          ) : (
            <span className="text-[14px] text-[var(--text-alpha-55)]">tap to start timer</span>
          )}
        </button>

        <div className="flex gap-3">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => {
              setStep((s) => Math.max(0, s - 1));
              setTimerLeft(null);
            }}
            className="btn-secondary h-[56px] flex-1 text-[16px] disabled:opacity-40"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => {
              if (step === total - 1) {
                router.push(`/recipe/${recipe.id}`);
                return;
              }
              setStep((s) => Math.min(total - 1, s + 1));
              setTimerLeft(null);
            }}
            className="btn-primary h-[56px] flex-[2] text-[16px]"
          >
            {step === total - 1 ? "Finish" : "Next step"}
          </button>
        </div>
        <p className="mt-4 text-center text-[12px] text-[var(--text-alpha-40)]">Screen stays awake while you cook</p>
      </div>
    </div>
  );
}
