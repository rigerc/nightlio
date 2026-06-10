import type { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Waymark',
  slug: 'waymark',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'dark',
  scheme: 'waymark',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#09090b',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.waymark.app',
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#09090b',
    },
    package: 'com.waymark.app',
    permissions: ['android.permission.ACTIVITY_RECOGNITION'],
    intentFilters: [
      {
        action: 'androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE',
      },
    ],
  },
  plugins: [
    'expo-router',
    'expo-sqlite',
    [
      'react-native-health-connect',
      {
        androidPermissions: ['android.permission.ACTIVITY_RECOGNITION'],
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
});
