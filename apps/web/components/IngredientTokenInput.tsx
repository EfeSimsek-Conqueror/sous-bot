"use client";

import { useState } from "react";
import { IngredientChip } from "./IngredientChip";

// Compound-input affordance: card containing already-added chips + an
// inline text field, per DESIGN.md §5 "Ingredient token input (web)".
export function IngredientTokenInput({
  value,
  onChange,
  placeholder = "type an ingredient…",
  footer,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Diet-flags note + submit CTA, rendered inside the same card below a
   * hairline divider — per DESIGN.md §5 "Ingredient token input (web)": one
   * compound card, not loose sibling elements. */
  footer?: React.ReactNode;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const cleaned = draft.trim().toLowerCase();
    if (cleaned && !value.includes(cleaned)) onChange([...value, cleaned]);
    setDraft("");
  }

  return (
    <div className="glass-panel flex flex-col rounded-[var(--radius-card-lg)] p-4">
      <div className="flex flex-wrap gap-2">
        {value.map((ing) => (
          <IngredientChip key={ing} label={ing} onRemove={() => onChange(value.filter((v) => v !== ing))} />
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={commit}
          placeholder={placeholder}
          aria-label="Type an ingredient"
          className="min-w-[140px] flex-1 bg-transparent py-1.5 text-[14.5px] text-[var(--text-base)] outline-none placeholder:text-[var(--text-alpha-40)]"
        />
      </div>
      {footer ? (
        <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3.5" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          {footer}
        </div>
      ) : null}
    </div>
  );
}
