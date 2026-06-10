<script setup lang="ts">
import { computed, ref } from 'vue'
import CheckableItem from './CheckableItem.vue'
import ReorderingModal from './ReorderingModal.vue'

interface ChildItem {
    id: string
    name: string
    order: number | null
    completed_at: number | null
    has_description?: boolean
    children?: Array<{ completed_at: number | null }>
}

const props = defineProps<{
    items: ChildItem[]
    title: string
    basePath: string
    childLabel?: string
    theme?: string | null
}>()

const emit = defineEmits<{
    create: [string]
    toggle: [{ id: string; nowComplete: boolean }]
    reorder: [{ id: string; order: number | null; name: string }[]]
}>()

const PAGE_SIZE = 10

const incompleteItems = computed(() =>
    props.items
        .filter((i) => !i.completed_at)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
)

const completedItems = computed(() =>
    props.items
        .filter((i) => i.completed_at)
        .sort((a, b) => (b.completed_at! > a.completed_at! ? 1 : -1)),
)

const incompletePage = ref(1)
const completedPage = ref(1)

const incompleteTotalPages = computed(() => Math.max(1, Math.ceil(incompleteItems.value.length / PAGE_SIZE)))
const completedTotalPages = computed(() => Math.max(1, Math.ceil(completedItems.value.length / PAGE_SIZE)))

const pagedIncomplete = computed(() => incompleteItems.value.slice((incompletePage.value - 1) * PAGE_SIZE, incompletePage.value * PAGE_SIZE))
const pagedCompleted = computed(() => completedItems.value.slice((completedPage.value - 1) * PAGE_SIZE, completedPage.value * PAGE_SIZE))

const incompleteChildCount = (item: ChildItem) =>
    item.children?.filter((c) => !c.completed_at).length ?? 0

const name = ref('')
const createItem = () => {
    if (!name.value.trim()) return
    emit('create', name.value.trim())
    name.value = ''
}

const modalOpen = ref(false)
</script>

<template>
    <div class="space-y-2">
        <div class="h-fit bg-main rounded-md p-2 space-y-2">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-xl underline">{{ title }}</h2>
                <div class="rounded-full bg-white w-6 h-6 flex justify-center items-center border cursor-pointer" @click="modalOpen = true">
                    <font-awesome-icon icon="up-down" />
                </div>
            </div>
            <form @submit.prevent="createItem">
                <div class="flex gap-2">
                    <input type="text" class="bg-white rounded-md flex-grow border border-black text-black px-1" v-model="name" />
                    <button type="submit" class="bg-black px-2 rounded-md text-white">Add</button>
                </div>
            </form>
            <div :class="incompleteTotalPages > 1 ? 'h-80 overflow-hidden' : ''">
                <CheckableItem
                    v-for="item in pagedIncomplete"
                    :key="item.id"
                    :to="`/${basePath}/${item.id}`"
                    :name="item.name"
                    :completed-at="null"
                    :incomplete-tasks="incompleteChildCount(item)"
                    :total-tasks="item.children?.length ?? 0"
                    :child-label="childLabel"
                    :has-description="item.has_description"
                    @toggle="(nowComplete) => emit('toggle', { id: item.id, nowComplete })"
                />
                <p v-if="!incompleteItems.length" class="italic">No {{ title.toLowerCase() }} yet.</p>
            </div>
            <div class="text-sm text-gray-700" v-if="incompleteItems.length > PAGE_SIZE">
                Showing {{ (incompletePage - 1) * PAGE_SIZE + 1 }}–{{ Math.min(incompletePage * PAGE_SIZE, incompleteItems.length) }} of {{ incompleteItems.length }}
            </div>
            <div v-if="incompleteTotalPages > 1" class="flex items-center gap-2">
                <button @click="incompletePage--" :disabled="incompletePage === 1" class="px-3 py-1 rounded border border-gray-500 disabled:opacity-40 cursor-pointer disabled:cursor-default">&larr;</button>
                <span class="text-sm">Page {{ incompletePage }} of {{ incompleteTotalPages }}</span>
                <button @click="incompletePage++" :disabled="incompletePage === incompleteTotalPages" class="px-3 py-1 rounded border border-gray-500 disabled:opacity-40 cursor-pointer disabled:cursor-default">&rarr;</button>
            </div>
        </div>

        <div class="h-fit bg-light rounded-md p-2 space-y-2">
            <h2 class="text-xl underline mb-2">Completed</h2>
            <div :class="completedTotalPages > 1 ? 'h-80 overflow-hidden' : ''">
                <CheckableItem
                    v-for="item in pagedCompleted"
                    :key="item.id"
                    :to="`/${basePath}/${item.id}`"
                    :name="item.name"
                    :completed-at="item.completed_at"
                    @toggle="(nowComplete) => emit('toggle', { id: item.id, nowComplete })"
                />
                <p v-if="!completedItems.length" class="italic">No completed {{ title.toLowerCase() }}.</p>
            </div>
            <div class="text-sm text-gray-700" v-if="completedItems.length > PAGE_SIZE">
                Showing {{ (completedPage - 1) * PAGE_SIZE + 1 }}–{{ Math.min(completedPage * PAGE_SIZE, completedItems.length) }} of {{ completedItems.length }}
            </div>
            <div v-if="completedTotalPages > 1" class="flex items-center gap-2">
                <button @click="completedPage--" :disabled="completedPage === 1" class="px-3 py-1 rounded border border-gray-500 disabled:opacity-40 cursor-pointer disabled:cursor-default">&larr;</button>
                <span class="text-sm">Page {{ completedPage }} of {{ completedTotalPages }}</span>
                <button @click="completedPage++" :disabled="completedPage === completedTotalPages" class="px-3 py-1 rounded border border-gray-500 disabled:opacity-40 cursor-pointer disabled:cursor-default">&rarr;</button>
            </div>
        </div>
    </div>

    <ReorderingModal
        v-model:open="modalOpen"
        :items="incompleteItems"
        :theme="theme ?? null"
        @save="(items) => emit('reorder', items)"
    />
</template>
