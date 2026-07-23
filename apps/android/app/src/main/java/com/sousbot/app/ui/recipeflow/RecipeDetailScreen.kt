package com.sousbot.app.ui.recipeflow

import androidx.compose.foundation.background
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
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.BookmarkBorder
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import com.sousbot.app.data.model.RecipeIngredient
import com.sousbot.app.theme.AccentBase
import com.sousbot.app.theme.BodyMd
import com.sousbot.app.theme.BodySm
import com.sousbot.app.theme.DisplayMd
import com.sousbot.app.theme.OnAccent
import com.sousbot.app.theme.ProAccentDark
import com.sousbot.app.theme.TextBase
import com.sousbot.app.ui.components.DangerOutlineButton
import com.sousbot.app.ui.components.ErrorState
import com.sousbot.app.ui.components.IconGlassButton
import com.sousbot.app.ui.components.LoadingState
import com.sousbot.app.ui.components.MacroStatRow
import com.sousbot.app.ui.components.MetaBadge
import com.sousbot.app.ui.components.PrimaryButton

/** DESIGN.md screens 04 (glass)/14 (Android v1): hero photo header, PRO badge, macros row,
 * have/missing ingredient list, sticky save + start-cooking action bar. */
@Composable
fun RecipeDetailScreen(
    vm: RecipeFlowViewModel,
    recipeId: String,
    onBack: () -> Unit,
    onStartCooking: (String) -> Unit,
) {
    val state by vm.state.collectAsState()
    var saved by remember(recipeId) { mutableStateOf(false) }

    LaunchedEffect(recipeId) { vm.loadRecipeDetail(recipeId) }

    when {
        state.loadingDetail -> LoadingState(label = "Loading recipe…")
        state.detailError != null -> ErrorState(state.detailError!!, onRetry = { vm.loadRecipeDetail(recipeId) })
        state.selectedRecipe != null -> {
            val recipe = state.selectedRecipe!!
            Box(modifier = Modifier.fillMaxSize()) {
                LazyColumn(modifier = Modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 120.dp)) {
                    item {
                        Box(modifier = Modifier.fillMaxWidth().aspectRatio(1.4f)) {
                            if (recipe.imageUrl != null) {
                                AsyncImage(
                                    model = recipe.imageUrl,
                                    contentDescription = recipe.title,
                                    contentScale = ContentScale.Crop,
                                    modifier = Modifier.fillMaxSize(),
                                )
                            } else {
                                Box(
                                    modifier = Modifier.fillMaxSize().background(TextBase.copy(alpha = 0.07f)),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        if (recipe.imageStatus == "pending") "AI dish photo · fills in async" else "dish photo",
                                        style = com.sousbot.app.theme.LabelXs,
                                        color = TextBase.copy(alpha = 0.4f),
                                    )
                                }
                            }
                            IconGlassButton(onClick = onBack, modifier = Modifier.align(Alignment.TopStart).padding(20.dp)) {
                                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = TextBase)
                            }
                            if (recipe.imageStatus == "pending" || recipe.imageStatus == "ready") {
                                MetaBadge(
                                    text = "PRO · AI PHOTO",
                                    solidPro = true,
                                    modifier = Modifier.align(Alignment.BottomStart).padding(20.dp),
                                )
                            }
                        }
                    }
                    item {
                        Column(modifier = Modifier.padding(20.dp)) {
                            Text(recipe.title, style = DisplayMd, color = TextBase)
                            Text(
                                "${recipe.totalMinutes} min · serves ${recipe.servings}" +
                                    (recipe.tags.firstOrNull()?.let { " · $it" } ?: ""),
                                style = BodySm,
                                color = TextBase.copy(alpha = 0.55f),
                                modifier = Modifier.padding(top = 6.dp),
                            )
                            androidx.compose.foundation.layout.Spacer(Modifier.height(18.dp))
                            MacroStatRow(macros = recipe.macros)
                            androidx.compose.foundation.layout.Spacer(Modifier.height(24.dp))
                            Text(
                                "Ingredients · you have ${recipe.haveCount}, missing ${recipe.missingCount}",
                                style = BodyMd,
                                color = TextBase,
                                fontWeight = FontWeight.Bold,
                            )
                            androidx.compose.foundation.layout.Spacer(Modifier.height(10.dp))
                            com.sousbot.app.theme.GlassPanel(
                                shape = RoundedCornerShape(20.dp),
                                elevation = com.sousbot.app.theme.GlassElevation.Standard,
                                modifier = Modifier.fillMaxWidth(),
                            ) {
                                Column(modifier = Modifier.fillMaxWidth()) {
                                    recipe.ingredients.forEachIndexed { i, ing ->
                                        IngredientRow(ing)
                                        if (i != recipe.ingredients.lastIndex) {
                                            Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(TextBase.copy(alpha = 0.08f)))
                                        }
                                    }
                                }
                            }
                            if (recipe.missingCount > 0) {
                                androidx.compose.foundation.layout.Spacer(Modifier.height(16.dp))
                                DangerOutlineButton(
                                    text = if (state.addedToShoppingList) "Added to shopping list ✓" else "Add ${recipe.missingCount} missing to shopping list",
                                    onClick = vm::addMissingToShoppingList,
                                )
                            }
                            if (recipe.description.isNotBlank()) {
                                androidx.compose.foundation.layout.Spacer(Modifier.height(20.dp))
                                Text(recipe.description, style = BodyMd, color = TextBase.copy(alpha = 0.7f))
                            }
                        }
                    }
                }

                Row(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .background(
                            androidx.compose.ui.graphics.Brush.verticalGradient(
                                listOf(androidx.compose.ui.graphics.Color.Transparent, com.sousbot.app.theme.BgGradientBottom),
                            ),
                        )
                        .padding(20.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    IconGlassButton(onClick = { saved = !saved; vm.toggleSave() }, size = 56.dp) {
                        Icon(
                            if (saved) Icons.Filled.Bookmark else Icons.Filled.BookmarkBorder,
                            contentDescription = "Save",
                            tint = AccentBase,
                        )
                    }
                    PrimaryButton(
                        text = "Start cooking",
                        modifier = Modifier.weight(1f),
                        onClick = { onStartCooking(recipe.id) },
                    )
                }
            }
        }
        else -> LoadingState(label = "Loading recipe…")
    }
}

@Composable
private fun IngredientRow(ing: RecipeIngredient) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (ing.have) {
            Icon(Icons.Filled.Check, contentDescription = null, tint = AccentBase, modifier = Modifier.size(20.dp))
        } else {
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .background(ProAccentDark, androidx.compose.foundation.shape.CircleShape),
            )
        }
        androidx.compose.foundation.layout.Spacer(Modifier.padding(start = 6.dp))
        val qty = if (ing.quantity > 0) "${formatQty(ing.quantity)} ${ing.unit} ".trim() + " " else ""
        Text("$qty${ing.name}", style = BodyMd, color = TextBase, modifier = Modifier.weight(1f))
        if (!ing.have) {
            Text("missing", style = BodySm, color = ProAccentDark, fontWeight = FontWeight.Bold)
        }
    }
}

private fun formatQty(q: Double): String = if (q == q.toLong().toDouble()) q.toLong().toString() else q.toString()
