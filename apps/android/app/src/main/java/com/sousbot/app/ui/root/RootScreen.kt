package com.sousbot.app.ui.root

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import com.sousbot.app.nav.SousbotViewModelFactory
import com.sousbot.app.theme.rememberAnimationsEnabled
import com.sousbot.app.theme.sousbotBackgroundBrush
import com.sousbot.app.ui.components.BottomNavBar
import com.sousbot.app.ui.components.MainTab
import com.sousbot.app.ui.home.HomeScreen
import com.sousbot.app.ui.library.LibraryScreen
import com.sousbot.app.ui.mealplanner.MealPlannerScreen
import com.sousbot.app.ui.shoppinglist.ShoppingListScreen
import kotlinx.coroutines.launch

/**
 * Hosts the swipeable Home/Planner/Library/List pager + the full-width Android bottom nav bar
 * (DESIGN.md Android-specific row: 4 items, no floating pill, pill highlight capsule behind the
 * active icon). Swipe and tab-tap are kept in sync bidirectionally through the single
 * [androidx.compose.foundation.pager.PagerState] — reading `pagerState.currentPage` drives the
 * nav bar's selection, and tapping a nav item drives the pager via [PagerState.animateScrollToPage].
 * The avatar → Profile entry point lives inside [HomeScreen]'s own greeting row (matching
 * `_design/screens/12-android-home.png` exactly), since Android has no dedicated Profile tab.
 */
@Composable
fun RootScreen(
    factory: SousbotViewModelFactory,
    onOpenCamera: () -> Unit,
    onTypeIngredients: () -> Unit,
    onOpenRecipe: (String) -> Unit,
    onOpenProfile: () -> Unit,
    onPaywall: () -> Unit,
) {
    val pagerState = rememberPagerState(pageCount = { MainTab.entries.size })
    val scope = rememberCoroutineScope()
    val animationsEnabled = rememberAnimationsEnabled()

    Box(modifier = Modifier.fillMaxSize().background(sousbotBackgroundBrush())) {
        Column(modifier = Modifier.fillMaxSize()) {
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.weight(1f).fillMaxWidth(),
            ) { page ->
                when (MainTab.entries[page]) {
                    MainTab.Home -> HomeScreen(
                        factory = factory,
                        onOpenCamera = onOpenCamera,
                        onTypeIngredients = onTypeIngredients,
                        onOpenRecipe = onOpenRecipe,
                        onOpenProfile = onOpenProfile,
                    )
                    MainTab.Planner -> MealPlannerScreen(factory = factory, onOpenRecipe = onOpenRecipe, onPaywall = onPaywall)
                    MainTab.Library -> LibraryScreen(factory = factory, onOpenRecipe = onOpenRecipe)
                    MainTab.List -> ShoppingListScreen(factory = factory)
                }
            }

            BottomNavBar(
                selected = MainTab.entries[pagerState.currentPage],
                onSelect = { tab ->
                    scope.launch {
                        if (animationsEnabled) pagerState.animateScrollToPage(tab.ordinal) else pagerState.scrollToPage(tab.ordinal)
                    }
                },
            )
        }
    }
}
