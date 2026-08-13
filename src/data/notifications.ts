import { Capacitor } from '@capacitor/core'
import { BackgroundRunner } from '@capacitor/background-runner'
import { LocalNotifications } from '@capacitor/local-notifications'

// Wiring for the background-runner notifications (see public/notifications.js).
// The runner can't read the app's Preferences or SQLite, so we hand it the
// server URL and the current refresh token (used read-only as a durable
// credential — a PoC shortcut, consistent with the plaintext token storage).

const RUNNER_LABEL = 'dev.rsbruce.activitymanager.notifications'
const SERVER_URL = import.meta.env.VITE_SYNC_URL
// Must match the channelId the runner posts to (public/notifications.js).
const CHANNEL_ID = 'reminders'

// Push the server URL + refresh token into the runner's key-value store. Call on
// boot and whenever the token changes so a background wake always has a valid one.
export async function configureRunner(refreshToken: string | null): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    await BackgroundRunner.dispatchEvent({
      label: RUNNER_LABEL,
      event: 'saveConfig',
      details: { serverUrl: SERVER_URL, refreshToken: refreshToken ?? '' },
    })
  } catch {
    // Runner not available (e.g. web) — notifications simply won't fire.
  }
}

// Request notification permission (Android 13+ needs the runtime grant) and
// create the channel the runner posts to. On Android 8+ a notification with no
// existing channel is silently dropped — including runner-posted ones — so this
// channel must exist before any notification can appear.
export async function initNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') await LocalNotifications.requestPermissions()
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Reminders',
      description: 'Daily activity reminders',
      importance: 4, // HIGH — heads-up + sound
    })
  } catch {
    // Ignore — without permission/channel the notifications just don't show.
  }
}
