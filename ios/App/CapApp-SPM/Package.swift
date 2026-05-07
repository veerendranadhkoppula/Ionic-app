// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.3.1"),
        .package(name: "CapacitorCommunityFileOpener", path: "..\..\..\node_modules\.pnpm\@capacitor-community+file-opener@8.0.0_@capacitor+core@8.0.0\node_modules\@capacitor-community\file-opener"),
        .package(name: "CapacitorFirebaseMessaging", path: "..\..\..\node_modules\.pnpm\@capacitor-firebase+messagi_90afdf05233a81c0d9f9d07163fb1575\node_modules\@capacitor-firebase\messaging"),
        .package(name: "CapacitorApp", path: "..\..\..\node_modules\.pnpm\@capacitor+app@8.0.0_@capacitor+core@8.0.0\node_modules\@capacitor\app"),
        .package(name: "CapacitorBrowser", path: "..\..\..\node_modules\.pnpm\@capacitor+browser@8.0.3_@capacitor+core@8.0.0\node_modules\@capacitor\browser"),
        .package(name: "CapacitorCamera", path: "..\..\..\node_modules\.pnpm\@capacitor+camera@8.2.0_@capacitor+core@8.0.0\node_modules\@capacitor\camera"),
        .package(name: "CapacitorFilesystem", path: "..\..\..\node_modules\.pnpm\@capacitor+filesystem@8.1.2_@capacitor+core@8.0.0\node_modules\@capacitor\filesystem"),
        .package(name: "CapacitorGeolocation", path: "..\..\..\node_modules\.pnpm\@capacitor+geolocation@8.2.0_@capacitor+core@8.0.0\node_modules\@capacitor\geolocation"),
        .package(name: "CapacitorHaptics", path: "..\..\..\node_modules\.pnpm\@capacitor+haptics@8.0.0_@capacitor+core@8.0.0\node_modules\@capacitor\haptics"),
        .package(name: "CapacitorKeyboard", path: "..\..\..\node_modules\.pnpm\@capacitor+keyboard@8.0.0_@capacitor+core@8.0.0\node_modules\@capacitor\keyboard"),
        .package(name: "CapacitorPreferences", path: "..\..\..\node_modules\.pnpm\@capacitor+preferences@8.0.1_@capacitor+core@8.0.0\node_modules\@capacitor\preferences"),
        .package(name: "CapacitorPushNotifications", path: "..\..\..\node_modules\.pnpm\@capacitor+push-notifications@8.0.3_@capacitor+core@8.0.0\node_modules\@capacitor\push-notifications"),
        .package(name: "CapacitorShare", path: "..\..\..\node_modules\.pnpm\@capacitor+share@8.0.1_@capacitor+core@8.0.0\node_modules\@capacitor\share"),
        .package(name: "CapacitorSplashScreen", path: "..\..\..\node_modules\.pnpm\@capacitor+splash-screen@8.0.1_@capacitor+core@8.0.0\node_modules\@capacitor\splash-screen"),
        .package(name: "CapacitorStatusBar", path: "..\..\..\node_modules\.pnpm\@capacitor+status-bar@8.0.0_@capacitor+core@8.0.0\node_modules\@capacitor\status-bar"),
        .package(name: "CapgoCapacitorSocialLogin", path: "..\..\..\node_modules\.pnpm\@capgo+capacitor-social-login@8.3.20_@capacitor+core@8.0.0\node_modules\@capgo\capacitor-social-login")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorCommunityFileOpener", package: "CapacitorCommunityFileOpener"),
                .product(name: "CapacitorFirebaseMessaging", package: "CapacitorFirebaseMessaging"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
                .product(name: "CapacitorBrowser", package: "CapacitorBrowser"),
                .product(name: "CapacitorCamera", package: "CapacitorCamera"),
                .product(name: "CapacitorFilesystem", package: "CapacitorFilesystem"),
                .product(name: "CapacitorGeolocation", package: "CapacitorGeolocation"),
                .product(name: "CapacitorHaptics", package: "CapacitorHaptics"),
                .product(name: "CapacitorKeyboard", package: "CapacitorKeyboard"),
                .product(name: "CapacitorPreferences", package: "CapacitorPreferences"),
                .product(name: "CapacitorPushNotifications", package: "CapacitorPushNotifications"),
                .product(name: "CapacitorShare", package: "CapacitorShare"),
                .product(name: "CapacitorSplashScreen", package: "CapacitorSplashScreen"),
                .product(name: "CapacitorStatusBar", package: "CapacitorStatusBar"),
                .product(name: "CapgoCapacitorSocialLogin", package: "CapgoCapacitorSocialLogin")
            ]
        )
    ]
)
