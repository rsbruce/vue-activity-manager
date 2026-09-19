<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDemoMode } from '@/composables/useDemoMode'

defineProps<{ links: { to: string; label: string }[] }>()
const emit = defineEmits<{ purge: [] }>()

const { isDemo } = useDemoMode()

// Close the menu, then ask the app to confirm the purge.
const onPurge = () => {
  open.value = false
  emit('purge')
}

const route = useRoute()
const router = useRouter()
const open = ref(false)
const navigating = ref(false)

// The menu stays open until the navigation fully resolves — the target
// route's beforeEnter loads its data first, so closing on click would flash
// the previous page underneath.
const navigate = async (to: string) => {
  if (navigating.value) return
  navigating.value = true
  try {
    await router.push(to)
  } finally {
    navigating.value = false
    open.value = false
  }
}

watch(open, (o) => {
  document.body.style.overflow = o ? 'hidden' : ''
})

// Safety net: navigation not initiated from the menu closes it too.
watch(() => route.fullPath, () => {
  open.value = false
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="sticky top-0 z-40 md:hidden flex items-center justify-between bg-slate-900 border-b px-3 py-2">
    <span class="text-lg">{{ route.name }}</span>
    <button
      @click="open = true"
      aria-label="Open menu"
      class="flex items-center justify-center w-8 h-8 cursor-pointer"
    >
      <font-awesome-icon icon="bars" />
    </button>
  </div>

  <div v-if="open" class="fixed inset-0 z-[60] md:hidden bg-slate-900 flex flex-col">
    <div class="flex justify-end px-3 py-2">
      <button
        @click="open = false"
        aria-label="Close menu"
        class="flex items-center justify-center w-8 h-8 cursor-pointer"
      >
        <font-awesome-icon icon="xmark" />
      </button>
    </div>
    <nav class="flex flex-col gap-4 px-6 py-4 text-lg" :class="{ 'opacity-50 pointer-events-none': navigating }">
      <button
        v-for="link in links"
        :key="link.to"
        @click="navigate(link.to)"
        class="text-left cursor-pointer"
      >{{ link.label }}</button>
    </nav>
    <button
      v-if="isDemo"
      type="button"
      class="mt-auto mx-6 mb-6 bg-red-600 text-white py-3 rounded-md cursor-pointer"
      @click="onPurge"
    >Purge demo data</button>
    <div v-if="navigating" class="absolute inset-0 flex items-center justify-center">
      <svg class="animate-spin w-8 h-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
      </svg>
    </div>
  </div>
</template>
