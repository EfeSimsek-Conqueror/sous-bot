package com.sousbot.app.ui.paywall

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.sousbot.app.theme.AccentBase
import com.sousbot.app.theme.BodyMd
import com.sousbot.app.theme.BodySm
import com.sousbot.app.theme.DisplayXl
import com.sousbot.app.theme.OnAccent
import com.sousbot.app.theme.ProAccentDark
import com.sousbot.app.theme.TextBase
import com.sousbot.app.theme.accentBloomBrush
import com.sousbot.app.theme.proBloomBrush
import com.sousbot.app.theme.sousbotBackgroundBrush
import com.sousbot.app.ui.components.IconGlassButton
import com.sousbot.app.ui.components.MetaBadge
import com.sousbot.app.ui.components.PrimaryButton

private enum class Plan { Monthly, Annual }

/** DESIGN.md screen 16 (Android v1) — usage badge, feature checklist, monthly/annual pricing
 * cards (annual highlighted + SAVE badge), "Subscribe with Google Play" CTA. Billing is out of
 * scope for this build (no Play Billing / RevenueCat SDK wired) — the CTA is presentational and
 * intentionally does not charge anything; see README "Paywall / billing" for the TODO. */
@Composable
fun PaywallScreen(usedThisMonth: Int, limit: Int, onClose: () -> Unit) {
    var plan by remember { mutableStateOf(Plan.Annual) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(sousbotBackgroundBrush())
            .background(accentBloomBrush(Offset(900f, -100f)))
            .background(proBloomBrush(Offset(0f, 1800f))),
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            Row(modifier = Modifier.fillMaxWidth().padding(20.dp), horizontalArrangement = Arrangement.End) {
                IconGlassButton(onClick = onClose, size = 40.dp) {
                    Icon(Icons.Filled.Close, contentDescription = "Close", tint = TextBase)
                }
            }

            Column(modifier = Modifier.weight(1f).padding(horizontal = 24.dp)) {
                // Framed as plan status, not the gate reason — this paywall also opens from the
                // meal planner / adapt, where "recipes used" would read as a non-sequitur.
                MetaBadge(text = "Free plan · $usedThisMonth of $limit generations used this month", solidPro = false)
                androidx.compose.foundation.layout.Spacer(Modifier.height(20.dp))
                Text("Cook without limits.", style = DisplayXl, color = TextBase)
                androidx.compose.foundation.layout.Spacer(Modifier.height(28.dp))
                FeatureLine("Unlimited recipe generations")
                FeatureLine("AI photos of every dish")
                FeatureLine("Weekly meal planner + smart shopping list")
                FeatureLine("Adapt any recipe — vegan it, halve it, air-fry it")
            }

            Column(modifier = Modifier.fillMaxWidth().padding(20.dp)) {
                PlanCard(
                    title = "Monthly",
                    price = "$7.99 / month",
                    selected = plan == Plan.Monthly,
                    onClick = { plan = Plan.Monthly },
                )
                androidx.compose.foundation.layout.Spacer(Modifier.height(12.dp))
                Box {
                    PlanCard(
                        title = "Annual",
                        price = "$59.99 / year · $5.00 / month",
                        selected = plan == Plan.Annual,
                        onClick = { plan = Plan.Annual },
                    )
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .offset(x = (-16).dp, y = (-10).dp)
                            .clip(RoundedCornerShape(999.dp))
                            .background(ProAccentDark)
                            .padding(horizontal = 12.dp, vertical = 5.dp),
                    ) {
                        Text("SAVE 37%", color = OnAccent, style = com.sousbot.app.theme.LabelXs, fontWeight = FontWeight.Bold)
                    }
                }
                androidx.compose.foundation.layout.Spacer(Modifier.height(20.dp))
                // TODO(billing): wire real Google Play Billing; this CTA does not charge yet.
                PrimaryButton(text = "Subscribe with Google Play", onClick = onClose)
                Text(
                    "Cancel anytime in Play Store · Works on web & iOS too",
                    style = BodySm,
                    color = TextBase.copy(alpha = 0.45f),
                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
            }
        }
    }
}

@Composable
private fun FeatureLine(text: String) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(bottom = 14.dp)) {
        Icon(Icons.Filled.Check, contentDescription = null, tint = AccentBase, modifier = Modifier.size(20.dp))
        Text(text, style = BodyMd, color = TextBase, modifier = Modifier.padding(start = 12.dp))
    }
}

@Composable
private fun PlanCard(title: String, price: String, selected: Boolean, onClick: () -> Unit) {
    val shape = RoundedCornerShape(20.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(if (selected) AccentBase.copy(alpha = 0.12f) else TextBase.copy(alpha = 0.03f), shape)
            .border(if (selected) 2.dp else 1.dp, if (selected) AccentBase else TextBase.copy(alpha = 0.14f), shape)
            .clickable(onClick = onClick)
            .padding(18.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(20.dp)
                .border(if (selected) 6.dp else 2.dp, if (selected) AccentBase else TextBase.copy(alpha = 0.4f), CircleShape),
        )
        Column(modifier = Modifier.padding(start = 14.dp)) {
            Text(title, style = BodyMd, color = TextBase, fontWeight = FontWeight.Bold)
            Text(price, style = BodySm, color = TextBase.copy(alpha = 0.55f))
        }
    }
}
