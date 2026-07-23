"use client";

// Auth is mocked per the task brief: the Google/Apple buttons are styled
// exactly as designed but skip straight to a real Supabase session so the
// rest of the app has a real user_id and real data to work against.
//
// TODO(real-auth): wire actual Google/Apple OAuth via supabase.auth.signInWithOAuth
// once credentials exist. Today both buttons call `mockSignIn()`, which uses
// supabase.auth.signInAnonymously() — a real Supabase Auth user, real JWT,
// real RLS-scoped rows (the `handle_new_user` trigger provisions `profiles`
// + `subscriptions` rows exactly like a real sign-up would).

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../supabase/client";
import type { ProfileRow, SubscriptionRow } from "../types/db";
import { FREE_MONTHLY_GENERATION_LIMIT, currentPeriod } from "../usage";

interface AuthContextValue {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: ProfileRow | null;
  subscription: SubscriptionRow | null;
  isPro: boolean;
  usageUsed: number;
  usageLimit: number | null;
  usageRemaining: number | null;
  mockSignIn: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshUsage: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [usageUsed, setUsageUsed] = useState(0);

  const loadProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    setProfile((data as ProfileRow) ?? null);
  }, []);

  const loadSubscription = useCallback(async (userId: string) => {
    const { data } = await supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle();
    setSubscription((data as SubscriptionRow) ?? null);
  }, []);

  const loadUsage = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("usage_counters")
      .select("generation_count")
      .eq("user_id", userId)
      .eq("period", currentPeriod())
      .maybeSingle();
    setUsageUsed((data as { generation_count: number } | null)?.generation_count ?? 0);
  }, []);

  const loadAll = useCallback(
    async (userId: string) => {
      await Promise.all([loadProfile(userId), loadSubscription(userId), loadUsage(userId)]);
    },
    [loadProfile, loadSubscription, loadUsage],
  );

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) await loadAll(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        await loadAll(newSession.user.id);
      } else {
        setProfile(null);
        setSubscription(null);
        setUsageUsed(0);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadAll]);

  const mockSignIn = useCallback(async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    if (data.user) await loadAll(data.user.id);
  }, [loadAll]);

  // Real Google OAuth (PKCE). Redirects the browser to Google; on return to
  // the app the ?code is exchanged automatically (detectSessionInUrl) and
  // onAuthStateChange loads the profile. redirectTo must be in the Supabase
  // Auth "Redirect URLs" allowlist.
  const signInWithGoogle = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const refreshUsage = useCallback(async () => {
    if (session?.user) await loadUsage(session.user.id);
  }, [session, loadUsage]);

  const isPro = subscription?.status === "pro" || subscription?.status === "grace";
  const usageLimit = isPro ? null : FREE_MONTHLY_GENERATION_LIMIT;
  const usageRemaining = usageLimit === null ? null : Math.max(0, usageLimit - usageUsed);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      subscription,
      isPro,
      usageUsed,
      usageLimit,
      usageRemaining,
      mockSignIn,
      signInWithGoogle,
      signOut,
      refreshProfile,
      refreshUsage,
    }),
    [loading, session, profile, subscription, isPro, usageUsed, usageLimit, usageRemaining, mockSignIn, signInWithGoogle, signOut, refreshProfile, refreshUsage],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
