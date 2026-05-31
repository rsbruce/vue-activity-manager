<script setup lang="ts">
import type { ActivityType, ActivityWithType } from '@/types/activities'
import ActivityForm from '@/views/components/ActivityForm.vue'

defineProps<{
    activity: ActivityWithType | null
    activityTypes: ActivityType[]
}>()
</script>

<template>
    <ActivityForm v-if="activity" :activity="activity" :activityTypes="activityTypes" />
    <p v-else>Activity not found.</p>
</template>
