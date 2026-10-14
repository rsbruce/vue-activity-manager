<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch, ref } from 'vue'
import Viewer from '@toast-ui/editor/viewer'
import '@toast-ui/editor/dist/toastui-editor-viewer.css'

// Read-only render via Toast UI's own Viewer (the lightweight viewer-only
// bundle, not the full editor), so the rendered output matches the editor's
// preview exactly — same parser, same built-in sanitizer. Replaces the former
// marked + DOMPurify path.
const props = defineProps<{ description: string | null }>()

const root = ref<HTMLElement | null>(null)
let viewer: Viewer | null = null

onMounted(() => {
    viewer = new Viewer({
        el: root.value!,
        initialValue: props.description ?? '',
        usageStatistics: false,
    })
})

watch(() => props.description, (md) => {
    viewer?.setMarkdown(md ?? '')
})

onBeforeUnmount(() => {
    viewer?.destroy()
})
</script>

<template>
    <div class="p-2 bg-white text-black rounded-lg shadow-md">
        <div v-show="description" ref="root" class="toast-viewer"></div>
        <p v-show="!description" class="italic text-gray-400">No description.</p>
    </div>
</template>
