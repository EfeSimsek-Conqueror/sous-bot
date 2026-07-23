package com.sousbot.app.ui.recipeflow

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sousbot.app.theme.AccentBase
import com.sousbot.app.theme.AccentLight
import com.sousbot.app.theme.BodyMd
import com.sousbot.app.theme.DisplayLg
import com.sousbot.app.theme.LabelXs
import com.sousbot.app.theme.OnAccent
import com.sousbot.app.theme.TextBase
import com.sousbot.app.ui.components.ErrorState
import com.sousbot.app.ui.components.IconGlassButton
import com.sousbot.app.ui.components.LoadingState
import com.sousbot.app.ui.components.PrimaryButton
import com.sousbot.app.ui.components.SecondaryButton
import kotlinx.coroutines.delay

/** DESIGN.md screen 05 — step-by-step, large serif instruction text, 8-segment progress bar,
 * screen stays awake for the whole cooking session (Story 15). */
@Composable
fun CookingModeScreen(
    vm: RecipeFlowViewModel,
    recipeId: String,
    onExit: () -> Unit,
) {
    val state by vm.state.collectAsState()
    val view = LocalView.current

    LaunchedEffect(recipeId) { vm.loadRecipeDetail(recipeId) }

    DisposableEffect(Unit) {
        view.keepScreenOn = true
        onDispose { view.keepScreenOn = false }
    }

    when {
        state.loadingDetail -> LoadingState(label = "Loading recipe…")
        state.detailError != null -> ErrorState(state.detailError!!, onRetry = { vm.loadRecipeDetail(recipeId) })
        state.selectedRecipe != null -> {
            val recipe = state.selectedRecipe!!
            val steps = recipe.steps.ifEmpty { listOf("No steps were returned for this recipe.") }
            val index = state.cookingStepIndex.coerceIn(0, steps.lastIndex)

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(com.sousbot.app.theme.sousbotFlatBackgroundBrush())
                    .padding(20.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconGlassButton(onClick = onExit, size = 40.dp) {
                        Icon(Icons.Filled.Close, contentDescription = "Exit cooking mode", tint = TextBase)
                    }
                    Text(
                        recipe.title.uppercase(),
                        style = LabelXs,
                        color = TextBase.copy(alpha = 0.55f),
                        modifier = Modifier.weight(1f).padding(start = 16.dp),
                        maxLines = 1,
                    )
                }

                androidx.compose.foundation.layout.Spacer(Modifier.height(20.dp))

                Row(horizontalArrangement = Arrangement.spacedBy(4.dp), modifier = Modifier.fillMaxWidth()) {
                    steps.indices.forEach { i ->
                        val color = when {
                            i < index -> AccentLight
                            i == index -> TextBase
                            else -> TextBase.copy(alpha = 0.15f)
                        }
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(4.dp)
                                .background(color, RoundedCornerShape(2.dp)),
                        )
                    }
                }

                Text(
                    "STEP ${index + 1} OF ${steps.size}",
                    style = LabelXs,
                    color = AccentLight,
                    modifier = Modifier.padding(top = 14.dp),
                )

                Box(modifier = Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.CenterStart) {
                    Column {
                        Text(steps[index], style = DisplayLg, color = TextBase)
                        val minutes = remember(steps[index]) { extractMinutes(steps[index]) }
                        if (minutes != null) {
                            androidx.compose.foundation.layout.Spacer(Modifier.height(24.dp))
                            StepTimerChip(totalSeconds = minutes * 60)
                        }
                    }
                }

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                    SecondaryButton(text = "Back", modifier = Modifier.weight(1f), onClick = vm::previousStep)
                    PrimaryButton(
                        text = if (index == steps.lastIndex) "Done" else "Next step",
                        modifier = Modifier.weight(2f),
                        onClick = { if (index == steps.lastIndex) onExit() else vm.nextStep() },
                    )
                }
                Text(
                    "Screen stays awake while you cook",
                    style = com.sousbot.app.theme.BodySm,
                    color = TextBase.copy(alpha = 0.35f),
                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
            }
        }
        else -> LoadingState(label = "Loading recipe…")
    }
}

@Composable
private fun StepTimerChip(totalSeconds: Int) {
    var remaining by remember(totalSeconds) { mutableIntStateOf(totalSeconds) }
    var running by remember(totalSeconds) { androidx.compose.runtime.mutableStateOf(false) }

    LaunchedEffect(running, remaining) {
        if (running && remaining > 0) {
            delay(1000)
            remaining -= 1
        }
    }

    val shape = RoundedCornerShape(999.dp)
    Row(
        modifier = Modifier
            .clickable { running = !running }
            .background(TextBase.copy(alpha = 0.08f), shape)
            .padding(horizontal = 18.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(Icons.Filled.Timer, contentDescription = null, tint = AccentLight, modifier = Modifier.padding(end = 10.dp))
        Text(
            "%d:%02d".format(remaining / 60, remaining % 60),
            style = BodyMd,
            color = TextBase,
            fontWeight = FontWeight.Bold,
        )
        Text(
            if (running) "  running…" else "  tap to start timer",
            style = BodyMd,
            color = TextBase.copy(alpha = 0.5f),
        )
    }
}

private fun extractMinutes(step: String): Int? {
    val regex = Regex("(\\d+)\\s*(minutes|minute|min)\\b", RegexOption.IGNORE_CASE)
    return regex.find(step)?.groupValues?.get(1)?.toIntOrNull()
}
