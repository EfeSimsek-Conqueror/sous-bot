package com.sousbot.app.theme

import android.provider.Settings
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext

/**
 * Respects the system "Remove animations" / animator-duration-scale accessibility setting
 * (Settings > Developer options > Window/Transition/Animator duration scale, or the system
 * "Remove animations" toggle which drives the same setting to 0). When scale is 0 we skip
 * animated transitions entirely (instant snap) instead of just shortening them, matching what
 * the rest of the OS does for a user who opted into reduced motion.
 */
@Composable
fun rememberAnimationsEnabled(): Boolean {
    val context = LocalContext.current
    return remember {
        val scale = Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f)
        scale != 0f
    }
}

/** A short, organic ease-out used for micro-interactions (pill highlights, chip removal). */
fun <T> sousbotTween(durationMillis: Int = 220) = tween<T>(durationMillis = durationMillis)
