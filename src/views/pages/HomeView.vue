<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getUserConfig, setLocalOnly, type UserMode } from '@/data/userConfig'

const loaded = ref(false)
const mode = ref<UserMode | null>(null)
const username = ref<string | null>(null)

onMounted(async () => {
  const cfg = await getUserConfig()
  mode.value = cfg.mode
  username.value = cfg.username
  loaded.value = true
})

const chooseLocal = async () => {
  await setLocalOnly()
  // Reload so boot re-runs in local-only mode (no sync).
  window.location.reload()
}
</script>

<template>
  <div v-if="loaded" class="py-6">
    <p v-if="mode === 'sync'" class="text-xl">Welcome back, {{ username }}</p>

    <template v-else-if="mode === null">
      <p class="mb-4 text-lg">How would you like to use the app?</p>
      <div class="flex gap-3">
        <button
          @click="chooseLocal"
          class="bg-slate-700 text-white rounded-md border-2 border-black px-3 py-1 cursor-pointer"
        >Local only</button>
        <RouterLink
          to="/sync-settings"
          class="bg-sky-500 text-white rounded-md border-2 border-black px-3 py-1"
        >Set up sync</RouterLink>
      </div>
    </template>

    <!-- returning local-only user: nothing -->
  </div>
</template>
