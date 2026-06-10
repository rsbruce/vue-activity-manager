<script setup lang="ts">
import type { PeopleGroup } from '@/types/people'

defineProps({
    groups: {
        type: Array as () => PeopleGroup[],
        required: true,
    },
})
</script>

<template>
    <div class="py-6 space-y-6">
        <div>
            <RouterLink to="/people">&larr; Back to People</RouterLink>
        </div>
        <div class="bg-sky-500 rounded-md p-1 w-fit">
            <RouterLink to="/people/groups/new">New Group &rarr;</RouterLink>
        </div>

        <div class="space-y-2">
            <template v-for="group in groups" :key="group.id">
                <div class="flex gap-2 items-center">
                    <RouterLink :to="`/people/groups/${group.id}`">{{ group.name }}</RouterLink>
                    <span class="text-xs text-gray-400">({{ group.member_count || 0 }} members)</span>
                </div>
            </template>
            <p v-if="!groups.length" class="text-gray-400">No groups yet.</p>
        </div>
    </div>
</template>
