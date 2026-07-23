package com.sousbot.app.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Checklist
import androidx.compose.material.icons.filled.Home
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sousbot.app.theme.AccentBase
import com.sousbot.app.theme.BgGradientMid
import com.sousbot.app.theme.LabelXs
import com.sousbot.app.theme.OnAccent
import com.sousbot.app.theme.TextBase

enum class MainTab(val label: String, val icon: ImageVector) {
    Home("Home", Icons.Filled.Home),
    Planner("Planner", Icons.Filled.CalendarMonth),
    Library("Library", Icons.Filled.Bookmark),
    List("List", Icons.Filled.Checklist),
}

/**
 * Android's bottom nav is deliberately NOT the iOS floating pill (DESIGN.md Android-specific
 * row): full-width flush to the bottom, height 88dp, 4 items only (Profile lives in the app bar
 * instead), with a pill highlight capsule behind the active icon.
 */
@Composable
fun BottomNavBar(
    selected: MainTab,
    onSelect: (MainTab) -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(88.dp)
            .background(BgGradientMid),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        MainTab.entries.forEach { tab ->
            NavItem(tab = tab, isSelected = tab == selected, onClick = { onSelect(tab) }, modifier = Modifier.weight(1f))
        }
    }
}

@Composable
private fun NavItem(tab: MainTab, isSelected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val pillColor by animateColorAsState(
        targetValue = if (isSelected) AccentBase.copy(alpha = 0.22f) else androidx.compose.ui.graphics.Color.Transparent,
        label = "navPill",
    )
    Column(
        modifier = modifier
            .fillMaxSize()
            .clickable(onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        androidx.compose.foundation.layout.Box(
            modifier = Modifier
                .clip(RoundedCornerShape(999.dp))
                .background(pillColor)
                .padding(horizontal = 22.dp, vertical = 6.dp),
        ) {
            Icon(
                imageVector = tab.icon,
                contentDescription = tab.label,
                tint = if (isSelected) AccentBase else TextBase.copy(alpha = 0.55f),
            )
        }
        Text(
            text = tab.label,
            style = LabelXs.copy(fontWeight = if (isSelected) FontWeight.Bold else FontWeight.SemiBold),
            color = if (isSelected) TextBase else TextBase.copy(alpha = 0.55f),
            modifier = Modifier.padding(top = 4.dp),
        )
    }
}
