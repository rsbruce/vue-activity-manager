<script setup lang="ts">
import type { Person } from '@/types/people'

defineProps({
    person: {
        type: Object as () => Person,
        required: true,
    },
})

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Unknown'
    return new Date(dateStr).toLocaleDateString()
}
</script>

<template>
    <div class="py-6 space-y-4">
        <div class="flex gap-4 items-center">
            <RouterLink to="/people">Back</RouterLink>
            <RouterLink :to="`/people/${person.id}/edit`">Edit</RouterLink>
        </div>

        <h2 class="text-2xl">{{ person.firstname }} {{ person.lastname || '' }}</h2>

        <div v-if="person.dob">
            <p class="text-sm text-gray-400">Born: {{ formatDate(person.dob) }}</p>
        </div>

        <h3 class="text-lg underline">Events</h3>
        <div class="space-y-2">
            <template v-for="event in person.events" :key="event.id">
                <div class="flex gap-2 items-center">
                    <RouterLink :to="`/events/${event.id}`">{{ event.name }}</RouterLink>
                    <span class="text-xs text-gray-400" v-if="event.start_datetime">{{ formatDate(event.start_datetime) }}</span>
                </div>
            </template>
            <p v-if="!person.events?.length" class="text-gray-400">No events.</p>
        </div>

        <h3 class="text-lg underline">Groups</h3>
        <div class="space-y-2">
            <template v-for="group in person.groups" :key="group.id">
                <div>
                    <RouterLink :to="`/people/groups/${group.id}`">{{ group.name }}</RouterLink>
                </div>
            </template>
            <p v-if="!person.groups?.length" class="text-gray-400">No groups.</p>
        </div>
    </div>
</template>
