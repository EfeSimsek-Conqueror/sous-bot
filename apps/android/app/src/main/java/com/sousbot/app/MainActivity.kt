package com.sousbot.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavBackStackEntry
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.navigation
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.sousbot.app.data.AuthState
import com.sousbot.app.nav.Routes
import com.sousbot.app.nav.SousbotViewModelFactory
import com.sousbot.app.theme.SousbotTheme
import com.sousbot.app.ui.camera.CameraScreen
import com.sousbot.app.ui.paywall.PaywallScreen
import com.sousbot.app.ui.profile.ProfileScreen
import com.sousbot.app.ui.recipeflow.CookingModeScreen
import com.sousbot.app.ui.recipeflow.IngredientReviewScreen
import com.sousbot.app.ui.recipeflow.RecipeDetailScreen
import com.sousbot.app.ui.recipeflow.RecipeFlowViewModel
import com.sousbot.app.ui.recipeflow.ResultsScreen
import com.sousbot.app.ui.root.RootScreen
import com.sousbot.app.ui.welcome.WelcomeScreen
import kotlinx.coroutines.runBlocking

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        val app = application as SousbotApp
        val factory = SousbotViewModelFactory(app.repository)

        // Restore a previously-persisted mock-auth session synchronously before the first frame
        // so we don't flash Welcome for an already-signed-in user (DataStore read is fast/local).
        runBlocking { app.repository.restoreSession() }
        val startDestination = if (app.repository.authState.value is AuthState.SignedIn) Routes.ROOT else Routes.WELCOME

        setContent {
            SousbotTheme {
                SousbotNavHost(factory = factory, startDestination = startDestination)
            }
        }
    }
}

@Composable
private fun SousbotNavHost(factory: SousbotViewModelFactory, startDestination: String) {
    val navController = rememberNavController()

    // Edge-to-edge is enabled (MainActivity.onCreate) so Compose draws underneath the system
    // bars by default — without this padding, top-area interactive elements (e.g. Cooking
    // mode's close button, every ScreenTopBar back button) sit under the status bar's own
    // touch-intercept zone and are unreliable/impossible to tap even though they render fine
    // visually. CameraScreen is the one deliberate exception to a full-bleed preview look, and
    // it already insets its own overlay controls with generous padding, so this outer padding
    // applying everywhere (including a very slightly smaller camera preview) is the right
    // trade-off over a broken touch target.
    NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding(),
    ) {
        composable(Routes.WELCOME) {
            WelcomeScreen(
                factory = factory,
                onSignedIn = {
                    navController.navigate(Routes.ROOT) {
                        popUpTo(Routes.WELCOME) { inclusive = true }
                    }
                },
            )
        }

        composable(Routes.ROOT) {
            RootScreen(
                factory = factory,
                onOpenCamera = {
                    navController.navigate(Routes.CAMERA)
                },
                onTypeIngredients = {
                    navController.navigate(Routes.INGREDIENT_REVIEW)
                },
                onOpenRecipe = { id -> navController.navigate(Routes.recipeDetail(id)) },
                onOpenProfile = { navController.navigate(Routes.PROFILE) },
                onPaywall = { navController.navigate(Routes.PAYWALL) },
            )
        }

        composable(Routes.PROFILE) {
            ProfileScreen(
                factory = factory,
                onBack = { navController.popBackStack() },
                onSignedOut = {
                    navController.navigate(Routes.WELCOME) {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onGoPro = { navController.navigate(Routes.PAYWALL) },
            )
        }

        composable(Routes.PAYWALL) {
            val app = androidx.compose.ui.platform.LocalContext.current.applicationContext as SousbotApp
            val usage by app.repository.usage.collectAsState()
            PaywallScreen(
                usedThisMonth = usage.used,
                limit = usage.limit ?: 10,
                onClose = { navController.popBackStack() },
            )
        }

        // Shared-ViewModel flow: camera → ingredient review → results → recipe detail → cooking.
        navigation(startDestination = Routes.INGREDIENT_REVIEW, route = Routes.FLOW_GRAPH) {
            composable(Routes.CAMERA) { entry ->
                val vm = flowViewModel(entry, navController, factory)
                CameraScreen(
                    onCaptured = { bytes ->
                        vm.onPhotoCaptured(bytes)
                        navController.navigate(Routes.INGREDIENT_REVIEW) {
                            popUpTo(Routes.CAMERA) { inclusive = true }
                        }
                    },
                    onClose = { navController.popBackStack() },
                )
            }
            composable(Routes.INGREDIENT_REVIEW) { entry ->
                val vm = flowViewModel(entry, navController, factory)
                IngredientReviewScreen(
                    vm = vm,
                    onBack = { navController.popBackStack(Routes.ROOT, inclusive = false) },
                    onGenerated = { navController.navigate(Routes.RESULTS) },
                    onPaywall = { navController.navigate(Routes.PAYWALL) },
                )
            }
            composable(Routes.RESULTS) { entry ->
                val vm = flowViewModel(entry, navController, factory)
                ResultsScreen(
                    vm = vm,
                    onBack = { navController.popBackStack() },
                    onOpenRecipe = { id -> navController.navigate(Routes.recipeDetail(id)) },
                )
            }
            composable(
                Routes.RECIPE_DETAIL,
                arguments = listOf(navArgument("recipeId") { type = NavType.StringType }),
            ) { entry ->
                val vm = flowViewModel(entry, navController, factory)
                val id = entry.arguments?.getString("recipeId").orEmpty()
                RecipeDetailScreen(
                    vm = vm,
                    recipeId = id,
                    onBack = { navController.popBackStack() },
                    onStartCooking = { recipeId -> navController.navigate(Routes.cookingMode(recipeId)) },
                )
            }
            composable(
                Routes.COOKING_MODE,
                arguments = listOf(navArgument("recipeId") { type = NavType.StringType }),
            ) { entry ->
                val vm = flowViewModel(entry, navController, factory)
                val id = entry.arguments?.getString("recipeId").orEmpty()
                CookingModeScreen(
                    vm = vm,
                    recipeId = id,
                    onExit = {
                        navController.popBackStack(Routes.ROOT, inclusive = false)
                    },
                )
            }
        }
    }
}

/**
 * Scopes a [RecipeFlowViewModel] to the "flow" nested nav-graph's own backstack entry (the
 * standard Navigation-Compose pattern for sharing one ViewModel across every screen in a
 * multi-step flow) rather than to each leaf screen's own entry.
 */
@Composable
private fun flowViewModel(
    entry: NavBackStackEntry,
    navController: NavHostController,
    factory: SousbotViewModelFactory,
): RecipeFlowViewModel {
    val parentEntry = remember(entry) { navController.getBackStackEntry(Routes.FLOW_GRAPH) }
    return viewModel(factory = factory, viewModelStoreOwner = parentEntry)
}
