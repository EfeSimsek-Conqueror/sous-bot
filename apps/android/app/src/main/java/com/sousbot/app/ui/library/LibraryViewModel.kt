package com.sousbot.app.ui.library

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sousbot.app.data.ApiResult
import com.sousbot.app.data.SousbotRepository
import com.sousbot.app.data.model.Recipe
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class LibraryUiState(
    val loading: Boolean = true,
    val recipes: List<Recipe> = emptyList(),
    val error: String? = null,
)

/** DESIGN.md: "Library/history screen — referenced in nav on every screen but never itself
 * captured" — built fresh, reusing the recipe-card visual language from Home's "Cook again". */
class LibraryViewModel(private val repository: SousbotRepository) : ViewModel() {
    private val _state = MutableStateFlow(LibraryUiState())
    val state: StateFlow<LibraryUiState> = _state

    init {
        refresh()
    }

    fun refresh() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val result = repository.fetchLibrary()) {
                is ApiResult.Success -> _state.value = LibraryUiState(loading = false, recipes = result.data)
                is ApiResult.Error -> _state.value = _state.value.copy(loading = false, error = result.message)
                is ApiResult.PaymentRequired -> _state.value = _state.value.copy(loading = false, error = result.message)
            }
        }
    }
}
