package com.sousbot.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.sousbot.app.theme.AccentBase
import com.sousbot.app.theme.BodySm
import com.sousbot.app.theme.GlassBorderSubtle
import com.sousbot.app.theme.GlassPanelMid
import com.sousbot.app.theme.TextBase

/**
 * Persistent free-tier "X of 10 left this month" indicator (PRD story 18 / interaction
 * requirement 4) — always visible on Home, thin pill progress bar per the glass usage-meter
 * pattern (DESIGN.md §5 "Progress & loading states").
 */
@Composable
fun UsageMeterBar(used: Int, limit: Int?, modifier: Modifier = Modifier) {
    val shape = RoundedCornerShape(999.dp)
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(shape)
            .background(GlassPanelMid, shape)
            .border(1.dp, GlassBorderSubtle, shape)
            .padding(horizontal = 16.dp, vertical = 12.dp),
    ) {
        if (limit == null) {
            Text("Unlimited generations · Pro", style = BodySm, color = AccentBase)
        } else {
            val remaining = (limit - used).coerceAtLeast(0)
            val progress = if (limit == 0) 0f else (used.toFloat() / limit).coerceIn(0f, 1f)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(TextBase.copy(alpha = 0.10f)),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(progress)
                        .height(6.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .background(AccentBase),
                )
            }
            Text(
                text = "$remaining / $limit free left",
                style = BodySm,
                color = AccentBase,
                modifier = Modifier.padding(top = 8.dp),
            )
        }
    }
}
