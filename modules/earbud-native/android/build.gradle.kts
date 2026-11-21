plugins {
    id("com.android.library")
    id("expo-module-gradle-plugin")
}

group = "host.exp.exponent"
version = "1.0.0"

android {
    namespace = "expo.modules.earbudnative"
    defaultConfig {
        minSdk = 24
    }
    buildFeatures {
        buildConfig = true
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.12.0")
}
