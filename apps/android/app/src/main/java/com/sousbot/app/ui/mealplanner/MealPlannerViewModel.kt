package com.sousbot.app.ui.mealplanner

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sousbot.app.data.ApiResult
import com.sousbot.app.data.SousbotRepository
import com.sousbot.app.data.model.MealPlan
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class MealPlannerUiState(
    val loading: Boolean = false,
    val plan: MealPlan? = null,
    val error: String? = null,
    val paywall: Boolean = false,
)

/** DESIGN.md screen 09 — weekly plan, Pro-gated server-side (`402 forbidden_not_pro`). */
class MealPlannerViewModel(private val repository: SousbotRepository) : ViewModel() {
    private val _state = MutableStateFlow(MealPlannerUiState())
    val state: StateFlow<MealPlannerUiState> = _state

    fun generateWeek() {
        if (_state.value.loading) return
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val result = repository.generateMealPlan(days = 7, mealsPerDay = 1)) {
                is ApiResult.Success -> _state.value = MealPlannerUiState(plan = result.data.mealPlan)
                is ApiResult.PaymentRequired -> _state.value = _state.value.copy(loading = false, paywall = true)
                is ApiResult.Error -> _state.value = _state.value.copy(loading = false, error = result.message)
            }
        }
    }

    fun consumePaywallFlag() {
        _state.value = _state.value.copy(paywall = false)
    }
}
