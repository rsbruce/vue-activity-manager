<script setup lang="ts">
import type { Project } from '@/types/projects'
import { computed } from 'vue'
import { refreshCurrent } from '@/router/defineController'
import { updateProjectStatus } from '@/data/projects'
import { createObjective, completeObjective, uncompleteObjective, reorderObjectives } from '@/data/objectives'
import ChildItemList from '../components/projects/ChildItemList.vue'
import DescriptionPanel from '../components/projects/DescriptionPanel.vue'
import StatusButtons from '../components/projects/StatusButtons.vue'

const props = defineProps<{ project: Project }>()

const setStatus = async (status: string) => {
    await updateProjectStatus(props.project.id, status)
    await refreshCurrent()
}

const objectivesWithChildren = computed(() =>
    (props.project.objectives ?? []).map((o) => ({ ...o, children: o.tasks })),
)

const onCreate = async (name: string) => {
    await createObjective({ name, project_id: props.project.id })
    await refreshCurrent()
}
const onToggle = async ({ id, nowComplete }: { id: string; nowComplete: boolean }) => {
    await (nowComplete ? completeObjective(id) : uncompleteObjective(id))
    await refreshCurrent()
}
const onReorder = async (items: { id: string; order: number | null }[]) => {
    await reorderObjectives(items)
    await refreshCurrent()
}
</script>

<template>
    <div class="space-y-3 py-2">
        <div class="text-2xl pb-2">
            <RouterLink :to="`/project-categories/${project.project_category_id}`">{{ project.project_area?.name }}</RouterLink>
            <span> &gt; </span>
            <span class="whitespace-nowrap">{{ project.name }}</span>
        </div>

        <div class="flex gap-2 items-center">
            <RouterLink :to="`/projects/${project.id}/edit`">Edit</RouterLink>
        </div>

        <StatusButtons :model-value="project.status ?? 'active'" @update:model-value="setStatus" />

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2" :data-model-theme="project.project_area?.color_scheme">
            <ChildItemList
                :items="objectivesWithChildren"
                title="Objectives"
                base-path="objectives"
                child-label="tasks"
                :theme="project.project_area?.color_scheme"
                @create="onCreate"
                @toggle="onToggle"
                @reorder="onReorder"
            />
            <DescriptionPanel :description="project.description" />
        </div>
    </div>
</template>
