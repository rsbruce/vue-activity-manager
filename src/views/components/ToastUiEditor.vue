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
    <div ref="root" class="bg-white text-black rounded-md"></div>
</template>
