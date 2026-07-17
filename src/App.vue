<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'

import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useSyncEngine } from '@/composables/useSyncEngine'

const SERVER_URL = 'https://sync.ts.rsbruce.dev'
const USER_ID = 'bob'

const { isReady, status, init, sync, errorMessage } = useSyncEngine()
const initError = ref('')

onMounted(async () => {
  try {
    await init(USER_ID, SERVER_URL)        // opens DB, registers, setDb(adapter)
    await sync(SERVER_URL, USER_ID)         // initial pull
  } catch (e) {
    initError.value = errorMessage(e)
  }
})

// Periodic + on focus
let timer: ReturnType<typeof setInterval> | null = null
const onVisible = () => {
  if (document.visibilityState === 'visible' && isReady.value) {
    sync(SERVER_URL, USER_ID).catch(() => {})
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
  <div class="container max-w-5xl mx-auto pt-4">
    <nav class="flex text-lg border-b mb-2 gap-4 overflow-auto items-center">
        <RouterLink to="/planner">Planner</RouterLink>
        <RouterLink to="/timetable">Timetable</RouterLink>
        <RouterLink to="/project-categories">Projects</RouterLink>
        <RouterLink to="/activities/index">Habits</RouterLink>
        <RouterLink to="/events">Events</RouterLink>
        <RouterLink to="/people">People</RouterLink>
    </nav>
    <div v-if="!isReady" class="boot">
      <p>{{ initError || status }}</p>
    </div>
    <template v-else>
        <h1 class="text-2xl">{{ route.name }}</h1>
      <RouterView />
      <footer class="status-bar">{{ status }}</footer>
    </template>
  </div>
</template>
