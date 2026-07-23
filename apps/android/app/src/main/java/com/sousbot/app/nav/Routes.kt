package com.sousbot.app.nav

object Routes {
    const val WELCOME = "welcome"
    const val ROOT = "root" // hosts the swipeable Home/Planner/Library/List pager + bottom nav
    const val PROFILE = "profile" // Android has no Profile tab — reached from the Home app bar avatar

    /** Nested nav-graph route wrapping the camera→ingredient-review→results→detail→cooking flow
     * so every screen in it shares a single [com.sousbot.app.ui.recipeflow.RecipeFlowViewModel]
     * instance (scoped to this graph's own NavBackStackEntry, the standard Navigation-Compose
     * pattern for a shared-state multi-screen flow). */
    const val FLOW_GRAPH = "flow"
    const val CAMERA = "camera"
    const val INGREDIENT_REVIEW = "ingredient_review"
    const val RESULTS = "results"
    const val RECIPE_DETAIL = "recipe_detail/{recipeId}"
    fun recipeDetail(id: String) = "recipe_detail/$id"
    const val COOKING_MODE = "cooking_mode/{recipeId}"
    fun cookingMode(id: String) = "cooking_mode/$id"
    const val PAYWALL = "paywall"
}
