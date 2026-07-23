package com.sousbot.app.data.remote

import io.ktor.client.HttpClient
import io.ktor.client.engine.android.Android
import io.ktor.client.plugins.HttpTimeout
import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
import io.ktor.client.plugins.logging.LogLevel
import io.ktor.client.plugins.logging.Logging
import io.ktor.serialization.kotlinx.json.json
import kotlinx.serialization.json.Json

object HttpClientFactory {
    val json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        // IMPORTANT: false, not true. An explicit JSON `null` on an insert body (e.g. `"id":
        // null`, `"source_plan_id": null`) overrides a Postgres column DEFAULT — PostgREST turns
        // it into a literal `INSERT ... (id) VALUES (NULL)`, which fails the `shopping_list_items`
        // primary key's NOT NULL constraint instead of falling back to `gen_random_uuid()`. With
        // this off, unset/default fields are omitted from the JSON entirely, which is what lets
        // DB defaults apply and is also just correct REST-body semantics.
        encodeDefaults = false
    }

    fun create(): HttpClient = HttpClient(Android) {
        expectSuccess = false // we inspect status codes ourselves (402 routes to paywall, etc.)
        install(ContentNegotiation) { json(json) }
        install(Logging) { level = LogLevel.INFO }
        install(HttpTimeout) {
            // 30s was too tight — verified live against `generate-meal-plan` (up to 7 days x
            // several meals, each a full AI recipe generation, run for a single request) timing
            // out client-side well before the server could finish, surfacing as a spurious
            // "Request timeout has expired" instead of the real result. `generate-recipes` alone
            // is ~7s for 2 recipes (per supabase/functions/README.md); a week of dinners is
            // proportionally much heavier. 60s gives real multi-recipe generations headroom
            // without materially changing the felt latency of the fast, already-observed calls.
            requestTimeoutMillis = 60_000
            connectTimeoutMillis = 15_000
            socketTimeoutMillis = 60_000
        }
    }
}
