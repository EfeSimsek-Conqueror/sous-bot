import type { ImageStatus } from "../lib/types/db";

// The striped diagonal placeholder IS the loading-state component per
// DESIGN.md §5 "Async image placeholder" — there's no spinner/skeleton
// anywhere in the source doc. Used for both user-uploaded fridge photos
// and AI-generated dish photos (Pro-only, fills in async).
export function DishPhoto({
  url,
  status,
  caption,
  className = "",
}: {
  url: string | null;
  status: ImageStatus;
  caption?: string;
  className?: string;
}) {
  if (url && status === "ready") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={`object-cover ${className}`} />;
  }
  return (
    <div className={`placeholder-stripe relative flex items-center justify-center ${className}`}>
      {caption ? (
        <span className="font-mono text-[9.5px] text-[var(--text-alpha-40)]">{caption}</span>
      ) : null}
      {status === "pending" ? (
        <span
          className="absolute bottom-2 right-2 rounded-full px-2.5 py-1 text-[9.5px] font-semibold"
          style={{ background: "rgba(0,0,0,0.4)", color: "var(--accent-light)" }}
        >
          generating…
        </span>
      ) : null}
    </div>
  );
}
