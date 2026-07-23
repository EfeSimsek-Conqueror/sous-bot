"use client";

// Sign-in modal opened from the landing's "Get started" CTA. Continue with
// Google is real OAuth (PKCE via auth-context.signInWithGoogle); Apple is
// intentionally disabled with a "Coming soon" label until Apple sign-in is
// wired. Styled to match the landing's dark-warm glass palette.

import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth/auth-context";
import { useToast } from "./Toast";

const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

const AppleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.09-2.01-3.76-2.04-1.6-.16-3.12.94-3.93.94-.81 0-2.06-.92-3.39-.9-1.74.03-3.35 1.01-4.25 2.57-1.81 3.14-.46 7.79 1.3 10.34.86 1.25 1.88 2.65 3.22 2.6 1.29-.05 1.78-.84 3.34-.84 1.56 0 2 .84 3.37.81 1.39-.02 2.27-1.27 3.12-2.53.98-1.45 1.39-2.85 1.41-2.93-.03-.01-2.71-1.04-2.74-4.12M14.63 4.6c.71-.86 1.19-2.06 1.06-3.25-1.02.04-2.26.68-2.99 1.54-.66.76-1.23 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.44" />
  </svg>
);

export function SignInSheet({ onClose }: { onClose: () => void }) {
  const { signInWithGoogle } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  // Close on Escape; lock background scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function google() {
    if (busy) return;
    setBusy(true);
    try {
      await signInWithGoogle(); // redirects away on success
    } catch (err) {
      setBusy(false);
      toast.show(
        err instanceof Error ? err.message : "Couldn't start Google sign-in — try again",
        "error"
      );
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "grid",
        placeItems: "center",
        padding: "24px",
        background: "rgba(12, 9, 8, 0.66)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Sign in to Sousbot"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative",
          width: "min(400px, 100%)",
          boxSizing: "border-box",
          padding: "34px 30px 26px",
          borderRadius: "24px",
          background: "linear-gradient(170deg, rgba(38,29,23,0.98), rgba(26,20,17,0.98))",
          border: "1px solid rgba(214,141,80,0.28)",
          boxShadow: "0 40px 90px rgba(0,0,0,0.6)",
          color: "#F3E9DE",
          fontFamily: "var(--font-ui), system-ui, sans-serif",
          display: "grid",
          gap: "22px",
          justifyItems: "center",
          textAlign: "center",
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "14px",
            right: "14px",
            width: "30px",
            height: "30px",
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
            background: "rgba(243,233,222,0.08)",
            color: "#B5A493",
            fontSize: "16px",
            lineHeight: 1,
          }}
        >
          ✕
        </button>

        <div style={{ display: "grid", gap: "12px", justifyItems: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "12px",
              background: "linear-gradient(145deg, #DE9A5E, #C97F41)",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 6px 18px rgba(214,141,80,0.35)",
            }}
          >
            <svg width="30" height="30" viewBox="10 2 80 88" fill="none" aria-hidden="true" style={{ display: "block", color: "#FFF7EF" }}>
              <path d="M40 8c-5 6 5 11 0 18" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
              <path d="M60 8c-5 6 5 11 0 18" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
              <rect x="20" y="33" width="60" height="7" rx="3.5" fill="currentColor" />
              <path d="M26 46h48v20a14 14 0 0 1-14 14H40a14 14 0 0 1-14-14z" fill="currentColor" />
              <rect x="14" y="50" width="7" height="12" rx="3.5" fill="currentColor" />
              <rect x="79" y="50" width="7" height="12" rx="3.5" fill="currentColor" />
            </svg>
          </div>
          <h2 style={{ margin: 0, fontFamily: "var(--font-display), Georgia, serif", fontWeight: 400, fontSize: "28px", letterSpacing: "-0.01em" }}>
            Sign in to Sousbot
          </h2>
          <p style={{ margin: 0, fontSize: "14.5px", lineHeight: 1.5, color: "#B5A493", maxWidth: "300px" }}>
            Pick up where your fridge left off — recipes, plans, and lists, synced across your devices.
          </p>
        </div>

        <div style={{ display: "grid", gap: "12px", width: "100%" }}>
          <button
            type="button"
            onClick={google}
            disabled={busy}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              width: "100%",
              padding: "13px 18px",
              borderRadius: "999px",
              border: "none",
              cursor: busy ? "wait" : "pointer",
              background: "#FFFFFF",
              color: "#1F1B18",
              fontFamily: "inherit",
              fontSize: "15px",
              fontWeight: 700,
              opacity: busy ? 0.75 : 1,
            }}
          >
            <GoogleG />
            {busy ? "Opening Google…" : "Continue with Google"}
          </button>

          <button
            type="button"
            disabled
            aria-disabled="true"
            title="Apple sign-in is coming soon"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              width: "100%",
              padding: "13px 16px",
              borderRadius: "999px",
              border: "1px solid rgba(243,233,222,0.12)",
              cursor: "not-allowed",
              background: "rgba(243,233,222,0.05)",
              color: "rgba(243,233,222,0.4)",
              fontFamily: "inherit",
              fontSize: "15px",
              fontWeight: 700,
            }}
          >
            <AppleLogo />
            <span style={{ flex: 1, textAlign: "center" }}>Continue with Apple</span>
            <span
              style={{
                flexShrink: 0,
                padding: "3px 9px",
                borderRadius: "999px",
                background: "rgba(214,141,80,0.16)",
                border: "1px solid rgba(214,141,80,0.3)",
                color: "#E5A66F",
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.06em",
              }}
            >
              COMING SOON
            </span>
          </button>
        </div>

        <p style={{ margin: 0, fontSize: "12px", lineHeight: 1.5, color: "#8E7F6F", maxWidth: "300px" }}>
          By continuing you agree to Sousbot&rsquo;s Terms and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
