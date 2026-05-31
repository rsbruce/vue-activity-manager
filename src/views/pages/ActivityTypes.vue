<script setup lang="ts">
import type { ActivityType } from '@/types/activities'
import ActivityTypeForm from '@/views/components/ActivityTypeForm.vue'

defineProps<{
    activityTypes: ActivityType[]
}>()
</script>

<template>
    <div class="py-6 flex flex-col gap-6">
        <RouterLink to="/activities/index">Back to Activities</RouterLink>

        <ActivityTypeForm />

        <div class="flex flex-col gap-2">
            <template v-for="activityType in activityTypes" :key="activityType.id">
                <div class="flex gap-2 items-center">
                    <RouterLink :to="`/activity-types/${activityType.id}/edit`">
                        {{ activityType.name }}{{ activityType.deleted_at ? ' (Trashed)' : '' }}
                    </RouterLink>
                </div>
            </template>
        </div>
    </div>
</template>
