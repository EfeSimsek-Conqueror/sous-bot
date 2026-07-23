package com.sousbot.app.ui.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.sousbot.app.data.ApiResult
import com.sousbot.app.data.SousbotRepository
import com.sousbot.app.data.model.ProfileDto
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch

val DietOptions = listOf("Vegetarian", "Vegan", "Gluten-free", "Halal", "Keto", "Dairy-free")

data class ProfileUiState(
    val loading: Boolean = true,
    val profile: ProfileDto = ProfileDto(),
    val saving: Boolean = false,
    val error: String? = null,
    val signedOut: Boolean = false,
)

/** DESIGN.md screen 11 — diet/allergy set-once, plan status, language/units. Android has no
 * Profile tab (reached from the Home app-bar avatar instead, per the Android-specific nav row). */
class ProfileViewModel(private val repository: SousbotRepository) : ViewModel() {
    private val _state = MutableStateFlow(ProfileUiState())
    val state: StateFlow<ProfileUiState> = _state
    val usage = repository.usage

    init {
        viewModelScope.launch {
            repository.fetchUsage()
            when (val result = repository.fetchProfile()) {
                is ApiResult.Success -> _state.value = ProfileUiState(loading = false, profile = result.data)
                is ApiResult.Error -> _state.value = _state.value.copy(loading = false, error = result.message)
                is ApiResult.PaymentRequired -> _state.value = _state.value.copy(loading = false, error = result.message)
            }
        }
    }

    fun toggleDiet(flag: String) {
        val current = _state.value.profile.dietFlags
        val updated = if (current.contains(flag)) current - flag else current + flag
        _state.value = _state.value.copy(profile = _state.value.profile.copy(dietFlags = updated))
        persist()
    }

    fun addAllergy(name: String) {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return
        val current = _state.value.profile.allergies
        if (current.any { it.equals(trimmed, ignoreCase = true) }) return
        _state.value = _state.value.copy(profile = _state.value.profile.copy(allergies = current + trimmed))
        persist()
    }

    fun removeAllergy(name: String) {
        _state.value = _state.value.copy(
            profile = _state.value.profile.copy(allergies = _state.value.profile.allergies - name),
        )
        persist()
    }

    fun setUnits(units: String) {
        _state.value = _state.value.copy(profile = _state.value.profile.copy(units = units))
        persist()
    }

    fun setLanguage(language: String) {
        _state.value = _state.value.copy(profile = _state.value.profile.copy(language = language))
        persist()
    }

    private fun persist() {
        val p = _state.value.profile
        viewModelScope.launch {
            _state.value = _state.value.copy(saving = true)
            repository.updateProfile(p.dietFlags, p.allergies, p.units, p.language)
            _state.value = _state.value.copy(saving = false)
        }
    }

    fun signOut() {
        viewModelScope.launch {
            repository.signOut()
            _state.value = _state.value.copy(signedOut = true)
        }
    }
}
