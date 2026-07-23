package com.sousbot.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SheetState
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.sousbot.app.theme.BgGradientTop
import com.sousbot.app.theme.GlassBorderSubtle
import com.sousbot.app.theme.TextBase

/**
 * The one bottom-sheet primitive used across the app (add-ingredient, add-shopping-item, etc).
 * Dismisses either by tapping the scrim or by **dragging the top grab handle down** — that's
 * `ModalBottomSheet`'s default `dragHandle` (`BottomSheetDefaults.DragHandle`), which is exactly
 * the velocity/threshold-snap drag gesture the spec asks for; we deliberately do NOT override it
 * with `dragHandle = null` anywhere in the app.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SousbotBottomSheet(
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    sheetState: SheetState = rememberModalBottomSheetState(),
    content: @Composable () -> Unit,
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = BgGradientTop,
        contentColor = TextBase,
        dragHandle = { BottomSheetDefaults.DragHandle(color = GlassBorderSubtle) },
        modifier = modifier,
    ) {
        androidx.compose.foundation.layout.Box(modifier = Modifier.padding(bottom = 28.dp)) {
            content()
        }
    }
}
