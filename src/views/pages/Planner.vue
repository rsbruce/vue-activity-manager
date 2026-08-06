<script lang="ts" setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import type { ProjectCategory, Project, Objective, ProjectOnDayData } from '@/types/projects'
import type { TimetableData, CalendarData, HabitTable, TimetableEvent, TimetableModalInitial, TimetableProjectCategories } from '@/types/events'
import type { Person } from '@/types/people'
import { getTimetableWindow } from '@/data/timetable'
import { getProjectOnDayData, addProjectOnDay as addPod, removeProjectOnDay as removePod } from '@/data/projectOnDay'
import { getProjectsForPlanner, getToDoListProject } from '@/data/projects'
import { completeObjective, uncompleteObjective, createObjective, type DueDateObjective } from '@/data/objectives'
import { formatDueDateParts } from '@/utils/dueDate'
import DayNavigator from '../components/timetable/DayNavigator.vue'
import TimetableGrid from '../components/timetable/TimetableGrid.vue'
import TimetableModal from '../components/timetable/TimetableModal.vue'
import PlannerDays from '../components/planner/PlannerDays.vue'
import ToDoList from '../components/planner/ToDoList.vue'
import ProjectAreaActionItems from '../components/planner/ProjectAreaActionItems.vue'

const props = defineProps<{
    timetable: TimetableData
    calendar: CalendarData
    habitTable: HabitTable
    eventsArr: Record<string, TimetableEvent>
    projectCategories: ProjectCategory[]
    allProjects: Project[]
    toDoList: Project | null
    toDoListId: string | null
    dueDateObjectives: DueDateObjective[]
    projectOnDayData: ProjectOnDayData
    timetableProjectCategories: TimetableProjectCategories
    activeProjects: Project[]
    people: Person[]
    displayStart: string
}>()

const view = ref<'projects' | 'timetable'>('projects')

// ── Local, navigable copies ───────────────────────────────────────────
const localDisplayStart = ref(new Date(props.displayStart))
const timetable = ref<TimetableData>(props.timetable)
const calendar = ref<CalendarData>(props.calendar)
const eventsArr = ref<Record<string, TimetableEvent>>(props.eventsArr)
const projectOnDayData = ref<ProjectOnDayData>(props.projectOnDayData)
const allProjects = ref<Project[]>(props.allProjects)
const toDoList = ref<Project | null>(props.toDoList)

watch(() => props.timetable, (v) => { timetable.value = v })
watch(() => props.calendar, (v) => { calendar.value = v })
watch(() => props.eventsArr, (v) => { eventsArr.value = v })
watch(() => props.projectOnDayData, (v) => { projectOnDayData.value = v })
watch(() => props.allProjects, (v) => { allProjects.value = v })
watch(() => props.toDoList, (v) => { toDoList.value = v })
watch(() => props.displayStart, (v) => { localDisplayStart.value = new Date(v) })

async function loadWindow() {
    const start = localDisplayStart.value
    const win = await getTimetableWindow(start.addDays(-7).isoDate(), start.addDays(7).isoDate())
    timetable.value = win.timetable
    calendar.value = win.calendar
    eventsArr.value = win.eventsArr
}
async function loadProjectOnDay() {
    projectOnDayData.value = await getProjectOnDayData(localDisplayStart.value.isoDate())
}
async function loadProjects() {
    allProjects.value = await getProjectsForPlanner(props.toDoListId)
    toDoList.value = props.toDoListId ? (await getToDoListProject(props.toDoListId)) ?? null : null
}

async function navigate(offsetDays: number) {
    localDisplayStart.value = localDisplayStart.value.addDays(offsetDays)
    await Promise.all([loadWindow(), loadProjectOnDay()])
}
async function toToday() {
    const d = new Date()
    d.setHours(5, 0, 0, 0)
    localDisplayStart.value = d
    await Promise.all([loadWindow(), loadProjectOnDay()])
}

// ── Project-on-day + objective actions ────────────────────────────────
const allProjectsIncludingToDoList = computed(() =>
    toDoList.value ? [toDoList.value, ...allProjects.value] : allProjects.value,
)

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

async function onAddProjectOnDay({ projectId, date }: { projectId: string; date: string }) {
    await addPod(projectId, date)
    await loadProjectOnDay()
}
async function onRemoveProjectOnDay(projectId: string, date: string) {
    await removePod(projectId, date)
    await loadProjectOnDay()
}
async function handleToggle(objectiveId: string, complete: boolean) {
    await (complete ? completeObjective(objectiveId) : uncompleteObjective(objectiveId))
    await loadProjects()
}
async function addToDoObjective(name: string) {
    if (!props.toDoListId) return
    await createObjective({ name, project_id: props.toDoListId })
    await loadProjects()
}

// ── Timetable strip modal (same wiring as Timetable.vue) ──────────────
const modalOpen = ref(false)
const modalInitial = ref<TimetableModalInitial | null>(null)

const datetimeLocal = (d: Date) => `${d.isoDate()}T${d.isoTime()}`
const toInput = (s: string) => `${s.slice(0, 10)}T${s.slice(11, 16)}`

function openModal(startDatetime: Date) {
    modalInitial.value = {
        eventId: null,
        itemType: null,
        name: '',
        projectId: null,
        startDatetime: datetimeLocal(startDatetime),
        endDatetime: datetimeLocal(startDatetime.addMinutes(60)),
        attendeeIds: [],
    }
    modalOpen.value = true
}
function openModalForItem(eventId: string) {
    const ev = eventsArr.value[eventId]
    if (!ev) return
    modalInitial.value = {
        eventId,
        itemType: ev.project_id ? 'work' : 'event',
        name: ev.name,
        projectId: ev.project_id,
        startDatetime: toInput(ev.start_datetime),
        endDatetime: toInput(ev.end_datetime),
        attendeeIds: [...ev.attendee_ids],
    }
    modalOpen.value = true
}

const presentMoment = ref(new Date())
let timer: ReturnType<typeof setInterval>
onMounted(() => { timer = setInterval(() => { presentMoment.value = new Date() }, 60000) })
onUnmounted(() => clearInterval(timer))
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
                        class="bg-main rounded-md px-2 py-1 text-blac list-disc"
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
