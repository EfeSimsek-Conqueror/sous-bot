package com.sousbot.app.ui.welcome

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sousbot.app.data.ApiResult
import com.sousbot.app.data.SousbotRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

data class WelcomeUiState(
    val loading: Boolean = false,
    val error: String? = null,
    val signedIn: Boolean = false,
)

/**
 * AUTH IS MOCKED per the product brief: both "Continue with Google" and "Continue with Apple"
 * call the exact same [signIn] — a real Supabase anonymous sign-in, not a fake local user. See
 * SupabaseAuthClient's doc comment for the TODO(real-oauth) tracking note.
 */
class WelcomeViewModel(private val repository: SousbotRepository) : ViewModel() {
    private val _state = MutableStateFlow(WelcomeUiState())
    val state: StateFlow<WelcomeUiState> = _state

    fun signIn() {
        if (_state.value.loading) return
        _state.value = _state.value.copy(loading = true, error = null)
        viewModelScope.launch {
            when (val result = repository.signInAnonymously()) {
                is ApiResult.Success -> _state.value = WelcomeUiState(signedIn = true)
                is ApiResult.Error -> _state.value = _state.value.copy(
                    loading = false,
                    error = result.message.ifBlank { "Sign-in failed. Check your connection and try again." },
                )
                is ApiResult.PaymentRequired -> _state.value = _state.value.copy(loading = false, error = result.message)
            }
        }
    }
}
