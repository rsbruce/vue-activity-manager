<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Thought } from '@/data/thoughts'

const props = defineProps<{ thought: Thought }>()
const emit = defineEmits<{
    save: [{ title: string | null; body: string }]
    delete: []
}>()

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// e.g. "Fri 24 Oct, 14:05" — with the year only when it isn't this year.
function formatStamp(seconds: number): string {
    const d = new Date(seconds * 1000)
    const year = d.getFullYear() === new Date().getFullYear() ? '' : ` ${d.getFullYear()}`
    const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    return `${WEEKDAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${year}, ${time}`
}

const stamp = computed(() => formatStamp(props.thought.created_at))
const edited = computed(() => props.thought.updated_at > props.thought.created_at + 60)

// Edit drafts are copied on entering edit mode and not re-synced from props, so a
// background refresh can't overwrite what's being typed.
const editing = ref(false)
const confirmingDelete = ref(false)
const draftTitle = ref('')
const draftBody = ref('')

function startEdit() {
    draftTitle.value = props.thought.title ?? ''
    draftBody.value = props.thought.body
    confirmingDelete.value = false
    editing.value = true
}

function save() {
    if (!draftBody.value.trim()) return
    emit('save', { title: draftTitle.value.trim() || null, body: draftBody.value })
    editing.value = false
}

function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save()
    if (e.key === 'Escape') editing.value = false
}
</script>

<template>
    <article class="bg-gray-200 text-black rounded-md shadow-sm p-3">
        <template v-if="!editing">
            <header class="flex items-start gap-3">
                <h4 v-if="thought.title" class="font-semibold break-words min-w-0">{{ thought.title }}</h4>
                <span class="ml-auto shrink-0 text-xs text-gray-600" :title="edited ? `Edited ${formatStamp(thought.updated_at)}` : undefined">
                    {{ stamp }}<span v-if="edited"> · edited</span>
                </span>
            </header>
            <p class="mt-1 whitespace-pre-wrap break-words">{{ thought.body }}</p>
            <div class="flex justify-end">
                <button
                    type="button"
                    aria-label="Edit thought"
                    class="p-1 -mr-1 -mb-1 text-gray-400 hover:text-gray-700 cursor-pointer"
                    @click="startEdit"
                >
                    <font-awesome-icon icon="pencil" class="text-sm" />
                </button>
            </div>
        </template>

        <form v-else class="space-y-2" @submit.prevent="save" @keydown="onKeydown">
            <input
                v-model="draftTitle"
                type="text"
                placeholder="Title (optional)"
                class="w-full bg-white border border-gray-400 rounded-md px-2 py-1"
            />
            <textarea
                v-model="draftBody"
                rows="5"
                class="w-full bg-white border border-gray-400 rounded-md px-2 py-1 resize-y"
            ></textarea>
            <div v-if="!confirmingDelete" class="flex items-center gap-2">
                <button type="button" class="text-sm text-red-600 hover:underline cursor-pointer" @click="confirmingDelete = true">Delete</button>
                <button type="button" class="ml-auto text-sm px-2 py-1 rounded-md border border-gray-400 cursor-pointer" @click="editing = false">Cancel</button>
                <button
                    type="submit"
                    :disabled="!draftBody.trim()"
                    class="text-sm px-2 py-1 rounded-md bg-sky-500 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >Save</button>
            </div>
            <div v-else class="flex items-center gap-2">
                <span class="text-sm">Delete this thought?</span>
                <button type="button" class="ml-auto text-sm px-2 py-1 rounded-md border border-gray-400 cursor-pointer" @click="confirmingDelete = false">No</button>
                <button type="button" class="text-sm px-2 py-1 rounded-md bg-red-600 text-white cursor-pointer" @click="emit('delete')">Delete</button>
            </div>
        </form>
    </article>
</template>
