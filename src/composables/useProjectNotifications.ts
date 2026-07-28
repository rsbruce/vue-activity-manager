import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { query } from '@/db'

// Proof of concept: a recurring notification with the active-project count.
//
// A scheduled notification's content is frozen when it is scheduled — the OS
// delivers it without running our code, so it can't query the DB at fire
// time. We therefore schedule wall-clock repeaters carrying the latest known
// count, and re-schedule (fresh count) every time the app boots or syncs.
// While the app stays closed, the notifications keep firing with the last
// known count.
//
// The plugin's `every` unit has no 15-minute option, so four hourly repeaters
// staggered at :00 / :15 / :30 / :45 stand in for "every fifteen minutes".

const NOTIFICATION_IDS = [9000, 9015, 9030, 9045]

export async function scheduleProjectCountNotifications(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return

  const perm = await LocalNotifications.requestPermissions()
  if (perm.display !== 'granted') return

  const rows = await query<{ n: number }>(
    'SELECT COUNT(*) AS n FROM projects WHERE active = 1 AND deleted_at IS NULL',
  )
  const count = rows[0]?.n ?? 0

  await LocalNotifications.cancel({
    notifications: NOTIFICATION_IDS.map((id) => ({ id })),
  })
  await LocalNotifications.schedule({
    notifications: NOTIFICATION_IDS.map((id, i) => ({
      id,
      title: 'Activity Manager',
      body: `${count} active project${count === 1 ? '' : 's'}`,
      schedule: { on: { minute: i * 15 }, allowWhileIdle: true },
    })),
  })
}
