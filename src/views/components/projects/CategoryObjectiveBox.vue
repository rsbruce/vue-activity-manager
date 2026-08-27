<script setup lang="ts">
import type { CategorisedObjective } from '@/data/objectives'
import CheckableItem from './CheckableItem.vue'

defineProps<{
    name: string
    colorScheme: string | null
    objectives: CategorisedObjective[]
    weekdayDate?: boolean
}>()

const emit = defineEmits<{ toggle: [id: string, nowComplete: boolean] }>()
</script>

<template>
    <div class="bg-main rounded-md px-2 py-1 text-black" :data-model-theme="colorScheme ?? 'gray'">
        <div v-if="name" class="font-semibold">{{ name }}</div>
        <CheckableItem
            v-for="obj in objectives"
            :key="obj.id"
            :to="`/objectives/${obj.id}`"
            :name="obj.name"
            :completed-at="obj.completed_at"
            :incomplete-tasks="obj.incomplete_tasks"
            :total-tasks="obj.total_tasks"
            child-label="tasks"
            :has-description="obj.has_description"
            :weekday-date="weekdayDate"
            @toggle="(nowComplete) => emit('toggle', obj.id, nowComplete)"
        />
    </div>
</template>
