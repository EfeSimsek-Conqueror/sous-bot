package com.sousbot.app.ui.shoppinglist

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sousbot.app.data.ApiResult
import com.sousbot.app.data.SousbotRepository
import com.sousbot.app.data.model.ShoppingListItemDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class ShoppingListUiState(
    val loading: Boolean = true,
    val items: List<ShoppingListItemDto> = emptyList(),
    val error: String? = null,
)

class ShoppingListViewModel(private val repository: SousbotRepository) : ViewModel() {
    private val _state = MutableStateFlow(ShoppingListUiState())
    val state: StateFlow<ShoppingListUiState> = _state

    init {
        refresh()
    }

    fun refresh() {
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val result = repository.fetchShoppingList()) {
                is ApiResult.Success -> _state.value = ShoppingListUiState(loading = false, items = result.data)
                is ApiResult.Error -> _state.value = _state.value.copy(loading = false, error = result.message)
                is ApiResult.PaymentRequired -> _state.value = _state.value.copy(loading = false, error = result.message)
            }
        }
    }

    fun setChecked(id: String?, checked: Boolean) {
        if (id == null) return
        _state.value = _state.value.copy(
            items = _state.value.items.map { if (it.id == id) it.copy(checked = checked) else it },
        )
        viewModelScope.launch { repository.setShoppingItemChecked(id, checked) }
    }

    fun addItem(name: String) {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return
        viewModelScope.launch {
            repository.addShoppingListItem(trimmed)
            refresh()
        }
    }
}
