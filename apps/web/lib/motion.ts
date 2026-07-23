// Shared motion constants + prefers-reduced-motion helper. CSS already
// zeroes all transition/animation durations globally under
// `@media (prefers-reduced-motion: reduce)` (see app/globals.css), this
// helper lets JS-driven gesture code (swipe snap timers, sheet dismiss
// timers) agree with that so we never sit around waiting on a transition
// that visually already finished instantly.
export const DURATION_MICRO = 250;
export const DURATION_SCREEN = 400;
export const EASE_ORGANIC = "cubic-bezier(0.22, 1, 0.36, 1)";

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function transitionMs(defaultMs: number): number {
  return prefersReducedMotion() ? 0 : defaultMs;
}
