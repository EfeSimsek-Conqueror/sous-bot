package com.sousbot.app.theme

import androidx.compose.ui.graphics.Color

// Generated from /_design/tokens.json — the #D68D50 remap is already applied there.
// Do not hand-edit hexes here without checking tokens.json first.

// Brand accent ramp
val AccentBase = Color(0xFFD68D50)
val AccentHover = Color(0xFFCD7830)
val AccentPressed = Color(0xFFAC6428)
val AccentLight = Color(0xFFE0A97B)
val AccentSubtleBgDark = Color(0xFF51361F)
val AccentTextOnTint = Color(0xFF9D5C25)
val AccentOnDarkBorder = Color(0xFFB26D34)
val AccentDisabled = Color(0xFFBCA48F)
val OnAccent = Color(0xFF2A1B10) // dark warm text/icons on solid accent fill — never white (2.7:1 fail)

// Pro / paprika secondary accent — deliberately redder/darker than brand accent
val ProAccentDark = Color(0xFFD9673D) // dark/glass surfaces
val ProAccentLight = Color(0xFFC1502A) // light surfaces (rare on Android's dark-first UI)
val ProTintBgDark = Color(0x33D9673D)

// Uncertain-detection chip (glass/dark variant, derived from the android token bg/border/text)
val UncertainBg = Color(0xFF6E5716).copy(alpha = 0.28f)
val UncertainBorder = Color(0xFFC9A94E)
val UncertainText = Color(0xFFE7CE87)

// Glass dark theme (canonical) background gradient stops
// NB: top stop warmed from the source's #1A231D (a desaturated GREEN — highest channel was green)
// to a warm neutral, per the locked "no green survives" decision. It was visibly green-casting the
// top of the bare tab screens (Planner/Library/List) which don't overlay an amber bloom. (tokens.json synced.)
val BgGradientTop = Color(0xFF231E1A)
val BgGradientMid = Color(0xFF12181A)
val BgGradientBottom = Color(0xFF101314)
val BgFlatTop = Color(0xFF151A17) // cooking mode flat variant
val BgFlatBottom = Color(0xFF0F1213)

// Text — "one color, many opacities"
val TextPrimary = Color(0xFFF4F0E6) // display headings
val TextBase = Color(0xFFE9E4D8) // body @ 100%

// Glass panel / border / shine
val GlassPanelLow = Color(0x0AFFFFFF)   // 0.04
val GlassPanelMid = Color(0x0FFFFFFF)   // 0.06
val GlassPanelHigh = Color(0x12FFFFFF)  // 0.07
val GlassPanelHero = Color(0x17FFFFFF)  // 0.09
val GlassNavBarBg = Color(0x8C1E2420)   // rgba(30,36,32,.55)
val GlassBorderSubtle = Color(0x1FFFFFFF) // 0.12
val GlassBorderHero = Color(0x29FFFFFF)   // 0.16
val GlassBorderButton = Color(0x2EFFFFFF) // 0.18
val GlassShineSubtle = Color(0x1FFFFFFF)
val GlassShineHero = Color(0x33FFFFFF)

// Below-API-31 fallback: no real blur available, so panels get a higher-opacity solid
// translucent surface instead of a blurred one to keep legibility (see README "blur fallback").
val GlassPanelFallback = Color(0xFF1E2622)
val GlassNavBarFallback = Color(0xFF20281F)
