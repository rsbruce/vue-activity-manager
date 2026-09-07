<script lang="ts" setup>
import { computed, ref, watch} from 'vue'
import type { ProjectCategory, Project, Objective } from '@/types/projects'
import { getProjectsForPlanner, getToDoListProject } from '@/data/projects'
import type { Event } from '@/types/events'
import { completeObjective, uncompleteObjective, createObjective, type DueDateObjective } from '@/data/objectives'
import { peopleSummary } from '@/utils/people'
import ToDoList from '../components/planner/ToDoList.vue'
import ReminderList from '../components/planner/ReminderList.vue'
import { resolveReminder, unresolveReminder } from '@/data/reminders'
import type { Reminder } from '@/types/reminders'
import { refreshCurrent } from '@/router/defineController'
import { query } from '@/db/index.ts'

const props = defineProps<{
    projectCategories: ProjectCategory[]
    toDoList: Project | null
    toDoListId: string | null
    nextEvents: Event[]
    reminders: Reminder[]
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

async function toggleReminder(reminderId: string, nowResolved: boolean) {
    await (nowResolved ? resolveReminder(reminderId) : unresolveReminder(reminderId))
    await refreshCurrent()
}

// Upcoming-events filter: all, work (has a project), or non-work.
const eventFilter = ref<'all' | 'work' | 'non-work'>('all')
const filteredEvents = computed(() => {
    if (eventFilter.value === 'work') return props.nextEvents.filter((e) => e.project_id)
    if (eventFilter.value === 'non-work') return props.nextEvents.filter((e) => !e.project_id)
    return props.nextEvents
})

// "12:00-13:00" from the event's start/end datetimes, like the timetable.
function timeRange(event: Event): string {
    if (!event.start_datetime || !event.end_datetime) return ''
    return `${event.start_datetime.slice(11, 16)}-${event.end_datetime.slice(11, 16)}`
}

</script>

<template>
    <div class="grid lg:grid-cols-2 gap-2 mt-6 mb-10">
        <div class="space-y-2">
            <ToDoList
                v-if="toDoList && toDoListCategory"
                :project-name="toDoList.name"
                :objectives="toDoObjectives"
                :theme="toDoListCategory.color_scheme"
                @toggle="handleToggle"
                @add-objective="addToDoObjective"
            />
            <ReminderList
                :reminders="reminders"
                all-link
                @toggle="toggleReminder"
            />
        </div>
        <div class="space-y-2">
            <h2 class="text-lg underline">Upcoming events</h2>
            <div class="flex gap-2">
                <button type="button" class="flex-1 px-3 py-0.5 rounded-md" :class="eventFilter === 'all' ? 'bg-sky-600 text-white' : 'bg-sky-200 text-black'" @click="eventFilter = 'all'">All</button>
                <button type="button" class="flex-1 px-3 py-0.5 rounded-md" :class="eventFilter === 'work' ? 'bg-sky-600 text-white' : 'bg-sky-200 text-black'" @click="eventFilter = 'work'">Work</button>
                <button type="button" class="flex-1 px-3 py-0.5 rounded-md" :class="eventFilter === 'non-work' ? 'bg-sky-600 text-white' : 'bg-sky-200 text-black'" @click="eventFilter = 'non-work'">Non-work</button>
            </div>
            <div class="mb-4 gap-2 grid grid-cols-1">
                <div
                    v-for="event in filteredEvents"
                    :key="event.id"
                    :data-model-theme="event.color_scheme ?? 'gray'"
                    class="px-2 py-1 rounded-md flex flex-col justify-between"
                    :class="event.project_id || event.people?.length ? 'bg-main' : 'bg-gray-400'"
                >
                    <h4 class="font-semibold text-lg">
                        <RouterLink :to="`/events/${event.id}`">{{ event.name }}</RouterLink>
                    </h4>
                    <div class="border-t border-gray-400">
                        <div class="text-sm">{{ event.start_datetime ? (new Date(event.start_datetime).toLocaleString('en-GB', {'weekday': 'long', 'day': 'numeric', 'month': 'long'})) : ''}}</div>
                        <div v-if="timeRange(event)" class="text-sm">{{ timeRange(event) }}</div>
                        <div v-if="event.people?.length" class="text-sm italic">
                            With: {{ peopleSummary(event.people) }}
                        </div>
                        <div v-else-if="!event.project_id" class="text-sm italic">
                            Solo
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
