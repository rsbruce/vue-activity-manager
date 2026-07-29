import { Preferences } from '@capacitor/preferences'

// Local (non-synced) identity + mode. Stored in @capacitor/preferences, not the
// SQLite DB, so it never crosses the sync path and is device-specific.
//   - fresh user: no mode set
//   - local-only user: mode = 'local'
//   - sync user: mode = 'sync' with a username

export type UserMode = 'sync' | 'local'

export interface UserConfig {
  username: string | null
  mode: UserMode | null
}

const USERNAME_KEY = 'user.username'
const MODE_KEY = 'user.mode'

export async function getUserConfig(): Promise<UserConfig> {
  const [{ value: username }, { value: mode }] = await Promise.all([
    Preferences.get({ key: USERNAME_KEY }),
    Preferences.get({ key: MODE_KEY }),
  ])
  return { username: username ?? null, mode: (mode as UserMode | null) ?? null }
}

export async function setSyncUser(username: string): Promise<void> {
  await Preferences.set({ key: USERNAME_KEY, value: username })
  await Preferences.set({ key: MODE_KEY, value: 'sync' })
}

export async function setLocalOnly(): Promise<void> {
  await Preferences.remove({ key: USERNAME_KEY })
  await Preferences.set({ key: MODE_KEY, value: 'local' })
}
