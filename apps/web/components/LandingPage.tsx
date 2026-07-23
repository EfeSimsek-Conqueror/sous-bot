"use client";

/*
 * Sousbot marketing landing — the logged-out root (rendered by AppShell when
 * there's no session). Rebuilt against the landing-page-guide-v2 framework
 * (11 essential elements) but adapted to Sousbot's EXISTING design system —
 * no ShadCN, no new scaffold.
 *
 * DESIGN DIRECTION (committed): "Warm editorial glass."
 *   - Aesthetic: dark, warm, appetite-forward; premium but friendly.
 *   - Type:  Instrument Serif (display, italic accents) + Schibsted Grotesk (UI).
 *   - Color: #D68D50 terracotta accent on a warm near-black; paprika (#D9673D)
 *            as the Pro secondary. NO green survives.
 *   - Motion: one orchestrated hero entrance (staggered lp-enter) + scroll-reveal
 *            fade-ups (Reveal). Subtle float on hero accents. Respects reduced-motion.
 *   - Layout: asymmetric hero, bento media showcase, varied section rhythm.
 *
 * 11 elements → sections here:
 *   1 URL/SEO (layout.tsx metadata) · 2 Header · 3 Hero title · 4 Hero CTA ·
 *   5 Social proof strip · 6 Media showcase (in-app phone mockups) · 7 Features ·
 *   (How-it-works supports 7) · 8 Testimonials · 9 FAQ · 10 Final CTA · 11 Footer.
 *
 * NOTE: testimonials are ILLUSTRATIVE placeholders — swap for real reviews before
 * any paid/public launch push. No fabricated user counts or ratings are shown.
 */

import { useEffect, useState } from "react";
import { useAuth } from "../lib/auth/auth-context";
import { useToast } from "./Toast";
import { Reveal } from "./Reveal";

export function LandingPage() {
  const { mockSignIn } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function enter() {
    setBusy(true);
    try {
      await mockSignIn();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Couldn't start — try again", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-dvh overflow-x-clip">
      <div className="bloom-accent-lg lp-float pointer-events-none absolute right-0 top-0 h-[560px] w-[560px]" aria-hidden />
      <div className="bloom-pro-lg pointer-events-none absolute left-0 top-[38%] h-[520px] w-[520px]" aria-hidden />

      <Header onEnter={enter} busy={busy} />

      <main>
        <Hero onEnter={enter} busy={busy} />
        <SocialProof />
        <Showcase />
        <Features />
        <HowItWorks />
        <Testimonials />
        <Pricing onEnter={enter} busy={busy} />
        <FAQ />
        <FinalCTA onEnter={enter} busy={busy} />
      </main>

      <Footer onEnter={enter} busy={busy} />
    </div>
  );
}

/* ============================ 2 · HEADER ============================ */

function Header({ onEnter, busy }: CTAProps) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        scrolled ? "glass-nav border-b border-white/5" : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex w-full max-w-[1160px] items-center justify-between px-6 py-4 md:px-10">
        <a href="#top" className="wordmark text-[22px] text-[var(--text-primary)]">
          Sousbot
        </a>
        <nav className="hidden items-center gap-8 text-[14.5px] text-[var(--text-alpha-65)] md:flex">
          <a href="#how" className="transition-colors hover:text-[var(--text-primary)]">How it works</a>
          <a href="#features" className="transition-colors hover:text-[var(--text-primary)]">Features</a>
          <a href="#pricing" className="transition-colors hover:text-[var(--text-primary)]">Pricing</a>
          <a href="#faq" className="transition-colors hover:text-[var(--text-primary)]">FAQ</a>
        </nav>
        <button type="button" onClick={onEnter} disabled={busy} className="btn-primary h-10 px-5 text-[14px]">
          {busy ? "Opening…" : "Open app"}
        </button>
      </div>
    </header>
  );
}

/* ====================== 3 · 4 · HERO (title + CTA) ====================== */

function Hero({ onEnter, busy }: CTAProps) {
  return (
    <section
      id="top"
      className="relative mx-auto grid w-full max-w-[1160px] items-center gap-14 px-6 pb-10 pt-10 md:min-h-[660px] md:grid-cols-[1.05fr_0.95fr] md:px-10 md:pt-4"
    >
      <div>
        <span className="lp-enter chip !py-2 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--text-alpha-65)]" style={{ ["--d" as string]: "0ms" }}>
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> AI sous-chef
        </span>

        <h1 className="mt-6 font-display text-[clamp(46px,7.2vw,78px)] leading-[1.0] text-[var(--text-primary)]">
          <span className="lp-enter block" style={{ ["--d" as string]: "80ms" }}>What&apos;s for dinner,</span>
          <span className="lp-enter block italic text-[var(--accent)]" style={{ ["--d" as string]: "200ms" }}>solved.</span>
        </h1>

        <p className="lp-enter mt-6 max-w-[32ch] text-[17px] leading-[1.55] text-[var(--text-alpha-65)] md:text-[19px]" style={{ ["--d" as string]: "320ms" }}>
          Snap a photo of your fridge. Get recipes you can actually cook — with real macros,
          a weekly meal plan, and a shopping list that writes itself. In seconds.
        </p>

        <div className="lp-enter mt-9 flex flex-col gap-3 sm:flex-row" style={{ ["--d" as string]: "440ms" }}>
          <button type="button" onClick={onEnter} disabled={busy} className="btn-primary group h-[56px] px-8 text-[16px]">
            {busy ? "Opening…" : "Get started free"}
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </button>
          <a href="#how" className="btn-secondary h-[56px] px-8 text-[16px]">See how it works</a>
        </div>

        <p className="lp-enter mt-4 text-[13px] text-[var(--text-alpha-40)]" style={{ ["--d" as string]: "560ms" }}>
          No password needed · 10 free recipes a month, no card
        </p>
      </div>

      {/* Inline product proof card */}
      <div className="lp-enter glass-hero relative rounded-[var(--radius-hero-lg)] p-6 md:p-8" style={{ ["--d" as string]: "300ms" }}>
        <div className="flex items-center justify-center gap-5 py-6">
          <Tile><FridgeIcon /></Tile>
          <ArrowIcon />
          <Tile><PlateIcon /></Tile>
        </div>
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-alpha-40)]">
          Fridge photo in · plated dinner out
        </p>
        <div className="glass-panel mt-6 rounded-[var(--radius-card-lg)] p-5">
          <p className="font-display text-[22px] text-[var(--text-primary)]">Garlic Chicken &amp; Rice</p>
          <p className="mt-1 text-[13px] text-[var(--text-alpha-40)]">40 min · serves 4 · one-pan</p>
          <div className="mt-4 grid grid-cols-4 gap-2.5">
            <Macro v="450" k="kcal" />
            <Macro v="45g" k="protein" accent />
            <Macro v="40g" k="carbs" />
            <Macro v="12g" k="fat" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ========================= 5 · SOCIAL PROOF ========================= */

function SocialProof() {
  const stats: [string, string][] = [
    ["< 20s", "photo → 3 recipes"],
    ["0", "ingredients to type"],
    ["10", "free recipes / month"],
    ["3", "platforms · web, iOS, Android"],
  ];
  return (
    <Reveal as="section" className="relative mx-auto w-full max-w-[1160px] px-6 py-8 md:px-10">
      <div className="glass-panel grid grid-cols-2 gap-y-8 rounded-[var(--radius-hero)] px-6 py-9 md:grid-cols-4 md:px-10">
        {stats.map(([big, small]) => (
          <div key={small} className="px-2 text-center md:border-r md:border-white/8 md:last:border-r-0">
            <p className="font-display text-[34px] leading-none text-[var(--accent)] md:text-[40px]">{big}</p>
            <p className="mt-2 text-[13px] text-[var(--text-alpha-65)]">{small}</p>
          </div>
        ))}
      </div>
    </Reveal>
  );
}

/* ===================== 6 · MEDIA SHOWCASE (mockups) ===================== */

function Showcase() {
  return (
    <section className="relative mx-auto w-full max-w-[1160px] px-6 py-20 md:px-10">
      <Reveal>
        <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">The app</p>
        <h2 className="mt-3 max-w-[16ch] font-display text-[clamp(30px,4.4vw,48px)] leading-[1.05] text-[var(--text-primary)]">
          Real recipes, real photos, real macros.
        </h2>
      </Reveal>

      <div className="mt-12 grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        {/* Phone mockup: results screen */}
        <Reveal className="flex justify-center">
          <PhoneFrame>
            <div className="flex items-center gap-3 px-5 pt-6">
              <button className="grid h-9 w-9 place-items-center rounded-full border border-white/12 text-[var(--text-base)]">←</button>
              <p className="font-display text-[22px] text-[var(--text-primary)]">Your recipes</p>
            </div>
            <div className="space-y-3 px-4 pt-4">
              <MiniRecipe title="Garlic Chicken & Rice Skillet" meta="40 min · serves 4" k="450" p="45g" />
              <MiniRecipe title="Garlic Butter Chicken with Rice" meta="40 min · serves 4" k="600" p="60g" />
              <MiniRecipe title="Quick Chicken & Rice Bowl" meta="30 min · serves 3" k="480" p="48g" />
            </div>
          </PhoneFrame>
        </Reveal>

        {/* Bento of floating product cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Reveal delay={0} className="glass-panel rounded-[var(--radius-card-lg)] p-5 sm:col-span-2">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--text-alpha-40)]">Detected from your photo</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {["chicken breast", "rice", "garlic", "olive oil", "cherry tomatoes"].map((x) => (
                <span key={x} className="chip !py-1.5 text-[13px] text-[var(--text-base)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />{x}
                </span>
              ))}
            </div>
          </Reveal>
          <Reveal delay={90} className="glass-panel flex flex-col justify-between rounded-[var(--radius-card-lg)] p-5">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--text-alpha-40)]">Macros, always</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Macro v="450" k="kcal" />
              <Macro v="45g" k="protein" accent />
              <Macro v="40g" k="carbs" />
              <Macro v="12g" k="fat" />
            </div>
          </Reveal>
          <Reveal delay={160} className="glass-panel-high flex flex-col justify-between rounded-[var(--radius-card-lg)] p-5">
            <span className="inline-flex w-fit rounded-full bg-[color-mix(in_srgb,var(--pro-dark)_18%,transparent)] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[var(--pro-dark)]">
              Pro · AI photo
            </span>
            <p className="mt-4 font-display text-[20px] leading-[1.2] text-[var(--text-primary)]">
              A generated photo of the finished dish — every time.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ========================= 7 · FEATURES ========================= */

function Features() {
  const items = [
    { icon: <CameraIcon />, title: "Snap your fridge", body: "Point, shoot, done. Sousbot reads what you have — no typing lists." },
    { icon: <ChartIcon />, title: "Recipes with real macros", body: "Every recipe comes with kcal, protein, carbs and fat you can trust." },
    { icon: <CalendarIcon />, title: "Meal plan + shopping list", body: "A whole week of dinners, and a smart list of only what you're missing." },
    { icon: <WandIcon />, title: "Adapt any recipe", body: "Vegan it, halve it, air-fry it. Sousbot rewrites the recipe to fit." },
  ];
  return (
    <section id="features" className="relative mx-auto w-full max-w-[1160px] px-6 py-20 md:px-10">
      <Reveal>
        <h2 className="max-w-[18ch] font-display text-[clamp(30px,4.4vw,48px)] leading-[1.05] text-[var(--text-primary)]">
          Everything from one photo.
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((f, i) => (
          <Reveal key={f.title} delay={i * 90} className="group glass-panel rounded-[var(--radius-card-lg)] p-6 transition-transform duration-300 hover:-translate-y-1">
            <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-tile)] bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)] transition-transform duration-300 group-hover:scale-110">
              {f.icon}
            </div>
            <h3 className="mt-5 font-display text-[22px] text-[var(--text-primary)]">{f.title}</h3>
            <p className="mt-2 text-[14.5px] leading-[1.5] text-[var(--text-alpha-65)]">{f.body}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ===================== HOW IT WORKS (supports 7) ===================== */

function HowItWorks() {
  const steps = [
    { n: "1", title: "Snap", body: "Take a photo of your fridge or pantry — or just type what you've got." },
    { n: "2", title: "Pick", body: "Get three recipes with macros and an AI photo of the finished dish." },
    { n: "3", title: "Cook", body: "Step-by-step cooking mode keeps the screen awake while you work." },
  ];
  return (
    <section id="how" className="relative mx-auto w-full max-w-[1160px] px-6 py-20 md:px-10">
      <Reveal className="glass-panel rounded-[var(--radius-hero)] px-6 py-14 md:px-14">
        <h2 className="text-center font-display text-[clamp(30px,4.4vw,48px)] text-[var(--text-primary)]">
          Three taps to dinner.
        </h2>
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 110} className="text-center md:text-left">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)] font-display text-[22px] text-[var(--color-on-accent,#2A1B10)] md:mx-0">
                {s.n}
              </div>
              <h3 className="mt-5 font-display text-[24px] text-[var(--text-primary)]">{s.title}</h3>
              <p className="mt-2 text-[15px] leading-[1.55] text-[var(--text-alpha-65)]">{s.body}</p>
            </Reveal>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ========================= 8 · TESTIMONIALS ========================= */
/* PLACEHOLDER voices — replace with real reviews before a public launch push. */

function Testimonials() {
  const quotes = [
    { name: "Maya", role: "cooks for two", initial: "M", body: "I used to stare into the fridge for 20 minutes. Now I snap a photo and dinner's decided before I've put the milk back." },
    { name: "Deniz", role: "gym + meal prep", initial: "D", body: "The macros on every recipe are the whole thing for me. Sunday planner → shopping list → done." },
    { name: "Priya", role: "busy weeknights", initial: "P", body: "\"Adapt this to vegetarian, half the servings\" and it just… does it. Feels like texting a chef." },
  ];
  return (
    <section className="relative mx-auto w-full max-w-[1160px] px-6 py-20 md:px-10">
      <Reveal>
        <h2 className="max-w-[16ch] font-display text-[clamp(30px,4.4vw,48px)] leading-[1.05] text-[var(--text-primary)]">
          Built for real weeknights.
        </h2>
      </Reveal>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        {quotes.map((q, i) => (
          <Reveal key={q.name} delay={i * 90} className="glass-panel flex flex-col rounded-[var(--radius-card-lg)] p-6 transition-transform duration-300 hover:-translate-y-1">
            <div className="flex gap-0.5 text-[var(--accent)]" aria-label="5 out of 5">
              {Array.from({ length: 5 }).map((_, s) => <StarIcon key={s} />)}
            </div>
            <p className="mt-4 flex-1 text-[15.5px] leading-[1.6] text-[var(--text-base)]">{q.body}</p>
            <div className="mt-6 flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] font-display text-[18px] text-[var(--accent)]">
                {q.initial}
              </span>
              <div>
                <p className="text-[14px] font-semibold text-[var(--text-primary)]">{q.name}</p>
                <p className="text-[12.5px] text-[var(--text-alpha-40)]">{q.role}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ========================= 9 (pricing) ========================= */

function Pricing({ onEnter, busy }: CTAProps) {
  return (
    <section id="pricing" className="relative mx-auto w-full max-w-[1160px] px-6 py-20 md:px-10">
      <Reveal className="mx-auto max-w-[560px] text-center">
        <h2 className="font-display text-[clamp(30px,4.4vw,48px)] text-[var(--text-primary)]">
          Start free. Go Pro when you&apos;re hooked.
        </h2>
        <p className="mt-4 text-[16px] text-[var(--text-alpha-65)]">
          10 free recipes a month, on the house. Upgrade for unlimited cooking.
        </p>
      </Reveal>
      <div className="mx-auto mt-10 grid max-w-[820px] gap-4 md:grid-cols-2">
        <Reveal className="glass-panel flex flex-col rounded-[var(--radius-card-lg)] p-7">
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--text-alpha-40)]">Free</p>
          <p className="mt-3 font-display text-[40px] text-[var(--text-primary)]">$0</p>
          <ul className="mt-5 space-y-3 text-[15px] text-[var(--text-alpha-65)]">
            <Bullet>10 recipe generations / month</Bullet>
            <Bullet>Macros on every recipe</Bullet>
            <Bullet>Shopping list</Bullet>
          </ul>
          <button type="button" onClick={onEnter} disabled={busy} className="btn-secondary mt-7 h-[52px] text-[15px]">Get started</button>
        </Reveal>
        <Reveal delay={90} className="glass-panel-high relative flex flex-col rounded-[var(--radius-card-lg)] p-7 ring-1 ring-[color-mix(in_srgb,var(--accent)_45%,transparent)]">
          <div className="absolute right-6 top-6 rounded-full bg-[var(--pro-dark)] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white">Save 37%</div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">Pro</p>
          <p className="mt-3 font-display text-[40px] text-[var(--text-primary)]">
            $5<span className="text-[18px] text-[var(--text-alpha-40)]"> /mo, billed yearly</span>
          </p>
          <ul className="mt-5 space-y-3 text-[15px] text-[var(--text-alpha-65)]">
            <Bullet>Unlimited recipe generations</Bullet>
            <Bullet>AI photos of every dish</Bullet>
            <Bullet>Weekly meal planner</Bullet>
            <Bullet>Adapt any recipe</Bullet>
          </ul>
          <button type="button" onClick={onEnter} disabled={busy} className="btn-primary mt-7 h-[52px] text-[15px]">Start free — upgrade anytime</button>
        </Reveal>
      </div>
    </section>
  );
}

/* ========================= 9 · FAQ ========================= */

function FAQ() {
  const faqs: [string, string][] = [
    ["Do I really just take a photo?", "Yes. Snap your fridge or pantry and Sousbot detects the ingredients for you — no typing. Prefer to type? There's a manual option too."],
    ["Is it free?", "You get 10 recipe generations every month for free, no card required. Pro ($5/mo billed yearly) unlocks unlimited generations, AI dish photos, the weekly meal planner, and recipe adapting."],
    ["Are the macros accurate?", "Every recipe comes with estimated kcal, protein, carbs and fat based on its ingredients and servings. Great for tracking; always sanity-check for strict dietary needs."],
    ["Can it match my diet?", "Set diets (vegetarian, vegan, keto, halal, and more) and hard allergy rules once — they're applied to every recipe. You can also adapt any single recipe on the fly."],
    ["What happens to my photos?", "Fridge photos are used to detect ingredients and are kept private to your account. They're never shown publicly."],
    ["Which devices does it work on?", "Sousbot runs on the web, iOS, and Android — your recipes, plans, and shopping list sync across all of them."],
  ];
  return (
    <section id="faq" className="relative mx-auto w-full max-w-[820px] px-6 py-20 md:px-10">
      <Reveal>
        <h2 className="text-center font-display text-[clamp(30px,4.4vw,48px)] text-[var(--text-primary)]">
          Questions, answered.
        </h2>
      </Reveal>
      <div className="mt-10 space-y-3">
        {faqs.map(([q, a], i) => (
          <Reveal key={q} delay={i * 60}>
            <details className="group glass-panel overflow-hidden rounded-[var(--radius-card-md)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-[16.5px] font-semibold text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]">
                {q}
                <span className="grid h-6 w-6 flex-none place-items-center rounded-full border border-white/15 text-[var(--accent)] transition-transform duration-300 group-open:rotate-45">+</span>
              </summary>
              <p className="px-6 pb-6 text-[15px] leading-[1.6] text-[var(--text-alpha-65)]">{a}</p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ========================= 10 · FINAL CTA ========================= */

function FinalCTA({ onEnter, busy }: CTAProps) {
  return (
    <section className="relative mx-auto w-full max-w-[1160px] px-6 pb-8 md:px-10">
      <Reveal className="glass-hero relative overflow-hidden rounded-[var(--radius-hero)] px-6 py-16 text-center md:py-24">
        <div className="bloom-accent-lg pointer-events-none absolute inset-0" aria-hidden />
        <h2 className="relative font-display text-[clamp(34px,5.4vw,60px)] leading-[1.03] text-[var(--text-primary)]">
          Your fridge already
          <br className="hidden sm:block" /> has dinner.
        </h2>
        <p className="relative mt-4 text-[18px] text-[var(--text-alpha-65)]">Let&apos;s go find it — free, no card.</p>
        <button type="button" onClick={onEnter} disabled={busy} className="btn-primary group relative mt-9 h-[60px] px-12 text-[17px]">
          {busy ? "Opening…" : "Get started free"}
          <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </button>
      </Reveal>
    </section>
  );
}

/* ========================= 11 · FOOTER ========================= */

function Footer({ onEnter, busy }: CTAProps) {
  return (
    <footer className="relative mt-8 border-t border-white/8 bg-black/25">
      <div className="mx-auto grid w-full max-w-[1160px] gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:px-10">
        <div>
          <p className="wordmark text-[22px] text-[var(--text-primary)]">Sousbot</p>
          <p className="mt-3 max-w-[34ch] text-[14px] leading-[1.6] text-[var(--text-alpha-65)]">
            What&apos;s for dinner, solved. AI recipes with real macros from a photo of your fridge.
          </p>
          <button type="button" onClick={onEnter} disabled={busy} className="btn-primary mt-6 h-11 px-6 text-[14px]">
            {busy ? "Opening…" : "Get started free"}
          </button>
        </div>
        <FooterCol title="Product" links={[["How it works", "#how"], ["Features", "#features"], ["Pricing", "#pricing"], ["FAQ", "#faq"]]} />
        <FooterCol title="Company" links={[["Privacy Policy", "#"], ["Terms of Service", "#"], ["Contact", "mailto:hello@sousbot.ai"]]} />
      </div>
      <div className="border-t border-white/8">
        <div className="mx-auto flex w-full max-w-[1160px] flex-col items-center justify-between gap-3 px-6 py-6 text-[13px] text-[var(--text-alpha-40)] md:flex-row md:px-10">
          <span>© {new Date().getFullYear()} Sousbot. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <a href="#" aria-label="X" className="transition-colors hover:text-[var(--accent)]"><XLogo /></a>
            <a href="#" aria-label="Instagram" className="transition-colors hover:text-[var(--accent)]"><IgLogo /></a>
            <a href="mailto:hello@sousbot.ai" aria-label="Email" className="transition-colors hover:text-[var(--accent)]"><MailIcon /></a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--text-alpha-40)]">{title}</p>
      <ul className="mt-4 space-y-2.5 text-[14.5px] text-[var(--text-alpha-65)]">
        {links.map(([label, href]) => (
          <li key={label}>
            <a href={href} className="transition-colors hover:text-[var(--text-primary)]">{label}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ============================ shared bits ============================ */

type CTAProps = { onEnter: () => void; busy: boolean };

function Tile({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[var(--radius-tile)] bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[var(--accent)]">
      {children}
    </div>
  );
}

function Macro({ v, k, accent }: { v: string; k: string; accent?: boolean }) {
  return (
    <div className={`rounded-[var(--radius-card-sm)] border px-2 py-2.5 text-center ${accent ? "border-[color-mix(in_srgb,var(--accent)_50%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]" : "border-white/8 bg-white/[0.03]"}`}>
      <p className={`text-[16px] font-semibold ${accent ? "text-[var(--accent)]" : "text-[var(--text-primary)]"}`}>{v}</p>
      <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--text-alpha-40)]">{k}</p>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <CheckIcon />
      <span>{children}</span>
    </li>
  );
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-[300px] rounded-[42px] border border-white/12 bg-[#15110d] p-2.5 shadow-2xl">
      <div className="relative h-[600px] overflow-hidden rounded-[34px] bg-gradient-to-b from-[#231e1a] via-[#12181a] to-[#101314]">
        <div className="absolute left-1/2 top-2 h-1.5 w-24 -translate-x-1/2 rounded-full bg-white/15" />
        {children}
      </div>
    </div>
  );
}

function MiniRecipe({ title, meta, k, p }: { title: string; meta: string; k: string; p: string }) {
  return (
    <div className="rounded-[var(--radius-card-md)] border border-white/8 bg-white/[0.04] p-4">
      <p className="font-display text-[16px] leading-[1.2] text-[var(--text-primary)]">{title}</p>
      <p className="mt-1 text-[11px] text-[var(--text-alpha-40)]">{meta}</p>
      <div className="mt-3 flex gap-2">
        <span className="rounded-[10px] border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[12px] text-[var(--text-primary)]">{k} <span className="text-[9px] text-[var(--text-alpha-40)]">KCAL</span></span>
        <span className="rounded-[10px] border border-[color-mix(in_srgb,var(--accent)_50%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-2.5 py-1 text-[12px] text-[var(--accent)]">{p} <span className="text-[9px] opacity-70">PROTEIN</span></span>
      </div>
    </div>
  );
}

/* ---- icons (inline, currentColor) ---- */

function FridgeIcon() {
  return <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M6 9.5h12M9.5 5.5v2M9.5 12.5v3" /></svg>;
}
function PlateIcon() {
  return <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4" /></svg>;
}
function ArrowIcon() {
  return <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"><path d="M4 12h15M13 6l6 6-6 6" /></svg>;
}
function CameraIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1L9 4h6l1.5 2h1A2.5 2.5 0 0 1 20 8.5V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><circle cx="12" cy="12.5" r="3.2" /></svg>;
}
function ChartIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M5 19V10M12 19V5M19 19v-6" /></svg>;
}
function CalendarIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5" width="16" height="16" rx="2.5" /><path d="M4 9.5h16M8 3v4M16 3v4" /></svg>;
}
function WandIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l3 3L9 18l-3 1 1-3z" /><path d="M17.5 3.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6L15.2 6l1.6-.7z" /></svg>;
}
function CheckIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-none"><path d="M5 12.5l4.5 4.5L19 7" /></svg>;
}
function StarIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.8 6.1 20.8l1.2-6.6L2.5 9l6.6-.9z" /></svg>;
}
function XLogo() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7 8 8.2 12h-6.4l-5-7.3L5.9 22H2.8l7.5-8.6L2.4 2h6.6l4.6 6.7z" /></svg>;
}
function IgLogo() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" /></svg>;
}
function MailIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M4 7l8 6 8-6" /></svg>;
}
