package com.sousbot.app.ui.components

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.sousbot.app.theme.AccentBase
import com.sousbot.app.theme.BodyMd
import com.sousbot.app.theme.DisplaySm
import com.sousbot.app.theme.ProAccentDark
import com.sousbot.app.theme.TextBase

@Composable
fun LoadingState(modifier: Modifier = Modifier, label: String = "Loading…") {
    Column(
        modifier = modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        CircularProgressIndicator(color = AccentBase)
        Text(label, style = BodyMd, color = TextBase.copy(alpha = 0.65f), modifier = Modifier.padding(top = 16.dp))
    }
}

@Composable
fun ErrorState(
    message: String,
    modifier: Modifier = Modifier,
    onRetry: (() -> Unit)? = null,
) {
    Column(
        modifier = modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text("Something went sideways", style = DisplaySm, color = TextBase, textAlign = TextAlign.Center)
        Text(
            message,
            style = BodyMd,
            color = ProAccentDark,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 12.dp),
        )
        if (onRetry != null) {
            androidx.compose.foundation.layout.Spacer(Modifier.height(20.dp))
            PrimaryButton(text = "Try again", onClick = onRetry)
        }
    }
}

@Composable
fun EmptyState(
    title: String,
    subtitle: String,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(title, style = DisplaySm, color = TextBase, textAlign = TextAlign.Center)
        Text(
            subtitle,
            style = BodyMd,
            color = TextBase.copy(alpha = 0.55f),
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 8.dp),
        )
    }
}
