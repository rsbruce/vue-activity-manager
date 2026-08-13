import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.rsbruce.activitymanager',
  appName: 'Activity Manager',
  webDir: 'dist',
  plugins: {
    BackgroundRunner: {
      label: 'dev.rsbruce.activitymanager.notifications',
      // Relative to webDir — public/notifications.js is copied to dist/ by Vite.
      src: 'notifications.js',
      event: 'checkNotifications',
      repeat: true,
      // Minutes. Timing needn't be precise; each wake sends any daily notification
      // whose time has passed and that hasn't been sent yet today.
      interval: 60,
      autoStart: true,
    },
  },
};

export default config;
