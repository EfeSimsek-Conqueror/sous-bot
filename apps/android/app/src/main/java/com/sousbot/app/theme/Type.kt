package com.sousbot.app.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import com.sousbot.app.R

// Instrument Serif (display) + Schibsted Grotesk (UI) bundled as variable-font TTFs from
// Google Fonts (OFL), per DESIGN.md §3. Roboto is Android's own system default so it needs
// no bundling for the few Material-only surfaces that intentionally fall back to it.
val DisplayFontFamily = FontFamily(
    Font(R.font.instrument_serif_regular, weight = FontWeight.Normal, style = FontStyle.Normal),
    Font(R.font.instrument_serif_italic, weight = FontWeight.Normal, style = FontStyle.Italic),
)

val UiFontFamily = FontFamily(
    Font(R.font.schibsted_grotesk, weight = FontWeight.Normal),
    Font(R.font.schibsted_grotesk, weight = FontWeight.Medium),
    Font(R.font.schibsted_grotesk, weight = FontWeight.SemiBold),
    Font(R.font.schibsted_grotesk, weight = FontWeight.Bold),
    Font(R.font.schibsted_grotesk_italic, weight = FontWeight.Normal, style = FontStyle.Italic),
)

// Semantic scale per DESIGN.md §3.2
val DisplayXl = TextStyle(fontFamily = DisplayFontFamily, fontSize = 44.sp, fontWeight = FontWeight.Normal, lineHeight = 46.sp)
val DisplayLg = TextStyle(fontFamily = DisplayFontFamily, fontSize = 34.sp, fontWeight = FontWeight.Normal, lineHeight = 39.sp)
val DisplayMd = TextStyle(fontFamily = DisplayFontFamily, fontSize = 28.sp, fontWeight = FontWeight.Normal, lineHeight = 31.sp)
val DisplaySm = TextStyle(fontFamily = DisplayFontFamily, fontSize = 23.sp, fontWeight = FontWeight.Normal, lineHeight = 26.sp)
val Wordmark = TextStyle(fontFamily = DisplayFontFamily, fontSize = 27.sp, fontStyle = FontStyle.Italic, lineHeight = 27.sp)
val BodyLg = TextStyle(fontFamily = UiFontFamily, fontSize = 16.sp, fontWeight = FontWeight.Bold, lineHeight = 23.sp)
val BodyMd = TextStyle(fontFamily = UiFontFamily, fontSize = 14.5.sp, fontWeight = FontWeight.Normal, lineHeight = 21.sp)
val BodySm = TextStyle(fontFamily = UiFontFamily, fontSize = 12.5.sp, fontWeight = FontWeight.Medium, lineHeight = 17.sp)
val LabelXs = TextStyle(
    fontFamily = UiFontFamily,
    fontSize = 10.5.sp,
    fontWeight = FontWeight.Bold,
    letterSpacing = 0.1.em,
    lineHeight = 12.sp,
)

val SousbotTypography = Typography(
    displayLarge = DisplayXl,
    displayMedium = DisplayLg,
    displaySmall = DisplayMd,
    headlineLarge = DisplayMd,
    headlineMedium = DisplaySm,
    headlineSmall = DisplaySm,
    titleLarge = BodyLg.copy(fontFamily = UiFontFamily),
    titleMedium = BodyMd.copy(fontWeight = FontWeight.SemiBold),
    titleSmall = BodySm.copy(fontWeight = FontWeight.SemiBold),
    bodyLarge = BodyLg.copy(fontWeight = FontWeight.Normal),
    bodyMedium = BodyMd,
    bodySmall = BodySm,
    labelLarge = BodyMd.copy(fontWeight = FontWeight.SemiBold),
    labelMedium = BodySm,
    labelSmall = LabelXs,
)
