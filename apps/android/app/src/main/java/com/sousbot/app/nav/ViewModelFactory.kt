package com.sousbot.app.nav

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.sousbot.app.data.SousbotRepository

/** One tiny reflective-free factory for every screen ViewModel — avoids pulling in Hilt/Koin. */
class SousbotViewModelFactory(private val repository: SousbotRepository) : ViewModelProvider.Factory {
    @Suppress("UNCHECKED_CAST")
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        return when {
            modelClass.isAssignableFrom(com.sousbot.app.ui.welcome.WelcomeViewModel::class.java) ->
                com.sousbot.app.ui.welcome.WelcomeViewModel(repository) as T
            modelClass.isAssignableFrom(com.sousbot.app.ui.home.HomeViewModel::class.java) ->
                com.sousbot.app.ui.home.HomeViewModel(repository) as T
            modelClass.isAssignableFrom(com.sousbot.app.ui.recipeflow.RecipeFlowViewModel::class.java) ->
                com.sousbot.app.ui.recipeflow.RecipeFlowViewModel(repository) as T
            modelClass.isAssignableFrom(com.sousbot.app.ui.shoppinglist.ShoppingListViewModel::class.java) ->
                com.sousbot.app.ui.shoppinglist.ShoppingListViewModel(repository) as T
            modelClass.isAssignableFrom(com.sousbot.app.ui.mealplanner.MealPlannerViewModel::class.java) ->
                com.sousbot.app.ui.mealplanner.MealPlannerViewModel(repository) as T
            modelClass.isAssignableFrom(com.sousbot.app.ui.library.LibraryViewModel::class.java) ->
                com.sousbot.app.ui.library.LibraryViewModel(repository) as T
            modelClass.isAssignableFrom(com.sousbot.app.ui.profile.ProfileViewModel::class.java) ->
                com.sousbot.app.ui.profile.ProfileViewModel(repository) as T
            else -> throw IllegalArgumentException("Unknown ViewModel class: $modelClass")
        }
    }
}
