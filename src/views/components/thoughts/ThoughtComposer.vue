<script setup lang="ts">
import { ref } from 'vue'

// Add a thought: optional title, required body. Cmd/Ctrl+Enter submits.
const emit = defineEmits<{ submit: [{ title: string | null; body: string }] }>()

const title = ref('')
const body = ref('')

function submit() {
    if (!body.value.trim()) return
    emit('submit', { title: title.value.trim() || null, body: body.value })
    title.value = ''
    body.value = ''
}

function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
}
</script>

<template>
    <form class="space-y-2" @submit.prevent="submit" @keydown="onKeydown">
        <input
            v-model="title"
            type="text"
            placeholder="Title (optional)"
            class="w-full bg-white text-black border border-gray-400 rounded-md px-2 py-1"
        />
        <textarea
            v-model="body"
            rows="3"
            placeholder="Add a thought…"
            class="w-full bg-white text-black border border-gray-400 rounded-md px-2 py-1 resize-y"
        ></textarea>
        <div class="flex justify-end">
            <button
                type="submit"
                :disabled="!body.trim()"
                class="bg-sky-500 text-white text-sm px-3 py-1 rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >Add thought</button>
        </div>
    </form>
</template>
