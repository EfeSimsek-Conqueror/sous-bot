# Add project specific ProGuard rules here.
-keepattributes *Annotation*
-keepclassmembers class kotlinx.serialization.json.** { *; }
-keep,includedescriptorclasses class com.sousbot.app.**$$serializer { *; }
-keepclassmembers class com.sousbot.app.** { *** Companion; }
-keepclasseswithmembers class com.sousbot.app.** { kotlinx.serialization.KSerializer serializer(...); }
