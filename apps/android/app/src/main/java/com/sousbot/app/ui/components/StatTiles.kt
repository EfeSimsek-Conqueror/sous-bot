package com.sousbot.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.sousbot.app.data.model.RecipeMacros
import com.sousbot.app.theme.AccentBase
import com.sousbot.app.theme.GlassBorderSubtle
import com.sousbot.app.theme.GlassPanelMid
import com.sousbot.app.theme.LabelXs
import com.sousbot.app.theme.TextBase

/** The 4-up KCAL/PROTEIN/CARBS/FAT macro row (DESIGN.md §5) — protein is always visually promoted. */
@Composable
fun MacroStatRow(macros: RecipeMacros, modifier: Modifier = Modifier) {
    Row(modifier = modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        StatTile("${macros.calories.toInt()}", "KCAL", modifier = Modifier.weight(1f))
        StatTile("${macros.proteinG.toInt()}g", "PROTEIN", highlighted = true, modifier = Modifier.weight(1f))
        StatTile("${macros.carbsG.toInt()}g", "CARBS", modifier = Modifier.weight(1f))
        StatTile("${macros.fatG.toInt()}g", "FAT", modifier = Modifier.weight(1f))
    }
}

@Composable
fun StatTile(value: String, label: String, modifier: Modifier = Modifier, highlighted: Boolean = false) {
    val shape = RoundedCornerShape(14.dp)
    Column(
        modifier = modifier
            .clip(shape)
            .background(if (highlighted) AccentBase.copy(alpha = 0.18f) else GlassPanelMid, shape)
            .border(1.dp, if (highlighted) AccentBase.copy(alpha = 0.5f) else GlassBorderSubtle, shape)
            .padding(vertical = 12.dp, horizontal = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(value, color = if (highlighted) AccentBase else TextBase, fontWeight = FontWeight.Bold, fontSize = 17.sp)
        Text(label, style = LabelXs, color = TextBase.copy(alpha = 0.55f))
    }
}
