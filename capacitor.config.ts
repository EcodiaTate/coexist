import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.coexistaus.app',
  appName: 'Co-Exist',
  webDir: 'dist',

  // ---- Server ----
  server: {
    // Allow navigation to these URLs (deep links)
    allowNavigation: ['*.coexistaus.org', '*.supabase.co', '*.stripe.com'],
    // Android: cleartext for localhost dev only
    androidScheme: 'https',
  },

  // ---- Plugins ----
  plugins: {
    // Push Notifications (FCM + APNs)
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },

    // Haptic feedback
    Haptics: {},

    // Preferences (key-value storage)
    Preferences: {},

    // Social Login (Google + Apple)
    SocialLogin: {
      providers: {
        google: true,
        apple: true,
        facebook: false,
        twitter: false,
      },
    },

    // Splash Screen
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: '#fafaf8', // neutral-50
      showSpinner: false,
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },

    // Status Bar
    StatusBar: {
      style: 'LIGHT', // dark text on light bg
      backgroundColor: '#f8f9f5',
    },

    // Keyboard
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },

  // ---- iOS specific ----
  ios: {
    // Let the WebView extend edge-to-edge; CSS env(safe-area-inset-*) handles the rest
    contentInset: 'never',
    // Background modes for silent push
    backgroundColor: '#f8f9f5',
    scheme: 'coexist',
    // Info.plist permissions are declared in Xcode:
    // - NSCameraUsageDescription
    // - NSPhotoLibraryUsageDescription
    // - NSLocationWhenInUseUsageDescription
    // - NSCalendarsUsageDescription
    // - NSMicrophoneUsageDescription
    // - NSUserNotificationsUsageDescription
  },

  // ---- Android specific ----
  android: {
    backgroundColor: '#f8f9f5',
    allowMixedContent: false,
    // Permission declarations are in AndroidManifest.xml:
    // - android.permission.CAMERA
    // - android.permission.ACCESS_FINE_LOCATION
    // - android.permission.ACCESS_COARSE_LOCATION
    // - android.permission.RECORD_AUDIO
    // - android.permission.READ_CALENDAR
    // - android.permission.WRITE_CALENDAR
    // - android.permission.POST_NOTIFICATIONS (Android 13+)
    // - android.permission.INTERNET
    // - android.permission.RECEIVE_BOOT_COMPLETED (for scheduled notifications)
  },
};

export default config;
