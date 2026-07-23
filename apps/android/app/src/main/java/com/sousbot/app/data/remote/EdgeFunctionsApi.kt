package com.sousbot.app.data.remote

import com.sousbot.app.BuildConfig
import com.sousbot.app.data.ApiResult
import com.sousbot.app.data.model.ApiErrorBody
import com.sousbot.app.data.model.DetectIngredientsRequest
import com.sousbot.app.data.model.DetectIngredientsResponse
import com.sousbot.app.data.model.GenerateMealPlanRequest
import com.sousbot.app.data.model.GenerateMealPlanResponse
import com.sousbot.app.data.model.GenerateRecipesRequest
import com.sousbot.app.data.model.GenerateRecipesResponse
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.http.ContentType
import io.ktor.http.contentType

/**
 * All AI traffic flows through these Supabase Edge Functions — no AI provider key ever ships in
 * this app (PRD acceptance criterion 11). Base contract documented in
 * supabase/functions/README.md (see also each function's index.ts).
 */
class EdgeFunctionsApi(private val client: HttpClient) {
    private val functionsBase = "${BuildConfig.SUPABASE_URL}/functions/v1"

    private suspend inline fun <reified T> post(path: String, token: String, body: Any): ApiResult<T> {
        return try {
            val response: HttpResponse = client.post("$functionsBase/$path") {
                header("Authorization", "Bearer $token")
                header("apikey", BuildConfig.SUPABASE_ANON_KEY)
                contentType(ContentType.Application.Json)
                setBody(body)
            }
            when (response.status.value) {
                in 200..299 -> ApiResult.Success(response.body<T>())
                402 -> {
                    val err = runCatching { response.body<ApiErrorBody>() }.getOrNull()?.error
                    ApiResult.PaymentRequired(
                        code = err?.code ?: "forbidden_not_pro",
                        message = err?.message ?: "Upgrade to Pro to continue.",
                    )
                }
                404 -> ApiResult.Error("This feature isn't live on the server yet.", "not_deployed")
                else -> {
                    val err = runCatching { response.body<ApiErrorBody>() }.getOrNull()?.error
                    ApiResult.Error(err?.message ?: "Request failed (${response.status.value}).", err?.code)
                }
            }
        } catch (t: Throwable) {
            ApiResult.Error(t.message ?: "Network error — check your connection.")
        }
    }

    suspend fun detectIngredients(token: String, req: DetectIngredientsRequest): ApiResult<DetectIngredientsResponse> =
        post("detect-ingredients", token, req)

    suspend fun generateRecipes(token: String, req: GenerateRecipesRequest): ApiResult<GenerateRecipesResponse> =
        post("generate-recipes", token, req)

    /** Pro-gated — server returns 402 forbidden_not_pro for free users (handled generically above). */
    suspend fun generateMealPlan(token: String, req: GenerateMealPlanRequest): ApiResult<GenerateMealPlanResponse> =
        post("generate-meal-plan", token, req)
}
