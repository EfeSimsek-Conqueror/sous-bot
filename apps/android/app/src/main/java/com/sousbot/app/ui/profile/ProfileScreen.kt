package com.sousbot.app.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.sousbot.app.nav.SousbotViewModelFactory
import com.sousbot.app.theme.AccentBase
import com.sousbot.app.theme.BodyMd
import com.sousbot.app.theme.BodySm
import com.sousbot.app.theme.DisplayMd
import com.sousbot.app.theme.GlassElevation
import com.sousbot.app.theme.GlassPanel
import com.sousbot.app.theme.LabelXs
import com.sousbot.app.theme.OnAccent
import com.sousbot.app.theme.ProAccentDark
import com.sousbot.app.theme.TextBase
import com.sousbot.app.ui.components.LoadingState
import com.sousbot.app.ui.components.PrimaryButton
import com.sousbot.app.ui.components.ScreenTopBar
import com.sousbot.app.ui.components.SousbotBottomSheet

/** DESIGN.md screen 11 — avatar/identity, diet pills (apply-to-every-generation), allergy pills
 * (hard-constraint styling), language/units/pantry/taste rows, plan-status + Go Pro card,
 * sign-out. Reached via Home's app-bar avatar, not a bottom-nav tab (Android nav decision). */
@OptIn(ExperimentalLayoutApi::class, ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    factory: SousbotViewModelFactory,
    onBack: () -> Unit,
    onSignedOut: () -> Unit,
    onGoPro: () -> Unit,
) {
    val vm: ProfileViewModel = viewModel(factory = factory)
    val state by vm.state.collectAsState()
    val usage by vm.usage.collectAsState()
    var showAddAllergy by remember { mutableStateOf(false) }

    LaunchedEffect(state.signedOut) {
        if (state.signedOut) onSignedOut()
    }

    Column(modifier = Modifier.fillMaxSize()) {
        ScreenTopBar(title = "Profile", onBack = onBack)

        if (state.loading) {
            LoadingState(modifier = Modifier.weight(1f), label = "Loading profile…")
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 4.dp),
                verticalArrangement = Arrangement.spacedBy(24.dp),
            ) {
                item {
                    androidx.compose.foundation.layout.Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier.size(56.dp).background(AccentBase, CircleShape),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text("S", color = OnAccent, fontWeight = FontWeight.Bold, style = com.sousbot.app.theme.DisplaySm)
                        }
                        Column(modifier = Modifier.padding(start = 14.dp)) {
                            Text(state.profile.displayName ?: "Sousbot cook", style = DisplayMd, color = TextBase)
                            Text("Signed in anonymously · via mock auth", style = BodySm, color = TextBase.copy(alpha = 0.55f))
                        }
                    }
                }

                item {
                    Column {
                        Text("DIET — APPLIED TO EVERY GENERATION", style = LabelXs, color = TextBase.copy(alpha = 0.5f))
                        androidx.compose.foundation.layout.Spacer(Modifier.padding(top = 10.dp))
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            DietOptions.forEach { flag ->
                                val active = state.profile.dietFlags.contains(flag)
                                DietPill(label = flag, active = active, onClick = { vm.toggleDiet(flag) })
                            }
                        }
                    }
                }

                item {
                    Column {
                        Text("ALLERGIES — HARD RULES, DOUBLE-CHECKED", style = LabelXs, color = ProAccentDark)
                        androidx.compose.foundation.layout.Spacer(Modifier.padding(top = 10.dp))
                        FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            state.profile.allergies.forEach { allergy ->
                                AllergyPill(label = allergy, onRemove = { vm.removeAllergy(allergy) })
                            }
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(999.dp))
                                    .background(TextBase.copy(alpha = 0.04f), RoundedCornerShape(999.dp))
                                    .clickable { showAddAllergy = true }
                                    .padding(horizontal = 16.dp, vertical = 10.dp),
                            ) {
                                Text("+ Add", style = BodyMd, color = TextBase.copy(alpha = 0.6f))
                            }
                        }
                    }
                }

                item {
                    GlassPanel(shape = RoundedCornerShape(20.dp), elevation = GlassElevation.Standard, modifier = Modifier.fillMaxWidth()) {
                        Column {
                            SettingsRow(
                                label = "Language",
                                value = if (state.profile.language == "tr") "Türkçe" else "English",
                                onClick = { vm.setLanguage(if (state.profile.language == "tr") "en" else "tr") },
                            )
                            Divider()
                            SettingsRow(
                                label = "Units",
                                value = if (state.profile.units == "imperial") "Imperial" else "Metric",
                                onClick = { vm.setUnits(if (state.profile.units == "imperial") "metric" else "imperial") },
                            )
                        }
                    }
                }

                item {
                    GlassPanel(shape = RoundedCornerShape(20.dp), elevation = GlassElevation.Standard, modifier = Modifier.fillMaxWidth()) {
                        androidx.compose.foundation.layout.Row(
                            modifier = Modifier.padding(18.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                val remaining = usage.limit?.let { (it - usage.used).coerceAtLeast(0) }
                                Text(if (usage.limit == null) "Pro plan" else "Free plan", style = BodyMd, color = TextBase, fontWeight = FontWeight.Bold)
                                Text(
                                    if (remaining != null) "${usage.used} of ${usage.limit} generations used this month" else "Unlimited generations",
                                    style = BodySm,
                                    color = TextBase.copy(alpha = 0.55f),
                                    modifier = Modifier.padding(top = 2.dp),
                                )
                            }
                            if (usage.limit != null) {
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(999.dp))
                                        .background(ProAccentDark)
                                        .clickable(onClick = onGoPro)
                                        .padding(horizontal = 18.dp, vertical = 10.dp),
                                ) {
                                    Text("Go Pro", color = OnAccent, fontWeight = FontWeight.Bold, style = BodySm)
                                }
                            }
                        }
                    }
                }

                item {
                    Text(
                        "Sign out",
                        style = BodyMd,
                        color = ProAccentDark,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.fillMaxWidth().clickable(onClick = vm::signOut).padding(vertical = 12.dp),
                        textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                    )
                }
                item { androidx.compose.foundation.layout.Spacer(Modifier.padding(top = 40.dp)) }
            }
        }
    }

    if (showAddAllergy) {
        var text by remember { mutableStateOf("") }
        SousbotBottomSheet(onDismiss = { showAddAllergy = false }) {
            Column(modifier = Modifier.padding(horizontal = 20.dp)) {
                Text("Add an allergy", style = DisplayMd, color = TextBase)
                androidx.compose.foundation.layout.Spacer(Modifier.padding(top = 16.dp))
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it },
                    placeholder = { Text("e.g. peanuts") },
                    singleLine = true,
                    colors = OutlinedTextFieldDefaults.colors(focusedTextColor = TextBase, unfocusedTextColor = TextBase, focusedBorderColor = ProAccentDark),
                    modifier = Modifier.fillMaxWidth(),
                )
                androidx.compose.foundation.layout.Spacer(Modifier.padding(top = 16.dp))
                PrimaryButton(text = "Add", onClick = {
                    vm.addAllergy(text)
                    text = ""
                    showAddAllergy = false
                })
            }
        }
    }
}

@Composable
private fun DietPill(label: String, active: Boolean, onClick: () -> Unit) {
    val shape = RoundedCornerShape(999.dp)
    androidx.compose.foundation.layout.Row(
        modifier = Modifier
            .clip(shape)
            .background(if (active) AccentBase else TextBase.copy(alpha = 0.05f), shape)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = BodyMd, color = if (active) OnAccent else TextBase, fontWeight = FontWeight.Bold)
        if (active) {
            Icon(Icons.Filled.Check, contentDescription = null, tint = OnAccent, modifier = Modifier.size(16.dp).padding(start = 4.dp))
        }
    }
}

@Composable
private fun AllergyPill(label: String, onRemove: () -> Unit) {
    val shape = RoundedCornerShape(999.dp)
    androidx.compose.foundation.layout.Row(
        modifier = Modifier
            .clip(shape)
            .background(ProAccentDark.copy(alpha = 0.18f), shape)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = BodyMd, color = ProAccentDark, fontWeight = FontWeight.Bold)
        Icon(
            Icons.Filled.Close,
            contentDescription = "Remove $label",
            tint = ProAccentDark,
            modifier = Modifier.size(16.dp).padding(start = 4.dp).clickable(onClick = onRemove),
        )
    }
}

@Composable
private fun SettingsRow(label: String, value: String, onClick: () -> Unit) {
    androidx.compose.foundation.layout.Row(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 18.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(label, style = BodyMd, color = TextBase)
        Text(value, style = BodyMd, color = TextBase.copy(alpha = 0.55f))
    }
}

@Composable
private fun Divider() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 18.dp)
            .height(1.dp)
            .background(TextBase.copy(alpha = 0.08f)),
    )
}
