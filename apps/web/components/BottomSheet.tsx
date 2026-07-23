"use client";

// Swipe-dismissible bottom sheet. The doc has no true sheet component to
// extract (see DESIGN.md §5 "Drawers / sheets / modals" — flagged gap), so
// the visual language (glass panel, hairline border, pill grab handle) is
// invented fresh, consistent with the rest of the system. Drag the handle
// down to dismiss: follows the finger, velocity/threshold-based snap back
// or close.

import { useCallback, useEffect, useRef, useState } from "react";
import { transitionMs } from "../lib/motion";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const CLOSE_DISTANCE_RATIO = 0.28;
const CLOSE_VELOCITY = 0.6;

export function BottomSheet({ open, onClose, title, children }: BottomSheetProps) {
  const [dragY, setDragY] = useState(0);
  const [closing, setClosing] = useState(false);
  const [mounted, setMounted] = useState(open);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const gesture = useRef<{ startY: number; lastY: number; lastT: number; velocity: number } | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      setDragY(0);
    }
  }, [open]);

  const doClose = useCallback(() => {
    setClosing(true);
    const height = sheetRef.current?.offsetHeight ?? 400;
    setDragY(height);
    const ms = transitionMs(280);
    window.setTimeout(() => {
      setMounted(false);
      setDragY(0);
      setClosing(false);
      onClose();
    }, ms);
  }, [onClose]);

  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    gesture.current = { startY: e.clientY, lastY: e.clientY, lastT: performance.now(), velocity: 0 };
  }, []);

  const onHandlePointerMove = useCallback((e: React.PointerEvent) => {
    const g = gesture.current;
    if (!g) return;
    const dy = Math.max(0, e.clientY - g.startY); // only allow downward drag
    const now = performance.now();
    const dt = now - g.lastT || 1;
    g.velocity = (e.clientY - g.lastY) / dt;
    g.lastY = e.clientY;
    g.lastT = now;
    setDragY(dy);
  }, []);

  const onHandlePointerUp = useCallback(() => {
    const g = gesture.current;
    gesture.current = null;
    if (!g) return;
    const height = sheetRef.current?.offsetHeight ?? 400;
    const ratio = dragY / height;
    if (ratio > CLOSE_DISTANCE_RATIO || g.velocity > CLOSE_VELOCITY) {
      doClose();
    } else {
      setDragY(0);
    }
  }, [dragY, doClose]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        style={{
          opacity: closing ? 0 : Math.max(0, 1 - dragY / 300),
          transition: gesture.current ? "none" : `opacity ${transitionMs(280)}ms var(--ease-organic)`,
        }}
        onClick={doClose}
        aria-hidden
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass-hero relative w-full max-w-[520px] rounded-t-[28px] rounded-b-none px-5 pt-3"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: gesture.current ? "none" : `transform ${transitionMs(280)}ms var(--ease-organic)`,
          maxHeight: "85vh",
          overflowY: "auto",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 32px)",
        }}
      >
        <div
          className="mx-auto mb-4 flex h-6 w-full cursor-grab touch-none items-center justify-center active:cursor-grabbing"
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
        >
          <div className="h-[5px] w-11 rounded-full" style={{ background: "rgba(255,255,255,0.28)" }} />
        </div>
        {title ? <h2 className="font-display mb-3 text-[22px] text-[var(--text-primary)]">{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}
