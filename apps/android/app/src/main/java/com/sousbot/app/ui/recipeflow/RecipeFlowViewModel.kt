package com.sousbot.app.ui.recipeflow

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sousbot.app.data.ApiResult
import com.sousbot.app.data.SousbotRepository
import com.sousbot.app.data.model.IngredientChipState
import com.sousbot.app.data.model.Recipe
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Shared across every screen in the camera → ingredient-review → results → recipe-detail →
 * cooking-mode flow (scoped to the "flow" nested nav-graph backstack entry — see MainActivity).
 * One VM instance so ingredients/recipes/selection survive back-and-forth navigation within the
 * flow without a re-fetch.
 */
class RecipeFlowViewModel(private val repository: SousbotRepository) : ViewModel() {

    data class State(
        val photoCaptured: Boolean = false,
        val chips: List<IngredientChipState> = emptyList(),
        val detecting: Boolean = false,
        val detected: Boolean = false,
        val detectError: String? = null,
        val generating: Boolean = false,
        val generateError: String? = null,
        val recipes: List<Recipe> = emptyList(),
        val paywall: Boolean = false,
        val usedGeneration: Boolean = false,
        val selectedRecipe: Recipe? = null,
        val loadingDetail: Boolean = false,
        val detailError: String? = null,
        val saving: Boolean = false,
        val addedToShoppingList: Boolean = false,
        val cookingStepIndex: Int = 0,
    )

    private val _state = MutableStateFlow(State())
    val state: StateFlow<State> = _state
    val usage = repository.usage

    /** Resets everything for a brand-new capture — call before entering the flow from Home. */
    fun startFresh() {
        _state.value = State()
    }

    fun onPhotoCaptured(bytes: ByteArray) {
        _state.update { it.copy(photoCaptured = true, detecting = true, detectError = null, chips = emptyList(), detected = false) }
        viewModelScope.launch {
            when (val result = repository.detectIngredients(bytes)) {
                is ApiResult.Success -> _state.update {
                    it.copy(
                        detecting = false,
                        detected = true,
                        chips = result.data.map { name -> IngredientChipState(label = name) },
                    )
                }
                is ApiResult.Error -> _state.update {
                    it.copy(detecting = false, detected = true, detectError = result.message)
                }
                is ApiResult.PaymentRequired -> _state.update {
                    it.copy(detecting = false, detected = true, detectError = result.message)
                }
            }
        }
    }

    /** "Type ingredients instead" entry point — no photo, start with an empty editable list. */
    fun startTyped() {
        _state.update { it.copy(photoCaptured = false, detected = true, chips = emptyList()) }
    }

    fun addIngredient(name: String) {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return
        _state.update {
            if (it.chips.any { c -> c.label.equals(trimmed, ignoreCase = true) }) it
            else it.copy(chips = it.chips + IngredientChipState(label = trimmed, isUserAdded = true))
        }
    }

    fun removeIngredient(label: String) {
        _state.update { it.copy(chips = it.chips.filterNot { c -> c.label == label }) }
    }

    fun generate() {
        val ingredients = _state.value.chips.map { it.label }
        if (ingredients.isEmpty()) {
            _state.update { it.copy(generateError = "Add at least one ingredient first.") }
            return
        }
        _state.update { it.copy(generating = true, generateError = null) }
        viewModelScope.launch {
            when (val result = repository.generateRecipes(ingredients = ingredients, n = 3)) {
                is ApiResult.Success -> {
                    val haveSet = ingredients.map { it.lowercase() }.toSet()
                    val recipes = result.data.recipes.map { recipe ->
                        recipe.copy(
                            ingredients = recipe.ingredients.map { ing ->
                                ing.copy(have = haveSet.any { have -> ing.name.lowercase().contains(have) || have.contains(ing.name.lowercase()) })
                            },
                        )
                    }
                    _state.update { it.copy(generating = false, recipes = recipes, usedGeneration = true) }
                }
                is ApiResult.PaymentRequired -> _state.update { it.copy(generating = false, paywall = true) }
                is ApiResult.Error -> _state.update { it.copy(generating = false, generateError = result.message) }
            }
        }
    }

    fun consumePaywallFlag() {
        _state.update { it.copy(paywall = false) }
    }

    fun loadRecipeDetail(id: String) {
        val cached = _state.value.recipes.firstOrNull { it.id == id }
        if (cached != null) {
            _state.update { it.copy(selectedRecipe = cached, cookingStepIndex = 0, addedToShoppingList = false) }
            return
        }
        _state.update { it.copy(loadingDetail = true, detailError = null, cookingStepIndex = 0, addedToShoppingList = false) }
        viewModelScope.launch {
            when (val result = repository.fetchRecipeById(id)) {
                is ApiResult.Success -> _state.update { it.copy(loadingDetail = false, selectedRecipe = result.data) }
                is ApiResult.Error -> _state.update { it.copy(loadingDetail = false, detailError = result.message) }
                is ApiResult.PaymentRequired -> _state.update { it.copy(loadingDetail = false, detailError = result.message) }
            }
        }
    }

    fun toggleSave() {
        val recipe = _state.value.selectedRecipe ?: return
        _state.update { it.copy(saving = true) }
        viewModelScope.launch {
            repository.toggleSaved(recipe.id, true)
            _state.update { it.copy(saving = false) }
        }
    }

    fun addMissingToShoppingList() {
        val recipe = _state.value.selectedRecipe ?: return
        val missing = recipe.ingredients.filterNot { it.have }.map { it.name }
        if (missing.isEmpty()) return
        viewModelScope.launch {
            repository.addMissingToShoppingList(missing)
            _state.update { it.copy(addedToShoppingList = true) }
        }
    }

    fun nextStep() {
        val total = _state.value.selectedRecipe?.steps?.size ?: 1
        _state.update { it.copy(cookingStepIndex = (it.cookingStepIndex + 1).coerceAtMost(total - 1)) }
    }

    fun previousStep() {
        _state.update { it.copy(cookingStepIndex = (it.cookingStepIndex - 1).coerceAtLeast(0)) }
    }
}
