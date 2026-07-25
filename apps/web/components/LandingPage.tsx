"use client";

/*
 * Sousbot marketing landing — the logged-out root (rendered by AppShell when
 * there's no session).
 *
 * A faithful port of the user-authored Claude Design project "Sousbot Landing"
 * (file `Sousbot Landing.dc.html`, project
 * 28f8c00b-5baf-43de-a51c-4fda160f4599, read via the claude_design MCP).
 *
 * Shape of it: the page never scrolls. It's a fixed, full-viewport stage with
 * five scenes — Welcome, The loop, Recipes, Pricing, Start cooking. Wheel,
 * arrow keys, swipe or the right-hand dots step between them; each scene's copy
 * (left) and cards (right) fly in from opposite sides on a rotateY arc while a
 * real WebGL pot (`landing/potScene.ts`) re-stages itself behind them: the lid
 * lifts and swings off, steam thickens, detected ingredients rise and orbit,
 * and the pot sinks out of frame by the closing scene.
 *
 * Deliberate departures from the design doc, all of them integration work:
 *   - The DC runtime's `{{ }}` bindings / `style-hover` / `<sc-for>` are real
 *     React state, CSS `:hover` rules and `.map()` here — no innerHTML.
 *   - Fonts come from the self-hosted next/font families
 *     (var(--font-display) / var(--font-ui)) instead of a Google Fonts <link>.
 *   - The logo <img>s point at /brand/*.svg (the same files the design has in
 *     its uploads/).
 *   - Every "Get started free" / "Start free" / "Go Pro" opens the real
 *     SignInSheet; the design's mock CTAs had `title="Coming soon"` stubs.
 *   - Added a stacked, auto-scaled layout under 900px — the source is
 *     desktop-only and would have overlapped its two columns on a phone.
 *   - `prefers-reduced-motion` drops the fly-in transforms to a plain crossfade
 *     (and see potScene.ts for the 3D side).
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { SignInSheet } from "./SignInSheet";
import { createPotScene, type PotScene } from "./landing/potScene";

const SCENES = ["Welcome", "The loop", "Recipes", "Pricing", "Start cooking"];
/** the design's `transitionMs` prop default */
const DUR = 950;
const EASE = "cubic-bezier(.23,.62,.18,1)";
/** below this width the two columns stack instead of flanking the pot */
const NARROW = 900;

const CSS = `
.sbl {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #171009;
  color: #F3E9DC;
  font-family: var(--font-ui);
  -webkit-font-smoothing: antialiased;
}
.sbl ::selection { background: #D68D50; color: #2A1B10; }
.sbl button { font-family: inherit; }

@keyframes sbl-fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
@keyframes sbl-hintDrop { 0%, 100% { transform: translateY(0); opacity: .85; } 50% { transform: translateY(8px); opacity: .15; } }
@keyframes sbl-glowPulse { 0%, 100% { opacity: .55; } 50% { opacity: .95; } }

/* ---- scenes: on desktop the wrappers dissolve so each side is positioned
   against the perspective stage exactly as the design has it; on narrow
   screens the scene becomes a centred column that stacks its two sides. ---- */
.sbl-scene { display: contents; }
.sbl-stack { display: contents; }
.sbl-side { position: absolute; pointer-events: none; }
.sbl-side-l { left: clamp(20px, 5vw, 84px); transform: translateY(-50%); }
.sbl-side-r { right: clamp(56px, 5vw, 88px); transform: translateY(-50%); }

/* ---- glass panel, the design's one repeated surface ---- */
.sbl-glass {
  background: rgba(43, 29, 17, .46);
  border: 1px solid rgba(214, 141, 80, .2);
  -webkit-backdrop-filter: blur(18px) saturate(1.2);
  backdrop-filter: blur(18px) saturate(1.2);
  box-shadow: 0 22px 54px rgba(0, 0, 0, .42), inset 0 1px 0 rgba(255, 255, 255, .05);
}
.sbl-glass-lg {
  background: rgba(43, 29, 17, .5);
  border: 1px solid rgba(214, 141, 80, .22);
  -webkit-backdrop-filter: blur(20px) saturate(1.2);
  backdrop-filter: blur(20px) saturate(1.2);
  box-shadow: 0 26px 64px rgba(0, 0, 0, .46), inset 0 1px 0 rgba(255, 255, 255, .05);
}

/* ---- typography roles ---- */
.sbl-eyebrow {
  font-size: 11.5px; letter-spacing: .26em; text-transform: uppercase;
  font-weight: 600; color: #B98E63;
}
.sbl-h1, .sbl-h2 {
  margin: 0; font-family: var(--font-display); font-weight: 400;
  line-height: 1.04; color: #F6EEE1;
}
.sbl-h1 { font-size: clamp(38px, 5vw, 78px); line-height: 1.02; text-wrap: balance; }
.sbl-h2 { font-size: clamp(32px, 4vw, 62px); }
.sbl-h2-cta { font-size: clamp(34px, 4.4vw, 68px); text-wrap: balance; }
.sbl-h1 em, .sbl-h2 em { color: #D68D50; }
.sbl-lede { margin: 0; font-size: 15.5px; line-height: 1.65; color: #C9B196; text-wrap: pretty; }
.sbl-serif { font-family: var(--font-display); }

/* ---- buttons ---- */
.sbl-cta {
  display: inline-flex; align-items: center; gap: 8px; background: #D68D50;
  color: #2A1B10; border: none; padding: 15px 28px; border-radius: 999px;
  font-weight: 700; font-size: 15px; cursor: pointer;
  box-shadow: 0 14px 36px rgba(214, 141, 80, .3);
  transition: background .25s, transform .25s, box-shadow .25s;
}
.sbl-cta:hover { background: #E29A5E; transform: translateY(-1px); box-shadow: 0 18px 44px rgba(214, 141, 80, .42); }
.sbl-cta-lg { padding: 16px 30px; font-size: 15.5px; }
.sbl-ghost {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(243, 233, 220, .05); color: #F3E9DC;
  border: 1px solid rgba(214, 141, 80, .38); padding: 14px 26px;
  border-radius: 999px; font-weight: 600; font-size: 14.5px; cursor: pointer;
  -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
  transition: border-color .25s, background .25s, transform .25s;
}
.sbl-ghost:hover { background: rgba(214, 141, 80, .14); border-color: rgba(214, 141, 80, .7); transform: translateY(-1px); }
.sbl-ghost-lg { padding: 15px 28px; }
.sbl-ghost-block { display: block; width: 100%; padding: 13px 0; font-size: 14px; -webkit-backdrop-filter: none; backdrop-filter: none; }
.sbl-ghost-block:hover { transform: none; }
.sbl-cta-pro {
  display: block; width: 100%; background: #D9673D; color: #2A1B10; border: none;
  padding: 14px 0; border-radius: 999px; font-weight: 700; font-size: 14.5px;
  cursor: pointer; box-shadow: 0 14px 36px rgba(217, 103, 61, .3);
  transition: background .25s, transform .25s;
}
.sbl-cta-pro:hover { background: #E57A4F; transform: translateY(-1px); }
.sbl-nav-cta {
  background: #D68D50; color: #2A1B10; border: none; padding: 10px 20px;
  border-radius: 999px; font-weight: 700; font-size: 13px; cursor: pointer;
  transition: background .25s;
}
.sbl-nav-cta:hover { background: #E29A5E; }

/* ---- small repeated bits ---- */
.sbl-pill {
  padding: 7px 14px; border-radius: 999px; border: 1px solid rgba(214, 141, 80, .32);
  background: rgba(214, 141, 80, .08); font-size: 12.5px; font-weight: 500; color: #E4C9A6;
}
.sbl-adapt {
  padding: 6px 12px; border-radius: 999px; border: 1px solid rgba(214, 141, 80, .3);
  background: transparent; font-size: 12px; color: #E4C9A6; cursor: default;
  transition: background .2s;
}
.sbl-adapt:hover { background: rgba(214, 141, 80, .14); }
.sbl-pro-tag {
  font-size: 9.5px; font-weight: 800; letter-spacing: .14em; padding: 3px 7px;
  border-radius: 6px; background: #D9673D; color: #2A1B10;
}
.sbl-rule { height: 1px; background: rgba(214, 141, 80, .16); }
.sbl-macro {
  text-align: center; padding: 12px 6px; border-radius: 14px;
  background: rgba(23, 16, 9, .4); border: 1px solid rgba(214, 141, 80, .14);
}
.sbl-macro-n { font-family: var(--font-display); font-size: 24px; line-height: 1.1; color: #F6EEE1; }
.sbl-macro-l { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: #9A7C5C; margin-top: 3px; }
.sbl-feat { display: flex; gap: 10px; align-items: flex-start; font-size: 14px; line-height: 1.5; color: #DECBB2; }
.sbl-tick { font-weight: 700; font-size: 13px; line-height: 1.5; }

/* ---- chrome ---- */
.sbl-nav {
  position: absolute; top: 0; left: 0; right: 0; display: flex; align-items: center;
  justify-content: space-between; padding: 22px clamp(20px, 4vw, 64px); z-index: 10;
}
.sbl-dots {
  position: absolute; right: clamp(14px, 2vw, 30px); top: 50%;
  transform: translateY(-50%); display: flex; flex-direction: column; gap: 12px; z-index: 10;
}
.sbl-dot {
  width: 9px; height: 9px; border-radius: 99px; border: none; padding: 0;
  cursor: pointer; display: block; background: rgba(214, 141, 80, .3);
  transition: all .5s ${EASE};
}
.sbl-dot-on { height: 28px; background: #D68D50; }
.sbl-counter {
  position: absolute; left: clamp(20px, 4vw, 64px); bottom: 26px; display: flex;
  align-items: center; gap: 12px; z-index: 10; user-select: none;
}

/* The vignette shades the copy columns on a wide stage; stacked on a phone the
   scrim has to run top-to-bottom instead, or the pot washes out the text. */
.sbl-vignette {
  background:
    linear-gradient(90deg, rgba(23, 16, 9, .92) 0%, rgba(23, 16, 9, .78) 28%, rgba(23, 16, 9, .38) 43%, rgba(23, 16, 9, 0) 52%, rgba(23, 16, 9, 0) 58%, rgba(23, 16, 9, .32) 68%, rgba(23, 16, 9, .68) 82%, rgba(23, 16, 9, .85) 100%),
    radial-gradient(125% 95% at 50% 42%, rgba(23, 16, 9, 0) 55%, rgba(9, 6, 3, .8) 100%);
}

/* Between the stacked breakpoint and a full-width desktop stage the copy
   columns are proportionally wider (they're vw-based, capped in px), so tighten
   the measure to keep the lede clear of the pot. */
@media (min-width: ${NARROW + 1}px) and (max-width: 1599px) {
  .sbl-lede { max-width: 36ch !important; }
}

@media (max-width: ${NARROW}px) {
  .sbl-vignette {
    background:
      linear-gradient(180deg, rgba(23, 16, 9, .8) 0%, rgba(23, 16, 9, .62) 38%, rgba(23, 16, 9, .72) 72%, rgba(23, 16, 9, .9) 100%),
      radial-gradient(120% 80% at 50% 45%, rgba(23, 16, 9, 0) 40%, rgba(9, 6, 3, .75) 100%);
  }
  .sbl-scene {
    display: flex; position: absolute; inset: 0; align-items: center;
    justify-content: center; padding: 80px 18px 88px; pointer-events: none;
  }
  .sbl-stack {
    display: flex; flex-direction: column; gap: 12px;
    width: 100%; max-width: 460px; transform-origin: 50% 50%;
  }
  /* the per-scene column geometry is inline (it's per-scene in the design), so
     the stacked layout has to out-rank it */
  .sbl-side, .sbl-side-l, .sbl-side-r {
    position: relative !important; left: auto !important; right: auto !important;
    top: auto !important; transform: none !important;
    width: auto !important; max-width: none !important;
  }
  .sbl-h1 { font-size: 34px; }
  .sbl-h2 { font-size: 29px; }
  .sbl-h2-cta { font-size: 31px; }
  .sbl-lede { font-size: 14.5px !important; max-width: none !important; }
  .sbl-nav { padding: 16px 18px; }
  .sbl-nav-meta { display: none; }
  .sbl-dots { top: auto; bottom: 24px; right: 18px; transform: none; flex-direction: row; gap: 10px; }
  .sbl-dot-on { height: 9px; width: 28px; }
  .sbl-counter { left: 18px; bottom: 22px; gap: 9px; }
  .sbl-counter-total { display: none; }
  .sbl-cta, .sbl-ghost { padding: 13px 22px; font-size: 14px; }
  .sbl-cta-lg { padding: 14px 24px; font-size: 14.5px; }
  .sbl-glass, .sbl-glass-lg { box-shadow: 0 14px 34px rgba(0, 0, 0, .4), inset 0 1px 0 rgba(255, 255, 255, .05); }
  /* stacked, the copy covers most of the pot — so let it recede to ambience
     rather than half-peek from behind the cards */
  .sbl-pot { opacity: .55; }
}
`;

/** The design's four hero stat rows. */
const STATS: [string, string][] = [
  ["< 20s", "from photo to three recipes"],
  ["0", "ingredients to type — just point your camera"],
  ["10/mo", "free recipes — no card required"],
  ["3×", "Web · iOS · Android, always in sync"],
];

/** "The loop" — the three product steps. */
const STEPS: [string, string, string][] = [
  ["01", "Snap", "Photograph your fridge or pantry — or type what you’ve got."],
  ["02", "Pick", "Three recipes from what’s inside — each with calories, protein, carbs and fat, plus a photo of the finished dish."],
  ["03", "Cook", "Step-by-step cooking mode keeps the screen awake while your hands are busy."],
];

const DIETS = ["Vegetarian", "Vegan", "Keto", "Halal", "Dairy-free"];

const MACROS: [string, string][] = [
  ["520", "kcal"],
  ["42g", "protein"],
  ["31g", "carbs"],
  ["24g", "fat"],
];

const FREE_FEATURES = [
  "10 recipe generations a month",
  "Macros on every recipe",
  "Smart shopping list — only what you’re missing",
  "Web, iOS & Android sync",
];

const PRO_FEATURES = [
  "Unlimited recipe generations",
  "AI photo of every finished dish",
  "Weekly meal planner",
  "Adapt any recipe — vegan it, halve it, air-fry it",
];

export function LandingPage() {
  const [scene, setScene] = useState(0);
  const [signInOpen, setSignInOpen] = useState(false);
  const [reduce, setReduce] = useState(false);
  /** narrow-screen only: scale factor that keeps a stacked scene inside the viewport */
  const [fit, setFit] = useState(1);

  const mountRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const potRef = useRef<PotScene | null>(null);
  const sceneRef = useRef(0);
  const lockRef = useRef(0);

  const go = useCallback((i: number) => {
    const n = Math.max(0, Math.min(SCENES.length - 1, i));
    const now = performance.now();
    if (n === sceneRef.current || now < lockRef.current) return;
    lockRef.current = now + DUR + 140;
    sceneRef.current = n;
    setScene(n);
    potRef.current?.setScene(n);
  }, []);

  // --- the page owns the viewport: no document scroll while the landing is up ---
  useEffect(() => {
    const html = document.documentElement;
    const prev = [html.style.overflow, document.body.style.overflow, document.body.style.overscrollBehavior];
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = prev[0];
      document.body.style.overflow = prev[1];
      document.body.style.overscrollBehavior = prev[2];
    };
  }, []);

  // --- navigation: wheel (accumulated so trackpad inertia counts as one step),
  // keyboard, and vertical swipe ---
  useEffect(() => {
    let acc = 0;
    let accT: number | undefined;
    const onWheel = (e: WheelEvent) => {
      if (performance.now() < lockRef.current) {
        acc = 0;
        return;
      }
      acc += e.deltaY;
      window.clearTimeout(accT);
      accT = window.setTimeout(() => {
        acc = 0;
      }, 180);
      if (acc > 70) {
        acc = 0;
        go(sceneRef.current + 1);
      } else if (acc < -70) {
        acc = 0;
        go(sceneRef.current - 1);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (["ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        go(sceneRef.current + 1);
      } else if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        go(sceneRef.current - 1);
      } else if (e.key === "Home") {
        go(0);
      } else if (e.key === "End") {
        go(SCENES.length - 1);
      }
    };
    let ty: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      ty = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (ty == null) return;
      const dy = ty - e.changedTouches[0].clientY;
      ty = null;
      if (Math.abs(dy) > 46) go(sceneRef.current + (dy > 0 ? 1 : -1));
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.clearTimeout(accT);
    };
  }, [go]);

  // --- the WebGL pot ---
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(mq.matches);
    const mount = mountRef.current;
    if (!mount) return;
    let disposed = false;
    createPotScene(mount, { initial: sceneRef.current, reduceMotion: mq.matches }).then((s) => {
      if (!s) return;
      if (disposed) {
        s.dispose();
        return;
      }
      potRef.current = s;
      s.setScene(sceneRef.current);
    });
    return () => {
      disposed = true;
      potRef.current?.dispose();
      potRef.current = null;
    };
  }, []);

  // --- narrow screens: scale the active stacked scene so it always fits ---
  useEffect(() => {
    const measure = () => {
      if (window.innerWidth > NARROW) {
        setFit(1);
        return;
      }
      const stack = stageRef.current?.querySelector<HTMLElement>(
        `[data-scene="${sceneRef.current}"] .sbl-stack`
      );
      if (!stack) return;
      const avail = window.innerHeight - 176; // nav + counter/dots gutters
      setFit(Math.min(1, avail / Math.max(1, stack.offsetHeight)));
    };
    measure();
    const t = window.setTimeout(measure, 400); // refit once webfonts land
    window.addEventListener("resize", measure);
    if (document.fonts?.ready) void document.fonts.ready.then(measure);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [scene]);

  /* The per-side fly-in. Active side sits at rest; the others wait off-stage,
     rotated away on the Y axis. Under reduced motion it's a plain crossfade. */
  const mv = (i: number, side: "L" | "R"): CSSProperties => {
    const act = i === scene;
    const dl = act && side === "R" ? 80 : 0;
    if (reduce) {
      return {
        opacity: act ? 1 : 0,
        transition: `opacity ${Math.round(DUR * 0.4)}ms ease`,
        pointerEvents: act ? "auto" : "none",
      };
    }
    return {
      opacity: act ? 1 : 0,
      transform: act
        ? "translate3d(0,0,0)"
        : `translate3d(${side === "L" ? "-54vw" : "54vw"},0,0) rotateY(${side === "L" ? "26deg" : "-26deg"}) scale(.96)`,
      transition: act
        ? `opacity ${Math.round(DUR * 0.55)}ms ease ${dl}ms, transform ${DUR}ms ${EASE} ${dl}ms`
        : `opacity ${Math.round(DUR * 0.5)}ms ease ${Math.round(DUR * 0.22)}ms, transform ${DUR}ms ${EASE}`,
      pointerEvents: act ? "auto" : "none",
      backfaceVisibility: "hidden",
      willChange: "transform, opacity",
    };
  };

  const stackStyle: CSSProperties = { transform: `scale(${fit})` };
  /** entrance stagger — only the first scene's copy animates in on load */
  const enter = (delay: number): CSSProperties =>
    reduce ? {} : { animation: `sbl-fadeUp .8s ${delay}s ${EASE} both` };

  const openSignIn = () => setSignInOpen(true);

  return (
    <div className="sbl">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ambient warmth behind the 3D layer */}
      <div
        style={{
          position: "absolute", left: "50%", top: "60%", width: 1300, height: 950,
          transform: "translate(-50%,-50%)",
          background:
            "radial-gradient(closest-side, rgba(214,141,80,0.16), rgba(214,141,80,0.05) 45%, rgba(23,16,9,0) 72%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute", left: "50%", top: "102%", width: 1700, height: 760,
          transform: "translate(-50%,-55%)",
          background: "radial-gradient(closest-side, rgba(217,103,61,0.11), rgba(23,16,9,0) 70%)",
          pointerEvents: "none",
          animation: reduce ? undefined : "sbl-glowPulse 7s ease-in-out infinite",
        }}
      />

      {/* the pot */}
      <div
        ref={mountRef}
        className="sbl-pot"
        aria-hidden
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      />

      {/* vignette: keeps the pot legible in the middle and the copy legible at the edges */}
      <div className="sbl-vignette" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />

      {/* ===================== SCENES ===================== */}
      <div
        ref={stageRef}
        style={{
          position: "absolute", inset: 0, perspective: 1600, perspectiveOrigin: "50% 50%",
          pointerEvents: "none", zIndex: 5,
        }}
      >
        {/* ---------- 01 Welcome ---------- */}
        <div className="sbl-scene" data-scene={0}>
          <div className="sbl-stack" style={stackStyle}>
            <div
              className="sbl-side sbl-side-l"
              style={{ top: "calc(50% + 16px)", width: "min(42vw,600px)" }}
              aria-hidden={scene !== 0}
            >
              <div style={mv(0, "L")}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 26 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, ...enter(0.15) }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/logo-mark.svg" alt="" width={24} height={24} style={{ display: "block" }} />
                    <span className="sbl-eyebrow">AI kitchen assistant</span>
                  </div>
                  <h1 className="sbl-h1" style={enter(0.25)}>
                    What’s for dinner, <em>solved.</em>
                  </h1>
                  <p className="sbl-lede" style={{ maxWidth: "44ch", fontSize: 16.5, ...enter(0.4) }}>
                    Snap a photo of your fridge. Sousbot spots the ingredients, writes recipes you can
                    actually cook — real macros included — and builds the shopping list for whatever’s
                    missing.
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", ...enter(0.55) }}>
                    <button type="button" className="sbl-cta" onClick={openSignIn}>
                      Get started free
                    </button>
                    <button type="button" className="sbl-ghost" onClick={() => go(1)}>
                      See how it works
                    </button>
                  </div>
                  <div style={{ fontSize: 12.5, letterSpacing: ".02em", color: "#8E7357", ...enter(0.7) }}>
                    Free plan · 10 recipes a month · No card required
                  </div>
                </div>
              </div>
            </div>

            <div
              className="sbl-side sbl-side-r"
              style={{ top: "calc(50% + 26px)", width: "min(27vw,380px)" }}
              aria-hidden={scene !== 0}
            >
              <div style={mv(0, "R")}>
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  {STATS.map(([n, label], i) => (
                    <div
                      key={label}
                      className="sbl-glass"
                      style={{
                        display: "flex", alignItems: "baseline", gap: 14, padding: "14px 18px",
                        borderRadius: 16,
                        ...(reduce ? {} : { animation: `sbl-fadeUp .7s ${0.5 + i * 0.12}s ${EASE} both` }),
                      }}
                    >
                      <span className="sbl-serif" style={{ fontSize: 27, lineHeight: 1, color: "#D68D50", minWidth: 74 }}>
                        {n}
                      </span>
                      <span style={{ fontSize: 13.5, lineHeight: 1.5, color: "#C9B196" }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- 02 The loop ---------- */}
        <div className="sbl-scene" data-scene={1}>
          <div className="sbl-stack" style={stackStyle}>
            <div
              className="sbl-side sbl-side-l"
              style={{ top: "calc(50% + 16px)", width: "min(34vw,480px)" }}
              aria-hidden={scene !== 1}
            >
              <div style={mv(1, "L")}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 22 }}>
                  <span className="sbl-eyebrow">The loop</span>
                  <h2 className="sbl-h2">
                    Snap. Pick. <em>Cook.</em>
                  </h2>
                  <p className="sbl-lede" style={{ maxWidth: "40ch" }}>
                    No lists to write, no decision fatigue. Point your camera at what you already have —
                    dinner sorts itself out from there.
                  </p>
                </div>
              </div>
            </div>

            <div
              className="sbl-side sbl-side-r"
              style={{ top: "calc(50% + 18px)", width: "min(30vw,430px)" }}
              aria-hidden={scene !== 1}
            >
              <div style={mv(1, "R")}>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {STEPS.map(([n, title, body]) => (
                    <div
                      key={n}
                      className="sbl-glass"
                      style={{ display: "flex", gap: 16, alignItems: "flex-start", padding: "19px 21px", borderRadius: 18 }}
                    >
                      <span
                        className="sbl-serif"
                        style={{ fontStyle: "italic", fontSize: 27, lineHeight: 1, color: "#D68D50", minWidth: 42 }}
                      >
                        {n}
                      </span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15.5, color: "#F3E9DC", marginBottom: 4 }}>{title}</div>
                        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: "#C0A88E" }}>{body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- 03 Recipes ---------- */}
        <div className="sbl-scene" data-scene={2}>
          <div className="sbl-stack" style={stackStyle}>
            <div
              className="sbl-side sbl-side-l"
              style={{ top: "calc(50% + 16px)", width: "min(34vw,500px)" }}
              aria-hidden={scene !== 2}
            >
              <div style={mv(2, "L")}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 22 }}>
                  <span className="sbl-eyebrow">Why it sticks</span>
                  <h2 className="sbl-h2">
                    Macros you can <em>trust.</em>
                  </h2>
                  <p className="sbl-lede" style={{ maxWidth: "42ch" }}>
                    Calories, protein, carbs and fat on every recipe — with your diet and allergy rules set
                    once and applied to every single one.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {DIETS.map((d) => (
                      <span key={d} className="sbl-pill">
                        {d}
                      </span>
                    ))}
                    <span
                      className="sbl-pill"
                      style={{ borderStyle: "dashed", background: "transparent", color: "#B98E63" }}
                    >
                      + more
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: "#D68D50", flex: "none" }} />
                    <span style={{ fontSize: 13, color: "#B99C7C" }}>
                      Fridge photos stay private, kept to your account.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="sbl-side sbl-side-r"
              style={{ top: "calc(50% + 20px)", width: "min(31vw,440px)" }}
              aria-hidden={scene !== 2}
            >
              <div style={mv(2, "R")}>
                <div
                  className="sbl-glass-lg"
                  style={{ display: "flex", flexDirection: "column", gap: 18, padding: 24, borderRadius: 22 }}
                >
                  <div style={{ display: "flex", gap: 15, alignItems: "center" }}>
                    <div
                      style={{
                        width: 64, height: 64, flex: "none", borderRadius: 14,
                        border: "1px solid rgba(214,141,80,.25)",
                        background:
                          "repeating-linear-gradient(45deg, rgba(241,229,209,.1) 0 8px, rgba(241,229,209,.03) 8px 16px)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "ui-monospace,'SF Mono',monospace", fontSize: 8.5,
                          letterSpacing: ".08em", textTransform: "uppercase", color: "#9A7C5C",
                        }}
                      >
                        ai photo
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 15.5, color: "#F3E9DC" }}>
                        Harissa chicken traybake
                      </div>
                      <div style={{ fontSize: 12.5, color: "#9A7C5C", marginTop: 3 }}>
                        From your fridge · 35 min · 2 servings
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10 }}>
                    {MACROS.map(([n, label]) => (
                      <div key={label} className="sbl-macro">
                        <div className="sbl-macro-n">{n}</div>
                        <div className="sbl-macro-l">{label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="sbl-rule" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: "#B99C7C" }}>Adapt it on the fly</span>
                      <span className="sbl-pro-tag">PRO</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {["Make it vegan", "Halve the servings", "Air-fry it"].map((a) => (
                        <span key={a} className="sbl-adapt">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- 04 Pricing ---------- */}
        <div className="sbl-scene" data-scene={3}>
          <div className="sbl-stack" style={stackStyle}>
            <div
              className="sbl-side sbl-side-l"
              style={{ top: "calc(50% + 22px)", width: "min(30vw,420px)" }}
              aria-hidden={scene !== 3}
            >
              <div style={mv(3, "L")}>
                <div
                  className="sbl-glass"
                  style={{
                    display: "flex", flexDirection: "column", gap: 18, padding: 28, borderRadius: 22,
                    boxShadow: "0 26px 64px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.05)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <span className="sbl-serif" style={{ fontSize: 34, color: "#F6EEE1" }}>
                      Free
                    </span>
                    <span className="sbl-serif" style={{ fontSize: 30, color: "#D68D50" }}>
                      $0
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "#9A7C5C", marginTop: -12 }}>No card required. Ever.</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                    {FREE_FEATURES.map((f) => (
                      <div key={f} className="sbl-feat">
                        <span className="sbl-tick" style={{ color: "#D68D50" }}>
                          ✓
                        </span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="sbl-ghost sbl-ghost-block" onClick={openSignIn}>
                    Start free
                  </button>
                </div>
              </div>
            </div>

            <div
              className="sbl-side sbl-side-r"
              style={{ top: "calc(50% + 22px)", width: "min(30vw,420px)" }}
              aria-hidden={scene !== 3}
            >
              <div style={mv(3, "R")}>
                <div
                  style={{
                    display: "flex", flexDirection: "column", gap: 18, padding: 28, borderRadius: 22,
                    background: "rgba(48,27,16,.55)", border: "1px solid rgba(217,103,61,.45)",
                    WebkitBackdropFilter: "blur(20px) saturate(1.2)",
                    backdropFilter: "blur(20px) saturate(1.2)",
                    boxShadow:
                      "0 26px 70px rgba(217,103,61,.16), 0 26px 64px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.06)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span className="sbl-serif" style={{ fontSize: 34, color: "#F6EEE1" }}>
                        Pro
                      </span>
                      <span className="sbl-pro-tag" style={{ padding: "4px 8px" }}>
                        PRO
                      </span>
                    </span>
                    <span className="sbl-serif" style={{ fontSize: 30, color: "#E0764A" }}>
                      $7.99
                      <span style={{ fontFamily: "var(--font-ui)", fontSize: 13, color: "#9A7C5C" }}>/mo</span>
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "#B99C7C", marginTop: -12 }}>
                    or $59.99 a year — about $5/mo, save 37%
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                    {PRO_FEATURES.map((f) => (
                      <div key={f} className="sbl-feat">
                        <span className="sbl-tick" style={{ color: "#E0764A" }}>
                          ✓
                        </span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button type="button" className="sbl-cta-pro" onClick={openSignIn}>
                    Go Pro
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ---------- 05 Start cooking ---------- */}
        <div className="sbl-scene" data-scene={4}>
          <div className="sbl-stack" style={stackStyle}>
            <div
              className="sbl-side sbl-side-l"
              style={{ top: "calc(50% + 16px)", width: "min(38vw,560px)" }}
              aria-hidden={scene !== 4}
            >
              <div style={mv(4, "L")}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 24 }}>
                  <span className="sbl-eyebrow">Start cooking</span>
                  <h2 className="sbl-h2 sbl-h2-cta">
                    Tonight’s dinner is <em>already</em> in your fridge.
                  </h2>
                  <p className="sbl-lede" style={{ maxWidth: "42ch" }}>
                    Snap it, pick a recipe, start cooking. Free on web, iOS and Android — no card, no lists,
                    no thinking.
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <button type="button" className="sbl-cta sbl-cta-lg" onClick={openSignIn}>
                      Get started free
                    </button>
                    <button type="button" className="sbl-ghost sbl-ghost-lg" onClick={() => go(3)}>
                      See pricing
                    </button>
                  </div>
                  <div style={{ fontSize: 12.5, color: "#8E7357" }}>
                    Launching soon at <span style={{ color: "#D68D50" }}>sousbot.ai</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              className="sbl-side sbl-side-r"
              style={{ top: "calc(50% + 16px)", width: "min(26vw,360px)" }}
              aria-hidden={scene !== 4}
            >
              <div style={mv(4, "R")}>
                <div
                  className="sbl-glass"
                  style={{
                    display: "flex", flexDirection: "column", gap: 16, padding: 24, borderRadius: 22,
                    boxShadow: "0 26px 64px rgba(0,0,0,.44), inset 0 1px 0 rgba(255,255,255,.05)",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/brand/logo-full-dark.svg"
                    alt="Sousbot"
                    style={{ height: 26, width: "auto", alignSelf: "flex-start", display: "block" }}
                  />
                  <div className="sbl-rule" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 9, fontSize: 13, color: "#C9B196" }}>
                    <span>Web · iOS · Android</span>
                    <span>10 free recipes a month, on the house</span>
                    <span>Private fridge photos, kept to your account</span>
                  </div>
                  <div className="sbl-rule" />
                  <span style={{ fontSize: 12, color: "#8E7357" }}>© 2026 Sousbot · sousbot.ai</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===================== CHROME ===================== */}
      <nav className="sbl-nav">
        <button
          type="button"
          onClick={() => go(0)}
          aria-label="Sousbot — back to the start"
          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "block" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/logo-full-dark.svg"
            alt="Sousbot"
            style={{ height: 30, width: "auto", display: "block" }}
          />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <span className="sbl-nav-meta" style={{ fontSize: 12.5, letterSpacing: ".04em", color: "#8E7357" }}>
            Web · iOS · Android
          </span>
          <button type="button" className="sbl-nav-cta" onClick={openSignIn}>
            Get started free
          </button>
        </div>
      </nav>

      <div className="sbl-counter">
        <span className="sbl-serif" style={{ fontStyle: "italic", fontSize: 21, color: "#D68D50", minWidth: 26 }}>
          {"0" + (scene + 1)}
        </span>
        <span style={{ width: 34, height: 1, background: "rgba(214,141,80,.4)" }} />
        <span style={{ fontSize: 11.5, letterSpacing: ".2em", textTransform: "uppercase", color: "#9A7C5C" }}>
          {SCENES[scene]}
        </span>
        <span className="sbl-counter-total" style={{ fontSize: 11, color: "#6E5638" }}>
          / 0{SCENES.length}
        </span>
      </div>

      <div className="sbl-dots" role="tablist" aria-label="Landing sections">
        {SCENES.map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={i === scene}
            aria-label={label}
            title={label}
            className={`sbl-dot${i === scene ? " sbl-dot-on" : ""}`}
            onClick={() => go(i)}
          />
        ))}
      </div>

      <div
        style={{
          position: "absolute", left: "50%", bottom: 20, transform: "translateX(-50%)",
          zIndex: 10, pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
            opacity: scene === 0 ? 1 : 0, transition: "opacity .7s ease",
          }}
        >
          <span style={{ fontSize: 10.5, letterSpacing: ".32em", textTransform: "uppercase", color: "#9A7C5C" }}>
            Scroll
          </span>
          <div
            style={{
              width: 1, height: 32, background: "linear-gradient(#D68D50, transparent)",
              animation: reduce ? undefined : "sbl-hintDrop 1.8s ease-in-out infinite",
            }}
          />
        </div>
      </div>

      {signInOpen && <SignInSheet onClose={() => setSignInOpen(false)} />}
    </div>
  );
}
