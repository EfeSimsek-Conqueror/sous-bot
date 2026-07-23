import type { Macros } from "../lib/types/db";

// 4-up KCAL/PROTEIN/CARBS/FAT row — the canonical macro display (DESIGN.md
// §5 "Macro/nutrition displays"). Protein is always the visually promoted
// tile (accent-colored number + tinted tile).
export function MacroStats({ macros }: { macros: Macros | null }) {
  if (!macros) return null;
  const tiles: Array<{ label: string; value: string; promoted?: boolean }> = [
    { label: "kcal", value: `${Math.round(macros.calories)}` },
    { label: "protein", value: `${Math.round(macros.protein_g)}g`, promoted: true },
    { label: "carbs", value: `${Math.round(macros.carbs_g)}g` },
    { label: "fat", value: `${Math.round(macros.fat_g)}g` },
  ];
  return (
    <div className="grid grid-cols-4 gap-2.5">
      {tiles.map((t) => (
        <div
          key={t.label}
          className="flex flex-col items-center gap-1 rounded-[var(--radius-tile)] py-3.5"
          style={
            t.promoted
              ? { background: "var(--accent-alpha-14)", border: "1px solid var(--accent-alpha-30)" }
              : { background: "var(--panel-bg-low)", border: "1px solid var(--border-subtle)" }
          }
        >
          <span
            className="text-[17px] font-bold"
            style={{ color: t.promoted ? "var(--accent)" : "var(--text-primary)" }}
          >
            {t.value}
          </span>
          <span className="text-label-xs text-[var(--text-alpha-45)]">{t.label}</span>
        </div>
      ))}
    </div>
  );
}
