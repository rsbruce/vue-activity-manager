<script setup lang="ts">
import type { Task } from '@/types/projects'
import { refreshCurrent } from '@/router/defineController'
import { completeTask, uncompleteTask } from '@/data/tasks'
import CompleteToggle from '../components/projects/CompleteToggle.vue'
import DescriptionPanel from '../components/projects/DescriptionPanel.vue'

const props = defineProps<{ task: Task }>()

const toggleComplete = async () => {
    await (props.task.completed_at ? uncompleteTask(props.task.id) : completeTask(props.task.id))
    await refreshCurrent()
}
</script>

<template>
    <div class="space-y-3 py-2">
        <div class="text-2xl pb-2">
            <template v-if="task.objective">
                <RouterLink v-if="task.objective.project" :to="`/projects/${task.objective.project.id}`">{{ task.objective.project.name }}</RouterLink>
                <span v-if="task.objective.project"> &gt; </span>
                <RouterLink :to="`/objectives/${task.objective.id}`">{{ task.objective.name }}</RouterLink>
                <span> &gt; </span>
            </template>
            <span class="whitespace-nowrap">{{ task.name }}</span>
        </div>

        <div>
            <RouterLink :to="`/tasks/${task.id}/edit`">Edit</RouterLink>
        </div>

        <CompleteToggle
            :completed-at="task.completed_at"
            completed-class="bg-emerald-300 border-emerald-700"
            @toggle="toggleComplete"
        />

        <DescriptionPanel :description="task.description" />
    </div>
</template>
