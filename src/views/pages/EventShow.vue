<script setup lang="ts">
import type { Event } from '@/types/events';

defineProps({
    event: {
        type: Object as () => Event,
        required: true,
    },
})

const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleString()
}
</script>

<template>
    <div class="py-6 space-y-4">
        <div class="flex gap-4 items-center">
            <RouterLink to="/events">Back</RouterLink>
            <!-- <RouterLink :to="`/events/${event.id}/edit`">Edit</RouterLink> -->
        </div>

        <h2 class="text-2xl">{{ event.name }}</h2>

        <div class="space-y-1 text-sm text-gray-300">
            <p v-if="event.start_datetime">Start: {{ formatDate(event.start_datetime) }}</p>
            <p v-if="event.end_datetime">End: {{ formatDate(event.end_datetime) }}</p>
            <p v-if="event.project">Project: <RouterLink :to="`/projects/${event.project.id}`">{{ event.project.name }}</RouterLink></p>
        </div>

        <div v-if="event.before_notes" class="mt-4">
            <h3 class="text-lg underline">Before Notes</h3>
            <p class="whitespace-pre-wrap">{{ event.before_notes }}</p>
        </div>

        <div v-if="event.after_notes" class="mt-4">
            <h3 class="text-lg underline">After Notes</h3>
            <p class="whitespace-pre-wrap">{{ event.after_notes }}</p>
        </div>

        <h3 class="text-lg underline">Attendees</h3>
        <div class="space-y-1">
            <template v-for="person in event.people" :key="person.id">
                <div>
                    <RouterLink :to="`/people/${person.id}`">{{ person.firstname }} {{ person.lastname || '' }}</RouterLink>
                </div>
            </template>
            <p v-if="!event.people?.length">No attendees.</p>
        </div>
    </div>
</template>
