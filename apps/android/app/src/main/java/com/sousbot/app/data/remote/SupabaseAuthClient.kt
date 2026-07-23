package com.sousbot.app.data.remote

import com.sousbot.app.BuildConfig
import io.ktor.client.HttpClient
import io.ktor.client.call.body
import io.ktor.client.request.header
import io.ktor.client.request.post
import io.ktor.client.request.setBody
import io.ktor.client.statement.HttpResponse
import io.ktor.http.ContentType
import io.ktor.http.contentType
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class AuthUser(
    val id: String,
    @SerialName("is_anonymous") val isAnonymous: Boolean = false,
)

@Serializable
data class AuthSession(
    @SerialName("access_token") val accessToken: String,
    @SerialName("refresh_token") val refreshToken: String,
    val user: AuthUser,
)

sealed class AuthOutcome {
    data class Success(val session: AuthSession) : AuthOutcome()
    data class Failure(val code: String, val message: String) : AuthOutcome()
}

/**
 * Thin wrapper over Supabase's Auth (GoTrue) REST API — deliberately plain Retrofit/Ktor rather
 * than the supabase-kt SDK, per the "thin client" architecture note in PRD.
 *
 * AUTH IS MOCKED (explicit product requirement): the Welcome screen's "Continue with Google" /
 * "Continue with Apple" buttons are styled per the design doc but do NOT perform real OAuth.
 * Tapping either calls [signInAnonymously] instead, which hits Supabase's real anonymous
 * sign-in endpoint (`POST /auth/v1/signup` with an empty body — this is the documented GoTrue
 * mechanism, verified directly against the live project during development) so the app is
 * backed by a real Supabase user_id and real rows in Postgres, not a fake local user.
 *
 * TODO(real-oauth): swap [signInAnonymously] for real Google/Apple OAuth (`/auth/v1/authorize`
 * + native Credential Manager / Sign in with Apple) before shipping — tracked as a v1.1 item,
 * explicitly out of scope for this build per the task brief.
 */
class SupabaseAuthClient(private val client: HttpClient) {
    private val baseUrl = BuildConfig.SUPABASE_URL
    private val anonKey = BuildConfig.SUPABASE_ANON_KEY

    suspend fun signInAnonymously(): AuthOutcome {
        val response: HttpResponse = client.post("$baseUrl/auth/v1/signup") {
            header("apikey", anonKey)
            contentType(ContentType.Application.Json)
            setBody("{}")
        }
        return if (response.status.value in 200..299) {
            AuthOutcome.Success(response.body<AuthSession>())
        } else {
            val raw = runCatching { response.body<Map<String, String>>() }.getOrNull()
            AuthOutcome.Failure(
                code = raw?.get("error_code") ?: response.status.value.toString(),
                message = raw?.get("msg") ?: raw?.get("message") ?: "Sign-in failed (${response.status.value}).",
            )
        }
    }

    suspend fun refresh(refreshToken: String): AuthOutcome {
        val response: HttpResponse = client.post("$baseUrl/auth/v1/token?grant_type=refresh_token") {
            header("apikey", anonKey)
            contentType(ContentType.Application.Json)
            setBody("""{"refresh_token":"$refreshToken"}""")
        }
        return if (response.status.value in 200..299) {
            AuthOutcome.Success(response.body<AuthSession>())
        } else {
            AuthOutcome.Failure(response.status.value.toString(), "Session refresh failed.")
        }
    }
}
