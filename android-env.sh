#!/bin/bash
# Android SDK Environment Setup for Sousbot
# Source this file: source android-env.sh

export ANDROID_HOME=/home/Koragan/Android/Sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME

# Set JAVA_HOME to user-local JDK 21 (required for Android Gradle Plugin)
export JAVA_HOME=/home/Koragan/.jdks/temurin-21

# Update PATH with JDK 21 and Android tools
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH"

echo "Android environment configured:"
echo "  ANDROID_HOME=$ANDROID_HOME"
echo "  ANDROID_SDK_ROOT=$ANDROID_SDK_ROOT"
echo "  JAVA_HOME=$JAVA_HOME"
echo "  sdkmanager: $(which sdkmanager)"
echo "  adb: $(which adb)"
echo "  emulator: $(which emulator)"
