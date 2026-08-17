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
import SyncIndicator from '@/views/components/SyncIndicator.vue'
import MobileNav from '@/views/components/MobileNav.vue'

const SERVER_URL = import.meta.env.VITE_SYNC_URL

const NAV_LINKS = [
  { to: '/', label: 'Planner' },
  { to: '/timetable', label: 'Timetable' },
  { to: '/project-categories', label: 'Projects' },
  { to: '/activities/index', label: 'Habits' },
  { to: '/events', label: 'Events' },
  { to: '/people', label: 'People' },
  { to: '/sync-settings', label: 'Sync' },
]

const { isReady, status, isDbEmpty, syncStatus, syncError, init, sync, errorMessage } = useSyncEngine()
const initError = ref('')
const firstSyncDone = ref(false)

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

// The boot screen blocks only while there is nothing to show: a sync user on a
// fresh (empty) DB waiting on their first sync. Local/fresh users and users
// with existing data render as soon as the DB is open.
const blocking = computed(() => !isReady.value || (isSyncUser.value && isDbEmpty.value && !firstSyncDone.value))

let timer: ReturnType<typeof setInterval> | null = null
const onVisible = () => {
  if (document.visibilityState === 'visible' && isReady.value) {
    doSync()
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
    doSync()
    timer = setInterval(onVisible, 30_000)
    document.addEventListener('visibilitychange', onVisible)
  }

  // Seed the background-notifications runner with the current refresh token
  // (covers the already-logged-in-at-boot case; logins/refreshes update it too).
  await initNotifications()
  await configureRunner(await getRefreshToken())
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
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
  <MobileNav :links="NAV_LINKS" />
  <div class="container max-w-5xl mx-auto pt-2 md:pt-4 mb-10 px-1">
    <nav class="hidden md:flex text-lg border-b mb-2 gap-4 overflow-auto items-center">
        <RouterLink v-for="link in NAV_LINKS" :key="link.to" :to="link.to">{{ link.label }}</RouterLink>
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
</template>
