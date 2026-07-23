"use client";

// Native-feeling horizontal swipe-to-navigate between the 5 main tabs
// (Home / Planner / Library / List / Profile, per DESIGN.md §7 nav order).
// Follows the finger during drag, snaps on release based on distance OR
// velocity, and deliberately backs off when:
//   - the initial gesture is more vertical than horizontal (don't fight
//     vertical page scroll), or
//   - the gesture starts inside an element marked `data-no-swipe` (don't
//     hijack horizontal scroll inside carousels / filter-pill rows).
// Works with mouse (pointer events) as well as touch.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { transitionMs } from "../motion";

export const TAB_ROUTES = ["/", "/planner", "/library", "/list", "/profile"] as const;

const DIRECTION_LOCK_PX = 8;
const DISTANCE_THRESHOLD_RATIO = 0.22; // fraction of container width
const VELOCITY_THRESHOLD = 0.55; // px/ms

type LockState = "undetermined" | "horizontal" | "vertical";

export function useSwipeTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const activeIndex = Math.max(0, TAB_ROUTES.indexOf(pathname as (typeof TAB_ROUTES)[number]));

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dragPx, setDragPx] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.offsetWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const gesture = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastT: number;
    velocity: number;
    lock: LockState;
  } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isAnimating) return;
      const target = e.target as HTMLElement;
      if (target.closest("[data-no-swipe]")) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      gesture.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastT: performance.now(),
        velocity: 0,
        lock: "undetermined",
      };
    },
    [isAnimating],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const g = gesture.current;
      if (!g || g.pointerId !== e.pointerId) return;

      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;

      if (g.lock === "undetermined") {
        if (Math.abs(dx) < DIRECTION_LOCK_PX && Math.abs(dy) < DIRECTION_LOCK_PX) return;
        if (Math.abs(dy) > Math.abs(dx)) {
          g.lock = "vertical";
          gesture.current = null;
          return;
        }
        g.lock = "horizontal";
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      }
      if (g.lock !== "horizontal") return;

      e.preventDefault();
      const now = performance.now();
      const dt = now - g.lastT || 1;
      g.velocity = (e.clientX - g.lastX) / dt;
      g.lastX = e.clientX;
      g.lastT = now;

      // Rubber-band resistance at the first/last tab.
      let offset = dx;
      const atLeftEdge = activeIndex === 0 && dx > 0;
      const atRightEdge = activeIndex === TAB_ROUTES.length - 1 && dx < 0;
      if (atLeftEdge || atRightEdge) offset = dx * 0.35;

      setDragPx(offset);
    },
    [activeIndex],
  );

  const endGesture = useCallback(() => {
    const g = gesture.current;
    gesture.current = null;
    if (!g || g.lock !== "horizontal") {
      setDragPx(0);
      return;
    }

    const width = containerRef.current?.offsetWidth ?? 1;
    const distanceRatio = Math.abs(dragPx) / width;
    const fastEnough = Math.abs(g.velocity) > VELOCITY_THRESHOLD;
    const pastThreshold = distanceRatio > DISTANCE_THRESHOLD_RATIO || fastEnough;

    let newIndex = activeIndex;
    if (pastThreshold) {
      if (dragPx < 0 && activeIndex < TAB_ROUTES.length - 1) newIndex = activeIndex + 1;
      else if (dragPx > 0 && activeIndex > 0) newIndex = activeIndex - 1;
    }

    setIsAnimating(true);
    if (newIndex !== activeIndex) {
      const target = (activeIndex - newIndex) * width;
      setDragPx(target);
      const ms = transitionMs(300);
      window.setTimeout(() => {
        router.push(TAB_ROUTES[newIndex]);
        // Reset offset without a visible jump: the base transform (driven by
        // the new pathname's activeIndex) now already equals this resting
        // position, so snapping dragPx back to 0 in the same frame is a no-op
        // visually.
        setDragPx(0);
        setIsAnimating(false);
      }, ms);
    } else {
      const ms = transitionMs(250);
      setDragPx(0);
      window.setTimeout(() => setIsAnimating(false), ms);
    }
  }, [activeIndex, dragPx, router]);

  const onPointerUp = useCallback(() => endGesture(), [endGesture]);
  const onPointerCancel = useCallback(() => endGesture(), [endGesture]);

  // Reset drag state on hard navigation (e.g. tapping a tab bar icon).
  useEffect(() => {
    setDragPx(0);
  }, [pathname]);

  return {
    containerRef,
    containerWidth,
    activeIndex,
    dragPx,
    isDragging: gesture.current?.lock === "horizontal",
    isAnimating,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}
