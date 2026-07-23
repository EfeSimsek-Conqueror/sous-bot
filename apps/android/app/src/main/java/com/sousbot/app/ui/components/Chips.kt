package com.sousbot.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sousbot.app.theme.AccentBase
import com.sousbot.app.theme.BodyMd
import com.sousbot.app.theme.GlassBorderSubtle
import com.sousbot.app.theme.GlassPanelMid
import com.sousbot.app.theme.TextBase
import com.sousbot.app.theme.UncertainBg
import com.sousbot.app.theme.UncertainBorder
import com.sousbot.app.theme.UncertainText

/** Editable ingredient chip — normal / low-confidence / add-new states (DESIGN.md §5 "Chips"). */
@Composable
fun IngredientChip(
    label: String,
    confidencePercent: Int? = null,
    onRemove: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val isUncertain = confidencePercent != null
    val bg = if (isUncertain) UncertainBg else GlassPanelMid
    val border = if (isUncertain) UncertainBorder else GlassBorderSubtle
    val textColor = if (isUncertain) UncertainText else TextBase
    val shape = RoundedCornerShape(999.dp)

    Row(
        modifier = modifier
            .clip(shape)
            .background(bg, shape)
            .border(1.dp, border, shape)
            .padding(start = 14.dp, end = 8.dp, top = 9.dp, bottom = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        val text = if (confidencePercent != null) "$label · $confidencePercent%?" else label
        Text(text = text, style = BodyMd, color = textColor, fontWeight = FontWeight.SemiBold)
        if (onRemove != null) {
            Box(
                modifier = Modifier
                    .padding(start = 6.dp)
                    .size(18.dp)
                    .clip(CircleShape)
                    .clickable(onClick = onRemove),
                contentAlignment = Alignment.Center,
            ) {
                Icon(Icons.Filled.Close, contentDescription = "Remove $label", tint = textColor, modifier = Modifier.size(14.dp))
            }
        }
    }
}

@Composable
fun AddItemChip(label: String = "Add item", modifier: Modifier = Modifier, onClick: () -> Unit) {
    val shape = RoundedCornerShape(999.dp)
    Row(
        modifier = modifier
            .clip(shape)
            .background(AccentBase.copy(alpha = 0.16f), shape)
            .border(1.dp, AccentBase.copy(alpha = 0.45f), shape, )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Filled.Add, contentDescription = null, tint = AccentBase, modifier = Modifier.size(16.dp))
        Text(text = " $label", style = BodyMd, color = AccentBase, fontWeight = FontWeight.Bold)
    }
}

/** Section eyebrow label — "PRODUCE" / "DAIRY & FRIDGE" / "PANTRY" (DESIGN.md §5). */
@Composable
fun SectionEyebrow(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text.uppercase(),
        style = com.sousbot.app.theme.LabelXs,
        color = AccentBase.copy(alpha = 0.85f),
        modifier = modifier,
    )
}

/** Small status/meta pill — "PRO · AI PHOTO", "scanned in 0.8s". */
@Composable
fun MetaBadge(text: String, modifier: Modifier = Modifier, solidPro: Boolean = false) {
    val shape = RoundedCornerShape(999.dp)
    val bg = if (solidPro) com.sousbot.app.theme.ProAccentDark else GlassPanelMid
    val fg = if (solidPro) com.sousbot.app.theme.OnAccent else TextBase
    Box(
        modifier = modifier
            .clip(shape)
            .background(bg, shape)
            .padding(horizontal = 12.dp, vertical = 6.dp),
    ) {
        Text(text = text, style = com.sousbot.app.theme.LabelXs, color = fg)
    }
}
