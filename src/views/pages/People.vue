<script setup lang="ts">
import { createPerson } from '@/data/people';
import { refreshCurrent } from '@/router/defineController';
import type { Person } from '@/types/people';
import { computed, ref, reactive } from 'vue';

const props = defineProps({
    people: {
        type: Array as () => Person[],
        required: true,
    },
})

const form = reactive({
    firstname: '',
    lastname: '',
    dob: '',
})

const submit = async () => {
    const payload : {
        firstname: string,
        lastname: string,
        dob?: Date
    } = {
        firstname: form.firstname,
        lastname: form.lastname,
    }

    if (form.dob.length) {
        payload.dob = new Date(form.dob)
    }

    await createPerson(payload)
    refreshCurrent()

    form.firstname = ''
    form.lastname = ''
    form.dob = ''
}

const PAGE_SIZE = 10
const currentPage = ref(1)

type SortKey = 'name' | 'events' | 'last_seen'
type SortDir = 'asc' | 'desc'

const sortKey = ref<SortKey | null>(null)
const sortDir = ref<SortDir>('asc')

function toggleSort(key: SortKey) {
    if (sortKey.value === key) {
        sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
    } else {
        sortKey.value = key
        sortDir.value = 'asc'
    }
    currentPage.value = 1
}

const sortedPeople = computed(() => {
    if (!sortKey.value) {
        return props.people
    }

    return [...props.people].sort((a, b) => {
        let cmp = 0
        if (sortKey.value === 'name') {
            const aName = `${a.firstname} ${a.lastname || ''}`.trim().toLowerCase()
            const bName = `${b.firstname} ${b.lastname || ''}`.trim().toLowerCase()
            cmp = aName.localeCompare(bName)
        } else if (sortKey.value === 'events') {
            cmp = (a.events_count || 0) - (b.events_count || 0)
        } else if (sortKey.value === 'last_seen') {
            const aDate = a.last_seen_date
            const bDate = b.last_seen_date
            if (!aDate && !bDate) {
                return 0
            }
            if (!aDate) {
                return 1
            }
            if (!bDate) {
                return -1
            }
            cmp = aDate < bDate ? -1 : aDate > bDate ? 1 : 0
        }

        return sortDir.value === 'asc' ? cmp : -cmp
    })
})

const totalPages = computed(() => Math.ceil(props.people.length / PAGE_SIZE))

function daysAgo(datetimeStr: string | null | undefined): string {
    if (!datetimeStr) {
        return '—'
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const day = new Date(datetimeStr)
    day.setHours(0, 0, 0, 0)

    const numDays = Math.round((today.getTime() - day.getTime()) / 86_400_000)

    if (numDays === 0) return 'Today'
    if (numDays === 1) return 'Yesterday'
    if (numDays < 30) return `${numDays} days ago`

    const months = Math.round(numDays / 30.44)
    if (months < 12) {
        return `${months} month${months === 1 ? '' : 's'} ago`
    }
    
    const years = Math.floor(months / 12)
    const remainingMonths = months % 12
    if (remainingMonths === 0) {
        return `${years} year${years === 1 ? '' : 's'} ago`
    }
    
    return `${years} year${years === 1 ? '' : 's'} ${remainingMonths} month${remainingMonths === 1 ? '' : 's'} ago`
}

function formatDate(datetimeStr: string | null | undefined): string {
    if (!datetimeStr) return ''
    return new Date(datetimeStr).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

const pagedPeople = computed(() => {
    const start = (currentPage.value - 1) * PAGE_SIZE
    return sortedPeople.value.slice(start, start + PAGE_SIZE)
})
</script>

<template>
    <div class="py-6 space-y-6">
        <div class="flex gap-4">
            <RouterLink to="/people/groups">People Groups</RouterLink>
        </div>

        <h2 class="text-xl underline">New Person</h2>
        <div class="p-2 rounded-md bg-gray-300 shadow-md w-72 text-black">
            <form @submit.prevent="submit" class="flex flex-col gap-2">
                <label>
                    <div>First Name</div>
                    <input class="bg-white border border-black rounded-md w-full" type="text" v-model="form.firstname" />
                </label>
                <label>
                    <div>Last Name</div>
                    <input class="bg-white border border-black rounded-md w-full" type="text" v-model="form.lastname" />
                </label>
                <label>
                    <div>Date of Birth</div>
                    <input class="bg-white border border-black rounded-md w-full" type="date" v-model="form.dob" />
                </label>
                <button type="submit" class="bg-sky-500 text-white rounded-md border-2 border-black cursor-pointer">Create</button>
            </form>
        </div>

        <div class="space-y-2">
            <div class="overflow-x-auto">
            <table class="w-full min-w-[44rem] table-fixed border-collapse text-white">
                <colgroup>
                    <col class="w-60" />
                    <col class="w-24" />
                    <col class="w-48" />
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
                            <button @click="toggleSort('events')" class="flex items-center gap-1 cursor-pointer hover:underline">
                                Events
                                <span class="text-xs text-gray-400">
                                    <template v-if="sortKey === 'events'">{{ sortDir === 'asc' ? '▲' : '▼' }}</template>
                                    <template v-else>⇅</template>
                                </span>
                            </button>
                        </th>
                        <th class="py-2 pr-4 font-semibold">
                            <button @click="toggleSort('last_seen')" class="flex items-center gap-1 cursor-pointer hover:underline">
                                Last Seen
                                <span class="text-xs text-gray-400">
                                    <template v-if="sortKey === 'last_seen'">{{ sortDir === 'asc' ? '▲' : '▼' }}</template>
                                    <template v-else>⇅</template>
                                </span>
                            </button>
                        </th>
                        <th class="py-2 font-semibold">Next Event</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="person in pagedPeople" :key="person.id" class="border-b border-gray-700">
                        <td class="py-2 pr-4">
                            <RouterLink :to="`/people/${person.id}`">{{ person.firstname }} {{ person.lastname || '' }}</RouterLink>
                        </td>
                        <td class="py-2 pr-4">{{ person.events_count || 0 }}</td>
                        <td class="py-2 pr-4">{{ daysAgo(person.last_seen_date) }}</td>
                        <td class="py-2">
                            <template v-if="person.next_event_id">
                                <RouterLink :to="`/events/${person.next_event_id}`">{{ person.next_event_name }}</RouterLink>
                                <span class="text-xs text-gray-400 ml-1">({{ formatDate(person.next_event_date) }})</span>
                            </template>
                            <span v-else class="text-gray-500">—</span>
                        </td>
                    </tr>
                    <tr v-if="!people.length">
                        <td colspan="4" class="py-2 text-gray-400">No people yet.</td>
                    </tr>
                </tbody>
            </table>
            </div>
            <div class="text-sm text-gray-400 pt-2">
                Showing {{ (currentPage - 1) * PAGE_SIZE + 1 }}–{{ Math.min(currentPage * PAGE_SIZE, people.length) }} of {{ people.length }}
            </div>
            <div v-if="totalPages > 1" class="flex items-center gap-2">
                <button
                    @click="currentPage--"
                    :disabled="currentPage === 1"
                    class="px-3 py-1 rounded border border-gray-500 disabled:opacity-40 cursor-pointer disabled:cursor-default"
                >
                    &larr;
                </button>
                <span class="text-sm">Page {{ currentPage }} of {{ totalPages }}</span>
                <button
                    @click="currentPage++"
                    :disabled="currentPage === totalPages"
                    class="px-3 py-1 rounded border border-gray-500 disabled:opacity-40 cursor-pointer disabled:cursor-default"
                >
                    &rarr;
                </button>
            </div>
        </div>
    </div>
</template>
