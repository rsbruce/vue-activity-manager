<script lang="ts" setup>
import { computed, ref, watch} from 'vue'
import type { ProjectCategory, Project, Objective } from '@/types/projects'
import { getProjectsForPlanner, getToDoListProject } from '@/data/projects'
import { completeObjective, uncompleteObjective, createObjective, type DueDateObjective } from '@/data/objectives'
import { formatDueDateParts } from '@/utils/dueDate'
import ToDoList from '../components/planner/ToDoList.vue'

const props = defineProps<{
    projectCategories: ProjectCategory[]
    toDoList: Project | null
    toDoListId: string | null
    dueDateObjectives: DueDateObjective[]
}>()

const view = ref<'projects' | 'timetable'>('projects')

// ── Local, navigable copies ───────────────────────────────────────────
const toDoList = ref<Project | null>(props.toDoList)

watch(() => props.toDoList, (v) => { toDoList.value = v })

async function reloadToDoList() {
    toDoList.value = props.toDoListId ? (await getToDoListProject(props.toDoListId)) ?? null : null
}

// Objectives with a due date, grouped by day (the list arrives ordered by
// date), then by project category within each day.
type CategoryGroup = { key: string; name: string; color_scheme: string | null; objectives: DueDateObjective[] }
type DateGroup = { date: string; label: string; relative: string; categories: CategoryGroup[] }
const objectivesByDueDate = computed(() => {
    const groups: DateGroup[] = []
    for (const obj of props.dueDateObjectives) {
        if (!obj.due_date) continue
        let dateGroup = groups[groups.length - 1]
        if (!dateGroup || dateGroup.date !== obj.due_date) {
            const { label, relative } = formatDueDateParts(obj.due_date)
            dateGroup = { date: obj.due_date, label, relative, categories: [] }
            groups.push(dateGroup)
        }
        const key = obj.project_category_id ?? ''
        let category = dateGroup.categories.find((c) => c.key === key)
        if (!category) {
            const name = props.projectCategories.find((pc) => pc.id === obj.project_category_id)?.name ?? ''
            category = { key, name, color_scheme: obj.color_scheme, objectives: [] }
            dateGroup.categories.push(category)
        }
        category.objectives.push(obj)
    }
    return groups
})

const toDoListCategory = computed(() => props.projectCategories.find((pc) => pc.id === toDoList.value?.project_category_id))
const toDoObjectives = computed<Objective[]>(() =>
    [...(toDoList.value?.objectives ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
)
async function handleToggle(objectiveId: string, complete: boolean) {
    await (complete ? completeObjective(objectiveId) : uncompleteObjective(objectiveId))
    await reloadToDoList()
}
async function addToDoObjective(name: string) {
    if (!props.toDoListId) return
    await createObjective({ name, project_id: props.toDoListId })
    await reloadToDoList()
}

</script>

<template>
    <div class="grid lg:grid-cols-2 gap-2">
        <ToDoList
            v-if="toDoList && toDoListCategory"
            :project-name="toDoList.name"
            :objectives="toDoObjectives"
            :theme="toDoListCategory.color_scheme"
            @toggle="handleToggle"
            @add-objective="addToDoObjective"
        />

        <div class="space-y-4">
            <div v-for="group in objectivesByDueDate" :key="group.date">
                <h3 class="font-semibold border-b flex justify-between items-baseline gap-2">
                    <span>{{ group.label }}</span>
                    <span class="text-sm font-normal">{{ group.relative }}</span>
                </h3>
                <div class="space-y-1 mt-1">
                    <ul
                        v-for="category in group.categories"
                        :key="category.key"
                        class="bg-main rounded-md px-2 py-1 text-black list-disc"
                        :data-model-theme="category.color_scheme ?? 'gray'"
                    >
                        <li v-if="category.name" class="list-none font-semibold">{{ category.name }}</li>
                        <li v-for="obj in category.objectives" :key="obj.id" class="ml-4">
                            <RouterLink :to="`/objectives/${obj.id}`">{{ obj.name }}</RouterLink>
                        </li>
                    </ul>
                </div>
            </div>
            <p v-if="!objectivesByDueDate.length">No objectives with a due date.</p>
        </div>
    </div>
</template>
