package com.sousbot.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sousbot.app.theme.AccentBase
import com.sousbot.app.theme.AccentDisabled
import com.sousbot.app.theme.BodyLg
import com.sousbot.app.theme.GlassBorderButton
import com.sousbot.app.theme.GlassPanelHigh
import com.sousbot.app.theme.OnAccent
import com.sousbot.app.theme.TextBase

private val PillShape = RoundedCornerShape(999.dp)

@Composable
fun PrimaryButton(
    text: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
    onClick: () -> Unit,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(56.dp)
            .clip(PillShape)
            .background(if (enabled) AccentBase else AccentDisabled, PillShape)
            .clickable(enabled = enabled && !loading, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        if (loading) {
            CircularProgressIndicator(modifier = Modifier.height(22.dp), color = OnAccent, strokeWidth = 2.dp)
        } else {
            Text(text = text, style = BodyLg, color = OnAccent, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
fun SecondaryButton(
    text: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp)
            .clip(PillShape)
            .background(GlassPanelHigh, PillShape)
            .border(1.dp, GlassBorderButton, PillShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(text = text, style = BodyLg, color = TextBase, fontWeight = FontWeight.SemiBold)
    }
}

@Composable
fun DangerOutlineButton(
    text: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(52.dp)
            .clip(PillShape)
            .border(1.5.dp, com.sousbot.app.theme.ProAccentDark, PillShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(text = text, style = BodyLg, color = com.sousbot.app.theme.ProAccentDark, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun IconGlassButton(
    modifier: Modifier = Modifier,
    size: androidx.compose.ui.unit.Dp = 44.dp,
    onClick: () -> Unit,
    content: @Composable () -> Unit,
) {
    Box(
        modifier = modifier
            .height(size)
            .width(size)
            .clip(RoundedCornerShape(50))
            .background(GlassPanelHigh, RoundedCornerShape(50))
            .border(1.dp, GlassBorderButton, RoundedCornerShape(50))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        content()
    }
}
