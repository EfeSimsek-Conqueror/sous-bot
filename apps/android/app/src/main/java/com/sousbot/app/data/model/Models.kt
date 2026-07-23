package com.sousbot.app.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class RecipeIngredient(
    val name: String,
    val quantity: Double = 0.0,
    val unit: String = "",
    // Client-only convenience fields (not sent by the server, computed locally against the
    // user's confirmed ingredient list so "have vs missing" renders without another round trip).
    val have: Boolean = true,
)

@Serializable
data class RecipeMacros(
    val calories: Double = 0.0,
    @SerialName("protein_g") val proteinG: Double = 0.0,
    @SerialName("carbs_g") val carbsG: Double = 0.0,
    @SerialName("fat_g") val fatG: Double = 0.0,
)

@Serializable
data class Recipe(
    val id: String = "",
    val title: String = "",
    val description: String = "",
    val ingredients: List<RecipeIngredient> = emptyList(),
    val steps: List<String> = emptyList(),
    val macros: RecipeMacros = RecipeMacros(),
    @SerialName("prep_minutes") val prepMinutes: Int = 0,
    @SerialName("cook_minutes") val cookMinutes: Int = 0,
    val servings: Int = 2,
    val difficulty: String = "easy",
    val tags: List<String> = emptyList(),
    @SerialName("image_url") val imageUrl: String? = null,
    @SerialName("image_status") val imageStatus: String? = null, // none|pending|ready|failed
    @SerialName("created_at") val createdAt: String? = null,
) {
    val totalMinutes: Int get() = prepMinutes + cookMinutes
    val missingCount: Int get() = ingredients.count { !it.have }
    val haveCount: Int get() = ingredients.count { it.have }
}

@Serializable
data class DetectIngredientsRequest(
    @SerialName("image_base64") val imageBase64: String,
    @SerialName("image_mime_type") val imageMimeType: String = "image/jpeg",
)

@Serializable
data class DetectIngredientsResponse(
    val ingredients: List<String> = emptyList(),
)

@Serializable
data class GenerateRecipesConstraints(
    val diet: String? = null,
    @SerialName("leftover_rescue") val leftoverRescue: Boolean? = null,
)

@Serializable
data class GenerateRecipesRequest(
    val ingredients: List<String>,
    val n: Int = 3,
    val constraints: GenerateRecipesConstraints? = null,
)

@Serializable
data class UsageInfo(
    val used: Int = 0,
    val limit: Int? = 10,
    val remaining: Int? = null,
)

@Serializable
data class GenerateRecipesResponse(
    val recipes: List<Recipe> = emptyList(),
    val usage: UsageInfo = UsageInfo(),
)

@Serializable
data class ApiErrorBody(
    val error: ApiErrorDetail = ApiErrorDetail(),
)

@Serializable
data class ApiErrorDetail(
    val code: String = "internal_error",
    val message: String = "Something went wrong.",
)

/** Local-only ingredient chip state used on the ingredient-review screen (§ design chips). */
data class IngredientChipState(
    val label: String,
    val confidence: Float? = null, // null = normal, else e.g. 0.62f -> "cream · 62%?"
    val isUserAdded: Boolean = false,
)

/** Mirrors the `shopping_list_items` table exactly (see migrations/0001_init.sql). */
@Serializable
data class ShoppingListItemDto(
    val id: String? = null,
    @SerialName("user_id") val userId: String? = null,
    val name: String,
    val quantity: Double? = null,
    val unit: String? = null,
    val checked: Boolean = false,
    @SerialName("source_plan_id") val sourcePlanId: String? = null,
)

/** Mirrors `profiles`. */
@Serializable
data class ProfileDto(
    val id: String? = null,
    @SerialName("display_name") val displayName: String? = null,
    val language: String = "en",
    val units: String = "metric",
    @SerialName("diet_flags") val dietFlags: List<String> = emptyList(),
    val allergies: List<String> = emptyList(),
)

@Serializable
data class MealPlanEntry(
    val id: String,
    val dayLabel: String,
    val dayNumber: String,
    val recipeTitle: String,
    val meta: String,
    val status: String = "planned", // planned | cooked | tonight
    val recipeId: String? = null,
)

// ---- generate-meal-plan (Pro-gated) — mirrors supabase/functions/README.md exactly ----

@Serializable
data class MealPlanMeal(
    val slot: String = "dinner",
    val recipe: Recipe = Recipe(),
)

@Serializable
data class MealPlanDay(
    val day: Int = 0,
    val meals: List<MealPlanMeal> = emptyList(),
    @SerialName("daily_macros") val dailyMacros: RecipeMacros = RecipeMacros(),
)

@Serializable
data class MealPlan(
    val id: String = "",
    @SerialName("week_start") val weekStart: String = "",
    val days: List<MealPlanDay> = emptyList(),
)

@Serializable
data class GenerateMealPlanRequest(
    val days: Int = 7,
    @SerialName("meals_per_day") val mealsPerDay: Int = 1,
)

@Serializable
data class GenerateMealPlanResponse(
    @SerialName("meal_plan") val mealPlan: MealPlan = MealPlan(),
    @SerialName("shopping_list") val shoppingList: List<ShoppingListItemDto> = emptyList(),
)
