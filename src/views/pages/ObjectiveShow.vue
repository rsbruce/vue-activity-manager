<script setup lang="ts">
import type { Objective } from '@/types/projects'
import { refreshCurrent } from '@/router/defineController'
import { completeObjective, uncompleteObjective, setCurrentObjective } from '@/data/objectives'
import { createTask, completeTask, uncompleteTask, reorderTasks } from '@/data/tasks'
import ChildItemList from '../components/projects/ChildItemList.vue'
import CompleteToggle from '../components/projects/CompleteToggle.vue'
import DescriptionPanel from '../components/projects/DescriptionPanel.vue'
import { formatDueDate } from '@/utils/dueDate'

const props = defineProps<{ objective: Objective; isCurrent: boolean }>()

const makeCurrent = async () => {
    await setCurrentObjective(props.objective.id)
    await refreshCurrent()
}

const toggleObjectiveComplete = async () => {
    await (props.objective.completed_at ? uncompleteObjective(props.objective.id) : completeObjective(props.objective.id))
    await refreshCurrent()
}

const onCreate = async (name: string) => {
    await createTask({ name, objective_id: props.objective.id })
    await refreshCurrent()
}
const onToggle = async ({ id, nowComplete }: { id: string; nowComplete: boolean }) => {
    await (nowComplete ? completeTask(id) : uncompleteTask(id))
    await refreshCurrent()
}
const onReorder = async (items: { id: string; order: number | null }[]) => {
    await reorderTasks(items)
    await refreshCurrent()
}
</script>

<template>
    <div class="space-y-3 py-2">
        <div class="text-2xl pb-2">
            <RouterLink v-if="objective.project?.project_area" :to="`/project-categories/${objective.project.project_area.id}`">{{ objective.project.project_area.name }}</RouterLink>
            <span v-if="objective.project?.project_area"> &gt; </span>
            <RouterLink v-if="objective.project" :to="`/projects/${objective.project.id}`">{{ objective.project.name }}</RouterLink>
            <span v-if="objective.project"> &gt; </span>
            <span class="whitespace-nowrap">{{ objective.name }}</span>
        </div>

        <div class="flex items-center gap-3">
            <RouterLink :to="`/objectives/${objective.id}/edit`">Edit</RouterLink>
            <!-- A completed objective can't be current (the Agenda treats it as none). -->
            <template v-if="!objective.completed_at">
                <span v-if="isCurrent" class="text-sm bg-sky-700 text-white px-2 py-0.5 rounded-md">Current objective</span>
                <button
                    v-else
                    type="button"
                    class="bg-sky-500 text-white text-sm px-2 py-0.5 rounded-md cursor-pointer"
                    @click="makeCurrent"
                >Set as current objective</button>
            </template>
        </div>

        <CompleteToggle :completed-at="objective.completed_at" @toggle="toggleObjectiveComplete" />

        <div v-if="objective.due_date" class="text-sm">Due: {{ formatDueDate(objective.due_date) }}</div>

        <div class="space-y-2 mt-2" :data-model-theme="objective.project?.project_area?.color_scheme">
            <ChildItemList
                :items="objective.tasks ?? []"
                title="Tasks"
                base-path="tasks"
                layout="row"
                :theme="objective.project?.project_area?.color_scheme"
                @create="onCreate"
                @toggle="onToggle"
                @reorder="onReorder"
            />
            <DescriptionPanel :description="objective.description" />
        </div>
    </div>
</template>
