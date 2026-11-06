<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { Thought } from '@/data/thoughts'
import ThoughtList from './ThoughtList.vue'
import ThoughtComposer from './ThoughtComposer.vue'

// Slide-in panel from the right for reading/writing the thread. w-92 from the sm
// breakpoint; below it, it spans the screen minus a 2rem strip on the left.
const props = defineProps<{ entityName: string; thoughts: Thought[] }>()
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{
    create: [input: { title: string | null; body: string }]
    update: [id: string, input: { title: string | null; body: string }]
    delete: [id: string]
}>()

const scroller = ref<HTMLElement | null>(null)

// Land on the newest thought (bottom) when opening, and after adding one.
async function scrollToLatest() {
    await nextTick()
    if (scroller.value) scroller.value.scrollTop = scroller.value.scrollHeight
}

function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') open.value = false
}

watch(open, (isOpen) => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    if (isOpen) {
        document.addEventListener('keydown', onKeydown)
        scrollToLatest()
    } else {
        document.removeEventListener('keydown', onKeydown)
    }
})

watch(() => props.thoughts.length, (len, prev) => {
    if (open.value && len > prev) scrollToLatest()
})

onBeforeUnmount(() => {
    document.body.style.overflow = ''
    document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
    <Teleport to="body">
        <Transition
            enter-active-class="transition-opacity duration-300"
            enter-from-class="opacity-0"
            leave-active-class="transition-opacity duration-200"
            leave-to-class="opacity-0"
        >
            <div v-if="open" class="fixed inset-0 z-50 bg-black/50" @click="open = false"></div>
        </Transition>

        <Transition
            enter-active-class="transition-transform duration-300 ease-out"
            enter-from-class="translate-x-full"
            leave-active-class="transition-transform duration-200 ease-in"
            leave-to-class="translate-x-full"
        >
            <aside
                v-if="open"
                role="dialog"
                aria-label="Thought Thread"
                class="fixed inset-y-0 right-0 left-8 sm:left-auto sm:w-92 z-50 flex flex-col bg-slate-900 text-white border-l border-gray-600 shadow-2xl"
            >
                <header class="flex items-start gap-2 px-4 py-3 border-b border-gray-600">
                    <div class="min-w-0">
                        <h2 class="text-lg font-semibold">Thought Thread</h2>
                        <p class="text-sm text-gray-400 truncate">{{ entityName }}</p>
                    </div>
                    <button
                        type="button"
                        aria-label="Close thought thread"
                        class="ml-auto flex items-center justify-center w-8 h-8 cursor-pointer"
                        @click="open = false"
                    >
                        <font-awesome-icon icon="xmark" />
                    </button>
                </header>

                <div ref="scroller" class="flex-1 overflow-y-auto p-4">
                    <ThoughtList
                        :thoughts="thoughts"
                        @update="(id, input) => emit('update', id, input)"
                        @delete="(id) => emit('delete', id)"
                    />
                </div>

                <div class="border-t border-gray-600 p-4">
                    <ThoughtComposer @submit="(input) => emit('create', input)" />
                </div>
            </aside>
        </Transition>
    </Teleport>
</template>
