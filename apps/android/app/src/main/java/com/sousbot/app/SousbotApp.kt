package com.sousbot.app

import android.app.Application
import com.sousbot.app.data.SessionStore
import com.sousbot.app.data.SousbotRepository
import com.sousbot.app.data.remote.EdgeFunctionsApi
import com.sousbot.app.data.remote.HttpClientFactory
import com.sousbot.app.data.remote.PostgrestApi
import com.sousbot.app.data.remote.SupabaseAuthClient

/** Simple hand-rolled DI container (no Hilt/Koin — keeps the thin-client build lean). */
class SousbotApp : Application() {
    lateinit var repository: SousbotRepository
        private set

    override fun onCreate() {
        super.onCreate()
        val httpClient = HttpClientFactory.create()
        val sessionStore = SessionStore(this)
        val authClient = SupabaseAuthClient(httpClient)
        val edgeApi = EdgeFunctionsApi(httpClient)
        val restApi = PostgrestApi(httpClient)
        repository = SousbotRepository(sessionStore, authClient, edgeApi, restApi)
    }
}
