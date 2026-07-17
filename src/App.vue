<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'

import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useSyncEngine } from '@/composables/useSyncEngine'
import { refreshCurrent } from '@/router/defineController'
import SyncIndicator from '@/views/components/SyncIndicator.vue'
import MobileNav from '@/views/components/MobileNav.vue'

const SERVER_URL = 'https://sync.ts.rsbruce.dev'
const USER_ID = 'bob'

const NAV_LINKS = [
  { to: '/planner', label: 'Planner' },
  { to: '/timetable', label: 'Timetable' },
  { to: '/project-categories', label: 'Projects' },
  { to: '/activities/index', label: 'Habits' },
  { to: '/events', label: 'Events' },
  { to: '/people', label: 'People' },
]

const { isReady, status, isDbEmpty, syncStatus, syncError, init, sync, errorMessage } = useSyncEngine()
const initError = ref('')
const firstSyncDone = ref(false)

// Boot-screen text. A failed first sync on an empty DB is the one case where
// the error must be shown inline — there's no app behind it to fall back to.
// (The periodic timer keeps retrying, so recovery is automatic.)
const bootMessage = computed(() => {
  if (initError.value) return initError.value
  if (syncStatus.value === 'failed') return `First sync failed: ${syncError.value}`
  return status.value
})

// Sync in the background; when the pull applied rows, re-run the current
// route's controller so the visible page reflects them.
const doSync = async () => {
  try {
    const { pulled } = await sync(SERVER_URL, USER_ID)
    firstSyncDone.value = true
    if (pulled > 0) await refreshCurrent()
  } catch {
    // Surfaced via the SyncIndicator; nothing to do here.
  }
}

// The boot screen blocks only while there is nothing to show: a fresh install
// (empty DB) waiting on its first sync. With existing data the app renders
// immediately and sync never blocks navigation.
const blocking = computed(() => !isReady.value || (isDbEmpty.value && !firstSyncDone.value))

onMounted(async () => {
  try {
    await init(USER_ID)   // local only: opens DB, applies schema, setDb(adapter)
  } catch (e) {
    initError.value = errorMessage(e)
    return
  }
  if (isDbEmpty.value) status.value = 'Syncing for the first time...'
  doSync()
})

// Periodic + on focus
let timer: ReturnType<typeof setInterval> | null = null
const onVisible = () => {
  if (document.visibilityState === 'visible' && isReady.value) {
    doSync()
  }
}
onMounted(() => {
  timer = setInterval(onVisible, 30_000)
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  document.removeEventListener('visibilitychange', onVisible)
})

const route = useRoute()

</script>

<template>
  <MobileNav :links="NAV_LINKS" />
  <div class="container max-w-5xl mx-auto pt-2 md:pt-4 mb-10">
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
    <SyncIndicator />
  </div>
</template>
