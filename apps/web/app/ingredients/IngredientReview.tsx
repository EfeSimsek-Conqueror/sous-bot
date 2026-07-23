"use client";

// Ingredient review (03-ios-ingredient-review-glass / 13-android). Reached
// either from a fridge-photo upload (calls /detect-ingredients, real vision
// call) or from typing ingredients directly on Home. Chips are fully
// editable — add/remove — before generating, per PRD stories 2 & 3.
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../lib/auth/auth-context";
import { supabase } from "../../lib/supabase/client";
import { api, ApiClientError } from "../../lib/api/client";
import { setLastGeneration } from "../../lib/state/generationStore";
import { BackButton } from "../../components/PageHeader";
import { Icon } from "../../components/Icon";
import { IngredientChip, AddChip } from "../../components/IngredientChip";
import { LoadingBlock, ErrorBlock } from "../../components/StateViews";
import { useToast } from "../../components/Toast";

export function IngredientReview() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, isPro, usageUsed, usageLimit, refreshUsage } = useAuth();
  const toast = useToast();

  const source = params.get("source") ?? "type";
  const path = params.get("path");
  const seed = params.get("seed");

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(source === "photo");
  const [detectError, setDetectError] = useState<string | null>(null);
  const [scanSeconds, setScanSeconds] = useState<number | null>(null);
  const [ingredients, setIngredients] = useState<string[]>(() =>
    seed
      ? seed
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
  );
  const [addingItem, setAddingItem] = useState(false);
  const [draft, setDraft] = useState("");
  const [generating, setGenerating] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (source !== "photo" || !path || !user || ran.current) return;
    ran.current = true;
    const started = performance.now();

    supabase.storage
      .from("fridge-photos")
      .createSignedUrl(path, 3600)
      .then(({ data }) => setPhotoUrl(data?.signedUrl ?? null));

    api
      .detectIngredients({ storage_path: path })
      .then((res) => {
        setIngredients(res.ingredients);
        setScanSeconds((performance.now() - started) / 1000);
      })
      .catch((err) => {
        setDetectError(err instanceof Error ? err.message : "Couldn't read that photo.");
      })
      .finally(() => setDetecting(false));
  }, [source, path, user]);

  function removeIngredient(name: string) {
    setIngredients((prev) => prev.filter((i) => i !== name));
  }

  function commitDraft() {
    const cleaned = draft.trim().toLowerCase();
    setDraft("");
    setAddingItem(false);
    if (cleaned && !ingredients.includes(cleaned)) setIngredients((prev) => [...prev, cleaned]);
  }

  async function generate() {
    if (ingredients.length === 0 || generating) return;
    setGenerating(true);
    try {
      const n = isPro ? 1 : 3;
      const res = await api.generateRecipes({ ingredients, n });
      setLastGeneration(res.recipes, ingredients);
      await refreshUsage();
      if (isPro && res.recipes.length === 1) {
        router.replace(`/recipe/${res.recipes[0].id}`);
      } else {
        router.replace(`/results?ids=${res.recipes.map((r) => r.id).join(",")}`);
      }
    } catch (err) {
      if (err instanceof ApiClientError && err.isPaywall) {
        router.replace("/paywall");
        return;
      }
      toast.show(err instanceof Error ? err.message : "Couldn't generate recipes.", "error");
    } finally {
      setGenerating(false);
    }
  }

  const remaining = usageLimit === null ? null : Math.max(0, usageLimit - usageUsed);

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-8 pt-[calc(env(safe-area-inset-top)+20px)] md:mx-auto md:w-full md:max-w-[640px] md:px-0 md:pt-12">
      <div className="flex items-center gap-3 pb-5">
        <BackButton onClick={() => router.back()} />
        <h1 className="font-display text-[26px] leading-[1.1] text-[var(--text-primary)]">Check what we found</h1>
      </div>

      {source === "photo" ? (
        <div className="glass-panel relative mb-6 flex h-40 items-end justify-between overflow-hidden rounded-[var(--radius-hero)] p-4">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Your fridge" className="absolute inset-0 h-full w-full object-cover opacity-60" />
          ) : (
            <div className="placeholder-stripe absolute inset-0" />
          )}
          <span className="relative font-mono text-[11px] text-[var(--text-alpha-50)]">your fridge photo</span>
          {scanSeconds !== null ? (
            <span
              className="relative rounded-full px-3 py-1.5 text-[12px] font-semibold"
              style={{ background: "var(--accent-alpha-25)", color: "var(--accent-light)" }}
            >
              scanned in {scanSeconds.toFixed(1)}s
            </span>
          ) : null}
        </div>
      ) : null}

      {detecting ? (
        <LoadingBlock label="Reading your fridge photo…" />
      ) : detectError ? (
        <ErrorBlock title="Couldn't scan that photo" subtitle={detectError} action={<BackButton onClick={() => router.back()} />} />
      ) : (
        <>
          <p className="mb-4 text-[15px] text-[var(--text-base)]">
            <span className="font-bold">{ingredients.length} ingredients spotted.</span>{" "}
            <span className="text-[var(--text-alpha-60)]">Tap × to remove, or add what we missed.</span>
          </p>

          <div className="flex flex-wrap gap-2.5">
            {ingredients.map((ing) => (
              <IngredientChip key={ing} label={ing} onRemove={() => removeIngredient(ing)} />
            ))}
            {addingItem ? (
              <span className="chip">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitDraft();
                    if (e.key === "Escape") {
                      setAddingItem(false);
                      setDraft("");
                    }
                  }}
                  onBlur={commitDraft}
                  placeholder="ingredient…"
                  aria-label="Add an ingredient"
                  className="w-24 bg-transparent outline-none placeholder:text-[var(--text-alpha-40)]"
                />
              </span>
            ) : (
              <AddChip label="Add item" onClick={() => setAddingItem(true)} />
            )}
          </div>

          <p className="mt-5 text-[12.5px] text-[var(--text-alpha-45)]">
            Your pantry staples (salt, oil, spices…) are always included.
          </p>
        </>
      )}

      <div className="flex-1" />

      {!detecting && !detectError ? (
        <div className="sticky bottom-4 mt-8 flex flex-col items-center gap-2">
          <button
            type="button"
            disabled={ingredients.length === 0 || generating}
            onClick={generate}
            className="btn-primary h-[56px] w-full text-[16px]"
          >
            {generating ? (
              "Generating…"
            ) : (
              <>
                <Icon name="sparkle" size={16} /> Generate {isPro ? "recipe" : "3 recipes"}
              </>
            )}
          </button>
          <p className="text-[12px] text-[var(--text-alpha-45)]">
            Uses 1 generation{remaining !== null ? ` · ${remaining} of ${usageLimit} left this month` : " · Pro · unlimited"}
          </p>
        </div>
      ) : null}
    </div>
  );
}
