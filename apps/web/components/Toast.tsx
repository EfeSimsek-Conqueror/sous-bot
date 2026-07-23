"use client";

// No toast/snackbar component exists in the source doc at all (DESIGN.md
// §5 "Toasts" — flagged gap). Invented fresh using the existing glass-chip
// visual language: small pill, glass blur, auto-dismiss.

import { createContext, useCallback, useContext, useRef, useState } from "react";

interface ToastItem {
  id: number;
  message: string;
  tone: "default" | "error" | "success";
}

interface ToastContextValue {
  show: (message: string, tone?: ToastItem["tone"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const show = useCallback((message: string, tone: ToastItem["tone"] = "default") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+96px)] z-[100] flex flex-col items-center gap-2 px-5">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="glass-nav pointer-events-auto max-w-[420px] rounded-full px-5 py-3 text-[13.5px] font-semibold text-[var(--text-primary)] shadow-lg"
            style={{
              borderColor: t.tone === "error" ? "var(--pro-tint-border)" : undefined,
              color: t.tone === "error" ? "var(--pro-dark)" : t.tone === "success" ? "var(--accent)" : undefined,
              animation: "toast-in 220ms var(--ease-organic)",
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
      <style jsx global>{`
        @keyframes toast-in {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
