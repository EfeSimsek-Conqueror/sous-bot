package com.sousbot.app.data.remote

import com.sousbot.app.BuildConfig
import com.sousbot.app.data.ApiResult
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.delete
import io.ktor.client.request.get
import io.ktor.client.request.header
import io.ktor.client.request.patch
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.http.ContentType
import io.ktor.http.contentType

/**
 * Direct PostgREST access for the plain data tables (profile, recipes/library, shopping list) —
 * per the architecture note "supabase-kt (or plain REST) for auth/data". RLS on every table
 * (see supabase/migrations/0001_init.sql) enforces `user_id = auth.uid()` server-side using the
 * caller's own JWT, so this client can only ever read/write the signed-in user's own rows even
 * though it talks to PostgREST directly rather than through an Edge Function.
 */
class PostgrestApi(@PublishedApi internal val client: HttpClient) {
    @PublishedApi
    internal val restBase = "${BuildConfig.SUPABASE_URL}/rest/v1"

    @PublishedApi
    internal suspend inline fun <reified T> get(path: String, token: String): ApiResult<T> = try {
        val response: HttpResponse = client.get("$restBase/$path") {
            header("apikey", BuildConfig.SUPABASE_ANON_KEY)
            header("Authorization", "Bearer $token")
        }
        if (response.status.value in 200..299) ApiResult.Success(response.body<T>())
        else ApiResult.Error("Request failed (${response.status.value}).")
    } catch (t: Throwable) {
        ApiResult.Error(t.message ?: "Network error.")
    }

    @PublishedApi
    internal suspend inline fun <reified T> mutate(
        path: String,
        token: String,
        body: Any,
        method: String,
    ): ApiResult<T> = try {
        val response: HttpResponse = when (method) {
            "PATCH" -> client.patch("$restBase/$path") {
                header("apikey", BuildConfig.SUPABASE_ANON_KEY)
                header("Authorization", "Bearer $token")
                header("Prefer", "return=representation")
                contentType(ContentType.Application.Json)
                setBody(body)
            }
            else -> client.post("$restBase/$path") {
                header("apikey", BuildConfig.SUPABASE_ANON_KEY)
                header("Authorization", "Bearer $token")
                header("Prefer", "return=representation")
                contentType(ContentType.Application.Json)
                setBody(body)
            }
        }
        if (response.status.value in 200..299) ApiResult.Success(response.body<T>())
        else ApiResult.Error("Save failed (${response.status.value}).")
    } catch (t: Throwable) {
        ApiResult.Error(t.message ?: "Network error.")
    }

    suspend fun deleteRow(path: String, token: String): ApiResult<Unit> = try {
        val response: HttpResponse = client.delete("$restBase/$path") {
            header("apikey", BuildConfig.SUPABASE_ANON_KEY)
            header("Authorization", "Bearer $token")
        }
        if (response.status.value in 200..299) ApiResult.Success(Unit)
        else ApiResult.Error("Delete failed (${response.status.value}).")
    } catch (t: Throwable) {
        ApiResult.Error(t.message ?: "Network error.")
    }

    suspend inline fun <reified T> select(table: String, query: String, token: String): ApiResult<T> =
        get("$table?$query", token)

    suspend inline fun <reified T> insert(table: String, token: String, body: Any): ApiResult<T> =
        mutate("$table", token, body, "POST")

    suspend inline fun <reified T> patch(table: String, query: String, token: String, body: Any): ApiResult<T> =
        mutate("$table?$query", token, body, "PATCH")
}
