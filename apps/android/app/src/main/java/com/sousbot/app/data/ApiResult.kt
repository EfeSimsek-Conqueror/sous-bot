package com.sousbot.app.data

/** Uniform outcome type for every repository call — screens render loading/empty/error from this. */
sealed class ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>()

    /** HTTP 402 + `generation_limit_reached` or `forbidden_not_pro` — route straight to Paywall. */
    data class PaymentRequired(val code: String, val message: String) : ApiResult<Nothing>()

    data class Error(val message: String, val code: String? = null) : ApiResult<Nothing>()
}

inline fun <T, R> ApiResult<T>.map(transform: (T) -> R): ApiResult<R> = when (this) {
    is ApiResult.Success -> ApiResult.Success(transform(data))
    is ApiResult.PaymentRequired -> this
    is ApiResult.Error -> this
}
