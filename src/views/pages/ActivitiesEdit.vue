<script setup lang="ts">
import { computed } from 'vue'
import type { ActivityTypeGroup } from '@/types/activities'
import ActivityForm from '@/views/components/ActivityForm.vue'

const props = defineProps<{
    activityTypeGroups: ActivityTypeGroup[]
}>()

const activityTypes = computed(() =>
    props.activityTypeGroups.map((group) => group.activityType),
)
</script>

<template>
    <div class="py-6 flex flex-col gap-6">
        <div class="flex gap-4">
            <RouterLink to="/activities/tracking">Tracking</RouterLink>
            <RouterLink to="/activities/types">Activity Types</RouterLink>
        </div>

        <ActivityForm :activityTypes="activityTypes" />

        <template v-if="activityTypeGroups.length">
            <div class="grid md:grid-cols-3 gap-2">
                <template v-for="group in activityTypeGroups" :key="group.activityType.id">
                    <div class="bg-main rounded-md p-2 text-black" :data-model-theme="group.activityType.theme">
                        <h3 class="text-xl mb-2 underline">
                            <RouterLink :to="`/activity-types/${group.activityType.id}/edit`">{{ group.activityType.name }}</RouterLink>
                        </h3>
                        <template v-if="group.activities.length">
                            <div class="space-y-1">
                                <template v-for="activity in group.activities" :key="activity.id">
                                    <div class="flex border-b border-gray-700">
                                        <RouterLink :to="`/activities/${activity.id}/edit`">
                                            {{ activity.name + (activity.deleted_at ? ' (Trashed)' : '') }}
                                        </RouterLink>
                                    </div>
                                </template>
                            </div>
                        </template>
                        <template v-else>
                            <p>No activities to show</p>
                        </template>
                    </div>
                </template>
            </div>
        </template>
        <template v-else>
            <span>There are no activity types in the database. Add some</span>
        </template>
    </div>
</template>
