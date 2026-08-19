<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSyncEngine } from '@/composables/useSyncEngine'

const { syncStatus, syncError } = useSyncEngine()

// Sync is trigger-only-by-app (boot, interval, visibility) — clicking never
// starts a sync. The only interaction: in the failed state, clicking the
// cross toggles the error detail.
const showError = ref(false)

const onClick = () => {
  if (syncStatus.value === 'failed') showError.value = !showError.value
}

watch(syncStatus, (s) => {
  if (s !== 'failed') showError.value = false
})
</script>

<template>
  <div class="fixed bottom-0 right-0 p-1.5 rounded-tl-md z-50 bg-slate-900">
    <pre
      v-if="showError && syncError"
      class="absolute bottom-8 right-0 text-red-400 text-xs max-w-xs whitespace-pre-wrap w-max break-all bg-slate-800 border border-slate-700 rounded-md p-2 shadow-lg"
    >{{ syncError }}</pre>
    <div
      @click="onClick"
      title="Sync"
      class="flex items-center justify-center w-6 h-6 text-white opacity-70 hover:opacity-100 transition-opacity"
      :class="{ 'cursor-pointer': syncStatus === 'failed' }"
    >
      <!-- Spinner -->
      <svg v-if="syncStatus === 'syncing'" class="animate-spin w-full h-full" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
      <!-- Cross -->
      <svg v-else-if="syncStatus === 'failed'" class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M15 9l-6 6M9 9l6 6"/>
      </svg>
      <!-- Checkmark -->
      <svg v-else class="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#4ade80" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M8 12l3 3 5-5"/>
      </svg>
    </div>
  </div>
</template>
