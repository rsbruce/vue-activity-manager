<script setup lang="ts">
import type { ActivityType } from '@/types/activities'
import ActivityTypeForm from '@/views/components/ActivityTypeForm.vue'

defineProps<{
    activityType: ActivityType | null
}>()
</script>

<template>
    <ActivityTypeForm v-if="activityType" :activityType="activityType" />
    <p v-else>Activity type not found.</p>
</template>
