<script setup lang="ts">
import type { Event } from '@/types/events';
import type { Person } from '@/types/people';
import { computed, ref } from 'vue';

const props = defineProps({
    events: {
        type: Array as () => Event[],
        required: true,
    },
})

const PAGE_SIZE = 10

type SortKey = 'name' | 'date'
type SortDir = 'asc' | 'desc'

const sortKey = ref<SortKey>('date')
const sortDir = ref<SortDir>('desc')
const currentPage = ref(1)

function toggleSort(key: SortKey) {
    if (sortKey.value === key) {
        sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    } else {
        sortKey.value = key
        sortDir.value = key === 'date' ? 'desc' : 'asc'
    }
    currentPage.value = 1
}

const sortedEvents = computed(() => {
    return [...props.events].sort((a, b) => {
        let cmp = 0
        if (sortKey.value === 'name') {
            cmp = (a.name || '').localeCompare(b.name || '')
        } else {
            const aDate = a.start_datetime ?? ''
            const bDate = b.start_datetime ?? ''
            cmp = aDate < bDate ? -1 : aDate > bDate ? 1 : 0
        }
        return sortDir.value === 'asc' ? cmp : -cmp
    })
})

const totalPages = computed(() => Math.ceil(props.events.length / PAGE_SIZE))

const pagedEvents = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return sortedEvents.value.slice(start, start + PAGE_SIZE)
})

function formatDate(dt: string | null): string {
    if (!dt) return '—'
    return new Date(dt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function peopleWith(people: Person[] | undefined): string {
    if (!people?.length) return '—'
    const sorted = [...people].sort((a, b) => (b.events_count || 0) - (a.events_count || 0))
    const named = sorted.slice(0, 2).map(p => `${p.firstname} ${p.lastname || ''}`.trim())
    const extra = sorted.length - 2
    if (extra > 0) return named.join(', ') + ` + ${extra} more`
    return named.join(', ')
}
</script>

<template>
    <div class="space-y-2">
        <table class="w-full table-fixed border-collapse text-white">
            <colgroup>
                <col class="w-1/3" />
                <col class="w-36" />
                <col />
            </colgroup>
            <thead>
                <tr class="border-b border-gray-600 text-left">
                    <th class="py-2 pr-4 font-semibold">
                        <button @click="toggleSort('name')" class="flex items-center gap-1 cursor-pointer hover:underline">
                            Name
                            <span class="text-xs text-gray-400">
                                <template v-if="sortKey === 'name'">{{ sortDir === 'asc' ? '▲' : '▼' }}</template>
                                <template v-else>⇅</template>
                            </span>
                        </button>
                    </th>
                    <th class="py-2 pr-4 font-semibold">
                        <button @click="toggleSort('date')" class="flex items-center gap-1 cursor-pointer hover:underline">
                            Date
                            <span class="text-xs text-gray-400">
                                <template v-if="sortKey === 'date'">{{ sortDir === 'asc' ? '▲' : '▼' }}</template>
                                <template v-else>⇅</template>
                            </span>
                        </button>
                    </th>
                    <th class="py-2 font-semibold">People</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="event in pagedEvents" :key="event.id" class="border-b border-gray-700">
                    <td class="py-2 pr-4 truncate">
                        <RouterLink :to="`/events/${event.id}`">{{ event.name }}</RouterLink>
                    </td>
                    <td class="py-2 pr-4">{{ formatDate(event.start_datetime) }}</td>
                    <td class="py-2 text-sm text-gray-300">{{ peopleWith(event.people) }}</td>
                </tr>
                <tr v-if="!events.length">
                    <td colspan="3" class="py-2 text-gray-400">No events.</td>
                </tr>
            </tbody>
        </table>

        <div class="text-sm text-gray-400">
            Showing {{ (currentPage - 1) * PAGE_SIZE + 1 }}–{{ Math.min(currentPage * PAGE_SIZE, events.length) }} of {{ events.length }}
        </div>
        <div v-if="totalPages > 1" class="flex items-center gap-2">
            <button
                @click="currentPage--"
                :disabled="currentPage === 1"
                class="px-3 py-1 rounded border border-gray-500 disabled:opacity-40 cursor-pointer disabled:cursor-default"
            >&larr;</button>
            <span class="text-sm">Page {{ currentPage }} of {{ totalPages }}</span>
            <button
                @click="currentPage++"
                :disabled="currentPage === totalPages"
                class="px-3 py-1 rounded border border-gray-500 disabled:opacity-40 cursor-pointer disabled:cursor-default"
            >&rarr;</button>
        </div>
    </div>
</template>
