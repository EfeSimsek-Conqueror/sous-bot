package com.sousbot.app.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "sousbot_session")

/**
 * Persists the mock-auth Supabase session (anonymous sign-in — see SupabaseAuthClient) across
 * app restarts. Holds the raw JWT/refresh token only; never any AI provider key (there is none
 * on this client at all, per PRD acceptance criterion 11).
 */
class SessionStore(private val context: Context) {
    private object Keys {
        val ACCESS_TOKEN = stringPreferencesKey("access_token")
        val REFRESH_TOKEN = stringPreferencesKey("refresh_token")
        val USER_ID = stringPreferencesKey("user_id")
    }

    val userIdFlow: Flow<String?> = context.dataStore.data.map { it[Keys.USER_ID] }
    val accessTokenFlow: Flow<String?> = context.dataStore.data.map { it[Keys.ACCESS_TOKEN] }

    suspend fun currentAccessToken(): String? = context.dataStore.data.first()[Keys.ACCESS_TOKEN]
    suspend fun currentRefreshToken(): String? = context.dataStore.data.first()[Keys.REFRESH_TOKEN]
    suspend fun currentUserId(): String? = context.dataStore.data.first()[Keys.USER_ID]

    suspend fun save(accessToken: String, refreshToken: String, userId: String) {
        context.dataStore.edit {
            it[Keys.ACCESS_TOKEN] = accessToken
            it[Keys.REFRESH_TOKEN] = refreshToken
            it[Keys.USER_ID] = userId
        }
    }

    suspend fun clear() {
        context.dataStore.edit { it.clear() }
    }
}
