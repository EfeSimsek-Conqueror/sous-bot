package com.sousbot.app.theme

import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithCache
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

/**
 * Elevation tiers for the glass system (DESIGN.md §2). Each maps to a blur radius + panel fill
 * alpha + border alpha, scaling together as elevation increases.
 */
enum class GlassElevation(val blurRadius: Dp, val panelColor: Color, val borderColor: Color, val fallbackColor: Color) {
    Chip(10.dp, GlassPanelMid, GlassBorderSubtle, GlassPanelFallback),
    Standard(14.dp, GlassPanelHigh, GlassBorderSubtle, GlassPanelFallback),
    Hero(20.dp, GlassPanelHero, GlassBorderHero, GlassPanelFallback),
    NavBar(22.dp, GlassNavBarBg, GlassBorderSubtle, GlassNavBarFallback),
}

/**
 * The signature "liquid glass" panel: translucent fill + backdrop blur + hairline border +
 * inner top-edge shine (DESIGN.md §2).
 *
 * Blur strategy (see README "Blur fallback decision"):
 *  - API 31+: real blur via Compose's [Modifier.blur], which is backed by
 *    [android.graphics.RenderEffect.createBlurEffect] on those API levels. Applied to the panel
 *    surface itself (fill + border), not a captured copy of arbitrary content behind it — Compose
 *    has no public "sample the layer beneath me" API without an expensive manual bitmap capture,
 *    and every Sousbot background is our own static gradient + bloom (never live/scrolling camera
 *    content), so self-blur + translucency reads visually the same as true backdrop-filter here.
 *  - API 26-30: [Modifier.blur] silently no-ops (per Compose docs), so we swap in a higher-opacity
 *    solid translucent surface instead ([GlassElevation.fallbackColor]) to keep text legible
 *    without any blur at all — a graceful degrade, not a crash or a broken look.
 */
@Composable
fun GlassPanel(
    modifier: Modifier = Modifier,
    shape: Shape = RoundedCornerShape(24.dp),
    elevation: GlassElevation = GlassElevation.Standard,
    borderWidth: Dp = 1.dp,
    content: @Composable BoxScope.() -> Unit,
) {
    val supportsBlur = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
    // IMPORTANT: the blur must land on its own layer *behind* the content, never on the same
    // Box as `content`. Modifier.blur() blurs everything drawn within that layout node's bounds
    // — including children — so blurring the outer content Box directly would blur the text/
    // icons placed on top of the glass too (this was exactly the earlier bug: hero-card copy was
    // unreadable). A `matchParentSize()` sibling behind `content` gets the blur+fill+border+
    // shine instead; the outer Box sizes to `content` as normal and stays perfectly crisp.
    Box(modifier = modifier.clip(shape)) {
        Box(
            modifier = Modifier
                .matchParentSize()
                .then(if (supportsBlur) Modifier.blur(elevation.blurRadius) else Modifier)
                .background(if (supportsBlur) elevation.panelColor else elevation.fallbackColor, shape)
                .border(borderWidth, if (supportsBlur) elevation.borderColor else elevation.borderColor.copy(alpha = 0.4f), shape),
        )
        Box(modifier = Modifier.matchParentSize().innerShine(shape))
        content()
    }
}

/** Simulates the `inset 0 1px 0 rgba(255,255,255,γ)` top-edge light catch from DESIGN.md §2. */
fun Modifier.innerShine(shape: Shape, color: Color = GlassShineSubtle): Modifier = drawWithCache {
    val outline = shape.createOutline(size, layoutDirection, this)
    onDrawWithContent {
        drawContent()
        // Approximate the CSS inset shine with a thin gradient hugging the top edge.
        drawRect(
            brush = Brush.verticalGradient(
                colors = listOf(color, Color.Transparent),
                startY = 0f,
                endY = size.height * 0.06f,
            ),
        )
    }
}

/** The app's base gradient background (DESIGN.md §1.3), with an optional accent "bloom". */
fun sousbotBackgroundBrush(): Brush = Brush.linearGradient(
    colors = listOf(BgGradientTop, BgGradientMid, BgGradientBottom),
    start = Offset(0f, 0f),
    end = Offset(300f, 1600f),
)

fun sousbotFlatBackgroundBrush(): Brush = Brush.verticalGradient(
    colors = listOf(BgFlatTop, BgFlatBottom),
)

fun accentBloomBrush(center: Offset = Offset.Zero, radius: Float = 900f): Brush = Brush.radialGradient(
    colors = listOf(AccentBase.copy(alpha = 0.28f), AccentBase.copy(alpha = 0f)),
    center = center,
    radius = radius,
)

fun proBloomBrush(center: Offset = Offset.Zero, radius: Float = 700f): Brush = Brush.radialGradient(
    colors = listOf(ProAccentDark.copy(alpha = 0.22f), ProAccentDark.copy(alpha = 0f)),
    center = center,
    radius = radius,
)
