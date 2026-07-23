package com.sousbot.app.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

// Dark is the primary/canonical theme (DESIGN.md: "Dark theme primary, matching the screenshots"
// + the glass system is dark-only in the source doc). We still define a light fallback using the
// same accent so the app doesn't break under forced-light-mode accessibility settings, but it is
// not a design target for v1.

private val SousbotDarkColors = darkColorScheme(
    primary = AccentBase,
    onPrimary = OnAccent,
    secondary = ProAccentDark,
    onSecondary = OnAccent,
    background = BgGradientMid,
    onBackground = TextBase,
    surface = BgGradientMid,
    onSurface = TextBase,
    surfaceVariant = GlassPanelHigh,
    onSurfaceVariant = TextBase,
    error = ProAccentDark,
    onError = OnAccent,
    outline = GlassBorderSubtle,
)

private val SousbotLightColors = lightColorScheme(
    primary = AccentBase,
    onPrimary = OnAccent,
    secondary = ProAccentLight,
    onSecondary = androidx.compose.ui.graphics.Color.White,
    background = androidx.compose.ui.graphics.Color(0xFFFAF6EF),
    onBackground = androidx.compose.ui.graphics.Color(0xFF26221C),
    surface = androidx.compose.ui.graphics.Color(0xFFFFFFFF),
    onSurface = androidx.compose.ui.graphics.Color(0xFF26221C),
)

@Composable
fun SousbotTheme(
    darkTheme: Boolean = true, // dark is canonical per DESIGN.md; ignore system light mode by default
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) SousbotDarkColors else SousbotLightColors
    MaterialTheme(
        colorScheme = colorScheme,
        typography = SousbotTypography,
        content = content,
    )
}
