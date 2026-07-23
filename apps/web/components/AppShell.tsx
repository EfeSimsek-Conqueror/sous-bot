"use client";

// Root auth gate. Every route in the app is behind sign-in (the PRD flow
// starts at Welcome); this is the single place that decides Welcome vs. the
// real app tree so individual pages don't each need the check.
import { useAuth } from "../lib/auth/auth-context";
import { LandingPage } from "./LandingPage";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="wordmark text-[var(--text-alpha-40)]">Sousbot</p>
      </div>
    );
  }

  if (!session) {
    return <LandingPage />;
  }

  return <>{children}</>;
}
