"use client";

// Scroll-triggered reveal wrapper (IntersectionObserver). Children fade+rise
// in once as they enter the viewport. Honors prefers-reduced-motion via the
// CSS in globals.css (.lp-reveal collapses to a no-op there). `delay` staggers
// grouped items; `as` lets callers keep semantic tags (section, li, etc.).

import { useEffect, useRef, useState, type ElementType } from "react";

export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  as?: ElementType;
  className?: string;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;

    // No IntersectionObserver (old/edge browsers, some headless envs) → just show.
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);

    // Safety net: if the observer never reports (virtual-time capture, throttled
    // background tab, etc.), reveal anyway so content is never stuck hidden.
    const fallback = window.setTimeout(() => setShown(true), 1800);

    return () => {
      io.disconnect();
      window.clearTimeout(fallback);
    };
  }, [shown]);

  return (
    <Tag
      ref={ref}
      className={`lp-reveal ${shown ? "is-in" : ""} ${className}`}
      style={{ ["--d" as string]: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
