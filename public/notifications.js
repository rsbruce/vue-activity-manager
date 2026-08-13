// Capacitor background runner for local notifications (Android).
//
// Runs in Capacitor's isolated JS context: no DOM, no app plugins, no SQLite —
// only the injected globals (fetch, CapacitorKV, CapacitorNotifications). It
// reads what it needs from the sync server (which holds the synced copy of the
// user's DB) and posts local notifications, each with a FIXED id so a new one
// replaces any still-unacknowledged notification of that type. A per-day marker
// keeps each type to at most once a day. Config (server URL + refresh token) is
// handed in from the app via dispatchEvent('saveConfig').

// eslint-disable-next-line no-undef
const KV = CapacitorKV
// eslint-disable-next-line no-undef
const Notifications = CapacitorNotifications

// id: fixed per type (replacement). hour: the daily time to fire (approx).
// path: the server endpoint under /notifications/.
const TYPES = [
  { key: 'dueObjectives', id: 1, hour: 7, path: 'due-objectives' },
  { key: 'todo', id: 2, hour: 8, path: 'todo-items' },
  { key: 'events', id: 3, hour: 18, path: 'upcoming-events' },
]

function kvGet(key) {
  try {
    return KV.get(key).value
  } catch (_e) {
    return undefined
  }
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function localContext() {
  const d = new Date()
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return {
    now: `${date}T${pad(d.getHours())}:${pad(d.getMinutes())}`, // matches stored datetimes
    today: date,
    hour: d.getHours(),
  }
}

// Turn a server payload into { title, body }, or null if there's nothing to show.
function buildNotification(type, data) {
  if (type.key === 'events') {
    if (!data.items || !data.items.length) return null
    return { title: 'Upcoming events', body: data.items.map((e) => `${e.name} — ${e.when}`).join('\n') }
  }
  if (type.key === 'todo') {
    if (!data.items || !data.items.length) return null
    return { title: 'To-do list', body: data.items.map((i) => `• ${i.name}`).join('\n') }
  }
  if (type.key === 'dueObjectives') {
    if (!data.items || !data.items.length) return null
    let body = data.items.map((o) => `${o.name} — ${o.due}`).join('\n')
    const more = (data.total || 0) - data.items.length
    if (more > 0) body += `\n+ ${more} more`
    return { title: 'Objectives due', body }
  }
  return null
}

async function runType(type, serverUrl, token, ctx) {
  if (ctx.hour < type.hour) return // not yet time today
  const sentKey = `sent_${type.key}`
  if (kvGet(sentKey) === ctx.today) return // already handled today

  const url = `${serverUrl}/notifications/${type.path}?now=${encodeURIComponent(ctx.now)}`
  // The runner's fetch requires an explicit method (unlike the browser's, which
  // defaults to GET) — omitting it throws "Expected one of [...] but was undefined".
  const res = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return // leave unmarked so it retries on the next wake

  const notification = buildNotification(type, await res.json())
  if (notification) {
    Notifications.schedule([
      {
        id: type.id,
        title: notification.title,
        body: notification.body,
        scheduleAt: new Date(Date.now() + 1000),
        // Must match the channel the app creates (src/data/notifications.ts);
        // Android drops notifications whose channel doesn't exist.
        channelId: 'reminders',
      },
    ])
  }
  // Mark handled for today whether or not something was posted — these are
  // once-a-day digests, not "notify as soon as data appears".
  KV.set(sentKey, ctx.today)
}

// Config handoff from the app.
addEventListener('saveConfig', (resolve, reject, args) => {
  try {
    if (args && typeof args.serverUrl === 'string') KV.set('serverUrl', args.serverUrl)
    if (args && typeof args.refreshToken === 'string') KV.set('refreshToken', args.refreshToken)
    resolve()
  } catch (e) {
    reject(e)
  }
})

// Periodic wake (see interval in capacitor.config.ts).
addEventListener('checkNotifications', async (resolve, _reject) => {
  try {
    const serverUrl = kvGet('serverUrl')
    const token = kvGet('refreshToken')
    if (serverUrl && token) {
      const ctx = localContext()
      for (const type of TYPES) {
        // A failure of one type (offline, etc.) must not block the others and
        // must not mark it handled — so it retries next wake.
        try {
          await runType(type, serverUrl, token, ctx)
        } catch (_e) {
          /* if sync/fetch fails it doesn't matter */
        }
      }
    }
    resolve()
  } catch (_e) {
    resolve() // failures don't matter
  }
})
