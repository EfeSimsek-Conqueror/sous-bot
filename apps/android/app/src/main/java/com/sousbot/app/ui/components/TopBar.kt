package com.sousbot.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sousbot.app.theme.AccentBase
import com.sousbot.app.theme.DisplayMd
import com.sousbot.app.theme.OnAccent
import com.sousbot.app.theme.TextBase

/** Screen title + optional back button, used on every drilled-in screen. */
@Composable
fun ScreenTopBar(
    title: String,
    modifier: Modifier = Modifier,
    onBack: (() -> Unit)? = null,
    trailing: @Composable (() -> Unit)? = null,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (onBack != null) {
            IconGlassButton(onClick = onBack, size = 40.dp) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = TextBase)
            }
            androidx.compose.foundation.layout.Spacer(Modifier.padding(start = 8.dp))
        }
        Text(title, style = DisplayMd, color = TextBase, modifier = Modifier.weight(1f))
        trailing?.invoke()
    }
}

/** Home's app-bar avatar — Android's profile entry point (no dedicated tab, per DESIGN.md). */
@Composable
fun AvatarButton(initial: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(
        modifier = modifier
            .size(40.dp)
            .background(AccentBase, CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(initial.uppercase(), color = OnAccent, fontWeight = FontWeight.Bold)
    }
}
