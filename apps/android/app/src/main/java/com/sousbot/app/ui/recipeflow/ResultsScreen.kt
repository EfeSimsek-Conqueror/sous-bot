package com.sousbot.app.ui.recipeflow

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sousbot.app.theme.BodyMd
import com.sousbot.app.theme.BodySm
import com.sousbot.app.theme.DisplaySm
import com.sousbot.app.theme.GlassElevation
import com.sousbot.app.theme.GlassPanel
import com.sousbot.app.theme.LabelXs
import com.sousbot.app.theme.TextBase
import com.sousbot.app.ui.components.EmptyState
import com.sousbot.app.ui.components.MacroStatRow
import com.sousbot.app.ui.components.ScreenTopBar
import com.sousbot.app.ui.components.SecondaryButton

/** DESIGN.md screen 08 — free-tier results list (no dish photos for free users, shown as the
 * striped placeholder + macros row instead), extrapolated onto the glass dark theme. */
@Composable
fun ResultsScreen(
    vm: RecipeFlowViewModel,
    onBack: () -> Unit,
    onOpenRecipe: (String) -> Unit,
) {
    val state by vm.state.collectAsState()

    Column(modifier = Modifier.fillMaxWidth()) {
        ScreenTopBar(title = "Your recipes", onBack = onBack)

        if (state.recipes.isEmpty()) {
            EmptyState(
                title = "Nothing generated yet",
                subtitle = "Head back and add a few ingredients to get started.",
            )
        } else {
            LazyColumn(
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                items(state.recipes) { recipe ->
                    GlassPanel(
                        shape = RoundedCornerShape(22.dp),
                        elevation = GlassElevation.Standard,
                        modifier = Modifier.fillMaxWidth().clickable { onOpenRecipe(recipe.id) },
                    ) {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text(recipe.title, style = DisplaySm, color = TextBase)
                            Text(
                                "${recipe.totalMinutes} min · serves ${recipe.servings} · ${recipe.difficulty}",
                                style = BodySm,
                                color = TextBase.copy(alpha = 0.55f),
                                modifier = Modifier.padding(top = 4.dp),
                            )
                            androidx.compose.foundation.layout.Spacer(Modifier.height(14.dp))
                            MacroStatRow(macros = recipe.macros)
                            Text(
                                "Dish photos come with Pro",
                                style = LabelXs,
                                color = TextBase.copy(alpha = 0.4f),
                                modifier = Modifier.padding(top = 12.dp),
                            )
                        }
                    }
                }
                item {
                    SecondaryButton(text = "Regenerate", onClick = vm::generate, modifier = Modifier.padding(vertical = 12.dp))
                }
                item { androidx.compose.foundation.layout.Spacer(Modifier.height(24.dp)) }
            }
        }
    }
}
