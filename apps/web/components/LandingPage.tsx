"use client";

/*
 * Sousbot marketing landing — the logged-out root (rendered by AppShell when
 * there's no session).
 *
 * This is a faithful port of the user-authored Claude Design project
 * "Sousbot landing page design" (file `Sousbot Landing.dc.html`, project
 * 65748c3f-d683-4f77-b3bc-89cc4012a9cd, imported via the claude_design MCP).
 *
 * It's a scroll-driven 3D "camera dolly": the document is tall (680vh); as you
 * scroll, a JS-driven translateZ flies a fixed 3D world past the camera through
 * five stops — Hero, How it works, Features, Pricing, Final CTA. An animated
 * pot scene (steam, bubbling stew, floating detected-ingredient chips) anchors
 * the hero; a monthly/annual toggle drives the pricing card.
 *
 * Port strategy: the design's markup is inline-styled HTML, so we render it
 * verbatim via dangerouslySetInnerHTML and reproduce the DC runtime in a
 * useEffect — converting `style-hover` → generic hover listeners, `{{…}}`
 * bindings → imperative DOM updates, `<sc-for>` → an unrolled feature list,
 * and the design's product CTAs → the app's mock sign-in (enter). Fonts map to
 * the self-hosted next/font families (var(--font-display) / --font-ui) instead
 * of the source's Google Fonts <link>. Reduced motion is respected.
 */

import { useEffect, useRef } from "react";
import { useAuth } from "../lib/auth/auth-context";
import { useToast } from "./Toast";

const FEATURES: { icon: string; title: string; body: string; pro: boolean }[] = [
  { icon: "a", title: "Ingredient detection", body: "One photo of your fridge or pantry becomes a full ingredient list. Nothing to type.", pro: false },
  { icon: "b", title: "Real, trustworthy macros", body: "Calories, protein, carbs and fat on every recipe — built for people who actually track.", pro: false },
  { icon: "c", title: "AI photo of every dish", body: "See the finished plate before you commit. Every generated recipe comes with its portrait.", pro: true },
  { icon: "d", title: "Weekly meal planner", body: "A full week of dinners planned around what you have and what you like.", pro: true },
  { icon: "e", title: "Smart shopping list", body: "Auto-adds only what you're missing, and syncs across web, iOS, and Android.", pro: false },
  { icon: "f", title: "Adapt any recipe", body: "“Make it vegan.” “Halve the servings.” “Air-fry it.” Sousbot rewrites the recipe on the spot.", pro: true },
];

const CARD_HOVER =
  "transform: translateY(-8px) scale(1.015); border-color: rgba(214,141,80,0.45); background: rgba(43,34,27,0.9); box-shadow: 0 24px 50px rgba(0,0,0,0.45), 0 0 36px rgba(214,141,80,0.12);";

const FEATURE_CARDS = FEATURES.map(
  (f) => `
    <div data-hover="${CARD_HOVER}" style="display: grid; gap: 9px; align-content: start; padding: 24px; border-radius: 18px; background: rgba(36,28,23,0.85); border: 1px solid rgba(243,233,222,0.09); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); transition: transform 0.45s cubic-bezier(0.22,1,0.36,1), border-color 0.45s, background 0.45s, box-shadow 0.45s;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
        <div style="width: 38px; height: 38px; border-radius: 11px; background: rgba(214,141,80,0.13); border: 1px solid rgba(214,141,80,0.25); display: grid; place-items: center; font-family: var(--font-display), Georgia, serif; font-style: italic; font-size: 20px; color: #E5A66F;">${f.icon}</div>
        ${f.pro ? `<span style="padding: 4px 10px; border-radius: 999px; background: rgba(217,103,61,0.16); border: 1px solid rgba(217,103,61,0.4); color: #ECAB8E; font-size: 11px; font-weight: 800; letter-spacing: 0.08em;">PRO</span>` : ""}
      </div>
      <h3 style="margin: 2px 0 0; font-size: 17px; font-weight: 700;">${f.title}</h3>
      <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #B5A493;">${f.body}</p>
    </div>`
).join("");

const BASE_CSS = `
.sb-landing { background: #171210; color: #F3E9DE; }
.sb-landing a { color: #D68D50; text-decoration: none; }
.sb-landing a:hover { color: #E5A66F; }
.sb-landing ::selection { background: #D68D50; color: #2A1B10; }
@keyframes potFloat { 0%,100% { transform: rotateX(12deg) rotateY(-14deg) translateY(0); } 50% { transform: rotateX(12deg) rotateY(-8deg) translateY(-16px); } }
@keyframes steamRise { 0% { transform: translateY(0) translateX(0) scale(0.6); opacity: 0; } 20% { opacity: 0.55; } 100% { transform: translateY(-110px) translateX(14px) scale(1.4); opacity: 0; } }
@keyframes chipFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
@keyframes glowPulse { 0%,100% { opacity: 0.55; } 50% { opacity: 0.85; } }
@keyframes lidRattle { 0%, 84%, 100% { transform: translateY(0) rotate(0deg); } 88% { transform: translateY(-5px) rotate(-1.4deg); } 92% { transform: translateY(-2px) rotate(1.2deg); } 96% { transform: translateY(-4px) rotate(-0.8deg); } }
@keyframes bubble { 0% { transform: translateY(2px) scale(0.4); opacity: 0; } 30% { opacity: 0.9; } 100% { transform: translateY(-9px) scale(1.1); opacity: 0; } }
@keyframes shine { 0%, 100% { transform: translateX(-46px) skewX(-12deg); opacity: 0.2; } 50% { transform: translateX(150px) skewX(-12deg); opacity: 0.5; } }
@keyframes ember { 0%, 100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 0.75; transform: scale(1.06); } }
@keyframes pulseDot { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.6); opacity: 0.45; } }
@media (prefers-reduced-motion: reduce) { .sb-landing * { animation-play-state: paused !important; } }
`;

const MARKUP = `
<div style="height: 680vh; background: #171210;">

  <!-- ===== FIXED 3D VIEWPORT ===== -->
  <div style="position: fixed; inset: 0; overflow: hidden; background: #171210; perspective: 1200px; perspective-origin: 50% 46%;">
    <div style="position: absolute; top: -12%; right: -8%; width: 760px; height: 760px; border-radius: 50%; background: radial-gradient(circle, rgba(214,141,80,0.2) 0%, rgba(217,103,61,0.07) 45%, transparent 70%); filter: blur(20px); animation: glowPulse 7s ease-in-out infinite; pointer-events: none;"></div>
    <div style="position: absolute; left: -14%; bottom: -18%; width: 640px; height: 640px; border-radius: 50%; background: radial-gradient(circle, rgba(217,103,61,0.1) 0%, transparent 70%); filter: blur(30px); pointer-events: none;"></div>

    <!-- World: camera dolly = translateZ on this node (JS-driven) -->
    <div id="sb-world" style="position: absolute; inset: 0; transform-style: preserve-3d; will-change: transform;">

      <!-- ===== STOP 0 · HERO ===== -->
      <section data-depth="0" data-screen-label="Hero" style="position: absolute; inset: 0; display: grid; place-items: center; transform: translateZ(0px); opacity: 1;">
        <div data-fit="1" style="display: grid; grid-template-columns: minmax(420px, 1.05fr) minmax(380px, 0.95fr); align-items: center; gap: 24px; width: min(1240px, 100%); box-sizing: border-box; padding: 70px 48px 30px; will-change: transform;">
          <div style="position: relative; display: grid; gap: 24px; justify-items: start;">
            <div style="display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; border-radius: 999px; border: 1px solid rgba(214,141,80,0.35); background: rgba(214,141,80,0.08); font-size: 13px; font-weight: 600; color: #E5A66F; letter-spacing: 0.04em;">
              <span style="width: 6px; height: 6px; border-radius: 50%; background: #D68D50;"></span>
              AI KITCHEN ASSISTANT · WEB · IOS · ANDROID
            </div>
            <h1 style="margin: 0; font-family: var(--font-display), Georgia, serif; font-weight: 400; font-size: clamp(48px, 5.6vw, 78px); line-height: 1.02; letter-spacing: -0.015em; text-wrap: balance;">What's for dinner, <em style="color: #D68D50;">solved.</em></h1>
            <p style="margin: 0; max-width: 480px; font-size: 18px; line-height: 1.55; color: #B5A493; text-wrap: pretty;">Snap a photo of your fridge. Sousbot spots what you have and serves up recipes you can actually cook — real macros, a weekly plan, and a shopping list that writes itself.</p>
            <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
              <a href="#" data-cta-enter style="display: inline-block; padding: 15px 28px; border-radius: 999px; background: #D68D50; color: #2A1B10; font-size: 16.5px; font-weight: 700; white-space: nowrap; box-shadow: 0 8px 30px rgba(214,141,80,0.35);" data-hover="background: #E5A66F; color: #2A1B10; transform: translateY(-1px);">Get started free</a>
              <a href="#" data-goto="1" style="display: inline-block; padding: 15px 26px; border-radius: 999px; border: 1px solid rgba(243,233,222,0.18); color: #F3E9DE; font-size: 16.5px; font-weight: 600; white-space: nowrap; background: rgba(243,233,222,0.04);" data-hover="border-color: rgba(243,233,222,0.4); color: #F3E9DE;">See how it works</a>
            </div>
            <div style="display: flex; gap: 26px; flex-wrap: wrap; margin-top: 4px;">
              <div style="display: grid; gap: 2px;">
                <span style="font-family: var(--font-display), Georgia, serif; font-size: 26px; color: #E5A66F;">&lt; 20s</span>
                <span style="font-size: 13px; color: #8E7F6F;">photo to 3 recipes</span>
              </div>
              <div style="width: 1px; background: rgba(243,233,222,0.1);"></div>
              <div style="display: grid; gap: 2px;">
                <span style="font-family: var(--font-display), Georgia, serif; font-size: 26px; color: #E5A66F;">0</span>
                <span style="font-size: 13px; color: #8E7F6F;">ingredients to type</span>
              </div>
              <div style="width: 1px; background: rgba(243,233,222,0.1);"></div>
              <div style="display: grid; gap: 2px;">
                <span style="font-family: var(--font-display), Georgia, serif; font-size: 26px; color: #E5A66F;">10 free</span>
                <span style="font-size: 13px; color: #8E7F6F;">recipes a month, no card</span>
              </div>
            </div>
          </div>

          <!-- 3D pot scene (self-animating) -->
          <div id="sb-pot-scene" aria-hidden="true" style="position: relative; height: 500px; perspective: 1100px; perspective-origin: 50% 38%;">
            <div id="sb-parallax" style="position: absolute; inset: 0; transform-style: preserve-3d; transition: transform 0.4s ease-out; will-change: transform;">
            <div style="position: absolute; inset: 0; transform-style: preserve-3d; animation: potFloat 8s ease-in-out infinite;">
              <!-- ember glow under the pot -->
              <div style="position: absolute; left: 50%; top: 320px; width: 320px; height: 100px; margin-left: -160px; border-radius: 50%; background: radial-gradient(ellipse, rgba(217,103,61,0.42) 0%, transparent 68%); filter: blur(18px); animation: ember 2.8s ease-in-out infinite;"></div>
              <!-- steam wisps -->
              <div style="position: absolute; left: 47%; top: 104px; width: 26px; height: 26px; border-radius: 50%; background: rgba(243,233,222,0.5); filter: blur(9px); animation: steamRise 3.6s ease-out infinite;"></div>
              <div style="position: absolute; left: 38%; top: 116px; width: 20px; height: 20px; border-radius: 50%; background: rgba(243,233,222,0.42); filter: blur(8px); animation: steamRise 4.4s ease-out 1.2s infinite;"></div>
              <div style="position: absolute; left: 56%; top: 110px; width: 22px; height: 22px; border-radius: 50%; background: rgba(243,233,222,0.45); filter: blur(8px); animation: steamRise 4s ease-out 2.1s infinite;"></div>
              <div style="position: absolute; left: 62%; top: 128px; width: 15px; height: 15px; border-radius: 50%; background: rgba(243,233,222,0.35); filter: blur(6px); animation: steamRise 5s ease-out 0.6s infinite;"></div>
              <div style="position: absolute; left: 33%; top: 132px; width: 14px; height: 14px; border-radius: 50%; background: rgba(243,233,222,0.32); filter: blur(6px); animation: steamRise 4.7s ease-out 2.8s infinite;"></div>
              <!-- bubbling stew at the rim -->
              <div style="position: absolute; left: 50%; top: 174px; width: 206px; height: 32px; margin-left: -103px; border-radius: 50%; background: radial-gradient(ellipse at 42% 32%, #B5532C 0%, #7A2F16 55%, #571F0D 100%); box-shadow: inset 0 5px 12px rgba(0,0,0,0.55), 0 0 22px rgba(217,103,61,0.4);">
                <div style="position: absolute; left: 34px; top: 10px; width: 9px; height: 9px; border-radius: 50%; background: rgba(255,205,160,0.75); animation: bubble 1.9s ease-out infinite;"></div>
                <div style="position: absolute; left: 96px; top: 13px; width: 7px; height: 7px; border-radius: 50%; background: rgba(255,205,160,0.65); animation: bubble 2.5s ease-out 0.7s infinite;"></div>
                <div style="position: absolute; left: 150px; top: 9px; width: 8px; height: 8px; border-radius: 50%; background: rgba(255,205,160,0.7); animation: bubble 2.2s ease-out 1.3s infinite;"></div>
                <div style="position: absolute; left: 66px; top: 8px; width: 5px; height: 5px; border-radius: 50%; background: rgba(255,225,190,0.6); animation: bubble 1.6s ease-out 0.4s infinite;"></div>
              </div>
              <!-- lid, resting ajar -->
              <div style="position: absolute; left: 56%; top: 112px; width: 250px; margin-left: -125px; transform: rotate(10deg); transform-origin: 20% 100%;">
                <div style="display: grid; justify-items: center; animation: lidRattle 5s ease-in-out infinite;">
                  <div style="width: 26px; height: 14px; border-radius: 8px 8px 3px 3px; background: linear-gradient(180deg, #4A3626, #2E2118); box-shadow: inset 0 2px 3px rgba(255,220,180,0.25);"></div>
                  <div style="width: 224px; height: 34px; border-radius: 50% / 100% 100% 0 0; background: linear-gradient(180deg, #E5A66F 0%, #C97F41 80%); box-shadow: inset 0 4px 8px rgba(255,235,210,0.45), 0 6px 14px rgba(0,0,0,0.4);"></div>
                </div>
              </div>
              <!-- pot body -->
              <div style="position: absolute; left: 50%; top: 186px; width: 240px; height: 170px; margin-left: -120px; border-radius: 14px 14px 90px 90px; background: linear-gradient(160deg, #E19B5F 0%, #C97F41 45%, #9E5F2C 100%); box-shadow: inset -18px -12px 40px rgba(60,30,10,0.45), inset 14px 10px 30px rgba(255,225,190,0.3), 0 30px 60px rgba(0,0,0,0.5);">
                <div style="position: absolute; inset: 0; border-radius: 14px 14px 90px 90px; overflow: hidden;">
                  <div style="position: absolute; left: 30px; top: 8px; width: 44px; height: 156px; background: linear-gradient(90deg, transparent, rgba(255,240,220,0.32), transparent); filter: blur(6px); animation: shine 5.5s ease-in-out infinite;"></div>
                </div>
                <div style="position: absolute; left: 22px; right: 22px; top: 26px; height: 3px; border-radius: 3px; background: rgba(255,240,220,0.28);"></div>
                <div style="position: absolute; left: -26px; top: 44px; width: 34px; height: 20px; border-radius: 10px; background: linear-gradient(180deg, #A66A34, #7E4C20); box-shadow: 0 4px 8px rgba(0,0,0,0.35);"></div>
                <div style="position: absolute; right: -26px; top: 44px; width: 34px; height: 20px; border-radius: 10px; background: linear-gradient(180deg, #A66A34, #7E4C20); box-shadow: 0 4px 8px rgba(0,0,0,0.35);"></div>
              </div>
              <div style="position: absolute; left: 50%; top: 378px; width: 280px; height: 44px; margin-left: -140px; border-radius: 50%; background: radial-gradient(ellipse, rgba(0,0,0,0.55) 0%, transparent 70%); filter: blur(6px);"></div>
              <!-- detected-ingredient chips, floating at different depths -->
              <div style="position: absolute; left: 2%; top: 60px; transform: translateZ(95px);">
                <div style="display: flex; align-items: center; padding: 10px 16px; border-radius: 12px; background: rgba(243,233,222,0.07); border: 1px solid rgba(243,233,222,0.14); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); font-size: 14px; font-weight: 600; box-shadow: 0 12px 30px rgba(0,0,0,0.35); animation: chipFloat 6s ease-in-out infinite;"><span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #D68D50; margin-right: 9px; animation: pulseDot 2s ease-in-out infinite;"></span>tomatoes <span style="color: #8E7F6F; font-weight: 400;">&nbsp;·&nbsp; detected</span></div>
              </div>
              <div style="position: absolute; right: 0%; top: 140px; transform: translateZ(50px);">
                <div style="display: flex; align-items: center; padding: 10px 16px; border-radius: 12px; background: rgba(243,233,222,0.07); border: 1px solid rgba(243,233,222,0.14); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); font-size: 14px; font-weight: 600; box-shadow: 0 12px 30px rgba(0,0,0,0.35); animation: chipFloat 7s ease-in-out 0.8s infinite;"><span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #D68D50; margin-right: 9px; animation: pulseDot 2s ease-in-out 0.5s infinite;"></span>6 eggs <span style="color: #8E7F6F; font-weight: 400;">&nbsp;·&nbsp; detected</span></div>
              </div>
              <div style="position: absolute; left: 6%; top: 320px; transform: translateZ(125px);">
                <div style="display: flex; align-items: center; padding: 10px 16px; border-radius: 12px; background: rgba(243,233,222,0.07); border: 1px solid rgba(243,233,222,0.14); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); font-size: 14px; font-weight: 600; box-shadow: 0 12px 30px rgba(0,0,0,0.35); animation: chipFloat 6.5s ease-in-out 1.6s infinite;"><span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #D68D50; margin-right: 9px; animation: pulseDot 2s ease-in-out 1s infinite;"></span>feta <span style="color: #8E7F6F; font-weight: 400;">&nbsp;·&nbsp; detected</span></div>
              </div>
              <div style="position: absolute; right: 4%; top: 346px; transform: translateZ(75px);">
                <div style="display: flex; align-items: center; padding: 10px 16px; border-radius: 12px; background: rgba(217,103,61,0.14); border: 1px solid rgba(217,103,61,0.35); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); font-size: 14px; font-weight: 600; color: #ECAB8E; box-shadow: 0 12px 30px rgba(0,0,0,0.35); animation: chipFloat 7.5s ease-in-out 2.4s infinite;"><span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #D9673D; margin-right: 9px; animation: pulseDot 1.6s ease-in-out infinite;"></span>3 recipes ready · 18s</div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== STOP 1 · HOW IT WORKS ===== -->
      <section data-depth="1" data-screen-label="How it works" style="position: absolute; inset: 0; display: grid; place-items: center; transform: translateZ(-1600px); opacity: 0;">
        <div data-fit="1" style="width: min(1240px, 100%); box-sizing: border-box; padding: 70px 48px 30px; will-change: transform;">
          <div style="display: grid; gap: 10px; justify-items: center; text-align: center; margin-bottom: 40px;">
            <span style="font-size: 13px; font-weight: 700; letter-spacing: 0.14em; color: #D68D50;">THE CORE LOOP</span>
            <h2 style="margin: 0; font-family: var(--font-display), Georgia, serif; font-weight: 400; font-size: clamp(36px, 3.8vw, 52px); letter-spacing: -0.01em;">Snap. Pick. <em style="color: #D68D50;">Cook.</em></h2>
            <p style="margin: 0; max-width: 520px; font-size: 16.5px; line-height: 1.55; color: #B5A493;">No lists to write, no scrolling recipe blogs. Dinner in three moves.</p>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px;">
            <div data-hover="transform: translateY(-10px) rotate(-0.5deg); border-color: rgba(214,141,80,0.45); box-shadow: 0 28px 60px rgba(0,0,0,0.5), 0 0 40px rgba(214,141,80,0.1);" style="display: grid; gap: 0; border-radius: 20px; background: rgba(36,28,23,0.85); border: 1px solid rgba(243,233,222,0.09); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); overflow: hidden; transition: transform 0.45s cubic-bezier(0.22,1,0.36,1), border-color 0.45s, box-shadow 0.45s;">
              <div style="padding: 24px 24px 14px; display: grid; gap: 7px;">
                <span style="font-family: var(--font-display), Georgia, serif; font-size: 32px; color: rgba(214,141,80,0.65);">1</span>
                <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Snap</h3>
                <p style="margin: 0; font-size: 14.5px; line-height: 1.5; color: #B5A493;">Photograph your fridge or pantry — or type ingredients if you'd rather. Photos stay private to your account.</p>
              </div>
              <div style="margin: 6px 18px 18px; border-radius: 14px; background: #211A15; border: 1px solid rgba(243,233,222,0.08); padding: 13px; display: grid; gap: 9px;">
                <div style="position: relative; height: 104px; border-radius: 10px; overflow: hidden; background: repeating-linear-gradient(45deg, #2A211A 0px, #2A211A 10px, #251D17 10px, #251D17 20px); display: grid; place-items: center;">
                  <span style="font-family: monospace; font-size: 12px; color: #8E7F6F;">[ fridge photo ]</span>
                  <div style="position: absolute; inset: 10px; border: 1.5px solid rgba(214,141,80,0.6); border-radius: 8px;"></div>
                </div>
                <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                  <span style="padding: 4px 10px; border-radius: 999px; background: rgba(214,141,80,0.14); color: #E5A66F; font-size: 11.5px; font-weight: 600;">chicken thighs</span>
                  <span style="padding: 4px 10px; border-radius: 999px; background: rgba(214,141,80,0.14); color: #E5A66F; font-size: 11.5px; font-weight: 600;">spinach</span>
                  <span style="padding: 4px 10px; border-radius: 999px; background: rgba(243,233,222,0.08); color: #B5A493; font-size: 11.5px; font-weight: 600;">+10 more</span>
                </div>
              </div>
            </div>
            <div data-hover="transform: translateY(-10px); border-color: rgba(214,141,80,0.45); box-shadow: 0 28px 60px rgba(0,0,0,0.5), 0 0 40px rgba(214,141,80,0.1);" style="display: grid; gap: 0; border-radius: 20px; background: rgba(36,28,23,0.85); border: 1px solid rgba(243,233,222,0.09); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); overflow: hidden; transition: transform 0.45s cubic-bezier(0.22,1,0.36,1), border-color 0.45s, box-shadow 0.45s;">
              <div style="padding: 24px 24px 14px; display: grid; gap: 7px;">
                <span style="font-family: var(--font-display), Georgia, serif; font-size: 32px; color: rgba(214,141,80,0.65);">2</span>
                <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Pick</h3>
                <p style="margin: 0; font-size: 14.5px; line-height: 1.5; color: #B5A493;">Three recipes tailored to what you have — full macros on every one, plus an AI photo of the finished dish.</p>
              </div>
              <div style="margin: 6px 18px 18px; border-radius: 14px; background: #211A15; border: 1px solid rgba(243,233,222,0.08); padding: 13px; display: grid; gap: 9px;">
                <div style="height: 64px; border-radius: 10px; background: repeating-linear-gradient(45deg, #2A211A 0px, #2A211A 10px, #251D17 10px, #251D17 20px); display: grid; place-items: center;">
                  <span style="font-family: monospace; font-size: 12px; color: #8E7F6F;">[ AI dish photo ]</span>
                </div>
                <div style="display: grid; gap: 2px;">
                  <span style="font-size: 14px; font-weight: 700;">Yogurt-marinated chicken skillet</span>
                  <span style="font-size: 12px; color: #8E7F6F;">25 min · one pan</span>
                </div>
                <div style="display: flex; gap: 6px;">
                  <span style="flex: 1; text-align: center; padding: 5px 4px; border-radius: 8px; background: rgba(243,233,222,0.06); font-size: 11px;"><b style="color: #E5A66F;">520</b><br><span style="color: #8E7F6F;">kcal</span></span>
                  <span style="flex: 1; text-align: center; padding: 5px 4px; border-radius: 8px; background: rgba(243,233,222,0.06); font-size: 11px;"><b style="color: #E5A66F;">46g</b><br><span style="color: #8E7F6F;">protein</span></span>
                  <span style="flex: 1; text-align: center; padding: 5px 4px; border-radius: 8px; background: rgba(243,233,222,0.06); font-size: 11px;"><b style="color: #E5A66F;">28g</b><br><span style="color: #8E7F6F;">carbs</span></span>
                  <span style="flex: 1; text-align: center; padding: 5px 4px; border-radius: 8px; background: rgba(243,233,222,0.06); font-size: 11px;"><b style="color: #E5A66F;">24g</b><br><span style="color: #8E7F6F;">fat</span></span>
                </div>
              </div>
            </div>
            <div data-hover="transform: translateY(-10px) rotate(0.5deg); border-color: rgba(214,141,80,0.45); box-shadow: 0 28px 60px rgba(0,0,0,0.5), 0 0 40px rgba(214,141,80,0.1);" style="display: grid; gap: 0; border-radius: 20px; background: rgba(36,28,23,0.85); border: 1px solid rgba(243,233,222,0.09); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); overflow: hidden; transition: transform 0.45s cubic-bezier(0.22,1,0.36,1), border-color 0.45s, box-shadow 0.45s;">
              <div style="padding: 24px 24px 14px; display: grid; gap: 7px;">
                <span style="font-family: var(--font-display), Georgia, serif; font-size: 32px; color: rgba(214,141,80,0.65);">3</span>
                <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Cook</h3>
                <p style="margin: 0; font-size: 14.5px; line-height: 1.5; color: #B5A493;">Step-by-step cooking mode keeps your screen awake while your hands are busy.</p>
              </div>
              <div style="margin: 6px 18px 18px; border-radius: 14px; background: #211A15; border: 1px solid rgba(243,233,222,0.08); padding: 16px 15px; display: grid; gap: 11px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-size: 12px; font-weight: 700; letter-spacing: 0.08em; color: #D68D50;">STEP 3 OF 7</span>
                  <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: #8E7F6F;"><span style="width: 6px; height: 6px; border-radius: 50%; background: #D68D50;"></span>screen stays awake</span>
                </div>
                <p style="margin: 0; font-size: 15px; line-height: 1.5; font-weight: 500;">Sear the chicken 4 minutes per side until deeply golden. Don't move it early.</p>
                <div style="display: flex; gap: 4px;">
                  <div style="flex: 1; height: 4px; border-radius: 2px; background: #D68D50;"></div>
                  <div style="flex: 1; height: 4px; border-radius: 2px; background: #D68D50;"></div>
                  <div style="flex: 1; height: 4px; border-radius: 2px; background: #D68D50;"></div>
                  <div style="flex: 1; height: 4px; border-radius: 2px; background: rgba(243,233,222,0.12);"></div>
                  <div style="flex: 1; height: 4px; border-radius: 2px; background: rgba(243,233,222,0.12);"></div>
                  <div style="flex: 1; height: 4px; border-radius: 2px; background: rgba(243,233,222,0.12);"></div>
                  <div style="flex: 1; height: 4px; border-radius: 2px; background: rgba(243,233,222,0.12);"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== STOP 2 · FEATURES ===== -->
      <section data-depth="2" data-screen-label="Features" style="position: absolute; inset: 0; display: grid; place-items: center; transform: translateZ(-3200px); opacity: 0;">
        <div data-fit="1" style="width: min(1240px, 100%); box-sizing: border-box; padding: 70px 48px 30px; will-change: transform;">
          <div style="display: grid; gap: 10px; margin-bottom: 36px; max-width: 620px;">
            <span style="font-size: 13px; font-weight: 700; letter-spacing: 0.14em; color: #D68D50;">FEATURES</span>
            <h2 style="margin: 0; font-family: var(--font-display), Georgia, serif; font-weight: 400; font-size: clamp(36px, 3.8vw, 52px); letter-spacing: -0.01em; text-wrap: balance;">Everything between <em style="color: #D68D50;">fridge</em> and fork.</h2>
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px;">
            ${FEATURE_CARDS}
          </div>
        </div>
      </section>

      <!-- ===== STOP 3 · PRICING ===== -->
      <section data-depth="3" data-screen-label="Pricing" style="position: absolute; inset: 0; display: grid; place-items: center; transform: translateZ(-4800px); opacity: 0;">
        <div data-fit="1" style="width: min(1020px, 100%); box-sizing: border-box; padding: 70px 48px 30px; will-change: transform;">
          <div style="display: grid; gap: 12px; justify-items: center; text-align: center; margin-bottom: 32px;">
            <span style="font-size: 13px; font-weight: 700; letter-spacing: 0.14em; color: #D68D50;">PRICING</span>
            <h2 style="margin: 0; font-family: var(--font-display), Georgia, serif; font-weight: 400; font-size: clamp(36px, 3.8vw, 52px); letter-spacing: -0.01em;">Start free. <em style="color: #D68D50;">Stay fed.</em></h2>
            <div style="display: inline-flex; padding: 4px; border-radius: 999px; background: rgba(243,233,222,0.06); border: 1px solid rgba(243,233,222,0.1); gap: 4px; margin-top: 6px;">
              <button id="sb-btn-monthly" style="padding: 8px 18px; border-radius: 999px; border: none; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 700; background: transparent; color: #B5A493;">Monthly</button>
              <button id="sb-btn-annual" style="padding: 8px 18px; border-radius: 999px; border: none; cursor: pointer; font-family: inherit; font-size: 14px; font-weight: 700; background: #D68D50; color: #2A1B10;">Annual <span style="opacity: 0.75; font-weight: 600;">· save 37%</span></button>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 22px; align-items: stretch;">
            <div data-hover="transform: translateY(-8px); border-color: rgba(243,233,222,0.28); box-shadow: 0 26px 56px rgba(0,0,0,0.5);" style="display: grid; gap: 16px; align-content: start; padding: 30px; border-radius: 22px; background: rgba(36,28,23,0.85); border: 1px solid rgba(243,233,222,0.1); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); transition: transform 0.45s cubic-bezier(0.22,1,0.36,1), border-color 0.45s, box-shadow 0.45s;">
              <div style="display: grid; gap: 5px;">
                <span style="font-size: 15px; font-weight: 700; color: #B5A493;">Free</span>
                <div style="display: flex; align-items: baseline; gap: 8px;">
                  <span style="font-family: var(--font-display), Georgia, serif; font-size: 46px;">$0</span>
                  <span style="font-size: 14px; color: #8E7F6F;">no card required</span>
                </div>
              </div>
              <div style="height: 1px; background: rgba(243,233,222,0.09);"></div>
              <div style="display: grid; gap: 10px; font-size: 14.5px; color: #D8CCBE;">
                <div style="display: flex; gap: 10px;"><span style="color: #D68D50;">✓</span>10 recipe generations / month</div>
                <div style="display: flex; gap: 10px;"><span style="color: #D68D50;">✓</span>Macros on every recipe</div>
                <div style="display: flex; gap: 10px;"><span style="color: #D68D50;">✓</span>Smart shopping list</div>
                <div style="display: flex; gap: 10px;"><span style="color: #D68D50;">✓</span>Diet & allergy rules</div>
              </div>
              <a href="#" data-cta-enter data-hover="border-color: rgba(243,233,222,0.45); color: #F3E9DE;" style="display: block; text-align: center; margin-top: 4px; padding: 12px 24px; border-radius: 999px; border: 1px solid rgba(243,233,222,0.2); color: #F3E9DE; font-weight: 700; font-size: 15px;">Get started free</a>
            </div>
            <div data-hover="transform: translateY(-8px) scale(1.01); border-color: rgba(217,103,61,0.7); box-shadow: 0 30px 70px rgba(217,103,61,0.22);" style="position: relative; display: grid; gap: 16px; align-content: start; padding: 30px; border-radius: 22px; background: linear-gradient(170deg, rgba(66,34,24,0.92), rgba(46,32,22,0.88)); border: 1px solid rgba(217,103,61,0.45); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); box-shadow: 0 20px 60px rgba(217,103,61,0.12); transition: transform 0.45s cubic-bezier(0.22,1,0.36,1), border-color 0.45s, box-shadow 0.45s;">
              <span style="position: absolute; top: -12px; right: 26px; padding: 5px 14px; border-radius: 999px; background: #D9673D; color: #2A1B10; font-size: 11.5px; font-weight: 800; letter-spacing: 0.08em;">MOST POPULAR</span>
              <div style="display: grid; gap: 5px;">
                <span style="font-size: 15px; font-weight: 700; color: #ECAB8E;">Pro</span>
                <div style="display: flex; align-items: baseline; gap: 8px;">
                  <span id="sb-pro-price" style="font-family: var(--font-display), Georgia, serif; font-size: 46px;">$59.99</span>
                  <span id="sb-pro-per" style="font-size: 14px; color: #B5A493;">/year</span>
                </div>
                <span id="sb-pro-note" style="font-size: 13px; color: #ECAB8E; min-height: 18px;">That's ~$5/mo — save 37%</span>
              </div>
              <div style="height: 1px; background: rgba(243,233,222,0.12);"></div>
              <div style="display: grid; gap: 10px; font-size: 14.5px; color: #F0E4D6;">
                <div style="display: flex; gap: 10px;"><span style="color: #D9673D;">✓</span>Everything in Free</div>
                <div style="display: flex; gap: 10px;"><span style="color: #D9673D;">✓</span><b>Unlimited</b> recipe generations</div>
                <div style="display: flex; gap: 10px;"><span style="color: #D9673D;">✓</span>AI photo of every dish</div>
                <div style="display: flex; gap: 10px;"><span style="color: #D9673D;">✓</span>Weekly meal planner</div>
                <div style="display: flex; gap: 10px;"><span style="color: #D9673D;">✓</span>Adapt any recipe on the fly</div>
              </div>
              <a href="#" data-cta-enter data-hover="background: #E5A66F; color: #2A1B10;" style="display: block; text-align: center; margin-top: 4px; padding: 12px 24px; border-radius: 999px; background: #D68D50; color: #2A1B10; font-weight: 700; font-size: 15px; box-shadow: 0 8px 24px rgba(214,141,80,0.3);">Go Pro</a>
            </div>
          </div>
        </div>
      </section>

      <!-- ===== STOP 4 · FINAL CTA + FOOTER ===== -->
      <section data-depth="4" data-screen-label="Final CTA" style="position: absolute; inset: 0; display: grid; place-items: center; transform: translateZ(-6400px); opacity: 0;">
        <div data-fit="1" style="width: min(1000px, 100%); box-sizing: border-box; padding: 70px 48px 30px; display: grid; gap: 34px; will-change: transform;">
          <div data-hover="transform: translateY(-6px); box-shadow: 0 30px 70px rgba(0,0,0,0.5), 0 0 60px rgba(214,141,80,0.12);" style="position: relative; overflow: hidden; border-radius: 26px; border: 1px solid rgba(214,141,80,0.3); background: linear-gradient(160deg, rgba(58,38,24,0.9), rgba(30,23,19,0.85)); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); padding: 64px 48px; display: grid; gap: 18px; justify-items: center; text-align: center; transition: transform 0.45s cubic-bezier(0.22,1,0.36,1), box-shadow 0.45s;">
            <div style="position: absolute; top: -60%; left: 25%; width: 600px; height: 400px; border-radius: 50%; background: radial-gradient(ellipse, rgba(214,141,80,0.28) 0%, transparent 70%); filter: blur(30px); pointer-events: none;"></div>
            <h2 style="position: relative; margin: 0; font-family: var(--font-display), Georgia, serif; font-weight: 400; font-size: clamp(38px, 4.4vw, 58px); letter-spacing: -0.01em; max-width: 640px; text-wrap: balance;">Your fridge already knows what's for dinner.</h2>
            <p style="position: relative; margin: 0; font-size: 17px; color: #C9BBAA;">10 free recipes a month. No card required.</p>
            <a href="#" data-cta-enter style="position: relative; display: inline-block; margin-top: 4px; padding: 15px 30px; border-radius: 999px; background: #D68D50; color: #2A1B10; font-size: 16.5px; font-weight: 700; white-space: nowrap; box-shadow: 0 10px 34px rgba(214,141,80,0.4);" data-hover="background: #E5A66F; color: #2A1B10; transform: translateY(-1px);">Get started free</a>
          </div>
          <footer style="display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap; padding: 0 8px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 26px; height: 26px; border-radius: 7px; background: linear-gradient(145deg, #DE9A5E, #C97F41); display: grid; place-items: center;">
                <div style="display: grid; justify-items: center; gap: 1.5px;">
                  <div style="width: 10px; height: 1.5px; border-radius: 2px; background: #FFF7EF;"></div>
                  <div style="width: 13px; height: 8px; border-radius: 1.5px 1.5px 4px 4px; background: #FFF7EF;"></div>
                </div>
              </div>
              <span style="font-size: 14.5px; font-weight: 700;">Sousbot</span>
              <span style="font-size: 13px; color: #8E7F6F;">· sousbot.ai</span>
            </div>
            <span style="font-size: 13px; color: #8E7F6F;">Web · iOS · Android — © 2026 Sousbot</span>
          </footer>
        </div>
      </section>
    </div>

    <!-- Depth progress dots -->
    <div style="position: absolute; right: 22px; top: 50%; transform: translateY(-50%); display: grid; gap: 12px; z-index: 40;">
      <button data-dot="0" data-goto="0" title="Intro" style="width: 10px; height: 10px; border-radius: 50%; border: none; cursor: pointer; background: #D68D50; padding: 0; transition: transform 0.3s, background 0.3s;"></button>
      <button data-dot="1" data-goto="1" title="How it works" style="width: 10px; height: 10px; border-radius: 50%; border: none; cursor: pointer; background: rgba(243,233,222,0.2); padding: 0; transition: transform 0.3s, background 0.3s;"></button>
      <button data-dot="2" data-goto="2" title="Features" style="width: 10px; height: 10px; border-radius: 50%; border: none; cursor: pointer; background: rgba(243,233,222,0.2); padding: 0; transition: transform 0.3s, background 0.3s;"></button>
      <button data-dot="3" data-goto="3" title="Pricing" style="width: 10px; height: 10px; border-radius: 50%; border: none; cursor: pointer; background: rgba(243,233,222,0.2); padding: 0; transition: transform 0.3s, background 0.3s;"></button>
      <button data-dot="4" data-goto="4" title="Get started" style="width: 10px; height: 10px; border-radius: 50%; border: none; cursor: pointer; background: rgba(243,233,222,0.2); padding: 0; transition: transform 0.3s, background 0.3s;"></button>
    </div>

    <!-- Scroll hint -->
    <div id="sb-hint" style="position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; font-size: 12px; letter-spacing: 0.12em; color: #8E7F6F; transition: opacity 0.5s; pointer-events: none;">SCROLL TO DIVE IN <span style="display: inline-block; width: 1px; height: 26px; background: linear-gradient(180deg, #D68D50, transparent);"></span></div>
  </div>

  <!-- ===== FIXED NAV ===== -->
  <nav data-screen-label="Nav" style="position: fixed; top: 0; left: 0; right: 0; z-index: 50; display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 14px 48px; background: rgba(23,18,16,0.72); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border-bottom: 1px solid rgba(243,233,222,0.07);">
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="width: 36px; height: 36px; border-radius: 9px; background: linear-gradient(145deg, #DE9A5E, #C97F41); display: grid; place-items: center; box-shadow: 0 4px 14px rgba(214,141,80,0.35);">
        <div style="display: grid; justify-items: center; gap: 2px;">
          <div style="width: 14px; height: 2px; border-radius: 2px; background: #FFF7EF;"></div>
          <div style="width: 18px; height: 11px; border-radius: 2px 2px 6px 6px; background: #FFF7EF;"></div>
        </div>
      </div>
      <span style="font-size: 19px; font-weight: 700; letter-spacing: -0.02em;">Sousbot</span>
    </div>
    <div style="display: flex; align-items: center; gap: 28px; font-size: 14.5px; font-weight: 500;">
      <a href="#" data-goto="1" style="color: #B5A493; white-space: nowrap;" data-hover="color: #F3E9DE;">How it works</a>
      <a href="#" data-goto="2" style="color: #B5A493; white-space: nowrap;" data-hover="color: #F3E9DE;">Features</a>
      <a href="#" data-goto="3" style="color: #B5A493; white-space: nowrap;" data-hover="color: #F3E9DE;">Pricing</a>
      <a href="#" data-cta-enter style="display: inline-block; padding: 9px 18px; border-radius: 999px; background: #D68D50; color: #2A1B10; font-weight: 700; white-space: nowrap;" data-hover="background: #E5A66F; color: #2A1B10;">Get started free</a>
    </div>
  </nav>
</div>
`;

export function LandingPage() {
  const { mockSignIn } = useAuth();
  const toast = useToast();
  const rootRef = useRef<HTMLDivElement>(null);

  // Keep the latest enter() handler reachable from the vanilla listeners wired
  // once in the effect below, without re-running the effect on every render.
  const enterRef = useRef(() => {});
  enterRef.current = async () => {
    try {
      await mockSignIn();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Couldn't start — try again", "error");
    }
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const cleanups: (() => void)[] = [];
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // --- style-hover: apply the hover declarations on top of the base style ---
    root.querySelectorAll<HTMLElement>("[data-hover]").forEach((el) => {
      const hover = el.getAttribute("data-hover") || "";
      const base = el.getAttribute("style") || "";
      const on = () => el.setAttribute("style", `${base};${hover}`);
      const off = () => el.setAttribute("style", base);
      el.addEventListener("mouseenter", on);
      el.addEventListener("mouseleave", off);
      cleanups.push(() => {
        el.removeEventListener("mouseenter", on);
        el.removeEventListener("mouseleave", off);
      });
    });

    // --- camera dolly: scroll drives translateZ; sections fade in/out by depth ---
    const GAP = 1600;
    const STOPS = 5;
    const world = root.querySelector<HTMLElement>("#sb-world");
    const hint = root.querySelector<HTMLElement>("#sb-hint");
    const sections = Array.from(root.querySelectorAll<HTMLElement>("[data-depth]"));
    const dots = Array.from(root.querySelectorAll<HTMLElement>("[data-dot]"));
    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

    const update = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const p = clamp(window.scrollY / max, 0, 1);
      const camZ = p * GAP * (STOPS - 1);
      if (world) world.style.transform = `translateZ(${camZ}px)`;
      sections.forEach((s) => {
        const i = Number(s.getAttribute("data-depth"));
        const d = i * GAP - camZ; // distance in front of camera
        let o: number;
        if (d < 0) o = 1 - clamp(-d / (GAP * 0.32), 0, 1); // flying past: fade out fast
        else if (d < GAP) o = 1 - 0.92 * (d / GAP); // approaching: brighten
        else o = clamp(0.08 - ((d - GAP) / GAP) * 0.08, 0, 0.08); // far ahead: faint silhouette
        s.style.opacity = String(clamp(o, 0, 1));
        s.style.pointerEvents = Math.abs(d) < GAP * 0.5 ? "auto" : "none";
        s.style.visibility = o <= 0.01 ? "hidden" : "visible";
      });
      const active = Math.round(p * (STOPS - 1));
      dots.forEach((dot, i) => {
        dot.style.background = i === active ? "#D68D50" : "rgba(243,233,222,0.2)";
        dot.style.transform = i === active ? "scale(1.35)" : "scale(1)";
      });
      if (hint) hint.style.opacity = p < 0.04 ? "1" : "0";
    };

    // --- fit: scale each stop down so its content always fits the viewport ---
    const fitEls = Array.from(root.querySelectorAll<HTMLElement>("[data-fit]"));
    const fit = () => {
      const avail = window.innerHeight - 64; // leave room for nav/hint
      fitEls.forEach((el) => {
        el.style.transform = "none";
        const h = el.offsetHeight;
        const s = Math.min(1, avail / Math.max(1, h));
        el.style.transformOrigin = "50% 0";
        el.style.transform = `translateY(${
          Math.max(0, (window.innerHeight - h * s) / 2) - el.offsetTop
        }px) scale(${s})`;
      });
    };

    const onScroll = () => update();
    const onResize = () => {
      fit();
      update();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    cleanups.push(() => window.removeEventListener("scroll", onScroll));
    cleanups.push(() => window.removeEventListener("resize", onResize));
    fit();
    update();
    const t = window.setTimeout(() => {
      fit();
      update();
    }, 400); // refit after fonts load
    cleanups.push(() => window.clearTimeout(t));
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        fit();
        update();
      });
    }

    // --- smooth-scroll nav / dots ---
    const goTo = (i: number) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo({ top: (i / (STOPS - 1)) * max, behavior: "smooth" });
    };
    root.querySelectorAll<HTMLElement>("[data-goto]").forEach((el) => {
      const handler = (ev: Event) => {
        ev.preventDefault();
        goTo(Number(el.getAttribute("data-goto")));
      };
      el.addEventListener("click", handler);
      cleanups.push(() => el.removeEventListener("click", handler));
    });

    // --- product CTAs → mock sign-in (enter the app) ---
    root.querySelectorAll<HTMLElement>("[data-cta-enter]").forEach((el) => {
      const handler = (ev: Event) => {
        ev.preventDefault();
        enterRef.current();
      };
      el.addEventListener("click", handler);
      cleanups.push(() => el.removeEventListener("click", handler));
    });

    // --- pricing monthly/annual toggle ---
    let annual = true;
    const price = root.querySelector<HTMLElement>("#sb-pro-price");
    const per = root.querySelector<HTMLElement>("#sb-pro-per");
    const note = root.querySelector<HTMLElement>("#sb-pro-note");
    const btnMonthly = root.querySelector<HTMLElement>("#sb-btn-monthly");
    const btnAnnual = root.querySelector<HTMLElement>("#sb-btn-annual");
    const renderPricing = () => {
      if (price) price.textContent = annual ? "$59.99" : "$7.99";
      if (per) per.textContent = annual ? "/year" : "/month";
      if (note)
        note.textContent = annual
          ? "That's ~$5/mo — save 37%"
          : "Or $59.99/year (~$5/mo, save 37%)";
      if (btnMonthly) {
        btnMonthly.style.background = annual ? "transparent" : "#D68D50";
        btnMonthly.style.color = annual ? "#B5A493" : "#2A1B10";
      }
      if (btnAnnual) {
        btnAnnual.style.background = annual ? "#D68D50" : "transparent";
        btnAnnual.style.color = annual ? "#2A1B10" : "#B5A493";
      }
    };
    const setMonthly = () => {
      annual = false;
      renderPricing();
    };
    const setAnnual = () => {
      annual = true;
      renderPricing();
    };
    btnMonthly?.addEventListener("click", setMonthly);
    btnAnnual?.addEventListener("click", setAnnual);
    cleanups.push(() => btnMonthly?.removeEventListener("click", setMonthly));
    cleanups.push(() => btnAnnual?.removeEventListener("click", setAnnual));

    // --- pot parallax tilt on mouse move ---
    const scene = root.querySelector<HTMLElement>("#sb-pot-scene");
    const parallax = root.querySelector<HTMLElement>("#sb-parallax");
    if (scene && parallax && !reduce) {
      const move = (e: MouseEvent) => {
        const r = scene.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        parallax.style.transform = `rotateY(${x * 16}deg) rotateX(${-y * 12}deg)`;
      };
      const leave = () => {
        parallax.style.transform = "none";
      };
      scene.addEventListener("mousemove", move);
      scene.addEventListener("mouseleave", leave);
      cleanups.push(() => {
        scene.removeEventListener("mousemove", move);
        scene.removeEventListener("mouseleave", leave);
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, []);

  return (
    <div ref={rootRef} className="sb-landing">
      <style dangerouslySetInnerHTML={{ __html: BASE_CSS }} />
      <div dangerouslySetInnerHTML={{ __html: MARKUP }} />
    </div>
  );
}
