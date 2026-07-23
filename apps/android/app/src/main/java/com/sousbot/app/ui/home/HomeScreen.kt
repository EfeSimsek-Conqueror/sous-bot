package com.sousbot.app.ui.home

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sousbot.app.data.model.Recipe
import com.sousbot.app.nav.SousbotViewModelFactory
import com.sousbot.app.theme.AccentBase
import com.sousbot.app.theme.BodyMd
import com.sousbot.app.theme.DisplayMd
import com.sousbot.app.theme.DisplaySm
import com.sousbot.app.theme.GlassElevation
import com.sousbot.app.theme.GlassPanel
import com.sousbot.app.theme.OnAccent
import com.sousbot.app.theme.TextBase
import com.sousbot.app.ui.components.AvatarButton
import com.sousbot.app.ui.components.SecondaryButton
import com.sousbot.app.ui.components.UsageMeterBar

@Composable
fun HomeScreen(
    factory: SousbotViewModelFactory,
    onOpenCamera: () -> Unit,
    onTypeIngredients: () -> Unit,
    onOpenRecipe: (String) -> Unit,
    onOpenProfile: () -> Unit,
) {
    val vm: HomeViewModel = viewModel(factory = factory)
    val state by vm.state.collectAsState()
    val usage by vm.usage.collectAsState()

    Box(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp)) {
                    Text(state.greeting, style = DisplayMd, color = TextBase, modifier = Modifier.weight(1f))
                    AvatarButton(initial = "S", onClick = onOpenProfile)
                }
            }
            item { UsageMeterBar(used = usage.used, limit = usage.limit) }

            item {
                GlassPanel(
                    shape = RoundedCornerShape(30.dp),
                    elevation = GlassElevation.Hero,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Column(modifier = Modifier.padding(26.dp, 24.dp)) {
                        Box(
                            modifier = Modifier
                                .size(52.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(AccentBase.copy(alpha = 0.25f)),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(Icons.Filled.CameraAlt, contentDescription = null, tint = AccentBase)
                        }
                        Text("Snap your fridge", style = DisplaySm, color = TextBase, modifier = Modifier.padding(top = 18.dp))
                        Text(
                            "Photo in, dinner ideas out — under 20 seconds.",
                            style = BodyMd,
                            color = TextBase.copy(alpha = 0.65f),
                            modifier = Modifier.padding(top = 6.dp),
                        )
                        Box(
                            modifier = Modifier
                                .padding(top = 20.dp)
                                .clip(RoundedCornerShape(999.dp))
                                .background(AccentBase)
                                .padding(horizontal = 24.dp, vertical = 14.dp)
                                .then(Modifier),
                        ) {
                            Text(
                                "Open camera",
                                color = OnAccent,
                                fontWeight = FontWeight.Bold,
                                modifier = Modifier.clickableSafe(onOpenCamera),
                            )
                        }
                    }
                }
            }

            item { SecondaryButton(text = "Type ingredients instead", onClick = onTypeIngredients) }

            item { Text("Cook again", style = DisplayMd, color = TextBase, modifier = Modifier.padding(top = 8.dp)) }

            if (state.cookAgain.isEmpty() && !state.loadingCookAgain) {
                item {
                    Text(
                        "Your generated recipes will show up here.",
                        style = BodyMd,
                        color = TextBase.copy(alpha = 0.5f),
                    )
                }
            } else {
                items(state.cookAgain.chunked(2)) { pair ->
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp), modifier = Modifier.fillMaxWidth()) {
                        pair.forEach { recipe ->
                            CookAgainCard(recipe = recipe, modifier = Modifier.weight(1f), onClick = { onOpenRecipe(recipe.id) })
                        }
                        if (pair.size == 1) Box(modifier = Modifier.weight(1f))
                    }
                }
            }

            item { androidx.compose.foundation.layout.Spacer(Modifier.height(90.dp)) }
        }

        FloatingActionButton(
            onClick = onOpenCamera,
            containerColor = AccentBase,
            contentColor = OnAccent,
            shape = RoundedCornerShape(28.dp),
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(20.dp)
                .size(72.dp),
        ) {
            Icon(Icons.Filled.CameraAlt, contentDescription = "Open camera")
        }
    }
}

@Composable
private fun CookAgainCard(recipe: Recipe, modifier: Modifier = Modifier, onClick: () -> Unit) {
    GlassPanel(
        modifier = modifier.clickableSafe(onClick),
        shape = RoundedCornerShape(20.dp),
        elevation = GlassElevation.Standard,
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1.6f)
                    .background(TextBase.copy(alpha = 0.06f)),
                contentAlignment = Alignment.Center,
            ) {
                Text("dish photo", style = com.sousbot.app.theme.LabelXs, color = TextBase.copy(alpha = 0.35f))
            }
            Column(modifier = Modifier.padding(12.dp)) {
                Text(recipe.title, style = BodyMd, color = TextBase, fontWeight = FontWeight.Bold, maxLines = 2)
                Text(
                    "${recipe.macros.calories.toInt()} kcal · ${recipe.totalMinutes} min",
                    style = com.sousbot.app.theme.BodySm,
                    color = TextBase.copy(alpha = 0.55f),
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }
    }
}

private fun Modifier.clickableSafe(onClick: () -> Unit): Modifier =
    this.then(Modifier.clickable(onClick = onClick))
