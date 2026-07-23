package com.sousbot.app.ui.library

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sousbot.app.data.model.Recipe
import com.sousbot.app.nav.SousbotViewModelFactory
import com.sousbot.app.theme.BodySm
import com.sousbot.app.theme.DisplayMd
import com.sousbot.app.theme.GlassElevation
import com.sousbot.app.theme.GlassPanel
import com.sousbot.app.theme.LabelXs
import com.sousbot.app.theme.TextBase
import com.sousbot.app.ui.components.EmptyState
import com.sousbot.app.ui.components.ErrorState
import com.sousbot.app.ui.components.LoadingState

/** No visual precedent in `_design/screens/` (flagged as a gap in DESIGN.md §6) — built fresh,
 * reusing the "Cook again" card language from Home in a 2-column grid. */
@Composable
fun LibraryScreen(factory: SousbotViewModelFactory, onOpenRecipe: (String) -> Unit) {
    val vm: LibraryViewModel = viewModel(factory = factory)
    val state by vm.state.collectAsState()

    Column(modifier = Modifier.fillMaxSize()) {
        Text(
            "Library",
            style = DisplayMd,
            color = TextBase,
            modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 16.dp),
        )
        when {
            state.loading -> LoadingState(label = "Loading your recipes…")
            state.error != null -> ErrorState(state.error!!, onRetry = vm::refresh)
            state.recipes.isEmpty() -> EmptyState(
                title = "No saved recipes yet",
                subtitle = "Every recipe you generate or save will show up here.",
            )
            else -> LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(state.recipes, key = { it.id }) { recipe -> LibraryCard(recipe, onClick = { onOpenRecipe(recipe.id) }) }
            }
        }
    }
}

@Composable
private fun LibraryCard(recipe: Recipe, onClick: () -> Unit) {
    GlassPanel(
        shape = RoundedCornerShape(20.dp),
        elevation = GlassElevation.Standard,
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
    ) {
        Column {
            Box(
                modifier = Modifier.fillMaxWidth().aspectRatio(1.4f).background(TextBase.copy(alpha = 0.06f)),
            ) {
                Text(
                    "dish photo",
                    style = LabelXs,
                    color = TextBase.copy(alpha = 0.35f),
                    modifier = Modifier.padding(12.dp),
                )
            }
            Column(modifier = Modifier.padding(12.dp)) {
                Text(recipe.title, style = com.sousbot.app.theme.BodyMd, color = TextBase, fontWeight = FontWeight.Bold, maxLines = 2)
                Text(
                    "${recipe.macros.calories.toInt()} kcal · ${recipe.totalMinutes} min",
                    style = BodySm,
                    color = TextBase.copy(alpha = 0.55f),
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }
    }
}
