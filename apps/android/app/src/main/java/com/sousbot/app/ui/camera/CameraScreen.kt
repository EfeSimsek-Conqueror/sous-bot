package com.sousbot.app.ui.camera

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Image
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.sousbot.app.theme.AccentBase
import com.sousbot.app.theme.OnAccent
import com.sousbot.app.theme.TextBase
import kotlinx.coroutines.launch

/**
 * CameraX capture screen + gallery fallback. On success hands JPEG bytes to [onCaptured], which
 * the caller (RootScaffold) forwards into RecipeFlowViewModel for detect-ingredients.
 */
@Composable
fun CameraScreen(
    onCaptured: (ByteArray) -> Unit,
    onClose: () -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()

    var hasPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED,
        )
    }
    var capturing by remember { mutableStateOf(false) }

    val permissionLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        hasPermission = granted
    }
    val galleryLauncher = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) {
            scope.launch {
                val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                if (bytes != null) onCaptured(bytes)
            }
        }
    }

    DisposableEffect(Unit) {
        if (!hasPermission) permissionLauncher.launch(Manifest.permission.CAMERA)
        onDispose {}
    }

    var imageCapture by remember { mutableStateOf<ImageCapture?>(null) }

    Box(modifier = Modifier.fillMaxSize().background(androidx.compose.ui.graphics.Color.Black)) {
        if (hasPermission) {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { ctx ->
                    val previewView = PreviewView(ctx)
                    val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)
                    cameraProviderFuture.addListener({
                        val cameraProvider = cameraProviderFuture.get()
                        val preview = Preview.Builder().build().also {
                            it.surfaceProvider = previewView.surfaceProvider
                        }
                        val capture = ImageCapture.Builder().build()
                        imageCapture = capture
                        try {
                            cameraProvider.unbindAll()
                            cameraProvider.bindToLifecycle(lifecycleOwner, CameraSelector.DEFAULT_BACK_CAMERA, preview, capture)
                        } catch (_: Exception) {
                        }
                    }, ContextCompat.getMainExecutor(ctx))
                    previewView
                },
            )
        } else {
            Text(
                "Camera permission is needed to snap your fridge.",
                color = TextBase,
                modifier = Modifier.align(Alignment.Center).padding(32.dp),
            )
        }

        Box(
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(20.dp)
                .size(44.dp)
                .background(androidx.compose.ui.graphics.Color.White.copy(alpha = 0.15f), CircleShape)
                .clickable(onClick = onClose),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Filled.Close, contentDescription = "Close", tint = TextBase)
        }

        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .padding(bottom = 40.dp)
                .fillMaxWidth(),
            contentAlignment = Alignment.Center,
        ) {
            if (capturing) {
                CircularProgressIndicator(color = AccentBase)
            } else {
                Box(
                    modifier = Modifier
                        .size(76.dp)
                        .background(AccentBase, CircleShape)
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                        ) {
                            val capture = imageCapture ?: return@clickable
                            capturing = true
                            val outputOptions = ImageCapture.OutputFileOptions.Builder(
                                java.io.File.createTempFile("capture", ".jpg", context.cacheDir),
                            ).build()
                            capture.takePicture(
                                outputOptions,
                                ContextCompat.getMainExecutor(context),
                                object : ImageCapture.OnImageSavedCallback {
                                    override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                                        val file = output.savedUri?.path?.let { java.io.File(it) }
                                        val bytes = file?.readBytes() ?: ByteArray(0)
                                        capturing = false
                                        if (bytes.isNotEmpty()) onCaptured(bytes)
                                    }

                                    override fun onError(exception: ImageCaptureException) {
                                        capturing = false
                                    }
                                },
                            )
                        },
                )
            }
        }

        Box(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(24.dp)
                .size(44.dp)
                .background(androidx.compose.ui.graphics.Color.White.copy(alpha = 0.15f), CircleShape)
                .clickable(onClick = { galleryLauncher.launch("image/*") }),
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Filled.Image, contentDescription = "Pick from gallery", tint = TextBase)
        }
    }
}
