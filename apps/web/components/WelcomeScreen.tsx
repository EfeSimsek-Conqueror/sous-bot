"use client";

// Entry screen (01-ios-welcome-glass). Auth is mocked per the task brief:
// both buttons call the same mockSignIn() (anonymous Supabase session, real
// user_id) and skip straight into the app. TODO(real-auth): swap in
// supabase.auth.signInWithOAuth("google" | "apple") once credentials exist.

import { useState } from "react";
import { useAuth } from "../lib/auth/auth-context";
import { useToast } from "./Toast";

export function WelcomeScreen() {
  const { mockSignIn } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState<"apple" | "google" | null>(null);

  async function handleSignIn(via: "apple" | "google") {
    setBusy(via);
    try {
      await mockSignIn();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Sign-in failed", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden px-6 pb-10 pt-[calc(env(safe-area-inset-top)+28px)]">
      <div className="bloom-accent-lg pointer-events-none absolute -right-20 -top-28 h-96 w-96 rounded-full" aria-hidden />
      <div className="bloom-pro-lg pointer-events-none absolute -bottom-28 -left-20 h-96 w-96 rounded-full" aria-hidden />

      <div className="relative mx-auto flex w-full max-w-[420px] flex-1 flex-col">
        <p className="wordmark text-[var(--text-base)]">Sousbot</p>

        <div className="glass-panel relative mt-10 flex h-64 items-center justify-center rounded-[var(--radius-hero-lg)] px-6 text-center">
          <span className="font-mono text-[13px] text-[var(--text-alpha-40)]">
            looping demo · fridge photo → plated dish
          </span>
        </div>

        <h1 className="font-display mt-12 text-[42px] leading-[1.08] text-[var(--text-primary)]">
          What&apos;s for dinner,
          <br />
          <span className="italic text-[var(--accent)]">solved.</span>
        </h1>
        <p className="mt-4 text-[15px] leading-[1.5] text-[var(--text-alpha-65)]">
          Snap your fridge. Get recipes you can actually cook, with macros — in seconds.
        </p>

        <div className="flex-1" />

        <div className="mt-10 flex flex-col gap-3">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => handleSignIn("apple")}
            className="btn-cream h-[56px] w-full text-[16px]"
          >
            {busy === "apple" ? "Signing in…" : "Continue with Apple"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => handleSignIn("google")}
            className="btn-secondary h-[56px] w-full text-[16px]"
          >
            {busy === "google" ? "Signing in…" : "Continue with Google"}
          </button>
          <p className="mt-2 text-center text-[12.5px] text-[var(--text-alpha-40)]">
            No password needed · Terms &amp; Privacy
          </p>
        </div>
      </div>
    </div>
  );
}
