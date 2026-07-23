"use client";

// The shell for the 5 swipeable main tabs (Home / Planner / Library / List
// / Profile). All 5 tab bodies are mounted simultaneously in a horizontal
// track so a swipe gesture can show real content following the finger
// (see lib/hooks/useSwipeTabs.ts for the gesture logic) — exactly like a
// native app's tab view, not a simulated preview.
//
// Layout: floating glass bottom tab bar on mobile (per 02-ios-home-glass),
// fixed left sidebar on desktop (per 07/17/18-web-*). Same 5-route order
// drives both.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth/auth-context";
import { TABS } from "../lib/nav";
import { useSwipeTabs } from "../lib/hooks/useSwipeTabs";
import { Icon } from "./Icon";
import { UsageMeter } from "./UsageMeter";
import { HomeTab } from "./tabs/HomeTab";
import { PlannerTab } from "./tabs/PlannerTab";
import { LibraryTab } from "./tabs/LibraryTab";
import { ListTab } from "./tabs/ListTab";
import { ProfileTab } from "./tabs/ProfileTab";

const TAB_BODIES = [HomeTab, PlannerTab, LibraryTab, ListTab, ProfileTab];

export function MainTabs() {
  const { containerRef, containerWidth, activeIndex, dragPx, handlers } = useSwipeTabs();
  const width = containerWidth || (typeof window !== "undefined" ? window.innerWidth : 400);
  const base = -activeIndex * width;

  return (
    <div className="flex min-h-dvh">
      <Sidebar activeIndex={activeIndex} />
      <div
        ref={containerRef}
        className="relative flex-1 touch-pan-y overflow-hidden"
        {...handlers}
      >
        <div
          className="flex h-full"
          style={{
            width: width * TAB_BODIES.length,
            transform: `translateX(${base + dragPx}px)`,
          }}
        >
          {TAB_BODIES.map((Body, i) => (
            <div
              key={i}
              className="h-full flex-none overflow-y-auto overscroll-contain px-5 pb-[140px] pt-[calc(env(safe-area-inset-top)+28px)] md:px-10 md:pb-14 md:pt-10"
              style={{ width }}
              aria-hidden={i !== activeIndex}
            >
              <div className="mx-auto w-full max-w-[560px] md:max-w-[1080px]">
                <Body />
              </div>
            </div>
          ))}
        </div>
      </div>
      <BottomTabBar activeIndex={activeIndex} />
    </div>
  );
}

function BottomTabBar({ activeIndex }: { activeIndex: number }) {
  return (
    <nav
      className="glass-nav fixed inset-x-4 bottom-4 z-40 flex h-[66px] items-center justify-around rounded-full md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Main navigation"
    >
      {TABS.map((tab, i) => {
        const active = i === activeIndex;
        return (
          <Link
            key={tab.path}
            href={tab.path}
            className="flex flex-col items-center gap-1 px-2 text-[10px] font-semibold"
            style={{ color: active ? "var(--accent)" : "var(--text-alpha-55)" }}
            aria-current={active ? "page" : undefined}
          >
            <Icon name={tab.icon} size={21} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Sidebar({ activeIndex }: { activeIndex: number }) {
  const router = useRouter();
  const { profile, isPro, usageUsed, usageLimit, signOut } = useAuth();
  return (
    <aside
      className="sticky top-0 hidden h-dvh flex-col justify-between border-r px-5 py-7 md:flex"
      style={{ width: "var(--sidebar-width)", borderColor: "rgba(255,255,255,0.08)" }}
    >
      <div>
        <Link href="/" className="wordmark mb-8 block text-[var(--text-primary)]">
          Sousbot
        </Link>
        <div className="flex flex-col gap-1">
          {TABS.map((tab, i) => {
            const active = i === activeIndex;
            return (
              <Link
                key={tab.path}
                href={tab.path}
                className="flex items-center gap-3 rounded-full px-4 py-2.5 text-[14.5px] font-semibold transition-colors"
                style={
                  active
                    ? { background: "var(--accent-alpha-14)", color: "var(--accent)" }
                    : { color: "var(--text-alpha-65)" }
                }
              >
                <Icon name={tab.icon} size={19} />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="glass-panel rounded-[var(--radius-card-md)] p-4">
          <UsageMeter used={usageUsed} limit={usageLimit} compact />
          {!isPro ? (
            <button
              type="button"
              onClick={() => router.push("/paywall")}
              className="btn-primary mt-3 w-full py-2.5 text-[13.5px]"
            >
              Go Pro
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="flex items-center gap-2.5 rounded-full px-3 py-2 text-left text-[13px] font-semibold text-[var(--text-alpha-65)] hover:text-[var(--text-primary)]"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold"
            style={{ background: "var(--accent-subtle-bg-dark)", color: "var(--accent-light)" }}
          >
            {(profile?.display_name ?? "S")[0]?.toUpperCase()}
          </span>
          {profile?.display_name ?? "Signed in"}
        </button>
      </div>
    </aside>
  );
}
