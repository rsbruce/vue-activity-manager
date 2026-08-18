<script lang="ts" setup>
import { computed, ref, watch} from 'vue'
import type { ProjectCategory, Project, Objective } from '@/types/projects'
import { getProjectsForPlanner, getToDoListProject } from '@/data/projects'
import type { Event } from '@/types/events'
import { completeObjective, uncompleteObjective, createObjective, type DueDateObjective } from '@/data/objectives'
import { peopleSummary } from '@/utils/people'
import ToDoList from '../components/planner/ToDoList.vue'
import { query } from '@/db/index.ts'

const props = defineProps<{
    projectCategories: ProjectCategory[]
    toDoList: Project | null
    toDoListId: string | null
    nextEvents: Event[]
}>()

// ── Local, navigable copies ───────────────────────────────────────────
const toDoList = ref<Project | null>(props.toDoList)

watch(() => props.toDoList, (v) => { toDoList.value = v })

async function reloadToDoList() {
    toDoList.value = props.toDoListId ? (await getToDoListProject(props.toDoListId)) ?? null : null
}


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
    <div class="grid lg:grid-cols-2 gap-2 mt-6 mb-10">
        <div v-if="toDoList && toDoListCategory">
            <ToDoList
                :project-name="toDoList.name"
                :objectives="toDoObjectives"
                :theme="toDoListCategory.color_scheme"
                @toggle="handleToggle"
                @add-objective="addToDoObjective"
            />
        </div>
        <div class="space-y-2">
            <h2 class="text-lg underline">Upcoming events</h2>
            <div class="mb-4 gap-2 grid grid-cols-1">
                <div v-for="event in nextEvents" data-model-theme="gray" class="bg-main px-2 py-1 rounded-md flex flex-col justify-between">
                    <h4 class="font-semibold text-lg">
                        <RouterLink :to="`/events/${event.id}`">{{ event.name }}</RouterLink>
                    </h4>
                    <div class="border-t border-gray-400">
                        <div class="text-sm">{{ event.start_datetime ? (new Date(event.start_datetime).toLocaleString('en-GB', {'weekday': 'long', 'day': 'numeric', 'month': 'long'})) : ''}}</div>
                        <div v-if="event.people?.length" class="text-sm italic">
                            With: {{ peopleSummary(event.people) }}
                        </div>
                        <div v-else class="text-sm italic">
                            Solo
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
