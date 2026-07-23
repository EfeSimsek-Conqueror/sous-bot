"use client";

// Shopping list tab (10-ios-shopping-list / 15-android-shopping-list).
// Reads/writes `shopping_list_items` directly (RLS-scoped) — no Edge
// Function involved, this table is populated by /generate-meal-plan and by
// the "Add N missing to shopping list" action on the recipe-detail screen.
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth/auth-context";
import { supabase } from "../../lib/supabase/client";
import type { ShoppingListItemRow } from "../../lib/types/db";
import { Icon } from "../Icon";
import { LoadingBlock, EmptyBlock, ErrorBlock } from "../StateViews";
import { useToast } from "../Toast";

export function ListTab() {
  const { user } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState<ShoppingListItemRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  async function load() {
    if (!user) return;
    setError(null);
    const { data, error: err } = await supabase
      .from("shopping_list_items")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (err) setError(err.message);
    else setItems((data as ShoppingListItemRow[]) ?? []);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function toggle(item: ShoppingListItemRow) {
    setItems((prev) => (prev ?? []).map((i) => (i.id === item.id ? { ...i, checked: !i.checked } : i)));
    const { error: err } = await supabase
      .from("shopping_list_items")
      .update({ checked: !item.checked })
      .eq("id", item.id);
    if (err) {
      toast.show("Couldn't update that item", "error");
      void load();
    }
  }

  async function addCustomItem() {
    const name = draft.trim();
    if (!name || !user) {
      setAdding(false);
      return;
    }
    setDraft("");
    setAdding(false);
    const { data, error: err } = await supabase
      .from("shopping_list_items")
      .insert({ user_id: user.id, name, checked: false, source_plan_id: null })
      .select("*")
      .single();
    if (err) {
      toast.show("Couldn't add that item", "error");
      return;
    }
    setItems((prev) => [...(prev ?? []), data as ShoppingListItemRow]);
  }

  const planItems = (items ?? []).filter((i) => i.source_plan_id);
  const ownItems = (items ?? []).filter((i) => !i.source_plan_id);
  const total = (items ?? []).length;
  const checkedCount = (items ?? []).filter((i) => i.checked).length;

  return (
    <div>
      <h1 className="font-display text-[28px] text-[var(--text-primary)] md:text-[36px]">Shopping list</h1>
      <p className="mt-1 text-[13px] text-[var(--text-alpha-55)]">
        {total > 0 ? `${total} items · ${checkedCount} in cart` : "Nothing on your list yet"}
      </p>

      <div className="mt-5 flex flex-col gap-6">
        {error ? (
          <ErrorBlock subtitle={error} />
        ) : items === null ? (
          <LoadingBlock label="Loading your list…" />
        ) : total === 0 ? (
          <EmptyBlock
            icon="cart"
            title="Your list is empty"
            subtitle="Generate a meal plan or add missing ingredients from a recipe to fill it in."
          />
        ) : (
          <>
            {planItems.length > 0 ? <ItemSection label="From your plan" items={planItems} onToggle={toggle} /> : null}
            {ownItems.length > 0 ? <ItemSection label="Added by you" items={ownItems} onToggle={toggle} /> : null}
          </>
        )}

        {adding ? (
          <div className="glass-panel flex items-center gap-2 rounded-[var(--radius-full)] px-4 py-2.5">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void addCustomItem();
                if (e.key === "Escape") {
                  setAdding(false);
                  setDraft("");
                }
              }}
              onBlur={() => void addCustomItem()}
              placeholder="Item name…"
              aria-label="New shopping list item"
              className="min-w-0 flex-1 bg-transparent text-[14.5px] text-[var(--text-base)] outline-none placeholder:text-[var(--text-alpha-40)]"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="chip chip-dashed w-full justify-center py-3"
          >
            <Icon name="plus" size={14} strokeWidth={2.2} />
            Add your own item
          </button>
        )}

        <p className="text-center text-[11.5px] text-[var(--text-alpha-40)]">Synced across web, iOS &amp; Android</p>
      </div>
    </div>
  );
}

function ItemSection({
  label,
  items,
  onToggle,
}: {
  label: string;
  items: ShoppingListItemRow[];
  onToggle: (item: ShoppingListItemRow) => void;
}) {
  return (
    <section>
      <p className="text-label-xs mb-2 text-[var(--text-alpha-45)]">{label}</p>
      <div className="glass-panel divide-y overflow-hidden rounded-[var(--radius-list)]" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3 px-4 py-3.5" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <button
              type="button"
              onClick={() => onToggle(item)}
              aria-pressed={item.checked}
              aria-label={item.checked ? `Mark ${item.name} as not bought` : `Mark ${item.name} as bought`}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[8px] border-[1.5px]"
              style={
                item.checked
                  ? { background: "var(--accent)", borderColor: "var(--accent)", color: "var(--on-accent)" }
                  : { borderColor: "var(--text-alpha-40)", color: "transparent" }
              }
            >
              <Icon name="check" size={14} strokeWidth={2.4} />
            </button>
            <span
              className="flex-1 text-[14.5px]"
              style={
                item.checked
                  ? { color: "var(--text-alpha-40)", textDecoration: "line-through" }
                  : { color: "var(--text-base)" }
              }
            >
              {item.name}
              {item.quantity ? `, ${item.quantity}${item.unit ? ` ${item.unit}` : ""}` : item.unit ? `, ${item.unit}` : ""}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
