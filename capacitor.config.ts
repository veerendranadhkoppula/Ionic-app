import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
 appId: 'com.whitemantis.app',
appName: 'White Mantis',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
