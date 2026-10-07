plugins {
    id("com.android.application")
}

android {
    namespace = "com.mirrorindex"
    compileSdk {
        version = release(37) { minorApiLevel = 2 }
    }

    defaultConfig {
        applicationId = "com.mirrorindex"
        minSdk = 26
        targetSdk = 37
        versionCode = 1
        versionName = "2026.10.07"
    }
    // サイト本体は scripts/sync-public.mjs が public/tool に集めたものをそのまま同梱する
    sourceSets["main"].assets.directories.add("../../public/tool")
}
