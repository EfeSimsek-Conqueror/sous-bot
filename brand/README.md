# Sousbot Brand Assets

Photo of your fridge in, AI-generated recipe out. The mark is a **steaming
cooking pot** — a recognisable kitchen essential with steam wisps rising from
the lid handles. Everything here is hand-drawn SVG (no external assets, no
embedded fonts — all wordmark type is outlined to paths). The glyph uses
`currentColor` for flexible recolouring.

## Palette

| Swatch | Hex | Role |
|---|---|---|
| **Primary 500** | `#D68D50` | The brand colour. Primary buttons, the mark's default fill, links, active states. |
| **Deep 700** | `#945623` | Gradient end / shadow side of the mark colour, hover & pressed states, dark accents on light surfaces. |
| **Ink 900** | `#72431B` | Wordmark colour on light backgrounds, high-contrast body text where a warm neutral (not pure black) is wanted. |
| **Tint 200** | `#EDCCB0` | Light surfaces, badges, subtle fills, borders on cream backgrounds. |
| **Wash 100** | `#F4EBE3` | Page/card backgrounds, the lightest surface in the ramp. |
| **Cream (on-colour)** | `#FFF7EE` | The mark and wordmark *on* Primary/Deep or on dark backgrounds — warm off-white, never pure `#FFFFFF`, to keep the glassmorphism warmth. |
| **Ink-dark surface** | `#14171A` | The product's dark-mode background (matches `_design/Forkful Glass.html`). Use as the backdrop for `logo-full-dark.svg`. |

All shades were derived from the primary's hue (27°) at fixed saturation, varying
only lightness, so the ramp stays visually related to `#D68D50` at every step.

## Files

| File | What it is | Use it when |
|---|---|---|
| `logo-mark.svg` | Icon alone, transparent background, fill `#D68D50`. | Anywhere you need just the glyph: nav bars, loading states, watermarks, as a colour-inheriting mask (swap the single `<rect fill>` to re-colour it). |
| `logo-full.svg` | Horizontal lockup, mark + "Sousbot" wordmark, ink text. Transparent canvas. | Default lockup on **light** backgrounds — marketing pages, light-mode headers, docs. |
| `logo-full-dark.svg` | Same lockup, cream wordmark. Transparent canvas. | On **dark** backgrounds (`#14171A` app dark surface, dark hero sections, decks). |
| `icon.svg` | Mark centred on a rounded-square gradient (`#D68D50 → #945623`) with a soft glass highlight. | App-icon-shaped placements: source for all PWA/app icon rasters below. |
| `favicon.svg` + `favicon-16/32/48.png` + `favicon.ico` | Flat-colour (no gradient — gradients turn muddy under 16px) simplified icon. | Browser tab icon. `favicon.ico` is the multi-resolution (16/32/48) file for legacy `<link rel="icon">`. |
| `android/ic_launcher_foreground.svg` + `ic_launcher_background.svg` | Adaptive-icon layers, 108×108 canvas, mark constrained to the 66×66 safe zone. | Source vectors for Android `adaptive-icon` XML, or re-export at any density. |
| `android/mipmap-*/ic_launcher.png` + `ic_launcher_round.png` | Pre-flattened composites at mdpi(48)/hdpi(72)/xhdpi(96)/xxhdpi(144)/xxxhdpi(192). | Drop straight into `res/mipmap-<density>/` for projects not using adaptive-icon XML, or as a fallback/legacy icon. |
| `web/icon-192.png`, `web/icon-512.png` | PWA manifest icons. | `manifest.json` `icons[]`. |
| `web/apple-touch-icon.png` | 180×180, **opaque** background (iOS ignores transparency and will show black otherwise). | `<link rel="apple-touch-icon">`. |
| `web/og-image.png` | 1200×630 social card — lockup + tagline on the brand gradient. | `og:image` / Twitter card meta tags. |
| `preview.png` | Contact sheet of every asset above, for a one-glance QA pass. | Design review only, not shipped in-product. |

## Usage rules

- **Never recolour the mark to anything outside the ramp.** On light surfaces it's
  Primary `#D68D50`; on Primary/Deep/dark surfaces it's Cream `#FFF7EE`. No gradients
  *on* the glyph itself — gradients live on backgrounds only, the mark stays flat.
- **The sensor node (the small circle at the base of the handle) is a true
  cutout**, not a filled white circle — it's built as an SVG `<mask>` so it
  always shows whatever sits behind it. If you recolour the mark, it recolours
  correctly for free; don't hardcode a second fill.
- **Don't stretch.** Both lockups and the mark are built on square/fixed-ratio
  viewBoxes — scale uniformly only.
- **Don't add a drop shadow to the flat SVG mark.** Elevation/shadow is a
  glassmorphism-panel property (apply it to the *card the logo sits on*), not a
  logo property.

## Clear space

Minimum clear space around the mark or lockup, on any side, is **half the mark's
height** (e.g. mark rendered at 64px → 32px of clear space on all sides). Keep
other UI elements, text, and edges out of that zone.

## Minimum sizes

| Context | Minimum |
|---|---|
| `logo-mark.svg` (glyph alone) | 16px — this is the floor; it was designed and pixel-checked at exactly this size (see `preview.png`). |
| `logo-full.svg` / `logo-full-dark.svg` (lockup) | 120px wide — below this the wordmark strokes get too thin relative to the mark. |
| Favicon | Ship all of `favicon-16/32/48.png` + `favicon.ico`; let the browser pick. Don't hand-roll a single scaled PNG. |

## Mark evolution

The current mark is a **steaming cooking pot** — a user-provided design that
directly communicates the core product function (cooking from recipes) with
universally recognisable kitchen iconography. The pot body, lid, handles, and
rising steam wisps are all rendered as geometric shapes, legible at all sizes
from 16px (favicon) to 512px+. The glyph is final and not regenerated.
