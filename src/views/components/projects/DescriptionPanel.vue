<script setup lang="ts">
import { onBeforeUnmount, watch, ref, nextTick, computed } from 'vue'
import Viewer from '@toast-ui/editor/viewer'
import '@toast-ui/editor/dist/toastui-editor-viewer.css'

// Read-only render via Toast UI's own Viewer (the lightweight viewer-only
// bundle, not the full editor), so the rendered output matches the editor's
// preview exactly — same parser, same built-in sanitizer.
const props = defineProps<{ description: string | null }>()

// Collapsed preview height: enough for a heading plus a couple of lines, so the
// bottom fade has room without hiding everything. Content taller than this gets
// the fade + "Show full description".
const COLLAPSED_PX = 112

const content = ref<HTMLElement | null>(null)
const expanded = ref(false)
const overflows = ref(false)
let viewer: Viewer | null = null
let observer: ResizeObserver | null = null

// Compare the full content height to the collapsed limit (not the clipped
// height), so the answer is the same whether currently expanded or not.
function measure() {
    overflows.value = !!content.value && content.value.scrollHeight > COLLAPSED_PX + 1
}

// No (or whitespace-only) description → the panel isn't rendered at all.
const hasDescription = computed(() => !!props.description?.trim())

function teardown() {
    observer?.disconnect()
    observer = null
    viewer?.destroy()
    viewer = null
}

// The content element only exists while there's a description, so create the
// viewer when it appears and tear it down when it goes.
watch(content, (el) => {
    teardown()
    if (!el) return
    viewer = new Viewer({ el, initialValue: props.description ?? '', usageStatistics: false })
    // Re-measure on any size change: viewer render, images loading, resizes.
    observer = new ResizeObserver(measure)
    observer.observe(el)
    measure()
})

watch(() => props.description, async (md) => {
    viewer?.setMarkdown(md ?? '')
    expanded.value = false
    await nextTick()
    measure()
})

onBeforeUnmount(teardown)
</script>

<template>
    <div
        v-if="hasDescription"
        class="relative bg-white text-black rounded-lg shadow-md overflow-hidden"
        :style="overflows && !expanded ? { maxHeight: `${COLLAPSED_PX}px` } : undefined"
    >
        <div ref="content" class="description-viewer px-3 pt-2 pb-3"></div>

        <!-- Collapsed: a short dark fade over just the bottom edge, full width to the
             rounded corners, with the label on its darkest part. -->
        <button
            v-if="overflows && !expanded"
            type="button"
            class="absolute inset-x-0 bottom-0 h-16 flex items-end justify-center pb-2 cursor-pointer bg-gradient-to-t from-black/75 to-transparent text-white text-sm font-semibold"
            @click="expanded = true"
        >Show full description</button>

        <div v-if="overflows && expanded" class="flex justify-center pb-2">
            <button type="button" class="text-sm text-gray-600 hover:underline cursor-pointer" @click="expanded = false">
                Hide description
            </button>
        </div>
    </div>
</template>

<style>
/* Toast UI gives the first block a top margin; drop it so the preview starts
   with the actual first line rather than whitespace. */
.description-viewer .toastui-editor-contents > :first-child {
    margin-top: 0 !important;
    padding-top: 0 !important;
}
</style>
