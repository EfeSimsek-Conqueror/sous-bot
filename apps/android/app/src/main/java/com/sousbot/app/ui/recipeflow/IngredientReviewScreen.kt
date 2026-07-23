package com.sousbot.app.ui.recipeflow

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
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
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import com.sousbot.app.theme.AccentBase
import com.sousbot.app.theme.BodyMd
import com.sousbot.app.theme.DisplayMd
import com.sousbot.app.theme.OnAccent
import com.sousbot.app.theme.ProAccentDark
import com.sousbot.app.theme.TextBase
import com.sousbot.app.ui.components.AddItemChip
import com.sousbot.app.ui.components.IngredientChip
import com.sousbot.app.ui.components.LoadingState
import com.sousbot.app.ui.components.MetaBadge
import com.sousbot.app.ui.components.PrimaryButton
import com.sousbot.app.ui.components.ScreenTopBar
import com.sousbot.app.ui.components.SousbotBottomSheet

/**
 * DESIGN.md screens 03 (glass)/13 (Android v1): photo placeholder + "scanned in Ns" badge,
 * editable ingredient chips, sticky "Generate N recipes" CTA. detect-ingredients returns plain
 * strings (no confidence score) so the low-confidence chip variant has nothing real to bind to
 * here — every detected/typed chip renders as the normal state.
 */
@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
fun IngredientReviewScreen(
    vm: RecipeFlowViewModel,
    onBack: () -> Unit,
    onGenerated: () -> Unit,
    onPaywall: () -> Unit,
) {
    val state by vm.state.collectAsState()
    val usage by vm.usage.collectAsState()
    var showAddSheet by remember { mutableStateOf(false) }
    val hasPhoto = state.photoCaptured

    LaunchedEffect(state.paywall) {
        if (state.paywall) {
            vm.consumePaywallFlag()
            onPaywall()
        }
    }
    LaunchedEffect(state.recipes) {
        if (state.recipes.isNotEmpty()) onGenerated()
    }
    LaunchedEffect(Unit) {
        if (!hasPhoto && !state.detected) vm.startTyped()
    }

    Column(modifier = Modifier.fillMaxSize()) {
        ScreenTopBar(title = "Check what we found", onBack = onBack)

        if (state.detecting) {
            LoadingState(modifier = Modifier.weight(1f), label = "Scanning your photo…")
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(20.dp),
            ) {
                if (hasPhoto) {
                    item {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .aspectRatio(1.7f)
                                .background(TextBase.copy(alpha = 0.06f), RoundedCornerShape(20.dp)),
                        ) {
                            Text(
                                "your fridge photo",
                                style = com.sousbot.app.theme.LabelXs,
                                color = TextBase.copy(alpha = 0.35f),
                                modifier = Modifier.align(Alignment.BottomStart).padding(16.dp),
                            )
                            MetaBadge(
                                text = "scanned",
                                modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
                            )
                        }
                    }
                }

                item {
                    if (state.detectError != null) {
                        Text(state.detectError!!, style = BodyMd, color = ProAccentDark)
                    } else {
                        Text(
                            "${state.chips.size} ingredients spotted. Tap × to remove, add what we missed.",
                            style = BodyMd,
                            color = TextBase,
                        )
                    }
                }

                item {
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        state.chips.forEach { chip ->
                            IngredientChip(label = chip.label, onRemove = { vm.removeIngredient(chip.label) })
                        }
                        AddItemChip(onClick = { showAddSheet = true })
                    }
                }

                item {
                    Text(
                        "Pantry staples (salt, oil, spices…) are always included.",
                        style = com.sousbot.app.theme.BodySm,
                        color = TextBase.copy(alpha = 0.5f),
                    )
                }

                item { androidx.compose.foundation.layout.Spacer(Modifier.height(24.dp)) }
            }

            if (state.generateError != null) {
                Text(
                    state.generateError!!,
                    style = BodyMd,
                    color = ProAccentDark,
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 8.dp),
                )
            }

            Column(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
                PrimaryButton(
                    text = "Generate ${3} recipes",
                    loading = state.generating,
                    enabled = state.chips.isNotEmpty(),
                    onClick = vm::generate,
                )
                val remaining = usage.limit?.let { (it - usage.used).coerceAtLeast(0) }
                Text(
                    text = if (remaining != null) "Uses 1 generation · $remaining of ${usage.limit} left this month" else "Unlimited generations · Pro",
                    style = com.sousbot.app.theme.BodySm,
                    color = TextBase.copy(alpha = 0.5f),
                    modifier = Modifier.fillMaxWidth().padding(top = 10.dp),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
            }
        }
    }

    if (showAddSheet) {
        var text by remember { mutableStateOf("") }
        SousbotBottomSheet(onDismiss = { showAddSheet = false }) {
            Column(modifier = Modifier.padding(horizontal = 20.dp)) {
                Text("Add an ingredient", style = DisplayMd, color = TextBase)
                androidx.compose.foundation.layout.Spacer(Modifier.height(16.dp))
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it },
                    placeholder = { Text("e.g. smoked paprika") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = {
                        vm.addIngredient(text)
                        text = ""
                        showAddSheet = false
                    }),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextBase,
                        unfocusedTextColor = TextBase,
                        focusedBorderColor = AccentBase,
                    ),
                    modifier = Modifier.fillMaxWidth(),
                )
                androidx.compose.foundation.layout.Spacer(Modifier.height(16.dp))
                PrimaryButton(text = "Add item", onClick = {
                    vm.addIngredient(text)
                    text = ""
                    showAddSheet = false
                })
            }
        }
    }
}
