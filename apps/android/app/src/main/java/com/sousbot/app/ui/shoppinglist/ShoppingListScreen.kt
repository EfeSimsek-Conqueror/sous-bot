package com.sousbot.app.ui.shoppinglist

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sousbot.app.data.model.ShoppingListItemDto
import com.sousbot.app.nav.SousbotViewModelFactory
import com.sousbot.app.theme.AccentBase
import com.sousbot.app.theme.BodyMd
import com.sousbot.app.theme.BodySm
import com.sousbot.app.theme.DisplayMd
import com.sousbot.app.theme.OnAccent
import com.sousbot.app.theme.TextBase
import com.sousbot.app.ui.components.EmptyState
import com.sousbot.app.ui.components.ErrorState
import com.sousbot.app.ui.components.LoadingState
import com.sousbot.app.ui.components.PrimaryButton
import com.sousbot.app.ui.components.SousbotBottomSheet

/** DESIGN.md screen 10 (iOS v1)/15 (Android v1) — checkable shopping list, square FAB add
 * button (M3 pattern, matches screen 15 exactly rather than a floating pill). No `category`
 * column exists on `shopping_list_items` server-side, so this renders one flat checkable list
 * instead of inventing PRODUCE/DAIRY/PANTRY sections not backed by real data. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShoppingListScreen(factory: SousbotViewModelFactory) {
    val vm: ShoppingListViewModel = viewModel(factory = factory)
    val state by vm.state.collectAsState()
    var showAddSheet by remember { mutableStateOf(false) }

    Box(modifier = Modifier.fillMaxSize()) {
        Column(modifier = Modifier.fillMaxSize()) {
            Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 16.dp)) {
                Text("Shopping list", style = DisplayMd, color = TextBase)
                if (state.items.isNotEmpty()) {
                    val checkedCount = state.items.count { it.checked }
                    Text(
                        "${state.items.size} items · $checkedCount in cart",
                        style = BodySm,
                        color = TextBase.copy(alpha = 0.55f),
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }

            when {
                state.loading -> LoadingState(modifier = Modifier.weight(1f), label = "Loading your list…")
                state.error != null -> ErrorState(state.error!!, modifier = Modifier.weight(1f), onRetry = vm::refresh)
                state.items.isEmpty() -> EmptyState(
                    title = "Your list is empty",
                    subtitle = "Missing ingredients from recipes and meal plans land here automatically.",
                    modifier = Modifier.weight(1f),
                )
                else -> LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(horizontal = 20.dp, vertical = 4.dp, ),
                    verticalArrangement = Arrangement.spacedBy(2.dp),
                ) {
                    items(state.items, key = { it.id ?: it.name }) { item ->
                        ShoppingRow(item, onToggle = { vm.setChecked(item.id, !item.checked) })
                    }
                    item { androidx.compose.foundation.layout.Spacer(Modifier.padding(top = 20.dp)) }
                    item {
                        Text(
                            "Synced across your devices",
                            style = BodySm,
                            color = TextBase.copy(alpha = 0.4f),
                            modifier = Modifier.fillMaxWidth().padding(vertical = 20.dp),
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                        )
                    }
                    item { androidx.compose.foundation.layout.Spacer(Modifier.padding(top = 80.dp)) }
                }
            }
        }

        FloatingActionButton(
            onClick = { showAddSheet = true },
            containerColor = AccentBase,
            contentColor = OnAccent,
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier.align(Alignment.BottomEnd).padding(20.dp),
        ) {
            Icon(Icons.Filled.Add, contentDescription = "Add item")
        }
    }

    if (showAddSheet) {
        var text by remember { mutableStateOf("") }
        SousbotBottomSheet(onDismiss = { showAddSheet = false }) {
            Column(modifier = Modifier.padding(horizontal = 20.dp)) {
                Text("Add your own item", style = DisplayMd, color = TextBase)
                androidx.compose.foundation.layout.Spacer(Modifier.padding(top = 16.dp))
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it },
                    placeholder = { Text("e.g. sourdough loaf") },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextBase,
                        unfocusedTextColor = TextBase,
                        focusedBorderColor = AccentBase,
                    ),
                    modifier = Modifier.fillMaxWidth(),
                )
                androidx.compose.foundation.layout.Spacer(Modifier.padding(top = 16.dp))
                PrimaryButton(text = "Add item", onClick = {
                    vm.addItem(text)
                    text = ""
                    showAddSheet = false
                })
            }
        }
    }
}

@Composable
private fun ShoppingRow(item: ShoppingListItemDto, onToggle: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onToggle)
            .padding(vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(24.dp)
                .clip(RoundedCornerShape(6.dp))
                .background(if (item.checked) AccentBase else TextBase.copy(alpha = 0.06f)),
            contentAlignment = Alignment.Center,
        ) {
            if (item.checked) Icon(Icons.Filled.Check, contentDescription = null, tint = OnAccent, modifier = Modifier.size(16.dp))
        }
        val qtyLabel = listOfNotNull(
            item.quantity?.let { if (it == it.toLong().toDouble()) it.toLong().toString() else it.toString() },
            item.unit,
        ).joinToString(" ")
        Text(
            text = if (qtyLabel.isBlank()) item.name else "${item.name}, $qtyLabel",
            style = BodyMd,
            color = if (item.checked) TextBase.copy(alpha = 0.4f) else TextBase,
            textDecoration = if (item.checked) TextDecoration.LineThrough else null,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.weight(1f).padding(start = 14.dp),
        )
    }
}
