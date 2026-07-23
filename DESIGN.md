# Sousbot — Design System Specification

Extracted from `/home/Koragan/projects/sousbot/_design/` (the "Forkful" design doc). This is a **read-only extraction** — the source files were not modified. Screenshots live in `_design/screens/`. Machine-readable tokens (with the terracotta remap already applied) live in `_design/tokens.json`.

## 0. Source map & how this was produced

The design doc ships two sibling variants plus device-chrome wrappers:

| File | Role | Screens |
|---|---|---|
| `Forkful Glass.dc.html` / `glass-export-src.html` / `Forkful Glass.html` (1.2MB bundle, identical content) | **Canonical visual language** — dark "liquid glass" theme | 7 (iOS ×6, Web ×1) |
| `Forkful Interfaces.dc.html` | Earlier, non-glass ("v1") light theme — full 3-platform coverage. Used **only** to fill screens the Glass set never got around to. | 18 (iOS ×10, Android ×5, Web ×3) |
| `ios-frame.jsx`, `android-frame.jsx`, `browser-window.jsx` | Device-chrome React wrappers (status bar, bezel, nav pill/gesture bar, browser tab bar). Confirm viewport sizes. Not part of the product UI. |
| `support.js` | The "dc-runtime" that turns the `.dc.html` doc into a live page: it fetches React 18 + Babel standalone from unpkg, JSX-transpiles the `x-import`ed frame components in-browser, and mounts every screen as a sibling `<div data-om-starter="…">`. |
| `PRD.md` | Product spec — cross-referenced in §6. |

**Important finding:** the Glass theme was only ever applied to 7 of the ~18 product screens (iOS welcome/home/ingredient-review/recipe-detail/cooking-mode/paywall + one web dashboard). Meal planner, shopping list, profile/settings, and **all of Android** exist only in the light "v1" theme. The doc's own "try next" suggestion literally says *"apply glass theme to Android too"* — it was never done. **Every screen in this spec that is not one of the 7 canonical Glass screens needs its glass treatment (§2) invented by extrapolation from the 7 that exist.** This is flagged per-row in the screen inventory (§6).

Screenshots were produced by serving the `_design/` folder over local HTTP (file:// fails — the doc's runtime does `fetch()` on the sibling `.jsx` files and CORS blocks that under `file://`), letting Chrome execute the runtime (headless Chrome + CDP, 2x device scale), then reading the exact pixel rect of each `[data-om-starter]` device-frame element and clipping a screenshot to it. This crops each screen to just its device frame with zero surrounding canvas.

## 1. Colour tokens

Two full palettes exist because of the two theme variants (dark glass vs. light v1), plus a distinct Material 3 palette Android uses. All three are documented below; the **remap target for Sousbot is the accent role in every one of them.**

### 1.1 Which tokens are "the green accent" (→ remap to `#D68D50`)

| Token (as used in source) | Hex | Theme / surface | Role |
|---|---|---|---|
| `#9FCBAB` | sage green | **Glass** (dark, canonical) | Primary accent — CTAs, active nav icon, progress fill, timer icon, ingredient-chip checkmarks, "have" ingredient icons |
| `#3E7B4F` | herb green | Light "v1" theme (iOS + Web) | Primary accent — same roles as above |
| `#2F5F3D` | herb green hover | Light "v1" theme | Hover/pressed state of `#3E7B4F`, and text color for the active sidebar nav item on web |
| `#3B6B47` | M3 green | Android (Material 3) | Primary accent (Android's own slightly-adjusted hue of the same green) |
| `#7FB98E` | mint | Dark **cooking-mode** screen (used in both v1 and glass) | A lighter/brighter accent variant specifically for on-black cooking mode (progress bar fill, timer icon, "STEP N OF 8" label) |
| `#0B2913` | near-black green | Android | Text-on-accent for light green M3 surfaces (`#BDE6C3`, `#C8E6C4`) |
| `#20301F` | near-black green | Android | Text on the light-green "+ Add item" chip |
| `#E8F0E6` / `#CBD9C8` / `#BDE6C3` / `#C8E6C4` / `#EDF6EA` | light green surfaces | v1 / Android | Tint/subtle backgrounds (active nav row, "you have" free-meter dots' *inactive* dot, Android hero card, Android FAB rest state, Android annual-plan radio surface) |

All of the above are **the same semantic slot** (brand/primary accent) reskinned per platform. In Sousbot they all become variants of **`#D68D50`**.

### 1.2 Remapped accent ramp (`#D68D50` primary)

Base `#D68D50` = HSL(27°, 62%, 58%). Ramp derived by shifting lightness/saturation on that same hue, matching the role each old green token played:

| Token | Hex | Derivation | Replaces / used for |
|---|---|---|---|
| `--accent` | `#D68D50` | base | Primary buttons, active nav, progress fill — replaces `#9FCBAB` / `#3E7B4F` / `#3B6B47` |
| `--accent-hover` | `#CD7830` | L 58%→50% | Hover state — replaces `#2F5F3D` |
| `--accent-pressed` | `#AC6428` | L 58%→42%, S+3 | Pressed/active state |
| `--accent-light` (for glass/dark-mode fills, e.g. cooking-mode) | `#E0A97B` | L 58%→68% | Replaces `#7FB98E` (cooking-mode accent) |
| `--accent-subtle-bg-light` | `#F8EFE7` | L→94%, S 55% | Light-theme tint background (chips, active nav row) — replaces `#E8F0E6` |
| `--accent-subtle-border-light` | `#EED7C4` | L→85%, S 55% | Light-theme tint border |
| `--accent-subtle-bg-dark` | `#51361F` | L→22%, S 45% | Dark/glass-theme solid tint surface (e.g. Android hero-card equivalent on dark) |
| `--accent-text-on-tint` | `#9D5C25` | L→38% | Text color when placed on a light accent-tinted background (needs AA contrast) |
| `--accent-on-dark-border` | `#B26D34` | L→45%, S 55% | Border stroke for accent-tinted glass chips on dark bg |
| `--accent-disabled` | `#BCA48F` | L 65%, S 25% | Disabled/muted accent |
| `--on-accent` | **`#2A1B10`** (dark warm, NOT white) | — | Text/icon color on top of a solid `--accent` fill. **Important:** contrast-checked — white-on-`#D68D50` is only 2.7:1 (fails WCAG AA even for large text); dark warm text gives 6.2:1. The old dark-green (`#3E7B4F`, L≈36%) was dark enough for white text; `#D68D50` (L≈58%) is not. Use dark text on solid-accent buttons everywhere, mirroring how the Glass theme already used dark text (`#14231A`) on its lighter sage (`#9FCBAB`). |
| Glass-style translucent chip tints | `rgba(214,141,80,0.10–0.35)` | same alpha steps the source used for `rgba(143,199,158,…)` | ingredient "have" chips, badges, progress track fill on glass bg |

**Naming collision to resolve deliberately:** the source doc already has a *second*, separate warm/orange accent — "paprika" (`#E08A5F` glass / `#C75B33` v1 / `#8C4A2B` Android) — reserved strictly for **Pro-gating, "missing" ingredient states, and errors**. Since Sousbot's new primary brand color (`#D68D50`) is itself warm/terracotta, it now sits very close in hue to that existing secondary "paprika" role, risking the two losing their semantic distinction (a user could no longer tell "this is the brand color" from "this needs your attention / this is Pro-gated" at a glance).

**Recommendation:** keep the secondary/Pro-gating accent but shift it redder and darker so it stays clearly distinct from the new brand accent:
- `--pro-accent` → **`#C1502A`** (deepened/reddened from `#C75B33`) for light surfaces
- `--pro-accent-dark` → **`#D9673D`** for dark/glass surfaces (deepened from `#E08A5F`)
- Keep its existing tint/border/text pattern (`rgba(pro-accent, .1–.45)` backgrounds, ~40–50% alpha borders) exactly as the source used it for `#E08A5F`/`#C75B33`.

### 1.3 Full palette — Glass theme (dark, canonical)

| Token | Value | Role |
|---|---|---|
| Page background | `linear-gradient(170deg,#1A231D 0%,#12181A 55%,#101314 100%)` | Base gradient behind every glass screen |
| Page background (cooking mode, no bloom) | `linear-gradient(170deg,#151A17 0%,#0F1213 100%)` | Darker/flatter variant used only for cooking mode |
| Bloom — accent (top-right, most screens) | `radial-gradient(90% 60% at 85% -5%, rgba(143,199,158,.28) 0%, rgba(143,199,158,0) 60%)` (alpha varies .16–.28 by screen) | Soft accent-color light bloom |
| Bloom — paprika (bottom-left, most screens) | `radial-gradient(70% 50% at 0% 100%, rgba(224,138,95,.22) 0%, rgba(224,138,95,0) 60%)` (alpha .16–.25) | Soft warm secondary bloom |
| Primary heading text | `#F4F0E6` | Serif display headings, large numbers |
| Base cream text | `#E9E4D8` | Body text at full opacity, wordmark, solid light buttons ("Continue with Apple") |
| Body/secondary text | `rgba(233,228,216,.70)` down to `rgba(233,228,216,.30)` | Opacity ramp of `#E9E4D8`: `.70` body copy → `.65/.60` supporting text → `.50/.45` meta/labels → `.40/.35/.30` disclaimers, footnotes |
| Accent (green→terracotta) | `#9FCBAB` → **`#D68D50`** | see §1.1/1.2 |
| Accent text-on-fill | `#14231A` → **`#2A1B10`** | Text on solid accent buttons |
| Paprika/Pro accent | `#E08A5F` → **`#D9673D`** (recommended) | Pro badges, "missing" dots |
| Paprika text-on-tint | `#E8A47F` → derive from new pro-accent | Text on translucent paprika chip |
| Page/icon-on-cream | `#14171A` / `#14171C` | Text on solid cream buttons |

**Glass panel system** (see §2 for full mechanics):
- Panel background: `rgba(255,255,255,.04)` to `rgba(255,255,255,.09)` (most common `.05`–`.07`)
- Panel border: `1px solid rgba(255,255,255,.12)` to `rgba(255,255,255,.18)`
- Inner shine: `inset 0 1px 0 rgba(255,255,255,.12–.20)`

### 1.4 Full palette — Light "v1" theme (iOS + Web, non-glass)

| Token | Value | Role |
|---|---|---|
| Page canvas (outside device, the doc's own background) | `#EFEBE2` | not part of the product, doc chrome only |
| App background | `#FAF6EF` | screen bg |
| Primary text | `#26221C` | headings, primary labels |
| Secondary text | `#57503F` | body/supporting |
| Tertiary/muted text | `#8A8071` | meta, timestamps, placeholder copy |
| Quaternary/disabled text | `#B8AE9C` | chevrons, struck-through list items, disabled hints |
| Fridge-photo placeholder texture | `repeating-linear-gradient(45deg,#E3DACA 0 8px,#EDE5D6 8px 16px)` | "your photo" placeholders |
| Dish-photo placeholder texture | `repeating-linear-gradient(45deg,#EFE7D9 0 8px,#F6F0E5 8px 16px)` | AI dish-photo placeholders (fills in async) |
| Avatar background | `#DCCFB6` | user initial avatar bg |
| Avatar text | `#6E5E41` | initial letter color |
| Accent (green→terracotta) | `#3E7B4F` → **`#D68D50`** | primary CTAs, active states |
| Accent hover | `#2F5F3D` → **`#CD7830`** | hover/active nav text |
| Accent tint bg | `#E8F0E6` → **`#F8EFE7`** | active sidebar row, chip fill |
| Paprika/Pro accent | `#C75B33` → **`#C1502A`** (recommended) | Pro badges, "missing" states, errors |
| Paprika text | `#A34526` | text on paprika tint |
| Paprika tint bg | `#F7E9E1` | allergy chip bg |
| Paprika tint border | `#E5BFA9` | allergy chip border |
| Low-confidence-detection tag bg/border/text | `#FBF3E4` / `#E4C989` / `#8A6A1F` | "cream · 62%?" uncertain ingredient chip |
| Card bg | `#FFFFFF` | all cards/list containers |
| Card border | `rgba(38,34,28,.08)` to `rgba(38,34,28,.16)` | hairline borders (`.06` dividers, `.08–.10` card borders, `.12–.16` input/chip borders, `.20–.25` dashed "add" borders) |
| Dark-mode override (cooking mode only) | bg `#181512`, text `#fff`/`rgba(255,255,255,.35–.75)`, accent `#7FB98E`→**`#E0A97B`** | the one screen in the v1 theme that's already dark |

### 1.5 Full palette — Android (Material 3)

| Token | Value | Role |
|---|---|---|
| Surface | `#F7FAF1` | screen bg (product screens) |
| M3 kit internal surface (frame chrome only, not product) | `#f4fbf8` | status bar / app bar bg from `android-frame.jsx` |
| On-surface (primary text) | `#1B1F19` | |
| On-surface-variant (secondary text) | `#74796F` / `#49454F` | `.74796F` for meta text, `#49454F` for stroked icons/checkboxes |
| Disabled / struck-through | `#9AA093` | |
| Accent (green→terracotta) | `#3B6B47` → **`#D68D50`** | FAB, filled buttons, active nav pill |
| Accent-on-light-surface text | `#0B2913` / `#20301F` → **`--on-accent` `#2A1B10`** | text on light-green (now light-terracotta) surfaces |
| Accent light surfaces | `#BDE6C3` (hero card), `#C8E6C4` (active nav pill bg), `#E8F0E6`/`#EDF2E6`/`#EDF6EA` (misc tint) → **`--accent-subtle-bg-light` `#F8EFE7`** family | |
| Pro/paprika accent | `#8C4A2B` → **`#C1502A`** (recommended, Android tends slightly darker than iOS in-source; keep consistent across platforms in Sousbot) | missing-item dot, PRO tag, cancel action |
| Pro/paprika tint bg | `#F0DFD4` | |
| Uncertain-detection tag | bg `#F3E7C9`, border `#C9A94E`, text `#6E5716` | |
| Card bg / border / divider | `#FFFFFF` / `#E0E6DA` / `#EDF0E8` | |
| Frame border (bezel, chrome-only) | `rgba(116,119,117,0.5)`, 8px | not product UI |

### 1.6 Web browser chrome (not product UI, for reference)

`browser-window.jsx`: tab bar bg `#202124`, tab bg `#35363a`, text `#e8eaed`, dim text `#9aa0a6`, url-bar bg `#282a2d`. macOS traffic lights `#ff5f57` / `#febc2e` / `#28c840`. Window corner radius `10px`, shadow `0 24px 80px rgba(0,0,0,.35), 0 0 0 1px rgba(0,0,0,.1)`.

## 2. Glass treatment (signature look — be exact)

The glass system is a layered recipe applied consistently across every glass-theme surface. Every glass panel in the source doc is built from up to four stacked ingredients:

1. **Base gradient background** (see §1.3) — always the deep forest-charcoal `linear-gradient(170deg,#1A231D 0%,#12181A 55%,#101314 100%)`, with 1–2 soft radial "bloom" lights (`radial-gradient(...at X% Y%, rgba(accent,α) 0%, rgba(accent,0) 60%)`) positioned per-screen to imply ambient light near the hero element.
2. **Translucent fill** — `background: rgba(255,255,255, α)` where α scales with elevation:
   - Lowest elevation (dividers, disabled bars): `rgba(255,255,255,.04)`
   - Standard card/panel: `rgba(255,255,255,.05)` – `.07`
   - Elevated/hero panel (home hero card, cook-input panel): `rgba(255,255,255,.06)` – `.09`
   - Nav bar (highest, needs opacity for legibility over scrolling content): `rgba(30,36,32,.55)` (tinted, not pure white-alpha)
3. **Backdrop blur** — `backdrop-filter: blur(Npx)` (+ `saturate(160%)` on most elevated panels), radius scales with size/prominence:
   - Small icon buttons / pills: `blur(10px)` or `blur(12px)`
   - Standard cards/chips: `blur(14px)`
   - Elevated hero panels: `blur(18px) saturate(160%)` or `blur(20px) saturate(160%)`
   - Bottom nav bar (top of stack, most blur): `blur(22px) saturate(160%)`
   - Always paired with `-webkit-backdrop-filter` equivalent in implementation (source omits it since Chrome doesn't need the prefix, but Safari/iOS WebKit does)
4. **Hairline border** — `1px solid rgba(255,255,255, β)`, β from `.12` (subtle cards) to `.18` (hero panels, buttons)
5. **Inner shine** — `box-shadow: inset 0 1px 0 rgba(255,255,255, γ)`, γ `.12`–`.20`, simulates a top-edge light catch
6. **Outer elevation shadow** — `box-shadow: 0 Npx Mpx rgba(0,0,0, δ)`, scaling with elevation:
   - Small buttons: `0 8px 24px rgba(accent,.25)` (colored shadow using the button's own accent, for CTAs) or no shadow (secondary buttons)
   - Cards: none-to-subtle, folded into the inset shine only
   - Hero panel: `0 20px 50px rgba(0,0,0,.35–.40)` / `0 24px 60px rgba(0,0,0,.45)`
   - Nav bar (floating): `0 14px 36px rgba(0,0,0,.5)`
   - Modal-like full device frame: `0 40px 80px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.12)` (from `ios-frame.jsx` — the phone bezel itself)

**Composited example — home hero card** (`_design/screens/02-ios-home-glass.png`):
```css
border-radius: 30px;
padding: 26px 24px;
background: rgba(255,255,255,.07);
backdrop-filter: blur(20px) saturate(160%);
border: 1px solid rgba(255,255,255,.16);
box-shadow: inset 0 1px 0 rgba(255,255,255,.20), 0 24px 60px rgba(0,0,0,.45);
```
Plus a decorative accent-tinted radial glow clipped inside it: `position:absolute; right:-40px; top:-40px; width:180px; height:180px; border-radius:50%; background: radial-gradient(circle, rgba(accent,.3) 0%, rgba(accent,0) 70%)`.

**Composited example — floating bottom nav bar**:
```css
position: absolute; left:16px; right:16px; bottom:16px;
background: rgba(30,36,32,.55);
backdrop-filter: blur(22px) saturate(160%);
border: 1px solid rgba(255,255,255,.14);
border-radius: 999px; height:66px;
box-shadow: inset 0 1px 0 rgba(255,255,255,.16), 0 14px 36px rgba(0,0,0,.5);
```

**Border-radius scale used throughout glass screens:** `12px`(chips-ish/small) `14–16px`(stat tiles) `20–22px`(medium cards) `24–26px`(pills/list containers) `28–30px`(hero cards, welcome demo box) `999px`(pills/buttons/nav bar) `48px`(iOS device bezel itself, from `ios-frame.jsx`).

**Text on glass**: never pure black; primary text is `#F4F0E6`/`#E9E4D8`, all secondary text is `#E9E4D8` at reduced opacity (see §1.3 ramp) — never a separate gray token. This "one color, many opacities" approach is a deliberate simplification worth keeping in the rebuild.

## 3. Typography

**Font loading**: Google Fonts, loaded via
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;0,700&family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
```
- **`Instrument Serif`** (italic + regular) — display/serif face. `font-family: 'Instrument Serif', Georgia, serif`. Used for: brand wordmark (always italic), all screen-title headlines, big numeric/hero moments. Never used for body or UI chrome.
- **`Schibsted Grotesk`** (400/500/600/700) — UI sans, iOS + Web. `font-family: 'Schibsted Grotesk', system-ui, sans-serif`. All body text, labels, buttons.
- **`Roboto`** (400/500/700) — Android only, `font-family: Roboto, system-ui, sans-serif`, per Material 3 convention.
- **`ui-monospace, Menlo, monospace`** — used only for dev-placeholder captions ("dish photo", "scanned in 0.8s" style meta chips) and doc-internal labels; not part of the real product type system, safe to drop or replace with a real timer/badge treatment.
- iOS system chrome (status bar, from `ios-frame.jsx`) uses `-apple-system, "SF Pro", system-ui` — device-native, not a brand choice.

### 3.1 Observed raw sizes (fidelity reference)

Instrument Serif appears at: `23px` (result-card title), `26px` (section headers e.g. "Check what we found"), `28px` (wordmark), `30px` (greeting/page titles, recipe-detail title), `34px` (cooking-mode instruction), `36px` (web page titles), `40px`/`42px` (welcome headline, v1/glass respectively), `44px`/`46px` (paywall/web headline, v1/glass respectively).

Schibsted Grotesk body/UI sizes span, in roughly half-point steps, from `10px` (tiny caption labels) through `10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5,` up to `17px` (nav-bar large numbers, primary CTA labels). Weights used: `400` (rare, mostly placeholder/dev captions), `500` (secondary nav labels, unselected), `600` (chip labels, nav labels, list rows), `700` (headings-as-UI, all CTA buttons, prices, stat numbers).

### 3.2 Recommended semantic scale (for implementation)

The raw doc hand-tunes near-duplicate sizes (e.g. `13/13.5/14/14.5`) rather than following a strict scale — expected for an AI-mocked design doc, not something to reproduce literally. Snap to:

| Token | Size | Weight | Line-height | Use |
|---|---|---|---|---|
| `display-xl` | 44px | 400 (serif) | 1.05 | Paywall/web hero headline |
| `display-lg` | 34px | 400 (serif) | 1.1–1.25 | Screen headline (welcome, cooking-mode instruction) |
| `display-md` | 28px | 400 (serif) | 1.1–1.15 | Page/section title, recipe title |
| `display-sm` | 23px | 400 (serif) | 1.15 | Card-level title (result card) |
| `wordmark` | 26–28px | 400 italic (serif) | 1 | Brand logotype, always italic |
| `body-lg` | 16px | 600/700 | 1.4–1.5 | Primary CTA label, intro paragraph |
| `body-md` | 14–15px | 400/600 | 1.4–1.5 | Standard body/list text |
| `body-sm` | 12–13px | 500/600 | 1.3–1.4 | Meta text, timestamps, secondary labels |
| `label-xs` | 10–11px | 600/700, tracked `+0.05–0.12em`, often uppercase | 1 | Eyebrow labels, section dividers ("PRODUCE", "STEP 3 OF 8") |
| `mono-caption` | 9–10px | 400 mono | 1 | Dev/placeholder captions only — replace with real content |

## 4. Spacing, radii, elevation

**Spacing** is not on a strict grid in the source (values like `6,7,9,10,11,14,18,22,26` appear alongside clean `4,8,12,16,20,24,28,32` multiples) — treat it as **hand-tuned around a base-4 rhythm**. Recommended token scale for the rebuild:

| Token | px |
|---|---|
| `space-1` | 4 |
| `space-2` | 8 |
| `space-3` | 12 |
| `space-4` | 16 |
| `space-5` | 20 |
| `space-6` | 24 |
| `space-7` | 28 |
| `space-8` | 32 |
| `space-10` | 40 |
| `space-11` | 44 |
| `space-13` | 52 |

Screen-edge padding is consistently `20px` (iOS/Android) horizontally, with device-safe-area top padding of `~70–84px` (accounts for status bar + optional back button) and bottom padding of `40–150px` (accounts for floating tab bar / sticky CTA). Web content padding is `38–52px`.

**Radii scale** (observed, ascending): `4px`(checkbox corners) `5–6px`(oid label chips, doc-internal) `7–8px`(app-bar icon tiles) `10px`(browser window) `12px`(stat tiles, sidebar nav rows) `14–16px`(medium cards, Android cards) `18px`(Android device bezel, web cards) `20–22px`(iOS cards, chip containers) `24px`(input panels, iOS cards large) `26px`(iOS grouped-list container per `IOSList`) `28px`(Android hero card, welcome demo box) `30px`(hero cards) `48px`(iOS device bezel). Pills/buttons/badges: `999px` throughout, no exceptions.

**Elevation** is expressed only via `box-shadow`, no formal z-index/elevation-level tokens in source. Three implicit levels:
- **Flush** (no shadow): standard list rows, inline chips
- **Raised** (`0 8–12px 24–32px rgba(color,.25–.35)`): primary CTAs (shadow tinted with the button's own accent color), floating device elements
- **Floating** (`0 20–40px 50–80px rgba(0,0,0,.35–.5)`): hero panels, bottom nav bar, device bezel itself, modal-like paywall sheet

## 5. Component inventory

Screenshot filenames below refer to `_design/screens/`.

### Buttons
- **Primary (filled, accent)** — pill (`border-radius:999px`), height `44–56px` depending on context (52–56px full-width CTAs, 44–46px inline). Glass: `background:#9FCBAB→#D68D50; color:#14231A→#2A1B10; box-shadow:0 8–12px 24–32px rgba(accent,.25–.35)`. v1: same but flat (no glass blur), `background:#3E7B4F→#D68D50; color:#fff→#2A1B10 (contrast fix, see §1.2)`. Seen on: 01,02,03,04,05,06,07 (glass) and every non-glass screen with a primary CTA.
- **Secondary (glass/outline)** — same pill shape, `background:rgba(255,255,255,.05–.08)` + blur + `border:1px solid rgba(255,255,255,.14–.18)` (glass) or `background:#fff; border:1.5px solid rgba(38,34,28,.16)` (v1). E.g. "Continue with Google", "Type ingredients instead", "Back" (cooking mode).
- **Icon-only circular button** — `44×44`–`52×52px` circle, glass fill + blur, used for back-nav and save/bookmark actions on detail/hero image headers. See 04, 07.
- **Segmented filter pill** (Results screen) — solid dark pill for the active filter ("Quick dinner"), outline pill for inactive ("Leftover rescue", "High protein"). See 08.
- **Icon FAB (Android)** — `96×96px` (home) or `56×56px` (shopping list add), `border-radius:28px`/`16px`, M3 square-ish FAB not a circle. See 12, 15.
- **Danger/Pro outline button** — `border:1.5px solid pro-accent; color:pro-accent; background: transparent/tinted` — "Add N missing to shopping list". See 04, 08, 14.

### Cards
- **Recipe/dish card** (grid or list) — rounded `20–24px`, `overflow:hidden`, dish-photo placeholder block on top (striped texture, `~92–110px` tall) + title/meta padding block below. Glass adds `backdrop-filter:blur(14px)` + inset shine; v1 is flat white + hairline border. See 02, 07, 08.
- **Stat tile** (macro card: KCAL/PROTEIN/CARBS/FAT) — 4-up flex row, each tile `border-radius:12–16px`, centered number (17px/700) over label (10px/600, tracked, uppercase). Protein tile alone gets accent-tinted bg+border to highlight it. See 04, 08.
- **Ingredient list row** — flex row, checkmark icon (accent) or colored dot (pro-accent, for "missing"), item label, optional trailing meta/"missing" tag, `border-bottom:1px solid` hairline divider between rows, container wraps in a card with `border-radius:20–22px`. See 04, 08.
- **Day-plan row (meal planner, list mode)** — leading date block (day abbreviation + number), square dish-thumbnail (`44×44px`), title+meta, optional trailing "Cook →" link. See 09.
- **Week-grid day card (meal planner, web)** — 7-column grid, each card `border-radius:16px`, header (day+date), thumbnail block, title, status line; "today" card gets a `2px solid accent` border; empty days show a dashed-border "+" placeholder card. See 17.

### Chips / tags
- **Ingredient chip** — pill, `padding:9px 8px 9px 14px`, label + small circular "×" remove button (`18×18px`). Three states: normal (neutral bg/border), low-confidence/uncertain (paprika-tinted bg+border+text, e.g. "cream · 62%?"), add-new (dashed border, accent text, no fill). See 03, 12.
- **Diet/allergy pill** — solid accent-filled with a trailing `✓` when active, outline+neutral when inactive (diet), or paprika-tinted with trailing `✕` for allergies. See 10, 18.
- **Section eyebrow label** — uppercase, `10–11px/700`, `letter-spacing:.1–.12em`, muted color, no background — used to divide the shopping list into PRODUCE / DAIRY & FRIDGE / PANTRY. See 08, 10, 14.
- **Status/meta badge** (pill, small) — "PRO · AI PHOTO" (solid pro-accent bg), "scanned in 0.8s" (accent-tinted), "SAVE 37%" (pro-accent, absolutely positioned corner-overlap badge on the annual pricing card). See 04, 06, 09, 13, 16.

### Inputs
- **Drop-zone (web)** — dashed border (`1.5–2px dashed accent@40–45%`), centered icon+label+sub-label, generous padding (`38px 20px`), `border-radius:22–24px`. See 07, 16.
- **Ingredient token input (web)** — card container holding a wrapped row of already-added ingredient chips plus an inline "type an ingredient…" placeholder text (not a bordered `<input>` — the whole card is a single big compound-input affordance), plus a footer row (diet-flags note + submit CTA). See 07, 16.
- **Checkbox (shopping list)** — square, `20–24px`, `border-radius:4–8px`; unchecked = `1.5–2px` neutral border only; checked = solid accent fill + white check glyph + label gets struck-through + muted. See 08, 14.
- **Radio (Android paywall plan picker)** — circle `20×20px`, unchecked = `2px` neutral ring, selected = `6px` accent ring (thick-border trick, no dot needed). See 16.

### Navigation
- **iOS/Android bottom tab bar** — 5 items (Home / Planner / Library / List / Profile), icon (21×21 iOS SVG stroke icons) + 10px label. iOS glass: floating pill, `left:16 right:16 bottom:16`, glass-blurred, `height:66px`. iOS v1: same floating pill shape but flat white `rgba(255,255,255,.94)` + blur(12px) (a lighter glass-lite treatment even in the "non-glass" doc). Android: **not floating** — full-width bar flush to the bottom, `height:88px`, flat surface color, 4 items only (no Profile tab — Android's profile lives in the app bar instead), active item gets a pill-shaped highlight capsule behind the icon. See 02 vs 12 for the iOS/Android contrast.
- **Web left sidebar** — fixed `236px` width, white bg, logo top, 5 nav rows (Cook / Meal planner / Library / Shopping list / Pantry — Settings replaces Pantry as the 5th on the Settings screen itself), active row gets accent-tinted pill background, usage-meter card pinned above a user-identity row at the bottom. See 07, 17, 18.
- **iOS in-context back button** — circular glass/flat icon button, top-left, `36px`, chevron-left SVG. Present on any screen reached by drilling in (ingredient review, results, recipe detail).

### Drawers / sheets / modals
No true bottom-sheet or modal-overlay component exists in the source — the doc is a static mockup with no interactive JS, so nothing is hidden behind a drawer trigger. The closest analogues:
- **Paywall as full-screen "sheet"** — not a drawer, but structured like one: `✕` dismiss top-right, content flows top-to-bottom, sticky CTA at the bottom. Treat as a full-screen modal route, not an overlay sheet. See 06, 09, 16.
- **Sticky bottom action bar** — appears on ingredient-review, recipe-detail, and cooking-mode screens: content scrolls underneath, a `linear-gradient(to top, bg 60–75%, transparent)` fade + solid CTA sits pinned via `position:absolute; bottom:0`. This is the nearest thing to a "grab handle" pattern in the doc, but **there is no visible drag handle bar** anywhere in the source — if Sousbot wants a real bottom-sheet component (e.g. for a future "adapt recipe" flow), the handle bar will need to be designed fresh; nothing to extract here.

### Toasts
None present in the source doc at all — no toast/snackbar component exists in any of the 25 captured frames. Flag as a gap: Sousbot will need to invent this using the existing glass-chip visual language (small pill, glass blur, auto-dismiss) as the closest stylistic precedent.

### Macro/nutrition displays
Covered under "Stat tile" above — the 4-up KCAL/PROTEIN/CARBS/FAT row is the canonical macro display, reused verbatim on both the free-tier results list (08) and Pro recipe detail (04). Protein is always the one tile visually promoted (accent-colored number + tinted tile) — a deliberate emphasis on the protein macro specifically, worth keeping.

### Progress & loading states
- **Usage meter** (X of 10 free generations) — two visual forms: (a) thin pill progress bar (`height:5–6px`, track `rgba(255,255,255,.1)`/`#E6DFD0`, fill = accent, `border-radius:3px`) used on iOS-glass home and web sidebar; (b) a **dot row** (7 filled + 3 empty small circles) used on the iOS-v1/Android home screens — same data, two different visual metaphors depending on theme. Both are always paired with an "N of 10 free left" text label. See 02 vs 11.
- **Cooking-mode step progress** — 8-segment horizontal bar (one segment per recipe step), `4px` tall pill segments, completed = accent, current = bright white/cream, upcoming = `rgba(255,255,255,.15–.18)`. See 05.
- **Async image placeholder** — repeating 45°-diagonal-stripe texture (two warm off-white tones, `8px` repeat) standing in for both user photos and AI-generated dish photos; a small mono-caption inside states what will load there ("AI dish photo · fal.ai · fills in async"). This striped placeholder **is** the loading-state component — there's no spinner/skeleton anywhere in the doc.

### Empty states
None explicitly designed — e.g. an empty shopping list, empty library, or a fresh account with no cook history are never shown. The closest precedent is the dashed-border "+ " placeholder pattern (empty weekend days on the meal planner, "+ Add item"/"+ Add your own item" affordances) — reuse that visual language (dashed border, muted icon/label, accent-colored "+") for any empty-state Sousbot needs to add.

## 6. Screen inventory

"Theme available" column: **Glass** = exists in the canonical dark glass doc; **v1-only** = only exists in the light Interfaces doc, needs glass treatment invented for Sousbot.

| # | Screen | Purpose (PRD story) | Screenshot | Theme available | Navigates from / to | Key components used |
|---|---|---|---|---|---|---|
| 1 | iOS Welcome | Story 1 — one-tap Google/Apple sign-in | `01-ios-welcome-glass.png` | Glass | Entry point → Home | Wordmark, looping-demo placeholder, primary+secondary buttons |
| 2 | iOS Home | Home screen, camera-first (PRD "UX decisions") | `02-ios-home-glass.png` | Glass | ← Welcome; → camera capture, ingredient-review, recipe detail (via Cook again), tab bar to Planner/Library/List/Profile | Usage meter, hero glass CTA card, secondary CTA, dish cards, bottom tab bar |
| 3 | iOS Ingredient review | Stories 2, 3 — confirm/edit detected ingredients | `03-ios-ingredient-review-glass.png` | Glass | ← Home (camera); → Results/Recipe generation | Photo placeholder+scan badge, ingredient chips (incl. low-confidence variant), sticky CTA |
| 4 | iOS Recipe detail (Pro) | Stories 6, 7, 15 — macros + AI photo + start cooking | `04-ios-recipe-detail-glass.png` | Glass | ← Results/Home; → Cooking mode | Hero async-photo header, PRO badge, stat tiles, ingredient list w/ missing states, dual sticky CTA (save + start cooking) |
| 5 | iOS Cooking mode | Story 15 — step-by-step, large text, screen-awake | `05-ios-cooking-mode-glass.png` | Glass | ← Recipe detail; steps forward/back; exits to Home/Library | Step progress bar, glass timer pill, back/next buttons |
| 6 | iOS Paywall | Stories 18, 19 — limit reached, upgrade | `06-ios-paywall-glass.png` | Glass | ← any gated action (11th generation, Pro feature tap) | Usage badge, feature checklist, monthly/annual pricing cards (annual highlighted + SAVE badge), primary CTA, restore-purchase link |
| 7 | Web Cook dashboard | Stories 2, 4, 5 — photo drop or typed ingredients, recent generations | `07-web-cook-glass.png` | Glass | Sidebar hub; → generation flow, Library | Sidebar nav, usage-meter card, drop-zone, token-input panel, recipe grid |
| 8 | iOS Results (free tier) | Story 5 — multiple recipe options, no images for free users | `08-ios-results-free-tier.png` | **v1-only** | ← Ingredient review; → Recipe detail | Filter pills, recipe-summary cards (1 expanded w/ macros + like/dislike, 2 collapsed), regenerate CTA, "Dish photos come with Pro" nudge |
| 9 | iOS Meal planner | Stories 10, 11 — weekly plan from prefs/pantry | `09-ios-meal-planner.png` | **v1-only** | Tab bar; → Recipe detail (Cook →), → Shopping list | Day-plan rows, "cooked ✓"/"tonight" states, missing-ingredients-summary CTA band, tab bar |
| 10 | iOS Shopping list | Stories 11, 12, 13 — only-missing list, checkable, pantry-aware | `10-ios-shopping-list.png` | **v1-only** | Tab bar; from Meal planner ("To list →") | Section eyebrow labels, checkbox rows w/ recipe-source meta tag, "+ Add your own item", sync footnote, tab bar |
| 11 | iOS Profile | Stories 8, 20-23 — diet/allergy set-once, plan status, language/units | `11-ios-profile.png` | **v1-only** | Tab bar | Avatar, diet pill row, allergy pill row (hard-constraint styling), settings list rows, plan-status card w/ Go Pro CTA, sign-out |
| 12 | Android Home | Same as #2, Material 3 | `12-android-home.png` | **v1-only** | Same as #2 | M3 usage-meter (dot row), M3 hero card, square FAB, 4-item bottom bar (no floating pill) |
| 13 | Android Ingredient review | Same as #3, M3 chips | `13-android-ingredient-review.png` | **v1-only** | Same as #3 | M3 outlined chips (rect, not pill), same states as iOS |
| 14 | Android Recipe detail | Same as #4, M3 | `14-android-recipe-detail.png` | **v1-only** | Same as #4 | M3 stat tiles, ingredient rows, single-icon leading action (save only — cooking-mode entry implicit in primary CTA) |
| 15 | Android Shopping list | Same as #10, M3 checkboxes | `15-android-shopping-list.png` | **v1-only** | Same as #10 | M3 square checkboxes, square FAB add button (not a tab bar item — Android has no dedicated List tab shown here) |
| 16 | Android Paywall | Stories 19, 21 — Google Play billing | `16-android-paywall.png` | **v1-only** | Same as #6 | M3 radio-style plan picker, "Subscribe with Google Play" CTA |
| 17 | Web Meal planner | Same as #9, week-grid + missing-ingredients rail | `17-web-meal-planner.png` | **v1-only** | Sidebar; → Shopping list | 7-col week grid, today-highlighted card, dashed empty-day cards, dark summary band CTA |
| 18 | Web Settings | Stories 20-23 — profile, diet, Stripe billing, pantry staples | `18-web-settings.png` | **v1-only** | Sidebar | 2×2 card grid: Profile, Diet & allergies, Subscription (Stripe manage/cancel), Pantry staples |

Reference-only captures (theme comparison, not distinct product screens — kept in `_design/screens/_raw-glass/` and `_design/screens/_raw-interfaces/`): the full 7-frame Glass set and full 18-frame Interfaces set as originally laid out, useful if an agent wants to diff the same screen across both themes pixel-for-pixel.

**Screens named in the PRD but not present in either design doc** (build fresh, no visual precedent to extract): recipe-adapt/URL-paste flow (PRD story 14), thumbs-up/down taste rating UI (story 9, only implied by two icon buttons on the Results card in screen 8 with no visible pressed/rated state), pantry-staples management screen (referenced by settings/profile but never shown as its own screen), Library/history screen (referenced in nav on every screen but never itself captured), onboarding diet/allergy *setup* flow (only the *already-configured* profile view exists, screen 11/18).

## 7. Navigation model

**iOS/Android tab order** (bottom tab bar, left→right): **Home → Planner → Library → List → Profile** (iOS, 5 tabs) / **Home → Planner → Library → List** (Android, 4 tabs — profile/settings is reached via the app bar instead of a tab). This tab order is the intended swipe/segment order for any tab-based transition animation.

**Web sidebar order** (top→bottom): **Cook → Meal planner → Library → Shopping list → Pantry**, with **Settings** as a distinct destination not shown in the persistent sidebar list on most screens but appearing as the active 5th item (replacing Pantry's slot) on the Settings screen itself — i.e. Pantry and Settings likely share a nav affordance or Settings is reached via the user-identity row at the sidebar's bottom, not a top-level item. Treat **Pantry** as the settings-adjacent, lower-priority item.

**Drawers vs. full pages**: nothing in this doc is a true drawer/bottom-sheet (see §5). Every screen captured is a **full page/route**. The sticky-bottom-CTA pattern (ingredient review, recipe detail, cooking mode) is a persistent action bar within a full page, not a modal.

**Flow graph** (primary path, matches PRD acceptance criteria):
```
Welcome (sign-in)
  → Home
      → [camera] → Ingredient review → Generate → Results (free) or Recipe detail (Pro, direct)
      → [type ingredients] → same ingredient review flow
      → [Cook again card] → Recipe detail
      → [tab: Planner] → Meal planner → [Cook →] → Recipe detail
                                       → [To list →] → Shopping list
      → [tab: Library] → (not captured)
      → [tab: List] → Shopping list
      → [tab: Profile] → Profile/Settings
  Recipe detail → [Start cooking] → Cooking mode
  Any gated action (11th generation / Pro feature) → Paywall → [subscribe] → back to origin screen, now unlocked
```

## 8. Motion

**No transitions, animations, easing curves, or durations are specified anywhere in the source doc.** It is a fully static mockup (confirmed: no `@keyframes`, no `transition:`, no animation-related JS — `support.js`'s only runtime job is mounting the static JSX once; there is no interactivity to animate between states). The only motion-adjacent copy in the doc itself is the phrase *"looping demo · fridge photo → plated dish"* on the Welcome screen (`01-ios-welcome-glass.png`) — implying the hero placeholder box is meant to hold a looping video/animation in the real product, but no animation spec for it exists.

**Recommendation for Sousbot**: since nothing is prescribed, motion is a green-field decision — but the visual language (glass blur, soft radial blooms, pill shapes, generous rounded corners) suggests soft/organic easing (e.g. `cubic-bezier(0.22, 1, 0.36, 1)` "ease-out-expo"-ish) and modest durations (150–250ms for micro-interactions, 300–400ms for screen transitions) would fit the tone, consistent with the user's stated preference for subtle/organic motion — but this is a recommendation, not an extraction, and should be treated as such when building.
