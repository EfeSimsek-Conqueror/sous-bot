import { Icon } from "./Icon";

interface IngredientChipProps {
  label: string;
  confidence?: number; // 0-100, present => low-confidence styling below 75
  onRemove?: () => void;
}

export function IngredientChip({ label, confidence, onRemove }: IngredientChipProps) {
  const uncertain = typeof confidence === "number" && confidence < 75;
  return (
    <span className={`chip ${uncertain ? "chip-uncertain" : ""}`}>
      <span>
        {label}
        {uncertain ? ` · ${confidence}%?` : ""}
      </span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="flex h-[18px] w-[18px] items-center justify-center rounded-full"
          style={{ background: "rgba(255,255,255,0.14)" }}
        >
          <Icon name="x" size={11} strokeWidth={2} />
        </button>
      ) : null}
    </span>
  );
}

export function AddChip({ label = "Add item", onClick }: { label?: string; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="chip chip-dashed">
      <Icon name="plus" size={14} strokeWidth={2.2} />
      {label}
    </button>
  );
}
