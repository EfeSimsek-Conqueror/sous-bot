package com.sousbot.app.ui.mealplanner

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sousbot.app.data.model.MealPlanDay
import com.sousbot.app.nav.SousbotViewModelFactory
import com.sousbot.app.theme.AccentBase
import com.sousbot.app.theme.BodyMd
import com.sousbot.app.theme.BodySm
import com.sousbot.app.theme.DisplayMd
import com.sousbot.app.theme.GlassElevation
import com.sousbot.app.theme.GlassPanel
import com.sousbot.app.theme.LabelXs
import com.sousbot.app.theme.ProAccentDark
import com.sousbot.app.theme.TextBase
import com.sousbot.app.ui.components.ErrorState
import com.sousbot.app.ui.components.LoadingState
import com.sousbot.app.ui.components.PrimaryButton
import com.sousbot.app.ui.components.SecondaryButton

private val DayNames = listOf("MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN")

/** DESIGN.md screen 09 (iOS v1, no glass precedent) — extrapolated onto the glass dark theme:
 * day-plan rows with a leading date block + dish thumbnail + title/meta, a dark missing-
 * ingredients summary band, "Generate week" CTA. Pro-gated — free users see the locked CTA and
 * get routed to Paywall when they tap it. */
@Composable
fun MealPlannerScreen(
    factory: SousbotViewModelFactory,
    onOpenRecipe: (String) -> Unit,
    onPaywall: () -> Unit,
) {
    val vm: MealPlannerViewModel = viewModel(factory = factory)
    val state by vm.state.collectAsState()

    LaunchedEffect(state.paywall) {
        if (state.paywall) {
            vm.consumePaywallFlag()
            onPaywall()
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text("This week", style = DisplayMd, color = TextBase)
                Text("Dinners · 2 servings", style = BodySm, color = TextBase.copy(alpha = 0.55f))
            }
        }
        if (state.plan != null) {
            SecondaryButton(
                text = "Regenerate week",
                modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp),
                onClick = vm::generateWeek,
            )
            androidx.compose.foundation.layout.Spacer(Modifier.height(12.dp))
        }

        when {
            state.loading -> LoadingState(modifier = Modifier.weight(1f), label = "Planning your week…")
            state.error != null -> ErrorState(state.error!!, modifier = Modifier.weight(1f), onRetry = vm::generateWeek)
            state.plan == null -> Box(modifier = Modifier.weight(1f).padding(20.dp)) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text("No plan yet this week", style = DisplayMd, color = TextBase, textAlign = TextAlign.Center)
                    Text(
                        "Generate a 7-day dinner plan from your diet + pantry.",
                        style = BodyMd,
                        color = TextBase.copy(alpha = 0.6f),
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(top = 8.dp, bottom = 24.dp),
                    )
                    PrimaryButton(text = "Generate week", loading = state.loading, onClick = vm::generateWeek)
                }
            }
            else -> {
                val plan = state.plan!!
                val allMissingCount = plan.days.sumOf { day -> day.meals.sumOf { it.recipe.missingCount } }
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 4.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(plan.days) { day -> DayRow(day, onOpenRecipe) }
                    if (allMissingCount > 0) {
                        item {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(20.dp))
                                    .background(ProAccentDark.copy(alpha = 0.18f), RoundedCornerShape(20.dp))
                                    .padding(18.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        "$allMissingCount ingredients missing for this plan",
                                        style = BodyMd,
                                        color = TextBase,
                                        fontWeight = FontWeight.Bold,
                                    )
                                    Text(
                                        "Pantry staples excluded automatically",
                                        style = LabelXs,
                                        color = TextBase.copy(alpha = 0.5f),
                                        modifier = Modifier.padding(top = 4.dp),
                                    )
                                }
                            }
                        }
                    }
                    item { androidx.compose.foundation.layout.Spacer(Modifier.height(100.dp)) }
                }
            }
        }
    }
}

@Composable
private fun DayRow(day: MealPlanDay, onOpenRecipe: (String) -> Unit) {
    val meal = day.meals.firstOrNull()
    GlassPanel(
        shape = RoundedCornerShape(18.dp),
        elevation = GlassElevation.Standard,
        modifier = Modifier
            .fillMaxWidth()
            .then(if (meal != null) Modifier.clickable { onOpenRecipe(meal.recipe.id) } else Modifier),
    ) {
        Row(modifier = Modifier.padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.width(48.dp)) {
                Text(DayNames.getOrElse(day.day - 1) { "DAY" }, style = LabelXs, color = TextBase.copy(alpha = 0.5f))
                Text("${day.day}", style = BodyMd, color = TextBase, fontWeight = FontWeight.Bold)
            }
            Box(
                modifier = Modifier.size(44.dp).background(TextBase.copy(alpha = 0.07f), RoundedCornerShape(12.dp)),
            )
            Column(modifier = Modifier.weight(1f).padding(start = 14.dp)) {
                Text(meal?.recipe?.title ?: "Free day", style = BodyMd, color = TextBase, fontWeight = FontWeight.Bold, maxLines = 1)
                Text(
                    if (meal != null) "${meal.recipe.macros.calories.toInt()} kcal" else "leave it open",
                    style = BodySm,
                    color = TextBase.copy(alpha = 0.55f),
                )
            }
            if (meal != null) {
                Text("Cook →", style = BodySm, color = AccentBase, fontWeight = FontWeight.Bold)
            }
        }
    }
}
