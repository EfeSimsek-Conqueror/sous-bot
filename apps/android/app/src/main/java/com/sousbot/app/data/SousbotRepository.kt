package com.sousbot.app.data

import android.util.Base64
import com.sousbot.app.data.model.DetectIngredientsRequest
import com.sousbot.app.data.model.DetectIngredientsResponse
import com.sousbot.app.data.model.GenerateMealPlanRequest
import com.sousbot.app.data.model.GenerateMealPlanResponse
import com.sousbot.app.data.model.GenerateRecipesConstraints
import com.sousbot.app.data.model.GenerateRecipesRequest
import com.sousbot.app.data.model.GenerateRecipesResponse
import com.sousbot.app.data.model.ProfileDto
import com.sousbot.app.data.model.Recipe
import com.sousbot.app.data.model.ShoppingListItemDto
import com.sousbot.app.data.model.UsageInfo
import com.sousbot.app.data.remote.EdgeFunctionsApi
import com.sousbot.app.data.remote.PostgrestApi
import com.sousbot.app.data.remote.SupabaseAuthClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

sealed class AuthState {
    object Unknown : AuthState()
    object SignedOut : AuthState()
    data class SignedIn(val userId: String) : AuthState()
}

/**
 * Single repository layer fronting auth + all Edge Function / PostgREST calls, per the
 * architecture note ("ViewModels + StateFlow, a repository layer"). ViewModels never talk to
 * [SupabaseAuthClient] / [EdgeFunctionsApi] / [PostgrestApi] directly.
 */
class SousbotRepository(
    private val sessionStore: SessionStore,
    private val authClient: SupabaseAuthClient,
    private val edgeApi: EdgeFunctionsApi,
    private val restApi: PostgrestApi,
) {
    private val _authState = MutableStateFlow<AuthState>(AuthState.Unknown)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    private val _usage = MutableStateFlow(UsageInfo(used = 0, limit = 10, remaining = 10))
    val usage: StateFlow<UsageInfo> = _usage.asStateFlow()

    /** Restores a previously-persisted mock-auth session, if any. Call once at app start. */
    suspend fun restoreSession() {
        val userId = sessionStore.currentUserId()
        _authState.value = if (userId != null) AuthState.SignedIn(userId) else AuthState.SignedOut
    }

    /**
     * Mock auth: real Supabase anonymous sign-in under the hood (see SupabaseAuthClient's
     * doc comment for why this counts as "real" and what's still TODO for launch).
     */
    suspend fun signInAnonymously(): ApiResult<String> {
        return when (val outcome = authClient.signInAnonymously()) {
            is com.sousbot.app.data.remote.AuthOutcome.Success -> {
                val s = outcome.session
                sessionStore.save(s.accessToken, s.refreshToken, s.user.id)
                _authState.value = AuthState.SignedIn(s.user.id)
                ApiResult.Success(s.user.id)
            }
            is com.sousbot.app.data.remote.AuthOutcome.Failure -> {
                ApiResult.Error(outcome.message, outcome.code)
            }
        }
    }

    suspend fun signOut() {
        sessionStore.clear()
        _authState.value = AuthState.SignedOut
    }

    private suspend fun token(): String? = sessionStore.currentAccessToken()

    suspend fun detectIngredients(imageBytes: ByteArray): ApiResult<List<String>> {
        val t = token() ?: return ApiResult.Error("Not signed in.")
        val b64 = Base64.encodeToString(imageBytes, Base64.NO_WRAP)
        return when (val r = edgeApi.detectIngredients(t, DetectIngredientsRequest(imageBase64 = b64))) {
            is ApiResult.Success -> ApiResult.Success(r.data.ingredients)
            is ApiResult.PaymentRequired -> r
            is ApiResult.Error -> r
        }
    }

    suspend fun generateRecipes(
        ingredients: List<String>,
        n: Int = 3,
        leftoverRescue: Boolean = false,
    ): ApiResult<GenerateRecipesResponse> {
        val t = token() ?: return ApiResult.Error("Not signed in.")
        val req = GenerateRecipesRequest(
            ingredients = ingredients,
            n = n,
            constraints = GenerateRecipesConstraints(leftoverRescue = leftoverRescue),
        )
        val result = edgeApi.generateRecipes(t, req)
        if (result is ApiResult.Success) _usage.value = result.data.usage
        return result
    }

    suspend fun fetchUsage(): ApiResult<UsageInfo> {
        val t = token() ?: return ApiResult.Error("Not signed in.")
        val period = java.text.SimpleDateFormat("yyyy-MM", java.util.Locale.US).format(java.util.Date())
        return when (val r = restApi.select<List<Map<String, Int>>>(
            "usage_counters",
            "period=eq.$period&select=generation_count",
            t,
        )) {
            is ApiResult.Success -> {
                val used = r.data.firstOrNull()?.get("generation_count") ?: 0
                val info = UsageInfo(used = used, limit = 10, remaining = (10 - used).coerceAtLeast(0))
                _usage.value = info
                ApiResult.Success(info)
            }
            is ApiResult.PaymentRequired -> r
            is ApiResult.Error -> r
        }
    }

    suspend fun fetchLibrary(): ApiResult<List<Recipe>> {
        val t = token() ?: return ApiResult.Error("Not signed in.")
        return restApi.select("recipes", "order=created_at.desc&limit=50", t)
    }

    /** Looks a recipe up directly by id — used when a screen is opened from a route (deep link,
     * Library, Home "Cook again") rather than from the in-memory generate-recipes result list. */
    suspend fun fetchRecipeById(id: String): ApiResult<Recipe> {
        val t = token() ?: return ApiResult.Error("Not signed in.")
        return when (val r = restApi.select<List<Recipe>>("recipes", "id=eq.$id&select=*", t)) {
            is ApiResult.Success -> r.data.firstOrNull()?.let { ApiResult.Success(it) }
                ?: ApiResult.Error("Recipe not found.")
            is ApiResult.PaymentRequired -> r
            is ApiResult.Error -> r
        }
    }

    /** Pro-gated (402 forbidden_not_pro for free users — caller routes to Paywall). */
    suspend fun generateMealPlan(days: Int = 7, mealsPerDay: Int = 1): ApiResult<GenerateMealPlanResponse> {
        val t = token() ?: return ApiResult.Error("Not signed in.")
        return edgeApi.generateMealPlan(t, GenerateMealPlanRequest(days = days, mealsPerDay = mealsPerDay))
    }

    suspend fun toggleSaved(recipeId: String, saved: Boolean): ApiResult<Unit> {
        val t = token() ?: return ApiResult.Error("Not signed in.")
        return when (restApi.patch<List<Recipe>>("recipes", "id=eq.$recipeId", t, mapOf("is_saved" to saved))) {
            is ApiResult.Success -> ApiResult.Success(Unit)
            is ApiResult.PaymentRequired -> ApiResult.Error("Upgrade required.")
            is ApiResult.Error -> ApiResult.Error("Could not save.")
        }
    }

    suspend fun fetchShoppingList(): ApiResult<List<ShoppingListItemDto>> {
        val t = token() ?: return ApiResult.Error("Not signed in.")
        return restApi.select("shopping_list_items", "order=created_at.desc", t)
    }

    suspend fun addShoppingListItem(name: String): ApiResult<List<ShoppingListItemDto>> {
        val t = token() ?: return ApiResult.Error("Not signed in.")
        val userId = sessionStore.currentUserId() ?: return ApiResult.Error("Not signed in.")
        // user_id is NOT NULL with no DB default — RLS's `with check (user_id = auth.uid())`
        // requires the client to set it explicitly on every insert (see migrations/0001_init.sql).
        return restApi.insert("shopping_list_items", t, listOf(ShoppingListItemDto(name = name, userId = userId)))
    }

    suspend fun setShoppingItemChecked(id: String, checked: Boolean): ApiResult<Unit> {
        val t = token() ?: return ApiResult.Error("Not signed in.")
        return when (restApi.patch<List<ShoppingListItemDto>>("shopping_list_items", "id=eq.$id", t, mapOf("checked" to checked))) {
            is ApiResult.Success -> ApiResult.Success(Unit)
            else -> ApiResult.Error("Could not update item.")
        }
    }

    suspend fun addMissingToShoppingList(names: List<String>): ApiResult<Unit> {
        val t = token() ?: return ApiResult.Error("Not signed in.")
        if (names.isEmpty()) return ApiResult.Success(Unit)
        val userId = sessionStore.currentUserId() ?: return ApiResult.Error("Not signed in.")
        return when (
            restApi.insert<List<ShoppingListItemDto>>(
                "shopping_list_items",
                t,
                names.map { ShoppingListItemDto(name = it, userId = userId) },
            )
        ) {
            is ApiResult.Success -> ApiResult.Success(Unit)
            else -> ApiResult.Error("Could not add items.")
        }
    }

    suspend fun fetchProfile(): ApiResult<ProfileDto> {
        val t = token() ?: return ApiResult.Error("Not signed in.")
        return when (val r = restApi.select<List<ProfileDto>>("profiles", "select=*", t)) {
            is ApiResult.Success -> r.data.firstOrNull()?.let { ApiResult.Success(it) } ?: ApiResult.Error("No profile row yet.")
            is ApiResult.PaymentRequired -> r
            is ApiResult.Error -> r
        }
    }

    suspend fun updateProfile(dietFlags: List<String>, allergies: List<String>, units: String, language: String): ApiResult<Unit> {
        val t = token() ?: return ApiResult.Error("Not signed in.")
        val userId = sessionStore.currentUserId() ?: return ApiResult.Error("Not signed in.")
        val body = mapOf(
            "diet_flags" to dietFlags,
            "allergies" to allergies,
            "units" to units,
            "language" to language,
        )
        return when (restApi.patch<List<ProfileDto>>("profiles", "id=eq.$userId", t, body)) {
            is ApiResult.Success -> ApiResult.Success(Unit)
            else -> ApiResult.Error("Could not save profile.")
        }
    }
}
