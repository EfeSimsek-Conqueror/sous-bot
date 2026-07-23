package com.sousbot.app.ui.welcome

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowRightAlt
import androidx.compose.material.icons.filled.Kitchen
import androidx.compose.material.icons.filled.RestaurantMenu
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sousbot.app.nav.SousbotViewModelFactory
import com.sousbot.app.theme.AccentBase
import com.sousbot.app.theme.BodyMd
import com.sousbot.app.theme.DisplayLg
import com.sousbot.app.theme.GlassElevation
import com.sousbot.app.theme.GlassPanel
import com.sousbot.app.theme.ProAccentDark
import com.sousbot.app.theme.TextBase
import com.sousbot.app.theme.TextPrimary
import com.sousbot.app.theme.Wordmark
import com.sousbot.app.theme.accentBloomBrush
import com.sousbot.app.theme.proBloomBrush
import com.sousbot.app.theme.sousbotBackgroundBrush
import com.sousbot.app.ui.components.PrimaryButton
import com.sousbot.app.ui.components.SecondaryButton

@Composable
fun WelcomeScreen(
    factory: SousbotViewModelFactory,
    onSignedIn: () -> Unit,
) {
    val vm: WelcomeViewModel = viewModel(factory = factory)
    val state by vm.state.collectAsState()

    LaunchedEffect(state.signedIn) {
        if (state.signedIn) onSignedIn()
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(sousbotBackgroundBrush())
            .background(accentBloomBrush(Offset(900f, -100f)))
            .background(proBloomBrush(Offset(0f, 1800f))),
    ) {
        Column(modifier = Modifier.fillMaxSize().padding(horizontal = 24.dp)) {
            Text(
                "Sousbot",
                style = Wordmark,
                color = TextPrimary,
                fontStyle = FontStyle.Italic,
                modifier = Modifier.padding(top = 64.dp),
            )

            GlassPanel(
                shape = RoundedCornerShape(28.dp),
                elevation = GlassElevation.Hero,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1.05f)
                    .padding(top = 40.dp),
            ) {
                HeroIllustration(modifier = Modifier.align(Alignment.Center).padding(24.dp))
            }

            Column(modifier = Modifier.padding(top = 40.dp)) {
                Text("What's for dinner,", style = DisplayLg, color = TextPrimary)
                Text("solved.", style = DisplayLg.copy(fontStyle = FontStyle.Italic), color = AccentBase)
                Text(
                    "Snap your fridge. Get recipes you can actually cook, with macros — in seconds.",
                    style = BodyMd,
                    color = TextBase.copy(alpha = 0.70f),
                    modifier = Modifier.padding(top = 16.dp),
                )
            }

            androidx.compose.foundation.layout.Spacer(Modifier.weight(1f))

            if (state.error != null) {
                Text(state.error!!, style = BodyMd, color = ProAccentDark, modifier = Modifier.padding(bottom = 12.dp))
            }

            if (state.loading) {
                Box(modifier = Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = AccentBase)
                }
            } else {
                PrimaryButton(text = "Continue with Apple", onClick = vm::signIn)
                androidx.compose.foundation.layout.Spacer(Modifier.padding(top = 12.dp))
                SecondaryButton(text = "Continue with Google", onClick = vm::signIn)
            }

            Text(
                "No password needed · Terms & Privacy",
                style = com.sousbot.app.theme.BodySm,
                color = TextBase.copy(alpha = 0.40f),
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 20.dp),
                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
            )
        }
    }
}

/** Static "fridge photo → plated dish" hero: two accent-tinted tiles with an arrow between,
 * plus a low-key caption. Replaces the old literal placeholder text; no animation asset exists
 * yet, so this is an intentional illustration built from Material icons. */
@Composable
private fun HeroIllustration(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            HeroTile(icon = { Icon(Icons.Filled.Kitchen, contentDescription = null, tint = AccentBase, modifier = Modifier.size(34.dp)) })
            Icon(
                Icons.AutoMirrored.Filled.ArrowRightAlt,
                contentDescription = null,
                tint = AccentBase.copy(alpha = 0.65f),
                modifier = Modifier.padding(horizontal = 14.dp).size(32.dp),
            )
            HeroTile(icon = { Icon(Icons.Filled.RestaurantMenu, contentDescription = null, tint = AccentBase, modifier = Modifier.size(34.dp)) })
        }
        Spacer(Modifier.height(24.dp))
        Text(
            "FRIDGE PHOTO IN · PLATED DINNER OUT",
            style = com.sousbot.app.theme.LabelXs,
            color = TextBase.copy(alpha = 0.45f),
            letterSpacing = androidx.compose.ui.unit.TextUnit(1.5f, androidx.compose.ui.unit.TextUnitType.Sp), // ~1.5sp tracking
        )
    }
}

@Composable
private fun HeroTile(icon: @Composable () -> Unit) {
    Box(
        modifier = Modifier
            .size(76.dp)
            .clip(RoundedCornerShape(22.dp))
            .background(AccentBase.copy(alpha = 0.15f)),
        contentAlignment = Alignment.Center,
    ) { icon() }
}
