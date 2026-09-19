<script setup lang="ts">
// Generic confirm modal reused for both the "seed demo data" prompt and the
// "purge demo data" confirmation, so they share one look. Matches the app's
// modal style (centred white card over a dimmed overlay).
defineProps<{
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  confirmClass?: string
  busy?: boolean
}>()

const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[70] bg-gray-700/80 flex items-center justify-center p-4"
      @click.self="!busy && emit('cancel')"
    >
      <div class="w-full max-w-md space-y-4 p-5 bg-white text-black rounded-md shadow-md">
        <h3 class="text-lg font-semibold">{{ title }}</h3>
        <p class="text-sm text-gray-700 whitespace-pre-line">{{ message }}</p>
        <div class="flex justify-end gap-2 pt-1">
          <button
            type="button"
            class="px-3 py-1 rounded-md border border-gray-400 cursor-pointer disabled:opacity-50"
            :disabled="busy"
            @click="emit('cancel')"
          >{{ cancelLabel }}</button>
          <button
            type="button"
            class="px-3 py-1 rounded-md text-white cursor-pointer disabled:opacity-50"
            :class="confirmClass ?? 'bg-sky-500'"
            :disabled="busy"
            @click="emit('confirm')"
          >{{ busy ? 'Working…' : confirmLabel }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
