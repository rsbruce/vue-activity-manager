<script setup lang="ts">
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'

import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useSyncEngine } from '@/composables/useSyncEngine'
import { refreshCurrent } from '@/router/defineController'
import { getUserConfig, type UserMode } from '@/data/userConfig'
import { getRefreshToken } from '@/data/authClient'
import { initNotifications, configureRunner } from '@/data/notifications'
import { setWriteHook } from '@/db'
import { useDemoMode } from '@/composables/useDemoMode'
import { seedDemoData, purgeAllData } from '@/data/demoSeed'
import SyncIndicator from '@/views/components/SyncIndicator.vue'
import MobileNav from '@/views/components/MobileNav.vue'
import DemoModal from '@/views/components/DemoModal.vue'

const SERVER_URL = import.meta.env.VITE_SYNC_URL

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/agenda', label: 'Agenda' },
  { to: '/project-categories', label: 'Projects' },
  { to: '/timetable', label: 'Timetable' },
  { to: '/activities/tracking', label: 'Habits' },
  { to: '/events', label: 'Events' },
  { to: '/people', label: 'People' },
  { to: '/sync-settings', label: 'Sync' },
]

const { isReady, status, isDbEmpty, syncStatus, syncError, init, sync, errorMessage } = useSyncEngine()
const initError = ref('')
const firstSyncDone = ref(false)

// ── Demo data ────────────────────────────────────────────────────────────────
const { isDemo, setDemo, clearDemo } = useDemoMode()
const seedDismissed = ref(false)
const seeding = ref(false)
const showPurge = ref(false)
const purging = ref(false)

// Offer to seed only for a local (non-sync) user on a genuinely empty DB, once —
// dismissing ("Start empty") hides it for the session.
const showSeedModal = computed(
  () => isReady.value && isDbEmpty.value && !isSyncUser.value && !isDemo.value && !seedDismissed.value,
)

const onSeed = async () => {
  seeding.value = true
  try {
    await seedDemoData()
    setDemo()
    isDbEmpty.value = false
    await refreshCurrent()
  } finally {
    seeding.value = false
  }
}

const onPurge = async () => {
  purging.value = true
  try {
    await purgeAllData()
    clearDemo()
    isDbEmpty.value = true
    seedDismissed.value = false
    showPurge.value = false
    await refreshCurrent()
  } finally {
    purging.value = false
  }
}

// Local identity/mode, read from Preferences on boot (not env).
const userMode = ref<UserMode | null>(null)
const username = ref<string | null>(null)
const isSyncUser = computed(() => userMode.value === 'sync' && !!username.value)

// Boot-screen text. A failed first sync on an empty DB is the one case where
// the error must be shown inline — there's no app behind it to fall back to.
// (The periodic timer keeps retrying, so recovery is automatic.)
const bootMessage = computed(() => {
  if (initError.value) return initError.value
  if (syncStatus.value === 'failed') return `First sync failed: ${syncError.value}`
  return status.value
})

// Sync in the background; when the pull applied rows, re-run the current
// route's controller so the visible page reflects them. Only sync users sync.
const doSync = async () => {
  if (!isSyncUser.value) return
  try {
    const { pulled } = await sync(SERVER_URL, username.value!)
    firstSyncDone.value = true
    if (pulled > 0) await refreshCurrent()
  } catch {
    // Surfaced via the SyncIndicator; nothing to do here.
  }
}

// All sync triggers — the local-write hook, the periodic timer, and visibility
// changes — funnel through here. scheduleSync's trailing debounce coalesces a
// burst of writes (one user action is often several) into a single sync;
// runSync's single-flight guard prevents overlapping syncs and re-runs once if a
// write lands while a sync is in flight, so nothing is left unsynced.
let syncDebounce: ReturnType<typeof setTimeout> | null = null
let syncing = false
let syncDirty = false

const runSync = async () => {
  if (syncing) { syncDirty = true; return }
  syncing = true
  try {
    do {
      syncDirty = false
      await doSync()
    } while (syncDirty)
  } finally {
    syncing = false
  }
}

const scheduleSync = (delay = 750) => {
  if (!isSyncUser.value) return
  if (syncDebounce) clearTimeout(syncDebounce)
  syncDebounce = setTimeout(() => { syncDebounce = null; runSync() }, delay)
}

// The boot screen blocks only while there is nothing to show: a sync user on a
// fresh (empty) DB waiting on their first sync. Local/fresh users and users
// with existing data render as soon as the DB is open.
const blocking = computed(() => !isReady.value || (isSyncUser.value && isDbEmpty.value && !firstSyncDone.value))

let timer: ReturnType<typeof setInterval> | null = null
const onVisible = () => {
  if (document.visibilityState === 'visible' && isReady.value) {
    runSync()
  }
}

onMounted(async () => {
  const cfg = await getUserConfig()
  userMode.value = cfg.mode
  username.value = cfg.username

  // Sync users open a per-username database; everyone else shares the local one.
  const dbUserId = isSyncUser.value ? username.value! : 'local'
  try {
    await init(dbUserId)   // opens DB, applies schema, setDb(adapter)
  } catch (e) {
    initError.value = errorMessage(e)
    return
  }

  if (isSyncUser.value) {
    if (isDbEmpty.value) status.value = 'Syncing for the first time...'
    runSync()
    timer = setInterval(onVisible, 30_000)
    document.addEventListener('visibilitychange', onVisible)
    // Any local write schedules a (debounced) sync so changes don't sit trapped.
    setWriteHook(() => scheduleSync())
  }

  // Seed the background-notifications runner with the current refresh token
  // (covers the already-logged-in-at-boot case; logins/refreshes update it too).
  await initNotifications()
  await configureRunner(await getRefreshToken())
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  if (syncDebounce) clearTimeout(syncDebounce)
  setWriteHook(null)
  document.removeEventListener('visibilitychange', onVisible)
})

const route = useRoute()
const router = useRouter()

// Android hardware back button: step back through router history like the web,
// exiting the app only when there's nowhere left to go back to. Native only.
let backButtonHandle: PluginListenerHandle | null = null
onMounted(async () => {
  if (!Capacitor.isNativePlatform()) return
  backButtonHandle = await CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) router.back()
    else CapacitorApp.exitApp()
  })
})

onBeforeUnmount(() => {
  backButtonHandle?.remove()
})

</script>

<template>
  <MobileNav :links="NAV_LINKS" @purge="showPurge = true" />
  <div class="container max-w-5xl mx-auto pt-2 md:pt-4 mb-10 px-1">
    <nav class="hidden md:flex text-lg border-b mb-2 gap-4 overflow-auto items-center">
        <RouterLink v-for="link in NAV_LINKS" :key="link.to" :to="link.to">{{ link.label }}</RouterLink>
        <button
          v-if="isDemo"
          type="button"
          class="ml-auto shrink-0 bg-red-600 text-white text-sm px-3 py-1 rounded-md cursor-pointer"
          @click="showPurge = true"
        >Purge demo data</button>
    </nav>
    <div v-if="blocking" class="boot">
      <p>{{ bootMessage }}</p>
    </div>
    <template v-else>
        <h1 class="hidden md:block text-2xl">{{ route.name }}</h1>
      <RouterView />
    </template>
    <SyncIndicator v-if="isSyncUser" />
  </div>

  <DemoModal
    :open="showSeedModal"
    title="Load demo data?"
    message="This looks like a fresh install. Want to fill the app with a sample of projects, objectives, tasks, events, habits, reminders and people so you can explore every screen? It stays on this device and you can wipe it any time."
    confirm-label="Load demo data"
    cancel-label="Start empty"
    :busy="seeding"
    @confirm="onSeed"
    @cancel="seedDismissed = true"
  />

  <DemoModal
    :open="showPurge"
    title="Purge demo data?"
    message="This permanently deletes all data on this device and returns the app to an empty state. This can't be undone."
    confirm-label="Purge demo data"
    cancel-label="Cancel"
    confirm-class="bg-red-600"
    :busy="purging"
    @confirm="onPurge"
    @cancel="showPurge = false"
  />
</template>
