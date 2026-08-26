<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import Editor from '@toast-ui/editor'
import '@toast-ui/editor/dist/toastui-editor.css'

// Toast UI editor: a WYSIWYG/markdown tabbed editor (StackEdit-like). Seeds from
// modelValue once on mount and emits current markdown on change, so the stored
// value stays plain markdown. usageStatistics:false stops it pinging analytics.
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const root = ref<HTMLElement | null>(null)
let editor: Editor | null = null

onMounted(() => {
    editor = new Editor({
        el: root.value!,
        initialValue: props.modelValue ?? '',
        initialEditType: 'wysiwyg',
        previewStyle: 'vertical',
        height: 'auto',
        usageStatistics: false,
        events: {
            change: () => { if (editor) emit('update:modelValue', editor.getMarkdown()) },
        },
    })
})

onBeforeUnmount(() => {
    editor?.destroy()
})
</script>

<template>
    <div ref="root" class="toast-editor bg-white text-black rounded-md"></div>
</template>

<style>
/* Match the app's font (Instrument Sans) across the editor chrome, the rendered
   content, and the editing surfaces, and round the outer border to match the
   app's inputs. */
.toast-editor .toastui-editor-defaultUI,
.toast-editor .toastui-editor-contents,
.toast-editor .ProseMirror {
    font-family: var(--font-sans, 'Instrument Sans', ui-sans-serif, system-ui, sans-serif);
}
.toast-editor .toastui-editor-defaultUI {
    border-radius: 0.375rem;
    overflow: hidden;
    min-height: 16rem;
}
</style>
