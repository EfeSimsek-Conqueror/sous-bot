package com.sousbot.app.ui.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sousbot.app.data.ApiResult
import com.sousbot.app.data.SousbotRepository
import com.sousbot.app.data.model.Recipe
import com.sousbot.app.data.model.UsageInfo
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class HomeUiState(
    val greeting: String = "Good evening",
    val cookAgain: List<Recipe> = emptyList(),
    val loadingCookAgain: Boolean = true,
)

class HomeViewModel(private val repository: SousbotRepository) : ViewModel() {
    val usage: StateFlow<UsageInfo> = repository.usage

    private val _state = MutableStateFlow(HomeUiState())
    val state: StateFlow<HomeUiState> = _state

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            repository.fetchUsage()
            when (val result = repository.fetchLibrary()) {
                is ApiResult.Success -> _state.value = _state.value.copy(
                    cookAgain = result.data.take(4),
                    loadingCookAgain = false,
                )
                else -> _state.value = _state.value.copy(loadingCookAgain = false)
            }
        }
    }
}
