<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getUserConfig, setSyncUser, setLocalOnly, type UserMode } from '@/data/userConfig'

const username = ref('')
const mode = ref<UserMode | null>(null)
const busy = ref(false)

onMounted(async () => {
  const cfg = await getUserConfig()
  username.value = cfg.username ?? ''
  mode.value = cfg.mode
})

const save = async () => {
  const name = username.value.trim()
  if (!name || busy.value) return
  busy.value = true
  await setSyncUser(name)
  // Reload so boot re-runs against the sync database and starts syncing.
  window.location.reload()
}

const disableSync = async () => {
  if (busy.value) return
  busy.value = true
  await setLocalOnly()
  // Reload so boot re-runs in local-only mode (no sync).
  window.location.reload()
}
</script>

<template>
  <div class="py-6 max-w-sm space-y-4">
    <label class="block">
      <span class="block mb-1">Username</span>
      <input
        v-model="username"
        type="text"
        placeholder="Enter a username"
        class="w-full p-1 border rounded-md bg-white text-black"
        @keyup.enter="save"
      />
    </label>
    <button
      @click="save"
      :disabled="!username.trim() || busy"
      class="bg-sky-500 text-white rounded-md border-2 border-black px-3 py-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >Save</button>

    <button
      v-if="mode === 'sync'"
      @click="disableSync"
      :disabled="busy"
      class="block bg-red-500 text-white rounded-md border-2 border-black px-3 py-1 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >Disable sync</button>
  </div>
</template>

