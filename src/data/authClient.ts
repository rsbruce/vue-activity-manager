import { Preferences } from '@capacitor/preferences'

// PoC token storage. Tokens live in Preferences (plaintext) and we use the
// NATIVE auth routes on every platform so the tokens come back in the response
// body for JS to store. This is deliberately the insecure-but-simple shortcut;
// the real design puts the refresh token in an httpOnly cookie (web) / OS
// keystore (native). Swap this out when hardening.

const SERVER_URL = import.meta.env.VITE_SYNC_URL
const ACCESS_KEY = 'auth.accessToken'
const REFRESH_KEY = 'auth.refreshToken'

export async function getAccessToken(): Promise<string | null> {
  return (await Preferences.get({ key: ACCESS_KEY })).value ?? null
}

export async function getRefreshToken(): Promise<string | null> {
  return (await Preferences.get({ key: REFRESH_KEY })).value ?? null
}

async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Preferences.set({ key: ACCESS_KEY, value: accessToken })
  await Preferences.set({ key: REFRESH_KEY, value: refreshToken })
}

async function clearTokens(): Promise<void> {
  await Preferences.remove({ key: ACCESS_KEY })
  await Preferences.remove({ key: REFRESH_KEY })
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}))
  return body.error ?? `${fallback} (${res.status})`
}

// Log in with existing credentials, storing tokens.
export async function login(username: string, password: string): Promise<void> {
  const res = await fetch(`${SERVER_URL}/auth/native/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  if (!res.ok) throw new Error(await errorMessage(res, 'Login failed'))

  const { accessToken, refreshToken } = await res.json()
  await setTokens(accessToken, refreshToken)
}

// Register a new account (idempotent — an existing account is fine), then log in.
export async function registerAndLogin(username: string, password: string, signupSecret: string): Promise<void> {
  const reg = await fetch(`${SERVER_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Signup-Secret': signupSecret },
    body: JSON.stringify({ username, password }),
  })
  if (!reg.ok && reg.status !== 409) {
    throw new Error(await errorMessage(reg, 'Registration failed'))
  }
  await login(username, password)
}

// Exchange the stored refresh token for a fresh access token (rotating the
// refresh token). Returns the new access token, or null if the session is dead
// (in which case tokens are cleared).
export async function refreshAccess(): Promise<string | null> {
  const refreshToken = await getRefreshToken()
  if (!refreshToken) return null

  const res = await fetch(`${SERVER_URL}/auth/native/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  if (!res.ok) {
    await clearTokens()
    return null
  }

  const { accessToken, refreshToken: newRefresh } = await res.json()
  await setTokens(accessToken, newRefresh)
  return accessToken
}

export async function logout(): Promise<void> {
  const refreshToken = await getRefreshToken()
  if (refreshToken) {
    await fetch(`${SERVER_URL}/auth/native/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {})
  }
  await clearTokens()
}
